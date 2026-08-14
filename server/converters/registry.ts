import {
  ConverterEngine,
  FormatCapability,
  ConversionJob,
  ConvertParams,
  ConvertResult,
  ValidationResult,
} from './types.js';
import { SharpImageConverter } from './sharpConverter.js';
import { PdfConverter } from './pdfConverter.js';
import { DxfConverter } from './dxfConverter.js';
import { SvgConverter } from './svgConverter.js';
import { generateTempFilePath, sanitizeFilename } from '../utils/fileSecurity.js';
import fs from 'fs';
import crypto from 'crypto';

export class ConverterRegistry {
  private engines: Map<string, ConverterEngine> = new Map();
  private jobs: Map<string, ConversionJob> = new Map();

  constructor() {
    this.registerEngine(new SharpImageConverter());
    this.registerEngine(new PdfConverter());
    this.registerEngine(new DxfConverter());
    this.registerEngine(new SvgConverter());
  }

  registerEngine(engine: ConverterEngine): void {
    this.engines.set(engine.id, engine);
  }

  getCapabilities(): FormatCapability[] {
    return [
      // IMAGES (Supported)
      {
        id: 'png',
        name: 'Portable Network Graphics',
        extension: 'png',
        mimeType: 'image/png',
        category: 'images',
        status: 'supported',
        supportedOutputs: ['jpg', 'webp', 'pdf'],
        description: 'Lossless raster image format supporting transparency and crisp graphics.',
      },
      {
        id: 'jpg',
        name: 'JPEG Image',
        extension: 'jpg',
        mimeType: 'image/jpeg',
        category: 'images',
        status: 'supported',
        supportedOutputs: ['png', 'webp', 'pdf'],
        description: 'Standard compressed digital photo format ideal for web and printing.',
      },
      {
        id: 'webp',
        name: 'WebP Image',
        extension: 'webp',
        mimeType: 'image/webp',
        category: 'images',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Modern high-efficiency image format for web performance.',
      },

      // PDF (Supported)
      {
        id: 'pdf',
        name: 'Portable Document Format',
        extension: 'pdf',
        mimeType: 'application/pdf',
        category: 'pdf',
        status: 'supported',
        supportedOutputs: ['png', 'jpg'],
        description: 'Universal vector document format for documents, blueprints, and artwork.',
      },

      // VECTOR (Supported)
      {
        id: 'svg',
        name: 'Scalable Vector Graphics',
        extension: 'svg',
        mimeType: 'image/svg+xml',
        category: 'vector',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'webp', 'pdf'],
        description: 'XML-based resolution-independent vector graphics standard.',
      },

      // CAD / ARCHITECTURE (Supported DXF, Coming Soon DWG/DWF)
      {
        id: 'dxf',
        name: 'Drawing Exchange Format',
        extension: 'dxf',
        mimeType: 'image/vnd.dxf',
        category: 'cad',
        status: 'supported',
        supportedOutputs: ['svg', 'png', 'jpg', 'pdf'],
        description: 'Autodesk CAD interchange format for architectural blueprints & engineering schematics.',
      },
      {
        id: 'dwg',
        name: 'AutoCAD Drawing File',
        extension: 'dwg',
        mimeType: 'image/vnd.dwg',
        category: 'cad',
        status: 'coming_soon',
        requiresEngine: 'Autodesk RealDWG Engine Extension',
        supportedOutputs: [],
        description: 'Native AutoCAD binary drawing file format.',
      },
      {
        id: 'dwf',
        name: 'Design Web Format',
        extension: 'dwf',
        mimeType: 'model/vnd.dwf',
        category: 'cad',
        status: 'coming_soon',
        requiresEngine: 'Autodesk DWF Engine Extension',
        supportedOutputs: [],
        description: 'Autodesk lightweight CAD review and print file format.',
      },

      // ADOBE (Coming Soon)
      {
        id: 'psd',
        name: 'Adobe Photoshop Document',
        extension: 'psd',
        mimeType: 'image/vnd.adobe.photoshop',
        category: 'adobe',
        status: 'coming_soon',
        requiresEngine: 'Adobe Creative Cloud Engine Extension',
        supportedOutputs: [],
        description: 'Layered raster artwork document from Photoshop.',
      },
      {
        id: 'ai',
        name: 'Adobe Illustrator Artwork',
        extension: 'ai',
        mimeType: 'application/postscript',
        category: 'adobe',
        status: 'coming_soon',
        requiresEngine: 'Adobe Creative Cloud Engine Extension',
        supportedOutputs: [],
        description: 'Vector graphics file created by Adobe Illustrator.',
      },
      {
        id: 'eps',
        name: 'Encapsulated PostScript',
        extension: 'eps',
        mimeType: 'application/postscript',
        category: 'adobe',
        status: 'coming_soon',
        requiresEngine: 'Ghostscript / Adobe Engine Extension',
        supportedOutputs: [],
        description: 'Standard vector graphic format for print publishing.',
      },
      {
        id: 'aep',
        name: 'After Effects Project',
        extension: 'aep',
        mimeType: 'application/vnd.adobe.aftereffects.project',
        category: 'adobe',
        status: 'coming_soon',
        requiresEngine: 'Adobe Aerender Engine Extension',
        supportedOutputs: [],
        description: 'Motion graphics & visual effects project file.',
      },
      {
        id: 'prproj',
        name: 'Premiere Pro Project',
        extension: 'prproj',
        mimeType: 'application/x-premiere',
        category: 'adobe',
        status: 'coming_soon',
        requiresEngine: 'Adobe Media Encoder Extension',
        supportedOutputs: [],
        description: 'Non-linear video editing project document.',
      },
      {
        id: 'fla',
        name: 'Animate / Flash Project',
        extension: 'fla',
        mimeType: 'application/x-authorware-bin',
        category: 'adobe',
        status: 'coming_soon',
        requiresEngine: 'Adobe Animate Engine Extension',
        supportedOutputs: [],
        description: 'Interactive 2D animation project source.',
      },

      // COREL (Coming Soon)
      {
        id: 'cdr',
        name: 'CorelDRAW Image File',
        extension: 'cdr',
        mimeType: 'application/cdr',
        category: 'corel',
        status: 'coming_soon',
        requiresEngine: 'CorelDRAW Graphics Engine Extension',
        supportedOutputs: [],
        description: 'Vector illustration format created by CorelDRAW.',
      },

      // 3D FORMATS (Coming Soon)
      {
        id: 'max',
        name: '3ds Max Scene File',
        extension: 'max',
        mimeType: 'application/x-3dsmax',
        category: '3d',
        status: 'coming_soon',
        requiresEngine: 'Autodesk 3ds Max Engine Extension',
        supportedOutputs: [],
        description: '3D scene and modeling project file.',
      },
      {
        id: '3ds',
        name: '3D Studio Mesh File',
        extension: '3ds',
        mimeType: 'image/x-3ds',
        category: '3d',
        status: 'coming_soon',
        requiresEngine: 'Open Asset Import Engine Extension',
        supportedOutputs: [],
        description: 'Legacy 3D model mesh interchange format.',
      },
      {
        id: 'obj',
        name: 'Wavefront 3D Object',
        extension: 'obj',
        mimeType: 'model/obj',
        category: '3d',
        status: 'coming_soon',
        requiresEngine: 'ThreeJS / Assimp 3D Engine Extension',
        supportedOutputs: [],
        description: '3D geometry definition format containing 3D vertices, texture maps, and faces.',
      },
      {
        id: 'fbx',
        name: 'Filmbox 3D Asset',
        extension: 'fbx',
        mimeType: 'application/octet-stream',
        category: '3d',
        status: 'coming_soon',
        requiresEngine: 'Autodesk FBX SDK Extension',
        supportedOutputs: [],
        description: '3D asset exchange format for motion capture, animation, and meshes.',
      },
      {
        id: 'stl',
        name: 'Stereolithography 3D Mesh',
        extension: 'stl',
        mimeType: 'model/stl',
        category: '3d',
        status: 'coming_soon',
        requiresEngine: 'OpenCASCADE 3D Mesh Engine Extension',
        supportedOutputs: [],
        description: 'Standard 3D geometry format used in 3D printing and CAD manufacturing.',
      },
    ];
  }

  findEngineFor(inputFormat: string, outputFormat: string): ConverterEngine | null {
    const inFmt = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    for (const engine of this.engines.values()) {
      if (engine.supports) {
        if (engine.supports(inFmt, outFmt)) return engine;
      } else if (
        engine.supportedInputFormats.includes(inFmt) &&
        engine.supportedOutputFormats.includes(outFmt)
      ) {
        return engine;
      }
    }
    return null;
  }

  createJob(originalName: string, inputFormat: string, options: any): ConversionJob {
    const jobId = crypto.randomUUID();
    const job: ConversionJob = {
      id: jobId,
      originalName: sanitizeFilename(originalName),
      inputFormat: inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase(),
      outputFormat: '',
      fileSize: 0,
      status: 'uploading',
      progress: 10,
      createdAt: new Date().toISOString(),
      options: options || {},
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getJob(jobId: string): ConversionJob | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<ConversionJob>): ConversionJob | undefined {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(jobId, job);
    }
    return job;
  }

  async processConversion(jobId: string, outputFormat: string, options: any): Promise<ConversionJob> {
    const job = this.jobs.get(jobId);
    if (!job || !job.inputPath) {
      throw new Error('Job or uploaded file not found');
    }

    const inFmt = job.inputFormat;
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    const capabilities = this.getCapabilities();
    const cap = capabilities.find((c) => c.extension === inFmt);

    if (cap && cap.status !== 'supported') {
      const err = `Format .${inFmt.toUpperCase()} requires the ${cap.requiresEngine || 'Dedicated Commercial Engine'}. This engine is currently disconnected.`;
      this.updateJob(jobId, { status: 'failed', error: err, progress: 0 });
      throw new Error(err);
    }

    const engine = this.findEngineFor(inFmt, outFmt);
    if (!engine) {
      const err = `No active conversion engine available for .${inFmt} → .${outFmt}`;
      this.updateJob(jobId, { status: 'failed', error: err, progress: 0 });
      throw new Error(err);
    }

    this.updateJob(jobId, {
      status: 'processing',
      progress: 30,
      outputFormat: outFmt,
      options: { ...job.options, ...options },
    });

    try {
      const inputBuffer = fs.readFileSync(job.inputPath);

      // Validate
      this.updateJob(jobId, { status: 'converting', progress: 50 });
      const validation = await engine.validate(inputBuffer, inFmt);
      if (!validation.valid) {
        throw new Error(validation.reason || 'File validation failed');
      }

      // Convert
      this.updateJob(jobId, { progress: 75 });
      const convertResult = await engine.convert({
        inputBuffer,
        inputFormat: inFmt,
        outputFormat: outFmt,
        fileName: job.originalName,
        options: { ...job.options, ...options },
      });

      // 1. Check in-memory result buffer
      if (!convertResult.buffer || convertResult.buffer.length === 0) {
        throw new Error('Conversion failed: generated output buffer is empty.');
      }

      // 2. Determine file extension and MIME type
      const finalExt = (convertResult.outputExtension || outFmt).toLowerCase();
      const mimeType = convertResult.mimeType || this.getMimeTypeForExtension(finalExt);

      // 3. Save output to disk
      const { filePath: outputPath } = generateTempFilePath(finalExt);
      fs.writeFileSync(outputPath, convertResult.buffer);

      // 4. Verify output file exists on disk and is non-empty
      if (!fs.existsSync(outputPath)) {
        throw new Error('Conversion failed: output file was not saved to disk.');
      }

      const fileStats = fs.statSync(outputPath);
      if (fileStats.size === 0) {
        try { fs.unlinkSync(outputPath); } catch {}
        throw new Error('Conversion failed: generated output file is 0 bytes.');
      }

      // 5. Verify format magic bytes and header integrity
      const headerValid = this.validateOutputIntegrity(convertResult.buffer, finalExt);
      if (!headerValid.valid) {
        try { fs.unlinkSync(outputPath); } catch {}
        throw new Error(`Conversion failed: generated output is corrupt (${headerValid.reason}).`);
      }

      this.updateJob(jobId, {
        status: 'finalizing',
        progress: 90,
      });

      const updated = this.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
        outputPath,
        outputFormat: finalExt,
        outputMimeType: mimeType,
        outputSize: fileStats.size,
      });

      return updated!;
    } catch (err: any) {
      const errMsg = err.message || 'Conversion failed. Please try again.';
      this.updateJob(jobId, {
        status: 'failed',
        error: errMsg,
        progress: 0,
      });
      throw err;
    }
  }

  private getMimeTypeForExtension(ext: string): string {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      pdf: 'application/pdf',
      svg: 'image/svg+xml',
      zip: 'application/zip',
      dxf: 'image/vnd.dxf',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  private validateOutputIntegrity(buffer: Buffer, format: string): { valid: boolean; reason?: string } {
    if (!buffer || buffer.length === 0) {
      return { valid: false, reason: 'Empty buffer' };
    }

    const fmt = format.toLowerCase();

    if (fmt === 'png') {
      if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
        return { valid: false, reason: 'Invalid PNG header signature' };
      }
    } else if (fmt === 'jpg' || fmt === 'jpeg') {
      if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        return { valid: false, reason: 'Invalid JPEG header signature' };
      }
    } else if (fmt === 'webp') {
      if (
        buffer.length < 12 ||
        buffer[0] !== 0x52 ||
        buffer[1] !== 0x49 ||
        buffer[2] !== 0x46 ||
        buffer[3] !== 0x46 ||
        buffer[8] !== 0x57 ||
        buffer[9] !== 0x45 ||
        buffer[10] !== 0x42 ||
        buffer[11] !== 0x50
      ) {
        return { valid: false, reason: 'Invalid WebP header signature' };
      }
    } else if (fmt === 'pdf') {
      const head = buffer.subarray(0, 1024).toString('binary');
      if (!head.includes('%PDF-')) {
        return { valid: false, reason: 'Invalid PDF magic bytes (%PDF- not found)' };
      }
    } else if (fmt === 'zip') {
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        return { valid: false, reason: 'Invalid ZIP archive header (PK not found)' };
      }
    } else if (fmt === 'svg') {
      const head = buffer.subarray(0, 1024).toString('utf-8').toLowerCase();
      if (!head.includes('<svg')) {
        return { valid: false, reason: 'Invalid SVG vector header' };
      }
    }

    return { valid: true };
  }
}

export const registry = new ConverterRegistry();
