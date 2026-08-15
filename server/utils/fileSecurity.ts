import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const TEMP_DIR = path.join(process.cwd(), 'tmp_uploads');

// Ensure temp directory exists on server start
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function safeParseInt(val: string | undefined, fallback: number): number {
  if (!val || typeof val !== 'string') return fallback;
  const parsed = parseInt(val.trim(), 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const FREE_MAX_FILE_SIZE_MB = 25;
export const FREE_MAX_FILE_SIZE_BYTES = FREE_MAX_FILE_SIZE_MB * 1024 * 1024;
export const FREE_DAILY_CONVERSIONS = 5;
export const FREE_MAX_PDF_PAGES = 10;
export const MAX_FILE_SIZE_BYTES = Math.max(FREE_MAX_FILE_SIZE_BYTES, 50 * 1024 * 1024); // Absolute server hard limit

export function sanitizeFilename(filename: string): string {
  // Remove path traversal and illegal characters
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function generateTempFilePath(extension: string): { filePath: string; fileId: string } {
  if (!fs.existsSync(TEMP_DIR)) {
    try {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    } catch {}
  }
  const fileId = crypto.randomUUID();
  const cleanExt = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fileName = `${fileId}.${cleanExt}`;
  const filePath = path.join(TEMP_DIR, fileName);
  return { filePath, fileId };
}

export interface MagicByteDetection {
  format: string;
  mimeType: string;
  valid: boolean;
}

export function detectFileFormat(buffer: Buffer, filename: string): MagicByteDetection {
  if (!buffer || buffer.length === 0) {
    return { format: 'unknown', mimeType: 'application/octet-stream', valid: false };
  }

  // Magic byte checks
  // PNG: 89 50 4E 47
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { format: 'png', mimeType: 'image/png', valid: true };
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { format: 'jpg', mimeType: 'image/jpeg', valid: true };
  }

  // WEBP: RIFF...WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { format: 'webp', mimeType: 'image/webp', valid: true };
  }

  // PDF: %PDF
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { format: 'pdf', mimeType: 'application/pdf', valid: true };
  }

  // SVG: text containing <svg
  const headStr = buffer.slice(0, 2048).toString('utf-8').toLowerCase();
  if (headStr.includes('<svg') || (headStr.includes('<?xml') && headStr.includes('svg'))) {
    return { format: 'svg', mimeType: 'image/svg+xml', valid: true };
  }

  // PSD: 8BPS (0x38 0x42 0x50 0x53)
  if (buffer.length >= 4 && buffer[0] === 0x38 && buffer[1] === 0x42 && buffer[2] === 0x50 && buffer[3] === 0x53) {
    return { format: 'psd', mimeType: 'image/vnd.adobe.photoshop', valid: true };
  }

  // DWG: AutoCAD binary header AC10xx (0x41 0x43 0x31 0x30)
  if (buffer.length >= 4 && buffer[0] === 0x41 && buffer[1] === 0x43 && buffer[2] === 0x31 && buffer[3] === 0x30) {
    return { format: 'dwg', mimeType: 'image/vnd.dwg', valid: true };
  }

  // DXF: text format contains "SECTION" or "HEADER" or "ENTITIES" or 0 / SECTION
  const fileExt = path.extname(filename).toLowerCase().replace('.', '');
  if (
    headStr.includes('section') ||
    headStr.includes('header') ||
    headStr.includes('entities') ||
    headStr.startsWith('0') ||
    headStr.includes('autocad')
  ) {
    if (fileExt === 'dxf' || headStr.includes('tables') || headStr.includes('dxf')) {
      return { format: 'dxf', mimeType: 'image/vnd.dxf', valid: true };
    }
  }

  // AI: Adobe Illustrator (PDF-compatible or PostScript)
  if (fileExt === 'ai') {
    return { format: 'ai', mimeType: 'application/postscript', valid: true };
  }
  if (fileExt === 'eps') {
    return { format: 'eps', mimeType: 'application/postscript', valid: true };
  }
  if (fileExt === 'cdr') {
    return { format: 'cdr', mimeType: 'application/cdr', valid: true };
  }
  if (fileExt === 'dwg') {
    return { format: 'dwg', mimeType: 'image/vnd.dwg', valid: true };
  }
  if (fileExt === 'dwf') {
    return { format: 'dwf', mimeType: 'model/vnd.dwf', valid: true };
  }

  // GIF: GIF87a / GIF89a (0x47 0x49 0x46)
  if (buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { format: 'gif', mimeType: 'image/gif', valid: true };
  }

  // BMP: BM (0x42 0x4D)
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return { format: 'bmp', mimeType: 'image/bmp', valid: true };
  }

  // TIFF: II*. or MM.* (0x49 0x49 0x2A 0x00 or 0x4D 0x4D 0x00 0x2A)
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
  ) {
    return { format: 'tiff', mimeType: 'image/tiff', valid: true };
  }

  // ZIP-based Office Formats (DOCX, XLSX, PPTX, ODT): PK.. (0x50 0x4B 0x03 0x04)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    if (fileExt === 'docx') {
      return { format: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', valid: true };
    }
    if (fileExt === 'xlsx') {
      return { format: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', valid: true };
    }
    if (fileExt === 'pptx') {
      return { format: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', valid: true };
    }
    if (fileExt === 'odt') {
      return { format: 'odt', mimeType: 'application/vnd.oasis.opendocument.text', valid: true };
    }
  }

  // Fallback to extension matching if magic bytes are ambiguous or for text-based CAD/Vector/Doc files
  if (
    [
      'png',
      'jpg',
      'jpeg',
      'webp',
      'gif',
      'bmp',
      'tiff',
      'tif',
      'avif',
      'pdf',
      'svg',
      'docx',
      'xlsx',
      'txt',
      'html',
      'htm',
      'pptx',
      'odt',
      'rtf',
      'dxf',
      'psd',
      'ai',
      'eps',
      'dwg',
      'dwf',
      'cdr',
      'obj',
      'fbx',
      '3ds',
      'stl',
      'max',
      'aep',
      'prproj',
      'fla',
    ].includes(fileExt)
  ) {
    const normalizedExt = fileExt === 'jpeg' ? 'jpg' : fileExt === 'tif' ? 'tiff' : fileExt === 'htm' ? 'html' : fileExt;
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      avif: 'image/avif',
      pdf: 'application/pdf',
      svg: 'image/svg+xml',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      html: 'text/html',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      odt: 'application/vnd.oasis.opendocument.text',
      rtf: 'application/rtf',
      dxf: 'image/vnd.dxf',
      psd: 'image/vnd.adobe.photoshop',
      ai: 'application/postscript',
      eps: 'application/postscript',
      dwg: 'image/vnd.dwg',
      dwf: 'model/vnd.dwf',
      cdr: 'application/cdr',
      obj: 'model/obj',
      fbx: 'application/octet-stream',
      '3ds': 'image/x-3ds',
      stl: 'model/stl',
      max: 'application/x-3dsmax',
      aep: 'application/vnd.adobe.aftereffects.project',
      prproj: 'application/x-premiere',
      fla: 'application/x-authorware-bin',
    };
    return { format: normalizedExt, mimeType: mimeMap[normalizedExt] || 'application/octet-stream', valid: true };
  }

  return { format: fileExt || 'unknown', mimeType: 'application/octet-stream', valid: false };
}

// Scheduled periodic cleanup of old temp files (> 30 minutes old)
export function cleanupOldTempFiles(maxAgeMs: number = 30 * 60 * 1000): void {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    for (const file of files) {
      const fullPath = path.join(TEMP_DIR, file);
      try {
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
        }
      } catch {
        // ignore individual file deletion error
      }
    }
  } catch {
    // ignore dir read error
  }
}

// Run cleanup every 10 minutes (unref so it does not block process exit)
const cleanupTimer = setInterval(() => {
  cleanupOldTempFiles();
}, 10 * 60 * 1000);
if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}
