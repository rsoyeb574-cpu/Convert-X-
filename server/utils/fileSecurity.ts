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

export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'sh', 'bat', 'cmd', 'py', 'js', 'mjs', 'cjs', 'vbs', 'ps1', 'psm1',
  'com', 'scr', 'msi', 'jar', 'apk', 'app', 'dmg', 'iso', 'bin', 'dll', 'so',
  'dylib', 'deb', 'rpm'
]);

export interface MagicByteDetection {
  format: string;
  mimeType: string;
  valid: boolean;
  reason?: string;
  extensionMismatch?: boolean;
  declaredFormat?: string;
  magicHex?: string;
  isExecutable?: boolean;
}

export function detectFileFormat(buffer: Buffer, filename: string): MagicByteDetection {
  if (!buffer || buffer.length === 0) {
    return { format: 'unknown', mimeType: 'application/octet-stream', valid: false, reason: 'Empty buffer' };
  }

  const extMatch = filename.split('.').pop() || '';
  const fileExt = extMatch.toLowerCase().trim();

  // 1. Strict Security Blocklist: Reject executable files & scripts by declared extension
  if (BLOCKED_EXTENSIONS.has(fileExt)) {
    return {
      format: fileExt,
      mimeType: 'application/x-executable',
      valid: false,
      isExecutable: true,
      reason: `Direct execution or upload of executable scripts (.${fileExt}) is strictly prohibited for system security.`,
    };
  }

  // 1b. Check for binary executable headers regardless of filename extension (disguised malware protection)
  // Windows / DOS PE (MZ)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return {
      format: 'exe',
      mimeType: 'application/x-msdownload',
      valid: false,
      isExecutable: true,
      reason: 'Executable DOS/Windows binary detected (MZ header). Execution and conversion of executable binaries is strictly prohibited.',
    };
  }
  // Linux ELF
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return {
      format: 'elf',
      mimeType: 'application/x-executable',
      valid: false,
      isExecutable: true,
      reason: 'Linux / Unix ELF binary executable detected. Execution and conversion of executable binaries is strictly prohibited.',
    };
  }
  // Mach-O
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && (buffer[3] === 0xce || buffer[3] === 0xcf)) ||
      (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe))
  ) {
    return {
      format: 'macho',
      mimeType: 'application/x-mach-binary',
      valid: false,
      isExecutable: true,
      reason: 'macOS Mach-O binary executable detected. Execution and conversion of executable binaries is strictly prohibited.',
    };
  }

  // 2. Magic byte checks
  // PNG: 89 50 4E 47
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { format: 'png', mimeType: 'image/png', valid: true };
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { format: 'jpg', mimeType: 'image/jpeg', valid: true };
  }

  // WEBP: RIFF...WEBP or WAVE or AVI
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    const riffType = buffer.subarray(8, 12).toString('ascii');
    if (riffType === 'WEBP') {
      return { format: 'webp', mimeType: 'image/webp', valid: true };
    }
    if (riffType === 'WAVE') {
      return { format: 'wav', mimeType: 'audio/wav', valid: true };
    }
    if (riffType === 'AVI ') {
      return { format: 'avi', mimeType: 'video/x-msvideo', valid: true };
    }
  }

  // PDF: %PDF
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { format: 'pdf', mimeType: 'application/pdf', valid: true };
  }

  // GGUF: GGUF (0x47 0x47 0x55 0x46)
  if (buffer.length >= 4 && buffer[0] === 0x47 && buffer[1] === 0x47 && buffer[2] === 0x55 && buffer[3] === 0x46) {
    return { format: 'gguf', mimeType: 'application/x-gguf', valid: true };
  }

  // GGML: ggml (0x67 0x67 0x6d 0x6c)
  if (buffer.length >= 4 && buffer[0] === 0x67 && buffer[1] === 0x67 && buffer[2] === 0x6d) {
    return { format: 'ggml', mimeType: 'application/x-ggml', valid: true };
  }

  // SafeTensors: Header size prefix in first 8 bytes (little-endian uint64) followed by '{'
  if (buffer.length >= 10) {
    try {
      const headerLen = Number(buffer.readBigUInt64LE(0));
      if (headerLen > 0 && headerLen < 100 * 1024 * 1024 && buffer[8] === 0x7b) {
        return { format: 'safetensors', mimeType: 'application/x-safetensors', valid: true };
      }
    } catch {}
  }

  // FLAC: fLaC (66 4C 61 43)
  if (buffer.length >= 4 && buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) {
    return { format: 'flac', mimeType: 'audio/flac', valid: true };
  }

  // Ogg container: OggS (4F 67 67 53)
  if (buffer.length >= 4 && buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    if (fileExt === 'opus') return { format: 'opus', mimeType: 'audio/opus', valid: true };
    return { format: 'ogg', mimeType: 'audio/ogg', valid: true };
  }

  // MP3: ID3v2 header or sync frame 0xFF 0xFB / 0xF3 / 0xF2
  if (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { format: 'mp3', mimeType: 'audio/mpeg', valid: true };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return { format: 'mp3', mimeType: 'audio/mpeg', valid: true };
  }

  // MP4 / MOV / M4A / QuickTime: 'ftyp' at offset 4
  if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.includes('m4a')) return { format: 'm4a', mimeType: 'audio/mp4', valid: true };
    if (brand.includes('qt')) return { format: 'mov', mimeType: 'video/quicktime', valid: true };
    if (brand.includes('heic') || brand.includes('mif1')) return { format: 'heic', mimeType: 'image/heic', valid: true };
    if (brand.includes('avif')) return { format: 'avif', mimeType: 'image/avif', valid: true };
    return { format: 'mp4', mimeType: 'video/mp4', valid: true };
  }

  // Matroska / WebM: EBML header (1A 45 DF A3)
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    if (fileExt === 'webm') return { format: 'webm', mimeType: 'video/webm', valid: true };
    return { format: 'mkv', mimeType: 'video/x-matroska', valid: true };
  }

  // Parquet: PAR1 magic bytes at beginning
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x41 && buffer[2] === 0x52 && buffer[3] === 0x31) {
    return { format: 'parquet', mimeType: 'application/vnd.apache.parquet', valid: true };
  }

  // HDF5 / Keras v2: \x89HDF\r\n\x1a\n (89 48 44 46 0D 0A 1A 0A)
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x48 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { format: fileExt === 'keras' ? 'keras' : 'h5', mimeType: 'application/x-hdf5', valid: true };
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

  // ZIP-based Office Formats (DOCX, XLSX, PPTX, ODT, Keras, 3MF): PK.. (0x50 0x4B 0x03 0x04)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    if (fileExt === 'docx') return { format: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', valid: true };
    if (fileExt === 'xlsx') return { format: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', valid: true };
    if (fileExt === 'pptx') return { format: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', valid: true };
    if (fileExt === 'odt') return { format: 'odt', mimeType: 'application/vnd.oasis.opendocument.text', valid: true };
    if (fileExt === 'ods') return { format: 'ods', mimeType: 'application/vnd.oasis.opendocument.spreadsheet', valid: true };
    if (fileExt === 'odp') return { format: 'odp', mimeType: 'application/vnd.oasis.opendocument.presentation', valid: true };
    if (fileExt === 'keras') return { format: 'keras', mimeType: 'application/x-keras', valid: true };
    if (fileExt === '3mf') return { format: '3mf', mimeType: 'model/3mf', valid: true };
    if (fileExt === 'pt' || fileExt === 'pth' || fileExt === 'ckpt') return { format: fileExt, mimeType: 'application/octet-stream', valid: true };
    return { format: 'zip', mimeType: 'application/zip', valid: true };
  }

  // PostScript / EPS / AI
  if (buffer.length >= 10 && buffer.subarray(0, 10).toString('ascii').startsWith('%!PS-Adobe')) {
    if (fileExt === 'ai') return { format: 'ai', mimeType: 'application/postscript', valid: true };
    return { format: 'eps', mimeType: 'application/postscript', valid: true };
  }

  // Comprehensive extension registry mapping for all supported formats
  const ALL_REGISTERED_FORMATS: Record<string, string> = {
    // Documents
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    rtf: 'application/rtf',
    txt: 'text/plain',
    html: 'text/html',
    htm: 'text/html',
    md: 'text/markdown',

    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    avif: 'image/avif',
    heic: 'image/heic',
    heif: 'image/heif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',

    // PDF
    pdf: 'application/pdf',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    aiff: 'audio/aiff',
    wma: 'audio/x-ms-wma',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',

    // CAD, BIM & Steel
    dxf: 'image/vnd.dxf',
    dwg: 'image/vnd.dwg',
    dwf: 'model/vnd.dwf',
    dstv: 'application/octet-stream',
    nc: 'text/plain',
    gcode: 'text/x-gcode',
    ifc: 'application/x-step',
    step: 'application/step',
    stp: 'application/step',
    iges: 'model/iges',
    igs: 'model/iges',
    std: 'application/octet-stream',

    // 3D Geometry
    obj: 'model/obj',
    stl: 'model/stl',
    ply: 'model/ply',
    '3mf': 'model/3mf',
    off: 'model/off',
    fbx: 'application/octet-stream',
    '3ds': 'image/x-3ds',
    gltf: 'model/gltf+json',
    glb: 'model/gltf-binary',

    // Adobe & Design
    psd: 'image/vnd.adobe.photoshop',
    ai: 'application/postscript',
    eps: 'application/postscript',
    indd: 'application/x-indesign',
    cdr: 'application/cdr',

    // Machine Learning & AI
    safetensors: 'application/x-safetensors',
    gguf: 'application/x-gguf',
    ggml: 'application/x-ggml',
    onnx: 'application/octet-stream',
    tflite: 'application/octet-stream',
    h5: 'application/x-hdf5',
    hdf5: 'application/x-hdf5',
    keras: 'application/x-keras',
    pt: 'application/octet-stream',
    pth: 'application/octet-stream',
    ckpt: 'application/octet-stream',
    pkl: 'application/octet-stream',

    // Data Science & Tabular
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    parquet: 'application/vnd.apache.parquet',
    json: 'application/json',
    jsonl: 'application/x-ndjson',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    xml: 'application/xml',
    sql: 'application/sql',

    // Archives
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  if (fileExt && ALL_REGISTERED_FORMATS[fileExt]) {
    const normalizedExt = fileExt === 'jpeg' ? 'jpg' : fileExt === 'tif' ? 'tiff' : fileExt === 'htm' ? 'html' : fileExt === 'yml' ? 'yaml' : fileExt === 'stp' ? 'step' : fileExt === 'igs' ? 'iges' : fileExt;
    return {
      format: normalizedExt,
      mimeType: ALL_REGISTERED_FORMATS[fileExt],
      valid: true,
    };
  }

  return {
    format: fileExt || 'unknown',
    mimeType: 'application/octet-stream',
    valid: false,
    reason: `Unsupported format .${fileExt || 'unknown'}. Please upload a supported document, image, CAD, 3D, audio, video, or data format.`,
  };
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
