import {
  ConverterEngine,
  FormatCapability,
  UniversalExportCapability,
  ConversionJob,
  ConvertParams,
  ConvertResult,
  ValidationResult,
} from './types.js';
import { SharpImageConverter } from './sharpConverter.js';
import { PdfConverter } from './pdfConverter.js';
import { DxfConverter } from './dxfConverter.js';
import { SvgConverter } from './svgConverter.js';
import { PsdConverter } from './psdConverter.js';
import { AiConverter } from './aiConverter.js';
import { EpsConverter } from './epsConverter.js';
import { DocumentConverter } from './documentConverter.js';
import { generateTempFilePath, sanitizeFilename } from '../utils/fileSecurity.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const JOBS_STORAGE_PATH = path.join(process.cwd(), 'tmp_uploads', 'jobs_metadata.json');

export class ConverterRegistry {
  private engines: Map<string, ConverterEngine> = new Map();
  private jobs: Map<string, ConversionJob> = new Map();

  constructor() {
    this.registerEngine(new SharpImageConverter());
    this.registerEngine(new PdfConverter());
    this.registerEngine(new DxfConverter());
    this.registerEngine(new SvgConverter());
    this.registerEngine(new PsdConverter());
    this.registerEngine(new AiConverter());
    this.registerEngine(new EpsConverter());
    this.registerEngine(new DocumentConverter());
    this.loadPersistedJobs();
  }

  private loadPersistedJobs(): void {
    try {
      if (fs.existsSync(JOBS_STORAGE_PATH)) {
        const raw = fs.readFileSync(JOBS_STORAGE_PATH, 'utf-8');
        const list: ConversionJob[] = JSON.parse(raw);
        for (const job of list) {
          // If input file is lost after restart, mark as failed rather than stuck pending
          if (job.status !== 'completed' && job.inputPath && !fs.existsSync(job.inputPath)) {
            job.status = 'failed';
            job.error = 'Temporary session expired. Please re-upload your file.';
          } else if (job.status === 'completed' && job.outputPath && !fs.existsSync(job.outputPath)) {
            job.status = 'failed';
            job.error = 'Converted file expired on server. Please convert again.';
          }
          this.jobs.set(job.id, job);
        }
      }
    } catch (err) {
      console.warn('Could not load persisted conversion jobs:', err);
    }
  }

