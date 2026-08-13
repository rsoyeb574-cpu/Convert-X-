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
  sanitizeFilename,
} from './server/utils/fileSecurity.js';
import { SAMPLE_FILES } from './server/utils/samples.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Multer memory storage configuration for secure magic-byte inspection
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
  });

  // --- API ROUTES ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ConvertX Engine Core', timestamp: new Date().toISOString() });
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

  // 3. Upload file or load sample file
  app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
      let fileBuffer: Buffer;
      let originalName: string;

      const sampleKey = req.body.sampleKey;
      if (sampleKey && SAMPLE_FILES[sampleKey]) {
        const sample = SAMPLE_FILES[sampleKey];
        fileBuffer = sample.getContent();
        originalName = sample.filename;
      } else if (req.file) {
        fileBuffer = req.file.buffer;
        originalName = req.file.originalname;
      } else {
        return res.status(400).json({ error: 'No file uploaded or sample selected.' });
      }

      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({ error: 'The file is too large. Maximum size is 50MB.' });
      }

      const cleanName = sanitizeFilename(originalName);
      const detection = detectFileFormat(fileBuffer, cleanName);

      if (!detection.valid) {
        return res.status(400).json({
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
      res.status(500).json({ error: 'Failed to process uploaded file. Please try again.' });
    }
  });

  // 4. Trigger Conversion
  app.post('/api/convert', async (req, res) => {
    try {
      const { jobId, outputFormat, options } = req.body;

      if (!jobId || !outputFormat) {
        return res.status(400).json({ error: 'Missing jobId or target outputFormat.' });
      }

      const job = registry.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Conversion session expired or not found.' });
      }

      // Process conversion asynchronously or await result
      const updatedJob = await registry.processConversion(jobId, outputFormat, options || {});

      res.json({
        jobId: updatedJob.id,
        status: updatedJob.status,
        progress: updatedJob.progress,
        outputFormat: updatedJob.outputFormat,
        outputSize: updatedJob.outputSize,
        completedAt: updatedJob.completedAt,
      });
    } catch (err: any) {
      console.error('Convert handler error:', err);
      res.status(400).json({ error: err.message || 'Conversion failed. Please try again.' });
    }
  });

  // 5. Get Conversion Status
  app.get('/api/status/:jobId', (req, res) => {
    const job = registry.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    res.json({
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

  // 6. Download Converted File
  app.get('/api/download/:jobId', (req, res) => {
    const job = registry.getJob(req.params.jobId);
    if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
      return res.status(404).send('Converted file not found or session expired.');
    }

    const baseName = path.parse(job.originalName).name;
    const downloadFilename = `${baseName}_converted.${job.outputFormat}`;

    res.setHeader('Content-Type', job.outputMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    const readStream = fs.createReadStream(job.outputPath);
    readStream.pipe(res);
  });

  // 7. File Preview
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ConvertX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
