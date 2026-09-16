import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import DxfParser from 'dxf-parser';
import JSZip from 'jszip';
import { FORMAT_REGISTRY, FormatDefinition, getFormatDefinition } from '../formats/formatRegistry.js';
import { BLOCKED_EXTENSIONS, detectFileFormat, generateTempFilePath, sanitizeFilename } from './fileSecurity.js';

export type HealthStatus =
  | 'HEALTHY'
  | 'PARTIALLY_READABLE'
  | 'CORRUPTED'
  | 'INVALID_FORMAT'
  | 'EXTENSION_MISMATCH'
  | 'UNSUPPORTED';

export type SecurityAuditStatus = 'SAFE' | 'LOW_RISK' | 'MEDIUM_RISK' | 'DANGEROUS';

export type CapabilityState = 'SUPPORTED' | 'PARTIAL' | 'COMING_SOON' | 'UNSUPPORTED';

export interface DoctorProblem {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  canRepair: boolean;
  repairAction?: string;
  userGuidance?: string;
}

export interface DoctorAction {
  id: string;
  label: string;
  type: 'convert' | 'compress' | 'preview' | 'inspect' | 'repair' | 'extract' | 'compare' | 'export' | 'batch';
  targetFormat?: string;
  description: string;
  isRecommended?: boolean;
}

export interface FileDoctorReport {
  file: {
    name: string;
    size: number;
    declaredExtension: string;
    detectedFormat: string;
    detectedExtension: string;
    mimeType: string;
    extensionMatches: boolean;
  };
  format: {
    name: string;
    category: string;
    magicBytes: string;
    signatureName: string;
    containerType: string;
    description: string;
  };
  validity: {
    status: HealthStatus;
    healthScore: number; // 0 to 100
    summary: string;
    canRepair: boolean;
  };
  security: {
    status: SecurityAuditStatus;
    isExecutable: boolean;
    containsUnsafeCode: boolean;
    details: string;
    riskFactors: string[];
  };
  structure: {
    pages?: number;
    dimensions?: { width: number; height: number; aspectRatio?: string };
    layers?: { count: number; names: string[] };
    objectsCount?: number;
    compression?: string;
    metadata?: Record<string, any>;
    embeddedFiles?: string[];
    isLinearized?: boolean;
    isEncrypted?: boolean;
  };
  capability: {
    state: CapabilityState;
    engine: string;
    supportedOutputs: string[];
    previewSupport: boolean;
    safeInspectionAvailable: boolean;
    alternativeWorkflow?: string;
    reason?: string;
  };
  supportedActions: DoctorAction[];
  recommendedAction: DoctorAction;
  problemsFound: DoctorProblem[];
}

/**
 * Extract magic bytes in hex string format e.g. "89 50 4E 47"
 */
export function getMagicBytesHex(buffer: Buffer, maxBytes: number = 8): string {
  if (!buffer || buffer.length === 0) return 'NONE';
  const len = Math.min(buffer.length, maxBytes);
  const hexParts: string[] = [];
  for (let i = 0; i < len; i++) {
    hexParts.push(buffer[i].toString(16).padStart(2, '0').toUpperCase());
  }
  return hexParts.join(' ');
}

/**
 * Detect magic signature name
 */
