import DOMMatrix from 'dommatrix';
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = DOMMatrix;
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { registry } from './server/converters/registry.js';
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Global CORS & preflight middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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

    const routes = [
      { loc: '', changefreq: 'daily', priority: '1.0' },
      { loc: 'converter', changefreq: 'weekly', priority: '0.9' },
      { loc: 'formats', changefreq: 'weekly', priority: '0.8' },
      { loc: 'how-it-works', changefreq: 'monthly', priority: '0.7' },
      { loc: 'faq', changefreq: 'monthly', priority: '0.7' },
      { loc: 'pricing', changefreq: 'weekly', priority: '0.8' },
      { loc: 'privacy', changefreq: 'yearly', priority: '0.4' },
      { loc: 'terms', changefreq: 'yearly', priority: '0.4' },
      { loc: 'contact', changefreq: 'monthly', priority: '0.5' },
      // Confirmed supported converters
      { loc: 'png-to-jpg', changefreq: 'weekly', priority: '0.9' },
      { loc: 'jpg-to-png', changefreq: 'weekly', priority: '0.9' },
      { loc: 'png-to-webp', changefreq: 'weekly', priority: '0.9' },
      { loc: 'jpg-to-webp', changefreq: 'weekly', priority: '0.9' },
      { loc: 'webp-to-png', changefreq: 'weekly', priority: '0.9' },
      { loc: 'webp-to-jpg', changefreq: 'weekly', priority: '0.9' },
      { loc: 'png-to-pdf', changefreq: 'weekly', priority: '0.9' },
      { loc: 'jpg-to-pdf', changefreq: 'weekly', priority: '0.9' },
      { loc: 'pdf-to-png', changefreq: 'weekly', priority: '0.9' },
      { loc: 'pdf-to-jpg', changefreq: 'weekly', priority: '0.9' },
      { loc: 'svg-to-png', changefreq: 'weekly', priority: '0.9' },
      { loc: 'svg-to-jpg', changefreq: 'weekly', priority: '0.9' },
      { loc: 'svg-to-pdf', changefreq: 'weekly', priority: '0.9' },
      { loc: 'dxf-to-pdf', changefreq: 'weekly', priority: '0.8' },
    ];

    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}/${r.loc}</loc>
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
    const paymentSecret = process.env.PAYMENT_SECRET_KEY;
    const isPaymentConfigured = Boolean(paymentSecret && paymentSecret.trim() !== '');
    const adsenseId = process.env.ADSENSE_CLIENT_ID || '';

    res.json({
      success: true,
      limits: {
        maxFileSizeMB: FREE_MAX_FILE_SIZE_MB,
        maxFileSizeBytes: FREE_MAX_FILE_SIZE_BYTES,
        dailyConversions: FREE_DAILY_CONVERSIONS,
        maxPdfPages: FREE_MAX_PDF_PAGES,
      },
      monetization: {
        paymentConfigured: isPaymentConfigured,
        paymentMessage: isPaymentConfigured
          ? 'Pro checkout is active.'
          : 'Pro payments are coming soon.',
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
            maxFileSizeMB: FREE_MAX_FILE_SIZE_MB,
            dailyConversions: FREE_DAILY_CONVERSIONS,
            maxPdfPages: FREE_MAX_PDF_PAGES,
          },
          pro: {
            id: 'pro',
            name: 'Pro Plan',
            amount: 199,
            currency: 'INR',
            formattedPrice: '₹199',
            period: 'per month',
            maxFileSizeMB: 100,
            dailyConversions: 'Unlimited',
            maxPdfPages: 'Unlimited',
          },
        },
      },
    });
  });

  // User Usage & Free Plan status endpoint
  app.get('/api/usage', (req, res) => {
    res.json({
      success: true,
      usage: {
        dailyConversions: 0,
        dailyLimit: FREE_DAILY_CONVERSIONS,
        maxFileSizeMB: FREE_MAX_FILE_SIZE_MB,
        plan: 'free',
      },
    });
  });

  // Payment status endpoint (Strictly server-side verification, no private credentials exposed)
  app.get('/api/payment/status', (req, res) => {
    const paymentSecret = process.env.PAYMENT_SECRET_KEY;
    const isPaymentConfigured = Boolean(paymentSecret && paymentSecret.trim() !== '');

    res.json({
      configured: isPaymentConfigured,
      provider: process.env.PAYMENT_PROVIDER || 'stripe',
      message: isPaymentConfigured
        ? 'Payment provider is active and ready.'
        : 'Pro payments are coming soon.',
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

      const job = registry.createJob(cleanName, detection.format, {});
      const { filePath } = generateTempFilePath(detection.format);
      fs.writeFileSync(filePath, fileBuffer);

      registry.updateJob(job.id, {
        inputPath: filePath,
        fileSize: fileBuffer.length,
        status: 'uploading',
        progress: 100,
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

  // 4. Upload file or load sample file
  app.post(
    '/api/upload',
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

        if (fileBuffer.length > FREE_MAX_FILE_SIZE_BYTES) {
          return res.status(400).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            error: `The uploaded file (${(fileBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the Free plan limit of ${FREE_MAX_FILE_SIZE_MB}MB. Please compress your file or upgrade to Pro.`,
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

        const job = registry.createJob(cleanName, detection.format, {});

        // Save input file to temp path
        const { filePath } = generateTempFilePath(detection.format);
        fs.writeFileSync(filePath, fileBuffer);

        registry.updateJob(job.id, {
          inputPath: filePath,
          fileSize: fileBuffer.length,
          status: 'uploading',
          progress: 100,
        });

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

  // 5. Trigger Conversion
  app.post('/api/convert', async (req, res) => {
    try {
      const { jobId, outputFormat, options } = req.body;

      if (!jobId || !outputFormat) {
        return res.status(400).json({ success: false, code: 'INVALID_REQUEST', error: 'Missing jobId or target outputFormat.' });
      }

      const job = registry.getJob(jobId);
      if (!job) {
        return res.status(404).json({ success: false, code: 'JOB_NOT_FOUND', error: 'Conversion session expired or not found. Please re-upload your file.' });
      }

      const updatedJob = await registry.processConversion(jobId, outputFormat, options || {});

      res.json({
        success: true,
        jobId: updatedJob.id,
        originalName: updatedJob.originalName,
        inputFormat: updatedJob.inputFormat,
        outputFormat: updatedJob.outputFormat,
        originalSize: updatedJob.fileSize,
        outputSize: updatedJob.outputSize || 0,
        status: updatedJob.status,
        completedAt: updatedJob.completedAt,
        downloadUrl: `/api/download/${updatedJob.id}`,
      });
    } catch (err: any) {
      console.error('Convert handler error:', err);
      res.status(400).json({ success: false, code: 'CONVERSION_FAILED', error: err.message || 'Conversion failed. Please try again.' });
    }
  });

  // 6. Get Conversion Status
  app.get('/api/status/:jobId', (req, res) => {
    const job = registry.getJob(req.params.jobId);
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
      error: job.error,
      fileSize: job.fileSize,
      outputSize: job.outputSize,
    });
  });

  // 7. Download Converted File
  app.get('/api/download/:jobId', (req, res) => {
    const job = registry.getJob(req.params.jobId);
    if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
      return res.status(404).send('Converted file not found or session expired.');
    }

    const stats = fs.statSync(job.outputPath);
    if (stats.size === 0) {
      return res.status(500).send('Converted output file is empty.');
    }

    const baseName = path.parse(job.originalName).name;
    const downloadFilename = `${baseName}_converted.${job.outputFormat}`;

    res.setHeader('Content-Type', job.outputMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'no-cache');

    const readStream = fs.createReadStream(job.outputPath);
    readStream.pipe(res);
  });

  // 8. File Preview
  app.get('/api/preview/:jobId', (req, res) => {
    const job = registry.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).send('File not found.');
    }

    const targetPath = job.outputPath && fs.existsSync(job.outputPath) ? job.outputPath : job.inputPath;
    if (!targetPath || !fs.existsSync(targetPath)) {
      return res.status(404).send('Preview unavailable.');
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
