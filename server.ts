import DOMMatrix from 'dommatrix';
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = DOMMatrix;
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { PDFDocument, PageSizes } from 'pdf-lib';
import sharp from 'sharp';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { registry } from './server/converters/registry.js';
import { jobStorage } from './server/queue/jobStorage.js';
import { jobQueue } from './server/queue/jobQueue.js';
import { runCrashRecovery } from './server/queue/crashRecovery.js';
import { createRateLimiter, checkQueueLimit } from './server/utils/rateLimiter.js';
import {
  generateTempFilePath,
  detectFileFormat,
  MAX_FILE_SIZE_BYTES,
  FREE_MAX_FILE_SIZE_MB,
  FREE_MAX_FILE_SIZE_BYTES,
  FREE_DAILY_CONVERSIONS,
  FREE_MAX_PDF_PAGES,
  sanitizeFilename,
} from './server/utils/fileSecurity.js';
import { SAMPLE_FILES } from './server/utils/samples.js';
import { SEO_ROUTES } from './src/data/seoRoutes.js';
import { metricsTracker } from './server/utils/metricsTracker.js';
import { paymentService } from './server/utils/paymentService.js';
import {
  FREE_DAILY_LIMIT,
  FREE_MAX_FILE_MB,
  PRO_MAX_FILE_MB,
  BUSINESS_MAX_FILE_MB,
  PLAN_LIMITS,
} from './server/utils/entitlements.js';
import {
  getUserPlan,
  isProUser,
  canShowAds,
  getDailyUsage,
  getRemainingDailyQuota,
  canCreateConversion,
  canUseBatchConversion,
  recordSuccessfulConversion,
  refundConversionOnFailure,
  isJobAlreadyAccounted,
  APP_TIMEZONE,
  FREE_BATCH_LIMIT,
  PRO_BATCH_LIMIT,
  getClientIdentifier,
} from './server/utils/usageService.js';
import { referralStore } from './server/utils/referralService.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Run crash recovery on server startup to restore in-flight jobs
  runCrashRecovery();

  // Rate Limiting & Queue Throttling
  const uploadRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    actionName: 'upload',
  });

  const convertRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    actionName: 'conversion',
  });

  const queueLimitGuard = checkQueueLimit(20);

  // Global CORS & preflight middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Multer memory storage configuration for secure magic-byte inspection
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
  });

  // --- SEO & CRAWLER ROUTES ---
  app.get('/ads.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const adsPath = path.join(process.cwd(), 'public', 'ads.txt');
    if (fs.existsSync(adsPath)) {
      return res.send(fs.readFileSync(adsPath, 'utf8'));
    }
    res.send('google.com, pub-8954286467084824, DIRECT, f08c47fec0942fa0\n');
  });

  app.get('/robots.txt', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'convert-x.com';
    const siteUrl = `${protocol}://${host}`;

    const robotsTxt = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /admin/',
      'Disallow: /private/',
      'Disallow: /temp/',
      '',
      `Sitemap: ${siteUrl}/sitemap.xml`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(robotsTxt);
  });

  app.get('/sitemap.xml', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'convert-x.com';
    const siteUrl = `${protocol}://${host}`;

    const coreRoutes = [
      { loc: '', changefreq: 'daily', priority: '1.0' },
      { loc: 'tools', changefreq: 'daily', priority: '0.9' },
      { loc: 'converter', changefreq: 'weekly', priority: '0.9' },
      { loc: 'formats', changefreq: 'weekly', priority: '0.8' },
      { loc: 'how-it-works', changefreq: 'monthly', priority: '0.7' },
      { loc: 'pricing', changefreq: 'weekly', priority: '0.8' },
      { loc: 'referral', changefreq: 'weekly', priority: '0.8' },
      { loc: 'about', changefreq: 'monthly', priority: '0.7' },
      { loc: 'faq', changefreq: 'monthly', priority: '0.7' },
      { loc: 'privacy', changefreq: 'yearly', priority: '0.4' },
      { loc: 'terms', changefreq: 'yearly', priority: '0.4' },
      { loc: 'contact', changefreq: 'monthly', priority: '0.5' },
    ];

    const seoToolRoutes = Object.keys(SEO_ROUTES).map((slug) => ({
      loc: slug,
      changefreq: 'weekly',
      priority: '0.9',
    }));

    const allRoutes = [...coreRoutes, ...seoToolRoutes];
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r.loc ? `/${r.loc}` : ''}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  });

  // --- API ROUTES ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ConvertX Engine Core', timestamp: new Date().toISOString() });
  });

  // System & Monetization Configuration (Safe public parameters)
  app.get('/api/config', (req, res) => {
    const paymentStatus = paymentService.getStatus();
    const adsenseId = process.env.ADSENSE_CLIENT_ID || 'pub-8954286467084824';
    const proMonthly = Number(process.env.PRO_PRICE_MONTHLY_INR) || 99;
    const bizMonthly = Number(process.env.BUSINESS_PRICE_MONTHLY_INR) || 499;

    res.json({
      success: true,
      limits: {
        maxFileSizeMB: FREE_MAX_FILE_MB,
        maxFileSizeBytes: FREE_MAX_FILE_MB * 1024 * 1024,
        dailyConversions: FREE_DAILY_LIMIT,
        maxPdfPages: FREE_MAX_PDF_PAGES,
      },
      monetization: {
        paymentConfigured: paymentStatus.isConfigured,
        paymentMessage: paymentStatus.message,
        adsenseConfigured: Boolean(adsenseId && adsenseId.trim() !== ''),
        adsenseClientId: adsenseId,
        pricing: {
          free: {
            id: 'free',
            name: 'Free Plan',
            amount: 0,
            currency: 'INR',
            formattedPrice: '₹0',
            period: 'forever',
            maxFileSizeMB: FREE_MAX_FILE_MB,
            dailyConversions: FREE_DAILY_LIMIT,
            maxPdfPages: FREE_MAX_PDF_PAGES,
            features: [
              '5 conversions per day',
              '25 MB maximum file size',
              'Standard JPG/PNG/PDF/WEBP conversions',
              'Basic compression tuning',
              'Normal queue priority',
              'Non-intrusive advertisements',
            ],
          },
          pro: {
            id: 'pro',
            name: 'Pro Plan',
            amount: proMonthly,
            currency: 'INR',
            formattedPrice: `₹${proMonthly}`,
            period: 'per month',
            maxFileSizeMB: PRO_MAX_FILE_MB,
            dailyConversions: 'Unlimited',
            maxPdfPages: 'Unlimited',
            features: [
              '100 MB maximum file size',
              'Unlimited daily conversions',
              'Batch conversion queue (up to 20 files)',
              '300 DPI high-resolution export',
              '100% Ad-Free workspace',
              'Priority queue processing',
            ],
          },
          business: {
            id: 'business',
            name: 'Business Plan',
            amount: bizMonthly,
            currency: 'INR',
            formattedPrice: `₹${bizMonthly}`,
            period: 'per month',
            maxFileSizeMB: BUSINESS_MAX_FILE_MB,
            dailyConversions: 'Unlimited',
            maxPdfPages: 'Unlimited',
            features: [
              '250 MB maximum file size',
              'Unlimited high-speed batch conversions (up to 50 files)',
              'Dedicated multi-threaded priority queue',
              'Dedicated API access tokens',
              'Team collaboration & shared workspace',
              '100% Ad-Free workspace & VIP support',
            ],
          },
        },
      },
    });
  });

  // User Usage & Free Plan status endpoint
  app.get('/api/usage', (req, res) => {
    const plan = getUserPlan(req);
    const isPro = isProUser(req);
    const used = getDailyUsage(req);
    const remaining = getRemainingDailyQuota(req);
    const userId = getClientIdentifier(req);
    const referralStats = referralStore.getReferralStats(userId);

    res.json({
      success: true,
      usage: {
        dailyConversions: used,
        dailyLimit: isPro ? 'unlimited' : FREE_DAILY_LIMIT + referralStats.bonusConversionsAvailable,
        baseDailyLimit: FREE_DAILY_LIMIT,
        bonusConversions: referralStats.bonusConversionsAvailable,
        maxFileSizeMB: isPro ? PRO_MAX_FILE_MB : FREE_MAX_FILE_MB,
        batchLimit: isPro ? PRO_BATCH_LIMIT : FREE_BATCH_LIMIT,
        plan,
        remaining,
        timezone: APP_TIMEZONE,
        canShowAds: canShowAds(req),
        referralCode: referralStats.referralCode,
      },
    });
  });

  // Referral statistics endpoint
  app.get('/api/referral/stats', (req, res) => {
    const userId = getClientIdentifier(req);
    const stats = referralStore.getReferralStats(userId);
    res.json({
      success: true,
      ...stats,
    });
  });

  // Register incoming referral code (with anti-abuse checks)
  app.post('/api/referral/register', (req, res) => {
    const { referralCode } = req.body;
    if (!referralCode) {
      return res.status(400).json({ success: false, code: 'MISSING_CODE', error: 'Referral code is required.' });
    }

    const userId = getClientIdentifier(req);
    const result = referralStore.registerReferral(userId, referralCode);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  // Aggregate popular tools endpoint based on real operational telemetry
  app.get('/api/metrics/popular-tools', (req, res) => {
    try {
      const tools = metricsTracker.getPopularTools();
      res.json({
        success: true,
        tools,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve popular tools.' });
    }
  });

  // Payment status endpoint
  app.get('/api/payment/status', (req, res) => {
    const status = paymentService.getStatus();
    res.json(status);
  });

  // Create payment checkout order
  app.post('/api/payment/create-order', async (req, res) => {
    try {
      const { planId = 'pro', billingPeriod = 'monthly', userEmail } = req.body;
      const order = await paymentService.createPaymentOrder({ planId, billingPeriod, userEmail });
      if (!order.success) {
        return res.status(order.code === 'PAYMENTS_NOT_CONFIGURED' ? 200 : 400).json(order);
      }
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Payment initiation failed.' });
    }
  });

  // Verify payment
  app.post('/api/payment/verify', async (req, res) => {
    try {
      const { orderId, paymentId, signature } = req.body;
      const result = await paymentService.verifyPayment({ orderId, paymentId, signature });
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, code: 'VERIFICATION_ERROR', error: err.message || 'Payment verification failed.' });
    }
  });

  // Cancel subscription
  app.post('/api/payment/cancel', async (req, res) => {
    try {
      const { subscriptionId } = req.body;
      const result = await paymentService.cancelSubscription(subscriptionId || '');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Operational Metrics & Telemetry (Honest tracking of real metrics)
  app.get('/api/admin/metrics', (req, res) => {
    try {
      const qStats = jobQueue.getStats();
      const metrics = metricsTracker.getMetrics({
        queuedJobs: qStats.queued,
        processingJobs: qStats.processing,
        completedJobs: qStats.completed,
        failedJobs: qStats.failed,
        activeWorkers: qStats.activeWorkers,
        maxConcurrency: qStats.maxConcurrency,
      });
      res.json({
        success: true,
        metrics,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve server telemetry metrics.' });
    }
  });

  // Health check endpoint with real queue stats
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ConvertX Engine Core',
      timestamp: new Date().toISOString(),
      queue: jobQueue.getStats(),
    });
  });

  // 1. Get supported formats and capabilities
  app.get('/api/formats', (req, res) => {
    try {
      const capabilities = registry.getCapabilities();
      res.json({ capabilities });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve format capabilities.' });
    }
  });

  // 1b. Get universal export registry capabilities
  app.get('/api/universal-export/capabilities', (req, res) => {
    try {
      const capabilities = registry.getUniversalExportCapabilities();
      res.json({ capabilities });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve universal export capabilities.' });
    }
  });

  // 2. Get list of available sample files
  app.get('/api/samples', (req, res) => {
    const list = Object.values(SAMPLE_FILES).map((s) => ({
      key: s.key,
      name: s.name,
      filename: s.filename,
      format: s.format,
      category: s.category,
      description: s.description,
    }));
    res.json({ samples: list });
  });

  // 3. Get single sample file session
  app.get('/api/sample/:key', async (req, res) => {
    try {
      const sampleKey = req.params.key;
      const sample = SAMPLE_FILES[sampleKey];
      if (!sample) {
        return res.status(404).json({ error: 'Sample file not found.' });
      }

      const fileBuffer = await Promise.resolve(sample.getContent());
      const cleanName = sanitizeFilename(sample.filename);
      const detection = detectFileFormat(fileBuffer, cleanName);

      const { filePath } = generateTempFilePath(detection.format);
      fs.writeFileSync(filePath, fileBuffer);

      const job = jobStorage.createJob({
        originalName: cleanName,
        inputFormat: detection.format,
        inputPath: filePath,
        fileSize: fileBuffer.length,
        sessionId: (req.headers['x-session-id'] as string) || 'sample_session',
      });

      const capabilities = registry.getCapabilities();
      const cap = capabilities.find((c) => c.extension === detection.format);

      res.json({
        jobId: job.id,
        fileName: cleanName,
        detectedFormat: detection.format,
        mimeType: detection.mimeType,
        fileSize: fileBuffer.length,
        category: cap?.category || 'general',
        status: cap?.status || 'supported',
        requiresEngine: cap?.requiresEngine,
        supportedOutputs: cap?.supportedOutputs || [],
      });
    } catch (err: any) {
      console.error('Sample retrieval error:', err);
      res.status(500).json({ error: 'Failed to initialize sample file.' });
    }
  });

  // 4. Upload file or load sample file (rate limited & queue protected)
  app.post(
    '/api/upload',
    uploadRateLimiter,
    queueLimitGuard,
    (req, res, next) => {
      upload.single('file')(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                code: 'LIMIT_FILE_SIZE',
                error: `The uploaded file exceeds the limit of ${FREE_MAX_FILE_SIZE_MB}MB. Please compress your file or upgrade to Pro.`,
              });
            }
            return res.status(400).json({ success: false, code: err.code, error: `Upload error: ${err.message}` });
          }
          return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', error: err.message || 'File upload failed.' });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        let fileBuffer: Buffer;
        let originalName: string;

        const sampleKey = req.body.sampleKey;
        if (sampleKey && SAMPLE_FILES[sampleKey]) {
          const sample = SAMPLE_FILES[sampleKey];
          fileBuffer = await Promise.resolve(sample.getContent());
          originalName = sample.filename;
        } else if (req.file) {
          fileBuffer = req.file.buffer;
          originalName = req.file.originalname;
        } else {
          return res.status(400).json({ success: false, code: 'NO_FILE', error: 'No file uploaded or sample selected.' });
        }

        const userPlan = getUserPlan(req);
        const maxAllowedMB = userPlan === 'pro' || userPlan === 'business' ? PRO_MAX_FILE_MB : FREE_MAX_FILE_MB;
        const maxAllowedBytes = maxAllowedMB * 1024 * 1024;

        if (fileBuffer.length > maxAllowedBytes) {
          return res.status(400).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            error: `The uploaded file (${(fileBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the ${userPlan === 'pro' ? 'Pro' : 'Free'} plan limit of ${maxAllowedMB}MB. Please compress your file or upgrade to Pro.`,
            upgrade: userPlan === 'free' ? { available: true, plan: 'Pro' } : undefined,
          });
        }

        const cleanName = sanitizeFilename(originalName);
        const detection = detectFileFormat(fileBuffer, cleanName);

        if (!detection.valid) {
          return res.status(400).json({
            success: false,
            code: 'UNSUPPORTED_FORMAT',
            error: `Unsupported or invalid file format. Detected extension: .${detection.format || 'unknown'}`,
          });
        }

        // Save input file to temp path
        const { filePath } = generateTempFilePath(detection.format);
        fs.writeFileSync(filePath, fileBuffer);

        const sessionId = (req.headers['x-session-id'] as string) || req.ip || 'anonymous';
        const isPro = isProUser(req);

        const job = jobStorage.createJob({
          originalName: cleanName,
          inputFormat: detection.format,
          inputPath: filePath,
          fileSize: fileBuffer.length,
          sessionId,
          isPro,
        });

        metricsTracker.recordUpload(detection.format, fileBuffer.length);

        // Retrieve capability details for input format
        const capabilities = registry.getCapabilities();
        const cap = capabilities.find((c) => c.extension === detection.format);

        res.json({
          success: true,
          jobId: job.id,
          fileName: cleanName,
          detectedFormat: detection.format,
          mimeType: detection.mimeType,
          fileSize: fileBuffer.length,
          category: cap?.category || 'general',
          status: cap?.status || 'supported',
          requiresEngine: cap?.requiresEngine,
          supportedOutputs: cap?.supportedOutputs || [],
        });
      } catch (err: any) {
        console.error('Upload handler error:', err);
        res.status(500).json({ success: false, code: 'UPLOAD_FAILED', error: 'Failed to process uploaded file. Please try again.' });
      }
    }
  );

  // 5. Trigger Asynchronous Conversion Job in Durable Worker Queue
  app.post('/api/convert', convertRateLimiter, async (req, res) => {
    try {
      const { jobId, outputFormat, options } = req.body;

      if (!jobId || !outputFormat) {
        return res.status(400).json({ success: false, code: 'INVALID_REQUEST', error: 'Missing jobId or target outputFormat.' });
      }

      const job = jobStorage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ success: false, code: 'JOB_NOT_FOUND', error: 'Conversion session expired or not found. Please re-upload your file.' });
      }

      // Check quota if this job was not already accounted for (e.g. retry)
      const alreadyAccounted = isJobAlreadyAccounted(req, jobId);
      if (!alreadyAccounted) {
        const quotaCheck = canCreateConversion(req, 1);
        if (!quotaCheck.allowed) {
          return res.status(403).json({
            success: false,
            code: quotaCheck.code || 'FREE_LIMIT_REACHED',
            error: quotaCheck.error || "You have reached today's free conversion limit.",
            upgrade: quotaCheck.upgrade || {
              available: true,
              plan: 'Pro',
            },
          });
        }
      }

      // Enqueue job into durable worker queue
      const enqueuedJob = jobQueue.enqueue(jobId, outputFormat, options || {});

      // Record conversion against daily quota
      if (!alreadyAccounted) {
        recordSuccessfulConversion(req, jobId, 1);
      }

      res.json({
        success: true,
        jobId: enqueuedJob.id,
        originalName: enqueuedJob.originalName,
        inputFormat: enqueuedJob.inputFormat,
        outputFormat: enqueuedJob.outputFormat,
        status: enqueuedJob.status,
        progress: enqueuedJob.progress,
        progressStage: enqueuedJob.progressStage,
        message: 'Conversion enqueued successfully',
      });
    } catch (err: any) {
      metricsTracker.recordFailure();
      console.error('Convert handler error:', err);
      res.status(400).json({ success: false, code: 'CONVERSION_ENQUEUE_FAILED', error: err.message || 'Failed to enqueue conversion job.' });
    }
  });

  // 5b. Combine / Merge Multiple Files into One PDF (Goal 10)
  app.post('/api/combine-pdf', async (req, res) => {
    try {
      const { jobIds, options = {}, filename } = req.body;

      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_REQUEST',
          error: 'Please provide an array of file session job IDs to combine into PDF.',
        });
      }

      const quotaCheck = canCreateConversion(req, 1);
      if (!quotaCheck.allowed) {
        return res.status(403).json({
          success: false,
          code: quotaCheck.code || 'FREE_LIMIT_REACHED',
          error: quotaCheck.error || "You have reached today's free conversion limit.",
          upgrade: quotaCheck.upgrade || {
            available: true,
            plan: 'Pro',
          },
        });
      }

      const combinedPdf = await PDFDocument.create();
      let totalPages = 0;

      const pageSizeSetting = options.pageSize || 'a4';
      const isLandscape = options.orientation === 'landscape';
      const margin = typeof options.margin === 'number' ? options.margin : 20;

      for (const jobId of jobIds) {
        const job = jobStorage.getJob(jobId);
        if (!job) continue;

        const filePath = job.outputPath && fs.existsSync(job.outputPath) ? job.outputPath : job.inputPath;
        if (!filePath || !fs.existsSync(filePath)) continue;

        const fileBuffer = fs.readFileSync(filePath);
        const inFmt = (path.extname(filePath).replace('.', '') || job.inputFormat || '').toLowerCase();

        if (inFmt === 'pdf') {
          try {
            const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
            const pageIndices = srcDoc.getPageIndices();
            const copiedPages = await combinedPdf.copyPages(srcDoc, pageIndices);
            for (const page of copiedPages) {
              combinedPdf.addPage(page);
              totalPages++;
            }
          } catch (pdfErr) {
            console.warn(`Could not copy PDF pages for job ${jobId}:`, pdfErr);
          }
        } else {
          // Convert raster image (or SVG) to PNG with sharp for embedding into PDF page
          try {
            const dpi = options.dpi || 150;
            const density = Math.round((dpi / 72) * 150);

            const pngBuf = await sharp(fileBuffer, { density })
              .png({ quality: 100 })
              .toBuffer();

            const embedImage = await combinedPdf.embedPng(pngBuf);
            const imgW = embedImage.width;
            const imgH = embedImage.height;

            let [pageWidth, pageHeight] = PageSizes.A4;
            if (pageSizeSetting === 'letter') {
              pageWidth = 612; pageHeight = 792;
            } else if (pageSizeSetting === 'legal') {
              pageWidth = 612; pageHeight = 1008;
            } else if (pageSizeSetting === 'a3') {
              pageWidth = 841.89; pageHeight = 1190.55;
            } else if (pageSizeSetting === 'a2') {
              pageWidth = 1190.55; pageHeight = 1683.78;
            } else if (pageSizeSetting === 'a1') {
              pageWidth = 1683.78; pageHeight = 2383.94;
            } else if (pageSizeSetting === 'a0') {
              pageWidth = 2383.94; pageHeight = 3370.39;
            } else if (pageSizeSetting === 'auto') {
              pageWidth = imgW;
              pageHeight = imgH;
            }

            if (isLandscape && pageSizeSetting !== 'auto') {
              const temp = pageWidth;
              pageWidth = pageHeight;
              pageHeight = temp;
            }

            const page = combinedPdf.addPage([pageWidth, pageHeight]);

            let drawW = imgW;
            let drawH = imgH;
            let x = 0;
            let y = 0;

            if (pageSizeSetting !== 'auto') {
              const maxW = pageWidth - margin * 2;
              const maxH = pageHeight - margin * 2;
              const scale = Math.min(maxW / imgW, maxH / imgH);
              drawW = imgW * scale;
              drawH = imgH * scale;
              x = (pageWidth - drawW) / 2;
              y = (pageHeight - drawH) / 2;
            }

            page.drawImage(embedImage, { x, y, width: drawW, height: drawH });
            totalPages++;
          } catch (imgErr) {
            console.warn(`Could not embed image for job ${jobId}:`, imgErr);
          }
        }
      }

      if (totalPages === 0) {
        return res.status(400).json({
          success: false,
          code: 'NO_VALID_PAGES',
          error: 'No valid pages could be processed from the selected files.',
        });
      }

      const pdfBytes = await combinedPdf.save();
      const outputFilename = sanitizeFilename(filename || 'combined_document.pdf');
      const { filePath } = generateTempFilePath('pdf');
      fs.writeFileSync(filePath, Buffer.from(pdfBytes));

      const newJob = jobStorage.createJob({
        originalName: outputFilename,
        inputFormat: 'images',
        inputPath: filePath,
        fileSize: pdfBytes.length,
        sessionId: (req.headers['x-session-id'] as string) || 'pdf_merge',
      });

      jobStorage.updateJob(newJob.id, {
        outputPath: filePath,
        outputFormat: 'pdf',
        outputSize: pdfBytes.length,
        outputMimeType: 'application/pdf',
        status: 'completed',
        progress: 100,
        progressStage: 'PDF merged successfully',
        completedAt: new Date().toISOString(),
      });

      recordSuccessfulConversion(req, newJob.id, 1);

      res.json({
        success: true,
        jobId: newJob.id,
        originalName: outputFilename,
        inputFormat: 'multiple',
        outputFormat: 'pdf',
        originalSize: 0,
        outputSize: pdfBytes.length,
        totalPages,
        status: 'completed',
        downloadUrl: `/api/download/${newJob.id}`,
      });
    } catch (err: any) {
      console.error('Combine PDF error:', err);
      res.status(500).json({
        success: false,
        code: 'COMBINE_FAILED',
        error: err.message || 'Failed to combine files into PDF.',
      });
    }
  });

  // 6. Get Conversion Status & Progress (Single Source of Truth)
  app.get('/api/status/:jobId', (req, res) => {
    const job = jobStorage.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, code: 'JOB_NOT_FOUND', error: 'Job not found or session expired.' });
    }

    res.json({
      success: true,
      jobId: job.id,
      originalName: job.originalName,
      inputFormat: job.inputFormat,
      outputFormat: job.outputFormat,
      status: job.status,
      progress: job.progress,
      progressStage: job.progressStage,
      error: job.errorMessage,
      errorCode: job.errorCode,
      fileSize: job.fileSize,
      outputSize: job.outputSize,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      retryCount: job.retryCount,
      downloadUrl: job.status === 'completed' ? `/api/download/${job.id}` : null,
    });
  });

  // 7. Download Converted File
  app.get('/api/download/:jobId', (req, res) => {
    const job = jobStorage.getJob(req.params.jobId);
    if (!job || !job.outputPath || !fs.existsSync(job.outputPath) || job.status !== 'completed') {
      return res.status(404).json({
        success: false,
        code: 'FILE_NOT_FOUND',
        error: 'Converted file not found or session expired.',
      });
    }

    const stats = fs.statSync(job.outputPath);
    if (stats.size === 0) {
      return res.status(500).json({
        success: false,
        code: 'FILE_EMPTY',
        error: 'Converted output file is empty.',
      });
    }

    metricsTracker.recordDownload();

    const baseName = path.parse(job.originalName).name;
    const downloadFilename = `${baseName}_converted.${job.outputFormat}`;

    res.setHeader('Content-Type', job.outputMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'no-cache');

    const readStream = fs.createReadStream(job.outputPath);
    readStream.pipe(res);
  });

  // 7b. Download All as ZIP Archive (Multi-File Real ZIP)
  app.post('/api/download-zip', async (req, res) => {
    try {
      const { jobIds, zipName = 'convertx_batch_export.zip' } = req.body;
      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_REQUEST',
          error: 'Please provide an array of completed job IDs to create ZIP archive.',
        });
      }

      const zip = new JSZip();
      let addedFilesCount = 0;

      for (const jobId of jobIds) {
        const job = jobStorage.getJob(jobId);
        if (!job || !job.outputPath || !fs.existsSync(job.outputPath) || job.status !== 'completed') {
          continue;
        }

        const fileData = fs.readFileSync(job.outputPath);
        const baseName = path.parse(job.originalName).name;
        const outFileName = `${baseName}_converted.${job.outputFormat}`;
        zip.file(outFileName, fileData);
        addedFilesCount++;
      }

      if (addedFilesCount === 0) {
        return res.status(404).json({
          success: false,
          code: 'NO_COMPLETED_FILES',
          error: 'No active completed files found on server to package into ZIP.',
        });
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const sanitizedZipName = sanitizeFilename(zipName.endsWith('.zip') ? zipName : `${zipName}.zip`);
      metricsTracker.recordDownload();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedZipName}"`);
      res.setHeader('Content-Length', zipBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');
      res.send(zipBuffer);
    } catch (err: any) {
      console.error('ZIP generation error:', err);
      res.status(500).json({
        success: false,
        code: 'ZIP_GENERATION_FAILED',
        error: err.message || 'Failed to generate ZIP archive.',
      });
    }
  });

  // 8. File Preview
  app.get('/api/preview/:jobId', (req, res) => {
    const job = jobStorage.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        code: 'FILE_NOT_FOUND',
        error: 'File not found or session expired.',
      });
    }

    const targetPath = job.outputPath && fs.existsSync(job.outputPath) ? job.outputPath : job.inputPath;
    if (!targetPath || !fs.existsSync(targetPath)) {
      return res.status(404).json({
        success: false,
        code: 'PREVIEW_UNAVAILABLE',
        error: 'Preview file is unavailable or missing on server.',
      });
    }

    const ext = path.extname(targetPath).toLowerCase().replace('.', '');
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    const readStream = fs.createReadStream(targetPath);
    readStream.pipe(res);
  });

  // 9. Strict API 404 Handler - guarantees NO /api/* request falls through to SPA HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      code: 'API_ENDPOINT_NOT_FOUND',
      error: `API route ${req.method} ${req.path} not found.`,
    });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static assets without intercepting root index.html
    app.use(express.static(distPath, { index: false }));

    app.get('*', (req, res) => {
      try {
        const rawHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
        const reqPath = req.path.replace(/^\/+|\/+$/g, '');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.get('host') || 'convert-x.com';
        const origin = `${protocol}://${host}`;

        let title = 'Convert-X - Free Online File Converter';
        let description =
          'Convert images, PDFs and supported design files online for free with Convert-X. Fast, simple and easy file conversion.';
        let canonicalUrl = `${origin}/${reqPath}`;

        if (SEO_ROUTES[reqPath]) {
          const cfg = SEO_ROUTES[reqPath];
          title = cfg.title;
          description = cfg.metaDescription;
          canonicalUrl = `${origin}/${cfg.slug}`;
        } else if (reqPath === 'tools') {
          title = 'All Free Online Conversion Tools | Convert-X Directory';
          description =
            'Browse the complete catalog of free online file conversion tools. Fast, private, and zero-retention image, PDF, and vector converters.';
        } else if (reqPath === 'referral') {
          title = 'Invite Friends & Earn Free Conversions | Convert-X Referrals';
          description =
            'Share Convert-X with friends and teammates. Earn +1 bonus conversion for every friend who converts their first file.';
        } else if (reqPath === 'about') {
          title = 'About Convert-X - Fast, Ephemeral & Private File Conversion';
          description =
            'Learn about Convert-X: our high-speed C++ conversion pipeline, zero-retention privacy architecture, 256-bit encryption, and technical mission.';
        } else if (reqPath === 'formats') {
          title = 'Supported File Formats Matrix | Convert-X';
          description =
            'Explore supported input and output formats in Convert-X, including PNG, JPG, WEBP, PDF, SVG, and DXF.';
        } else if (reqPath === 'how-it-works') {
          title = 'How It Works - Fast & Secure File Conversion | Convert-X';
          description =
            'Learn how Convert-X converts images, PDFs, and design files with server-side rendering and automatic zero-retention file deletion.';
        } else if (reqPath === 'faq') {
          title = 'Frequently Asked Questions (FAQ) | Convert-X';
          description =
            'Find answers to common questions about file formats, conversion quality, privacy security, and batch file processing in Convert-X.';
        } else if (reqPath === 'pricing') {
          title = 'Pricing Plans & Pro Limits | Convert-X';
          description =
            'Explore Convert-X plans. Convert files for free with standard limits, or upgrade to Pro for higher file sizes, priority queues, and ad-free conversions.';
        } else if (reqPath === 'privacy') {
          title = 'Privacy Policy & Zero-Retention Security | Convert-X';
          description =
            'Convert-X privacy policy: 256-bit TLS encryption, strict zero-retention memory processing, and instant automated file purging.';
        } else if (reqPath === 'terms') {
          title = 'Terms of Service | Convert-X';
          description = 'Convert-X terms of service, acceptable use policies, and conversion service terms.';
        } else if (reqPath === 'contact') {
          title = 'Contact Support & Engine Inquiries | Convert-X';
          description =
            'Get in touch with the Convert-X technical team for format support, engine issues, or enterprise file processing questions.';
        } else if (!reqPath) {
          canonicalUrl = `${origin}/`;
        }

        let injectedHtml = rawHtml
          .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
          .replace(
            /<meta name="description" content=".*?" \/>/,
            `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`
          )
          .replace(
            /<meta property="og:title" content=".*?" \/>/,
            `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`
          )
          .replace(
            /<meta property="og:description" content=".*?" \/>/,
            `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`
          )
          .replace(
            /<meta property="og:url" content=".*?" \/>/,
            `<meta property="og:url" content="${canonicalUrl}" />`
          )
          .replace(
            /<meta name="twitter:title" content=".*?" \/>/,
            `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`
          )
          .replace(
            /<meta name="twitter:description" content=".*?" \/>/,
            `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />`
          );

        if (!injectedHtml.includes('<link rel="canonical"')) {
          injectedHtml = injectedHtml.replace(
            '</head>',
            `  <link rel="canonical" href="${canonicalUrl}" />\n  </head>`
          );
        } else {
          injectedHtml = injectedHtml.replace(
            /<link rel="canonical" href=".*?" \/>/,
            `<link rel="canonical" href="${canonicalUrl}" />`
          );
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(injectedHtml);
      } catch (e) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error caught by middleware:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ConvertX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