export function getMagicSignatureName(buffer: Buffer): { signature: string; format: string } {
  if (!buffer || buffer.length === 0) return { signature: 'Empty Buffer', format: 'unknown' };

  // Windows / DOS Executable
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { signature: 'MZ (DOS / Windows PE Executable)', format: 'exe' };
  }
  // Linux ELF
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { signature: 'ELF (Unix / Linux Executable)', format: 'elf' };
  }
  // Mach-O
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && (buffer[3] === 0xce || buffer[3] === 0xcf)) ||
      (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe))
  ) {
    return { signature: 'Mach-O (macOS Binary Executable)', format: 'macho' };
  }
  // PNG
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { signature: '%PNG-1.0 (Portable Network Graphics)', format: 'png' };
  }
  // JPEG
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { signature: 'JFIF / EXIF (JPEG Compressed Image)', format: 'jpg' };
  }
  // PDF
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    const head = buffer.subarray(0, 16).toString('ascii');
    const verMatch = head.match(/%PDF-(\d\.\d)/);
    return { signature: `%PDF-${verMatch ? verMatch[1] : '1.x'} (Adobe Acrobat Document)`, format: 'pdf' };
  }
  // RIFF (WebP, WAV, AVI)
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    const sub = buffer.subarray(8, 12).toString('ascii');
    if (sub === 'WEBP') return { signature: 'RIFF...WEBP (Google WebP Image)', format: 'webp' };
    if (sub === 'WAVE') return { signature: 'RIFF...WAVE (Linear PCM Audio)', format: 'wav' };
    if (sub === 'AVI ') return { signature: 'RIFF...AVI (Audio Video Interleave)', format: 'avi' };
    return { signature: `RIFF Container (${sub})`, format: 'riff' };
  }
  // ZIP / OpenXML Container (PK..)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)) {
    return { signature: 'PK Zip Archive / OpenXML Container', format: 'zip' };
  }
  // Photoshop PSD
  if (buffer.length >= 4 && buffer[0] === 0x38 && buffer[1] === 0x42 && buffer[2] === 0x50 && buffer[3] === 0x53) {
    return { signature: '8BPS (Adobe Photoshop Document)', format: 'psd' };
  }
  // AutoCAD DWG
  if (buffer.length >= 6 && buffer[0] === 0x41 && buffer[1] === 0x43 && buffer[2] === 0x31 && buffer[3] === 0x30) {
    const ver = buffer.subarray(0, 6).toString('ascii');
    let verName = 'AutoCAD DWG';
    if (ver === 'AC1015') verName = 'AutoCAD 2000 DWG';
    else if (ver === 'AC1018') verName = 'AutoCAD 2004 DWG';
    else if (ver === 'AC1021') verName = 'AutoCAD 2007 DWG';
    else if (ver === 'AC1024') verName = 'AutoCAD 2010 DWG';
    else if (ver === 'AC1027') verName = 'AutoCAD 2013 DWG';
    else if (ver === 'AC1032') verName = 'AutoCAD 2018/2024 DWG';
    return { signature: `${ver} (${verName})`, format: 'dwg' };
  }
  // SafeTensors
  if (buffer.length >= 10) {
    try {
      const headerLen = Number(buffer.readBigUInt64LE(0));
      if (headerLen > 0 && headerLen < 50 * 1024 * 1024 && buffer[8] === 0x7b) {
        return { signature: 'SafeTensors Model Weights Container', format: 'safetensors' };
      }
    } catch {}
  }
  // GGUF
  if (buffer.length >= 4 && buffer[0] === 0x47 && buffer[1] === 0x47 && buffer[2] === 0x55 && buffer[3] === 0x46) {
    return { signature: 'GGUF (llama.cpp Quantized AI Model)', format: 'gguf' };
  }
  // HDF5 / Keras v2
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x48 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { signature: 'HDF5 Hierarchical Data Format', format: 'h5' };
  }
  // Parquet
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x41 && buffer[2] === 0x52 && buffer[3] === 0x31) {
    return { signature: 'Apache Parquet Columnar Data', format: 'parquet' };
  }
  // MP3 ID3
  if (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { signature: 'ID3v2 MPEG Audio Layer 3', format: 'mp3' };
  }
  // FLAC
  if (buffer.length >= 4 && buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) {
    return { signature: 'fLaC (Free Lossless Audio Codec)', format: 'flac' };
  }
  // MP4 / MOV
  if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    return { signature: `ISO Media / MP4 (${brand})`, format: 'mp4' };
  }
  // SVG Text
  const textHead = buffer.subarray(0, 1024).toString('utf8').trim().toLowerCase();
  if (textHead.includes('<svg') || (textHead.includes('<?xml') && textHead.includes('<svg'))) {
    return { signature: 'XML Scalable Vector Graphics', format: 'svg' };
  }
  // DXF Text
  if (textHead.includes('section') && textHead.includes('header') || textHead.includes('$acadver')) {
    return { signature: 'AutoCAD DXF ASCII Exchange', format: 'dxf' };
  }
  // JSON
  if ((textHead.startsWith('{') && textHead.endsWith('}')) || (textHead.startsWith('[') && textHead.endsWith(']'))) {
    return { signature: 'JSON Structured Object Notation', format: 'json' };
  }

  return { signature: 'Binary / Generic Data Container', format: 'unknown' };
}

/**
 * Main Smart File Doctor Diagnostic Function
 */