  private savePersistedJobs(): void {
    try {
      const dir = path.dirname(JOBS_STORAGE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Save last 200 jobs
      const allJobs = Array.from(this.jobs.values()).slice(-200);
      fs.writeFileSync(JOBS_STORAGE_PATH, JSON.stringify(allJobs, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist conversion jobs:', err);
    }
  }

  registerEngine(engine: ConverterEngine): void {
    this.engines.set(engine.id, engine);
  }

  getCapabilities(): FormatCapability[] {
    return [
      // DOCUMENTS (Supported DOCX, XLSX, TXT, HTML, PDF; Coming Soon PPTX, ODT, RTF)
      {
        id: 'docx',
        name: 'Microsoft Word Document',
        extension: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        category: 'documents',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Render DOCX document layout and structured pages to PNG, JPG, or PDF.',
      },
      {
        id: 'xlsx',
        name: 'Microsoft Excel Spreadsheet',
        extension: 'xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        category: 'documents',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Render Excel spreadsheet data tables, sheets, and grid formatting to PNG, JPG, or PDF.',
      },
      {
        id: 'txt',
        name: 'Plain Text Document',
        extension: 'txt',
        mimeType: 'text/plain',
        category: 'documents',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Formatted multi-page text renderer with custom margins, typography, and page numbers.',
      },
      {
        id: 'html',
        name: 'HTML Document',
        extension: 'html',
        mimeType: 'text/html',
        category: 'documents',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Structured HTML document layout renderer for web page documents.',
      },
      {
        id: 'pptx',
        name: 'PowerPoint Presentation',
        extension: 'pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        category: 'documents',
        status: 'coming_soon',
        requiresEngine: 'Office Presentation Slide Engine Extension',
        supportedOutputs: [],
        description: 'Presentation slide deck format.',
      },
      {
        id: 'odt',
        name: 'OpenDocument Text',
        extension: 'odt',
        mimeType: 'application/vnd.oasis.opendocument.text',
        category: 'documents',
        status: 'coming_soon',
        requiresEngine: 'LibreOffice OpenDocument Engine Extension',
        supportedOutputs: [],
        description: 'Open-source office word processing document format.',
      },
      {
        id: 'rtf',
        name: 'Rich Text Format',
        extension: 'rtf',
        mimeType: 'application/rtf',
        category: 'documents',
        status: 'coming_soon',
        requiresEngine: 'Rich Text Rendering Engine Extension',
        supportedOutputs: [],
        description: 'Standard cross-platform rich text document format.',
      },

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
      {
        id: 'gif',
        name: 'Graphics Interchange Format',
        extension: 'gif',
        mimeType: 'image/gif',
        category: 'images',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Standard raster image format rendered into high-resolution PNG, JPG, or PDF.',
      },
      {
        id: 'bmp',
        name: 'Windows Bitmap Image',
        extension: 'bmp',
        mimeType: 'image/bmp',
        category: 'images',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Uncompressed raw raster bitmap format rendered to modern image and PDF targets.',
      },
      {
        id: 'tiff',
        name: 'Tagged Image File Format',
        extension: 'tiff',
        mimeType: 'image/tiff',
        category: 'images',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'High-depth photographic and scanning image format rendered to PNG, JPG, or PDF.',
      },
      {
        id: 'avif',
        name: 'AV1 Image File Format',
        extension: 'avif',
        mimeType: 'image/avif',
        category: 'images',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Next-generation AV1-compressed image format rendered to PNG, JPG, or PDF.',
      },

      // PDF (Supported)
      {
        id: 'pdf',
        name: 'Portable Document Format',
        extension: 'pdf',
        mimeType: 'application/pdf',
        category: 'pdf',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'webp', 'pdf'],
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

      // ADOBE (Supported PSD and PDF-compatible AI, Coming Soon Legacy EPS/AEP/PRPROJ/FLA)
      {
        id: 'psd',
        name: 'Adobe Photoshop Document',
        extension: 'psd',
        mimeType: 'image/vnd.adobe.photoshop',
        category: 'adobe',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Layered raster artwork document from Adobe Photoshop rendered to PNG, JPG, or PDF.',
      },
      {
        id: 'ai',
        name: 'Adobe Illustrator Artwork',
        extension: 'ai',
        mimeType: 'application/postscript',
        category: 'adobe',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'pdf'],
        description: 'Vector graphics artwork created by Adobe Illustrator rendered to lossless PNG, high-efficiency JPG, or PDF.',
      },
      {
        id: 'eps',
        name: 'Encapsulated PostScript',
        extension: 'eps',
        mimeType: 'application/postscript',
        category: 'adobe',
        status: 'supported',
        supportedOutputs: ['png', 'jpg', 'webp', 'pdf'],
        description: 'Encapsulated PostScript vector illustration format rendered to high-resolution PNG, JPG, WEBP, or vector PDF.',
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

  getUniversalExportCapabilities(): UniversalExportCapability[] {
    return [
      // Documents
      {
        inputFormat: 'pdf',
        name: 'Portable Document Format',
        category: 'Documents',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'PDF High-Fidelity Vector & Document Engine',
        multiPageSupport: true,
        status: 'supported',
        description: 'Direct multi-page PDF rasterization to high-DPI PNG, JPG, or re-paginated PDF.',
      },
      {
        inputFormat: 'docx',
        name: 'Microsoft Word Document',
        category: 'Documents',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Office Document Visual Export Engine',
        multiPageSupport: true,
        status: 'supported',
        description: 'Extracts and renders Word document text hierarchy, tables, and pages to PNG, JPG, or PDF.',
      },
      {
        inputFormat: 'xlsx',
        name: 'Microsoft Excel Spreadsheet',
        category: 'Documents',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Spreadsheet Grid Engine',
        multiPageSupport: true,
        status: 'supported',
        description: 'Visualizes spreadsheet workbooks, cell data, and tabular layouts into PNG, JPG, or PDF.',
      },
      {
        inputFormat: 'txt',
        name: 'Plain Text Document',
        category: 'Documents',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Typography Text Engine',
        multiPageSupport: true,
        status: 'supported',
        description: 'Formatted multi-page document pagination with custom margins and typography.',
      },
      {
        inputFormat: 'html',
        name: 'HTML Document',
        category: 'Documents',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'HTML Document Engine',
        multiPageSupport: true,
        status: 'supported',
        description: 'Visual document export for HTML markup and structured documents.',
      },
      {
        inputFormat: 'pptx',
        name: 'PowerPoint Presentation',
        category: 'Documents',
        canRender: false,
        outputFormats: [],
        renderer: 'Office Presentation Slide Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'Office Presentation Slide Engine Extension',
        description: 'PowerPoint presentation slides export (Coming Soon).',
      },
      {
        inputFormat: 'odt',
        name: 'OpenDocument Text',
        category: 'Documents',
        canRender: false,
        outputFormats: [],
        renderer: 'OpenDocument Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'LibreOffice OpenDocument Engine Extension',
        description: 'OpenDocument text visual export (Coming Soon).',
      },
      {
        inputFormat: 'rtf',
        name: 'Rich Text Format',
        category: 'Documents',
        canRender: false,
        outputFormats: [],
        renderer: 'Rich Text Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'Rich Text Rendering Engine Extension',
        description: 'Rich text document visual export (Coming Soon).',
      },

      // CAD & Architecture
      {
        inputFormat: 'dxf',
        name: 'Drawing Exchange Format',
        category: 'CAD & 3D',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'DXF Vector CAD Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Direct CAD vector parser converting architectural blueprints to PNG, JPG, and PDF.',
      },
      {
        inputFormat: 'dwg',
        name: 'AutoCAD Drawing',
        category: 'CAD & 3D',
        canRender: false,
        outputFormats: [],
        renderer: 'Autodesk RealDWG Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'Autodesk RealDWG Engine Extension',
        description: 'Native AutoCAD binary drawing export (Coming Soon).',
      },
      {
        inputFormat: 'dwf',
        name: 'Design Web Format',
        category: 'CAD & 3D',
        canRender: false,
        outputFormats: [],
        renderer: 'Autodesk DWF Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'Autodesk DWF Engine Extension',
        description: 'Lightweight CAD review drawing export (Coming Soon).',
      },
      {
        inputFormat: '3ds',
        name: '3D Studio Mesh',
        category: 'CAD & 3D',
        canRender: false,
        outputFormats: [],
        renderer: '3D Studio Mesh Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'Open Asset Import Engine Extension',
        description: '3D mesh model rendering (Coming Soon).',
      },
      {
        inputFormat: 'obj',
        name: 'Wavefront 3D Object',
        category: 'CAD & 3D',
        canRender: false,
        outputFormats: [],
        renderer: 'ThreeJS / Assimp 3D Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'ThreeJS / Assimp 3D Engine Extension',
        description: '3D geometry and texture rendering (Coming Soon).',
      },
      {
        inputFormat: 'fbx',
        name: 'Filmbox 3D Asset',
        category: 'CAD & 3D',
        canRender: false,
        outputFormats: [],
        renderer: 'Autodesk FBX SDK',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'Autodesk FBX SDK Extension',
        description: '3D asset exchange format (Coming Soon).',
      },
      {
        inputFormat: 'stl',
        name: 'Stereolithography 3D Mesh',
        category: 'CAD & 3D',
        canRender: false,
        outputFormats: [],
        renderer: 'OpenCASCADE 3D Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'OpenCASCADE 3D Mesh Engine Extension',
        description: '3D printing and CAD manufacturing export (Coming Soon).',
      },

      // Design & Vector
      {
        inputFormat: 'svg',
        name: 'Scalable Vector Graphics',
        category: 'Design & Vector',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'SVG High-Fidelity Vector Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Resolution-independent vector artwork export to crisp PNG, JPG, or PDF.',
      },
      {
        inputFormat: 'psd',
        name: 'Adobe Photoshop Document',
        category: 'Design & Vector',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Photoshop PSD Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Adobe Photoshop composite artwork rendered to lossless PNG, JPG, or PDF.',
      },
      {
        inputFormat: 'ai',
        name: 'Adobe Illustrator Artwork',
        category: 'Design & Vector',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Adobe Illustrator Vector Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Adobe Illustrator vector artwork rendered to PNG, JPG, or PDF.',
      },
      {
        inputFormat: 'eps',
        name: 'Encapsulated PostScript',
        category: 'Design & Vector',
        canRender: true,
        outputFormats: ['png', 'jpg', 'webp', 'pdf'],
        renderer: 'EPS High-Fidelity Vector Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'PostScript vector artwork rendered to high-DPI PNG, JPG, WEBP, or vector PDF.',
      },
      {
        inputFormat: 'cdr',
        name: 'CorelDRAW Image File',
        category: 'Design & Vector',
        canRender: false,
        outputFormats: [],
        renderer: 'CorelDRAW Graphics Engine',
        multiPageSupport: false,
        status: 'coming_soon',
        requiresEngine: 'CorelDRAW Graphics Engine Extension',
        description: 'CorelDRAW vector graphics (Coming Soon).',
      },

      // Images
      {
        inputFormat: 'png',
        name: 'Portable Network Graphics',
        category: 'Images',
        canRender: true,
        outputFormats: ['jpg', 'webp', 'pdf'],
        renderer: 'Sharp Image Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Lossless raster image export.',
      },
      {
        inputFormat: 'jpg',
        name: 'JPEG Image',
        category: 'Images',
        canRender: true,
        outputFormats: ['png', 'webp', 'pdf'],
        renderer: 'Sharp Image Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Compressed photo image export.',
      },
      {
        inputFormat: 'webp',
        name: 'WebP Image',
        category: 'Images',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Sharp Image Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Modern high-efficiency image export.',
      },
      {
        inputFormat: 'gif',
        name: 'GIF Image',
        category: 'Images',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Sharp Image Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Raster GIF visual export.',
      },
      {
        inputFormat: 'bmp',
        name: 'Bitmap Image',
        category: 'Images',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Sharp Image Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'Bitmap raster visual export.',
      },
      {
        inputFormat: 'tiff',
        name: 'TIFF Image',
        category: 'Images',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Sharp Image Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'TIFF high-depth image visual export.',
      },
      {
        inputFormat: 'avif',
        name: 'AVIF Image',
        category: 'Images',
        canRender: true,
        outputFormats: ['png', 'jpg', 'pdf'],
        renderer: 'Sharp Image Engine',
        multiPageSupport: false,
        status: 'supported',
        description: 'AV1 image format visual export.',
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
    this.savePersistedJobs();
    return job;
  }

  getJob(jobId: string): ConversionJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    // Check if files still exist on disk
    if (job.status === 'completed' && job.outputPath && !fs.existsSync(job.outputPath)) {
      job.status = 'failed';
      job.error = 'Converted file has expired or was removed from server cache.';
      this.savePersistedJobs();
    } else if (job.status !== 'completed' && job.inputPath && !fs.existsSync(job.inputPath)) {
      job.status = 'failed';
      job.error = 'Upload session expired. Please re-upload your file.';
      this.savePersistedJobs();
    }
    return job;
  }

  updateJob(jobId: string, updates: Partial<ConversionJob>): ConversionJob | undefined {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(jobId, job);
      this.savePersistedJobs();
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
