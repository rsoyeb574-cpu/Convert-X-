import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const TEMP_DIR = path.join(process.cwd(), 'tmp_uploads');

// Ensure temp directory exists on server start
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function sanitizeFilename(filename: string): string {
  // Remove path traversal and illegal characters
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function generateTempFilePath(extension: string): { filePath: string; fileId: string } {
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

  // DXF: text format contains "SECTION" or "HEADER" or "ENTITIES" or 0 / SECTION
  if (
    headStr.includes('section') ||
    headStr.includes('header') ||
    headStr.includes('entities') ||
    headStr.startsWith('0') ||
    headStr.includes('autocad')
  ) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    if (ext === 'dxf' || headStr.includes('tables') || headStr.includes('dxf')) {
      return { format: 'dxf', mimeType: 'image/vnd.dxf', valid: true };
    }
  }

  // Fallback to extension matching if magic bytes are ambiguous or for text-based CAD/Vector files
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  if (['png', 'jpg', 'jpeg', 'webp', 'pdf', 'svg', 'dxf'].includes(ext)) {
    const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp',
      pdf: 'application/pdf',
      svg: 'image/svg+xml',
      dxf: 'image/vnd.dxf',
    };
    return { format: normalizedExt, mimeType: mimeMap[normalizedExt] || 'application/octet-stream', valid: true };
  }

  return { format: ext || 'unknown', mimeType: 'application/octet-stream', valid: false };
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