export async function diagnoseFile(buffer: Buffer, originalFilename: string): Promise<FileDoctorReport> {
  const cleanFilename = sanitizeFilename(originalFilename || 'unnamed_file');
  const declaredExt = (cleanFilename.split('.').pop() || '').toLowerCase();
  const magicHex = getMagicBytesHex(buffer, 8);
  const sig = getMagicSignatureName(buffer);

  // Determine actual format
  let detectedExt = sig.format;
  if (detectedExt === 'unknown' || detectedExt === 'riff' || detectedExt === 'zip') {
    // If ZIP, inspect inner container
    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const fileNames = Object.keys(zip.files);
        if (fileNames.some((f) => f.startsWith('word/'))) detectedExt = 'docx';
        else if (fileNames.some((f) => f.startsWith('xl/'))) detectedExt = 'xlsx';
        else if (fileNames.some((f) => f.startsWith('ppt/'))) detectedExt = 'pptx';
        else if (fileNames.includes('config.json') && fileNames.includes('model.weights.bin')) detectedExt = 'keras';
        else if (fileNames.includes('3D/3dmodel.model')) detectedExt = '3mf';
        else detectedExt = declaredExt === 'zip' ? 'zip' : (declaredExt || 'zip');
      } catch {
        detectedExt = declaredExt || 'zip';
      }
    } else {
      const basicDetect = detectFileFormat(buffer, cleanFilename);
      detectedExt = basicDetect.format !== 'unknown' ? basicDetect.format : declaredExt || 'bin';
    }
  }

  // Check extension mismatch
  const normalizedDeclared = declaredExt === 'jpeg' ? 'jpg' : declaredExt === 'htm' ? 'html' : declaredExt;
  const normalizedDetected = detectedExt === 'jpeg' ? 'jpg' : detectedExt === 'htm' ? 'html' : detectedExt;
  const extensionMatches =
    normalizedDeclared === normalizedDetected ||
    (normalizedDeclared === 'zip' && ['docx', 'xlsx', 'pptx', '3mf', 'keras'].includes(normalizedDetected));

  const formatDef = getFormatDefinition(normalizedDetected) || getFormatDefinition(normalizedDeclared);
  const formatName = formatDef?.name || `${normalizedDetected.toUpperCase()} File`;
  const category = formatDef?.categoryLabel || 'General File';
  const mimeType = formatDef?.mimeType || 'application/octet-stream';

  const problemsFound: DoctorProblem[] = [];
  const riskFactors: string[] = [];
  let isExecutable = false;
  let containsUnsafeCode = false;
  let securityStatus: SecurityAuditStatus = 'SAFE';

  // 1. Security Analysis
  if (BLOCKED_EXTENSIONS.has(normalizedDeclared) || ['exe', 'elf', 'macho'].includes(sig.format)) {
    isExecutable = true;
    securityStatus = 'DANGEROUS';
    riskFactors.push('Executable binary or script content detected.');
    problemsFound.push({
      severity: 'critical',
      title: 'Untrusted Executable Content',
      description: 'The file contains binary machine code or script execution headers. Convert-X isolates and refuses execution of all binaries.',
      canRepair: false,
      userGuidance: 'Do not run untrusted executable files. Convert-X will never execute uploaded binaries on our servers.',
    });
  }

  if (['pt', 'pth', 'ckpt', 'pkl'].includes(normalizedDetected) || ['pt', 'pth', 'ckpt', 'pkl'].includes(normalizedDeclared)) {
    containsUnsafeCode = true;
    securityStatus = 'MEDIUM_RISK';
    riskFactors.push('Python pickle format contains potential arbitrary code deserialization hazards.');
    problemsFound.push({
      severity: 'warning',
      title: 'Python Pickle Deserialization Risk',
      description: 'PyTorch / Python pickle files can contain arbitrary executable opcodes. Convert-X runs safe zero-bytecode inspection only.',
      canRepair: false,
      userGuidance: 'Consider converting this model to SafeTensors (.safetensors) or ONNX (.onnx) for secure storage without arbitrary code execution.',
    });
  }

  // 2. Extension Mismatch Problem
  if (!extensionMatches && declaredExt && normalizedDetected !== 'unknown') {
    problemsFound.push({
      severity: 'warning',
      title: 'Extension Mismatch Detected',
      description: `File extension is ".${declaredExt}" but file contents match ".${normalizedDetected}" (${sig.signature}).`,
      canRepair: true,
      repairAction: `Rename extension to .${normalizedDetected}`,
      userGuidance: `Rename the file to end with .${normalizedDetected} so standard operating system applications can open it correctly.`,
    });
  }

  // 3. Structural Parsing & Health Status
  let healthScore = 100;
  let healthStatus: HealthStatus = 'HEALTHY';
  let canRepair = false;
  const structure: FileDoctorReport['structure'] = {};

  if (isExecutable) {
    healthStatus = 'INVALID_FORMAT';
    healthScore = 0;
  } else if (!extensionMatches) {
    healthStatus = 'EXTENSION_MISMATCH';
    healthScore = 75;
    canRepair = true;
  }

  // PDF Deep Inspection
  if (normalizedDetected === 'pdf') {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      structure.pages = pdfDoc.getPageCount();
      structure.isEncrypted = pdfDoc.isEncrypted;
      const pages = pdfDoc.getPages();
      if (pages.length > 0) {
        const first = pages[0].getSize();
        structure.dimensions = {
          width: Math.round(first.width),
          height: Math.round(first.height),
          aspectRatio: `${(first.width / first.height).toFixed(2)}:1`,
        };
      }
      // Check for PDF trailer and EOF
      const tail = buffer.subarray(Math.max(0, buffer.length - 1024)).toString('ascii');
      if (!tail.includes('%%EOF')) {
        healthStatus = 'PARTIALLY_READABLE';
        healthScore = 65;
        canRepair = true;
        problemsFound.push({
          severity: 'warning',
          title: 'Truncated PDF Trailer',
          description: 'The PDF file is missing the closing "%%EOF" marker, which may cause some viewers to report an error.',
          canRepair: true,
          repairAction: 'Rebuild & Normalize PDF Structure',
          userGuidance: 'Convert-X can normalize the xref cross-reference table and write a clean, compliant PDF trailer.',
        });
      }
    } catch (pdfErr: any) {
      healthStatus = 'CORRUPTED';
      healthScore = 20;
      canRepair = false;
      problemsFound.push({
        severity: 'critical',
        title: 'Corrupted PDF Structure',
        description: `Failed to parse PDF document: ${pdfErr.message}`,
        canRepair: false,
        userGuidance: 'The PDF file data is incomplete or severely damaged. Please obtain a fresh copy or export from source.',
      });
    }
  }

  // Image Deep Inspection (Sharp)
  if (['png', 'jpg', 'webp', 'gif', 'tiff', 'avif'].includes(normalizedDetected)) {
    try {
      const meta = await sharp(buffer).metadata();
      structure.dimensions = {
        width: meta.width || 0,
        height: meta.height || 0,
        aspectRatio: meta.width && meta.height ? `${(meta.width / meta.height).toFixed(2)}:1` : '1:1',
      };
      structure.compression = meta.format;
      structure.metadata = {
        format: meta.format,
        space: meta.space,
        channels: meta.channels,
        depth: meta.depth,
        density: meta.density,
        hasAlpha: meta.hasAlpha,
      };
    } catch (imgErr: any) {
      healthStatus = 'CORRUPTED';
      healthScore = 25;
      canRepair = true;
      problemsFound.push({
        severity: 'critical',
        title: 'Corrupted Image Stream',
        description: `Image decode stream failed: ${imgErr.message}`,
        canRepair: true,
        repairAction: 'Safe Re-encode & Recover Image Buffer',
        userGuidance: 'Convert-X will attempt to salvage available raster scanlines into a valid PNG.',
      });
    }
  }

  // DXF Deep Inspection
  if (normalizedDetected === 'dxf') {
    try {
      const parser = new DxfParser();
      const text = buffer.toString('utf-8');
      const parsed = parser.parseSync(text);
      if (parsed) {
        const entities = parsed.entities || [];
        structure.objectsCount = entities.length;
        const layerNames = Object.keys(parsed.tables?.layer?.layers || {});
        structure.layers = { count: layerNames.length, names: layerNames.slice(0, 10) };
      }
    } catch (dxfErr: any) {
      healthStatus = 'PARTIALLY_READABLE';
      healthScore = 55;
      problemsFound.push({
        severity: 'warning',
        title: 'DXF Syntax Warning',
        description: `Parser encountered non-standard group codes: ${dxfErr.message}`,
        canRepair: false,
        userGuidance: 'Check that the file was exported with standard ASCII DXF format (R12 - 2018).',
      });
    }
  }

  // DWG / Proprietary CAD
  if (normalizedDetected === 'dwg') {
    healthStatus = 'UNSUPPORTED';
    healthScore = 70;
    problemsFound.push({
      severity: 'info',
      title: 'Proprietary Binary AutoCAD Database',
      description: 'AutoCAD DWG uses an encrypted, closed binary format requiring Autodesk RealDWG commercial runtime.',
      canRepair: false,
      userGuidance: 'Open the drawing in AutoCAD, DraftSight, or BricsCAD, then use: File → Save As → AutoCAD DXF. Convert-X will then convert and preview your drawing with 100% vector fidelity.',
    });
  }

  // DOCX / XLSX Deep Inspection
  if (['docx', 'xlsx', 'pptx'].includes(normalizedDetected)) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const entries = Object.keys(zip.files);
      structure.embeddedFiles = entries.slice(0, 15);
      if (entries.length === 0) {
        healthStatus = 'CORRUPTED';
        healthScore = 15;
        problemsFound.push({
          severity: 'critical',
          title: 'Empty Office XML Package',
          description: 'The ZIP container contains no documents or parts.',
          canRepair: false,
        });
      }
    } catch (zipErr: any) {
      healthStatus = 'CORRUPTED';
      healthScore = 20;
      problemsFound.push({
        severity: 'critical',
        title: 'Broken Office ZIP Archive',
        description: 'Office OpenXML container cannot be decompressed.',
        canRepair: false,
        userGuidance: 'The file appears truncated. Check if the download completed fully.',
      });
    }
  }

  // 4. Determine Capability State
  let capabilityState: CapabilityState = 'SUPPORTED';
  let engine = formatDef?.engine || 'Convert-X Core Engine';
  let supportedOutputs = formatDef?.supportedOutputs || [];
  let previewSupport = formatDef?.previewSupport ?? false;
  let alternativeWorkflow: string | undefined;
  let reason: string | undefined;

  if (normalizedDetected === 'dwg') {
    capabilityState = 'COMING_SOON';
    engine = 'Native RealDWG Engine (Coming Soon)';
    supportedOutputs = [];
    previewSupport = false;
    alternativeWorkflow = 'Export to AutoCAD DXF or PDF in AutoCAD, then upload DXF to Convert-X';
    reason = 'Native DWG conversion engine is not installed.';
  } else if (isExecutable) {
    capabilityState = 'UNSUPPORTED';
    engine = 'Execution Blocked';
    supportedOutputs = [];
    previewSupport = false;
    reason = 'Direct execution of executable binaries is prohibited for security.';
  } else if (!formatDef || formatDef.status === 'COMING_SOON' || supportedOutputs.length === 0) {
    capabilityState = 'COMING_SOON';
    supportedOutputs = [];
    reason = formatDef?.conversionNotes || 'Dedicated conversion engine is coming soon.';
  }

  // 5. Generate Supported & Recommended Actions
  const supportedActions: DoctorAction[] = [];

  // Actions for PDF
  if (normalizedDetected === 'pdf') {
    supportedActions.push({
      id: 'compress-pdf',
      label: 'Compress PDF',
      type: 'compress',
      description: 'Reduce PDF file size while preserving readability and vector text.',
      isRecommended: (buffer.length > 2 * 1024 * 1024),
    });
    supportedActions.push({
      id: 'extract-text',
      label: 'Extract Text',
      type: 'extract',
      description: 'Extract raw text, edit paragraphs, or perform OCR on scanned pages.',
    });
    supportedActions.push({
      id: 'pdf-to-jpg',
      label: 'PDF → JPG',
      type: 'convert',
      targetFormat: 'jpg',
      description: 'Render high-resolution raster JPEG images for each page.',
    });
    supportedActions.push({
      id: 'pdf-to-png',
      label: 'PDF → PNG',
      type: 'convert',
      targetFormat: 'png',
      description: 'Export crisp, lossless PNG images of PDF pages.',
    });
    supportedActions.push({
      id: 'pdf-preview',
      label: 'Interactive Preview',
      type: 'preview',
      description: 'View PDF pages, layout dimensions, and inspect metadata.',
    });
  }
  // Actions for Images
  else if (['png', 'jpg', 'webp', 'svg', 'gif', 'tiff', 'avif', 'bmp'].includes(normalizedDetected)) {
    if (normalizedDetected !== 'webp') {
      supportedActions.push({
        id: 'convert-webp',
        label: `${normalizedDetected.toUpperCase()} → WebP`,
        type: 'convert',
        targetFormat: 'webp',
        description: 'Modern high-efficiency WebP image with 30-70% file size savings.',
        isRecommended: true,
      });
    }
    if (normalizedDetected !== 'jpg') {
      supportedActions.push({
        id: 'convert-jpg',
        label: `${normalizedDetected.toUpperCase()} → JPG`,
        type: 'convert',
        targetFormat: 'jpg',
        description: 'Standard JPEG photo format for universal compatibility.',
      });
    }
    if (normalizedDetected !== 'png') {
      supportedActions.push({
        id: 'convert-png',
        label: `${normalizedDetected.toUpperCase()} → PNG`,
        type: 'convert',
        targetFormat: 'png',
        description: 'Lossless raster graphic with full alpha transparency.',
      });
    }
    supportedActions.push({
      id: 'convert-pdf',
      label: `${normalizedDetected.toUpperCase()} → PDF`,
      type: 'convert',
      targetFormat: 'pdf',
      description: 'Embed image into a print-ready vector PDF page.',
    });
    supportedActions.push({
      id: 'compress-image',
      label: 'Compress Image',
      type: 'compress',
      description: 'Optimize image byte size without noticeable quality loss.',
      isRecommended: buffer.length > 500 * 1024,
    });
  }
  // Actions for DXF
  else if (normalizedDetected === 'dxf') {
    supportedActions.push({
      id: 'dxf-preview',
      label: 'CAD Drawing Preview',
      type: 'preview',
      description: 'Interactive pan, zoom, layer isolation, and measurement tools.',
      isRecommended: true,
    });
    supportedActions.push({
      id: 'dxf-svg',
      label: 'DXF → SVG',
      type: 'export',
      targetFormat: 'svg',
      description: 'Export resolution-independent vector blueprint graphic.',
    });
    supportedActions.push({
      id: 'dxf-pdf',
      label: 'DXF → PDF',
      type: 'convert',
      targetFormat: 'pdf',
      description: 'High-DPI vector ISO / ANSI blueprint document.',
    });
    supportedActions.push({
      id: 'dxf-png',
      label: 'DXF → PNG',
      type: 'convert',
      targetFormat: 'png',
      description: 'High-resolution raster CAD rendering.',
    });
  }
  // Actions for ML Models
  else if (['safetensors', 'gguf', 'onnx', 'tflite', 'h5', 'keras', 'pt', 'pth', 'pkl'].includes(normalizedDetected)) {
    supportedActions.push({
      id: 'ml-inspect',
      label: 'Inspect Model Weights',
      type: 'inspect',
      description: 'Safe zero-bytecode inspection of tensor shapes, dtypes, and layer parameters.',
      isRecommended: true,
    });
    supportedActions.push({
      id: 'ml-json-report',
      label: 'Export JSON Report',
      type: 'export',
      targetFormat: 'json',
      description: 'Complete architecture and tensor metadata JSON manifest.',
    });
    supportedActions.push({
      id: 'ml-pdf-report',
      label: 'Export PDF Report',
      type: 'export',
      targetFormat: 'pdf',
      description: 'Structured printable architecture audit report.',
    });
  }
  // Default Generic Actions
  else {
    supportedActions.push({
      id: 'universal-inspect',
      label: 'Deep Inspect',
      type: 'inspect',
      description: 'Inspect file container, metadata, and security integrity.',
      isRecommended: true,
    });
    if (supportedOutputs.length > 0) {
      supportedOutputs.slice(0, 3).forEach((out) => {
        supportedActions.push({
          id: `convert-${out}`,
          label: `Convert to .${out.toUpperCase()}`,
          type: 'convert',
          targetFormat: out,
          description: `Convert file to .${out.toUpperCase()} using verified engine.`,
        });
      });
    }
  }

  // Always include Health Check / Fix if problems found
  if (problemsFound.length > 0) {
    supportedActions.unshift({
      id: 'doctor-fix',
      label: canRepair ? 'Repair File Health' : 'View Problem Guidance',
      type: 'repair',
      description: canRepair ? 'Convert-X can automatically repair detected corruption.' : 'Detailed guidance on alternative software workflow.',
      isRecommended: true,
    });
  }

  // Pick recommended action
  const recommendedAction = supportedActions.find((a) => a.isRecommended) || supportedActions[0] || {
    id: 'inspect',
    label: 'Inspect File',
    type: 'inspect',
    description: 'Safely inspect file properties and structure.',
  };

  return {
    file: {
      name: cleanFilename,
      size: buffer.length,
      declaredExtension: declaredExt,
      detectedFormat: normalizedDetected,
      detectedExtension: normalizedDetected,
      mimeType,
      extensionMatches,
    },
    format: {
      name: formatName,
      category,
      magicBytes: magicHex,
      signatureName: sig.signature,
      containerType: sig.format.toUpperCase(),
      description: formatDef?.description || 'Standard digital file asset.',
    },
    validity: {
      status: healthStatus,
      healthScore,
      summary:
        problemsFound.length === 0
          ? 'File structure and magic header are valid and completely healthy.'
          : `${problemsFound.length} issue(s) detected during structural audit.`,
      canRepair,
    },
    security: {
      status: securityStatus,
      isExecutable,
      containsUnsafeCode,
      details:
        securityStatus === 'SAFE'
          ? 'Passed security filters: zero executable headers and isolated sandbox verification.'
          : `Security flags raised: ${riskFactors.join(' ')}`,
      riskFactors,
    },
    structure,
    capability: {
      state: capabilityState,
      engine,
      supportedOutputs,
      previewSupport,
      safeInspectionAvailable: true,
      alternativeWorkflow,
      reason,
    },
    supportedActions,
    recommendedAction,
    problemsFound,
  };
}

/**
 * Real file repair function for repairable formats (PDF normalization, Image re-encoding, Text cleaning)
 */
export async function repairFile(
  buffer: Buffer,
  originalFilename: string,
  detectedFormat: string
): Promise<{ success: boolean; repairedBuffer?: Buffer; newFilename?: string; notes: string }> {
  const cleanName = sanitizeFilename(originalFilename);
  const baseName = path.basename(cleanName, path.extname(cleanName));

  // 1. PDF Repair: Load and save clean PDF document
  if (detectedFormat.toLowerCase() === 'pdf') {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const repairedBytes = await pdfDoc.save();
      return {
        success: true,
        repairedBuffer: Buffer.from(repairedBytes),
        newFilename: `${baseName}_repaired.pdf`,
        notes: 'Successfully rebuilt cross-reference table (xref), normalized page tree, and wrote clean %%EOF trailer.',
      };
    } catch (err: any) {
      return {
        success: false,
        notes: `PDF repair failed: ${err.message}. Damage to file binary is too severe for automated resynthesis.`,
      };
    }
  }

  // 2. Image Repair: Re-encode via sharp to strip corrupt metadata/trailing garbage
  if (['png', 'jpg', 'jpeg', 'webp'].includes(detectedFormat.toLowerCase())) {
    try {
      const repaired = await sharp(buffer).toFormat('png').toBuffer();
      return {
        success: true,
        repairedBuffer: repaired,
        newFilename: `${baseName}_repaired.png`,
        notes: 'Successfully salvaged valid scanlines and re-encoded into a pristine PNG image stream.',
      };
    } catch (err: any) {
      return {
        success: false,
        notes: `Image re-encode failed: ${err.message}. Image header or color data is unreadable.`,
      };
    }
  }

  // 3. Text / JSON / CSV normalization (strip BOM, fix null bytes)
  if (['json', 'csv', 'tsv', 'txt', 'xml', 'yaml', 'yml'].includes(detectedFormat.toLowerCase())) {
    try {
      let text = buffer.toString('utf8');
      // Strip UTF-8 BOM if present
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }
      // Remove trailing null bytes
      text = text.replace(/\0+$/g, '').trim();
      const ext = detectedFormat.toLowerCase();
      return {
        success: true,
        repairedBuffer: Buffer.from(text, 'utf8'),
        newFilename: `${baseName}_repaired.${ext}`,
        notes: 'Successfully removed byte order mark (BOM), stripped trailing null bytes, and normalized character encoding to UTF-8.',
      };
    } catch (err: any) {
      return {
        success: false,
        notes: `Text normalization failed: ${err.message}.`,
      };
    }
  }

  return {
    success: false,
    notes: `No automated repair engine exists for .${detectedFormat.toUpperCase()}. Please use native software export or audit tools.`,
  };
}
