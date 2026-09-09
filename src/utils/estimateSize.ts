/**
 * Universal file size estimator and compression ratio calculation
 */

export interface CompressionRatioInfo {
  percent: number; // e.g., 45 for 45% reduction, -20 for 20% increase
  isReduction: boolean;
  diffBytes: number;
  formattedDiff: string;
  ratioLabel: string;
  multiplier: string;
  colorClass: 'emerald' | 'blue' | 'slate' | 'amber';
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculates pre-conversion estimated output size based on format, size, and options.
 */
export function calculateEstimatedSize(
  inputFormat: string,
  outputFormat: string,
  inputSize: number,
  options?: { quality?: number; dpi?: number; resolution?: number; [key: string]: any }
): number {
  if (!inputSize || inputSize <= 0) return 0;
  const inFmt = (inputFormat || '').toLowerCase().replace(/^\./, '');
  const outFmt = (outputFormat || '').toLowerCase().replace(/^\./, '');

  if (inFmt === outFmt) {
    const quality = options?.quality ?? 80;
    return Math.max(512, Math.round(inputSize * (quality / 100)));
  }

  const qualityFactor = options?.quality ? options.quality / 80 : 1.0;

  // 1. RASTER IMAGES
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'avif'].includes(inFmt)) {
    if (outFmt === 'webp') {
      if (inFmt === 'png') return Math.round(inputSize * 0.35 * qualityFactor);
      if (inFmt === 'jpg' || inFmt === 'jpeg') return Math.round(inputSize * 0.75 * qualityFactor);
      if (inFmt === 'bmp' || inFmt === 'tiff') return Math.round(inputSize * 0.15 * qualityFactor);
      return Math.round(inputSize * 0.65 * qualityFactor);
    }
    if (outFmt === 'jpg' || outFmt === 'jpeg') {
      if (inFmt === 'png') return Math.round(inputSize * 0.45 * qualityFactor);
      if (inFmt === 'webp') return Math.round(inputSize * 1.25 * qualityFactor);
      if (inFmt === 'bmp' || inFmt === 'tiff') return Math.round(inputSize * 0.20 * qualityFactor);
      return Math.round(inputSize * 0.80 * qualityFactor);
    }
    if (outFmt === 'png') {
      if (inFmt === 'jpg' || inFmt === 'jpeg') return Math.round(inputSize * 2.2);
      if (inFmt === 'webp') return Math.round(inputSize * 2.8);
      if (inFmt === 'bmp' || inFmt === 'tiff') return Math.round(inputSize * 0.40);
      return Math.round(inputSize * 1.1);
    }
    if (outFmt === 'pdf') {
      return Math.round(inputSize + 12288);
    }
    if (outFmt === 'avif') {
      return Math.round(inputSize * 0.30 * qualityFactor);
    }
  }

  // 2. VECTOR / CAD
  if (['svg', 'eps', 'dxf', 'dwg'].includes(inFmt)) {
    if (outFmt === 'svg') return Math.round(Math.max(1024, inputSize * 0.7));
    if (outFmt === 'png' || outFmt === 'jpg' || outFmt === 'webp') {
      const dpi = options?.dpi || 150;
      const factor = (dpi / 150) * (dpi / 150);
      return Math.round(180 * 1024 * factor);
    }
    if (outFmt === 'pdf') return Math.round(Math.max(16384, inputSize * 0.5 + 20480));
    if (outFmt === 'dxf') return Math.round(inputSize * 1.8);
  }

  // 3. DOCUMENTS
  if (['pdf', 'docx', 'xlsx', 'txt', 'html', 'pptx', 'odt', 'rtf'].includes(inFmt)) {
    if (outFmt === 'pdf') {
      if (inFmt === 'docx') return Math.round(inputSize * 0.75 + 15360);
      if (inFmt === 'xlsx') return Math.round(inputSize * 0.85 + 20480);
      if (inFmt === 'txt') return Math.round(inputSize * 1.5 + 12288);
      return Math.round(inputSize * 0.9 + 10240);
    }
    if (outFmt === 'png' || outFmt === 'jpg') {
      return Math.round(160 * 1024);
    }
    if (outFmt === 'txt') {
      return Math.max(512, Math.round(inputSize * 0.15));
    }
  }

  // 4. 3D MODELS
  if (['obj', 'stl', 'ply', '3mf', 'off', 'fbx'].includes(inFmt)) {
    if (inFmt === 'obj' && outFmt === 'stl') return Math.round(inputSize * 0.42);
    if (inFmt === 'stl' && outFmt === 'obj') return Math.round(inputSize * 2.3);
    if (outFmt === 'ply') return Math.round(inputSize * 0.65);
    if (outFmt === '3mf') return Math.round(inputSize * 0.35);
    if (outFmt === 'off') return Math.round(inputSize * 1.8);
    if (outFmt === 'png' || outFmt === 'jpg' || outFmt === 'svg' || outFmt === 'pdf') {
      return Math.round(220 * 1024);
    }
  }

  // 5. DATA / TABULAR
  if (['csv', 'tsv', 'json', 'yaml', 'yml', 'xml', 'parquet', 'xlsx'].includes(inFmt)) {
    if (inFmt === 'csv' && outFmt === 'json') return Math.round(inputSize * 1.85);
    if (inFmt === 'json' && outFmt === 'csv') return Math.round(inputSize * 0.52);
    if (outFmt === 'parquet') return Math.max(1024, Math.round(inputSize * 0.28));
    if (inFmt === 'parquet' && (outFmt === 'csv' || outFmt === 'json')) return Math.round(inputSize * 3.6);
    if (outFmt === 'yaml' || outFmt === 'yml') return Math.round(inputSize * 1.6);
    if (outFmt === 'xml') return Math.round(inputSize * 2.1);
    if (outFmt === 'xlsx') return Math.round(inputSize * 0.70 + 16384);
  }

  // 6. AUDIO
  if (['wav', 'mp3', 'aac', 'ogg', 'flac', 'm4a', 'opus', 'aiff'].includes(inFmt)) {
    if (inFmt === 'wav' || inFmt === 'aiff') {
      if (outFmt === 'mp3' || outFmt === 'm4a') return Math.round(inputSize * 0.14);
      if (outFmt === 'ogg' || outFmt === 'opus') return Math.round(inputSize * 0.10);
      if (outFmt === 'flac') return Math.round(inputSize * 0.55);
    }
    if (inFmt === 'flac' && outFmt === 'mp3') return Math.round(inputSize * 0.32);
    if (outFmt === 'wav') return Math.round(inputSize * 6.5);
  }

  // 7. VIDEO
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(inFmt)) {
    if (outFmt === 'mp3' || outFmt === 'wav' || outFmt === 'aac') {
      return Math.round(inputSize * 0.12);
    }
    if (outFmt === 'gif') {
      return Math.round(inputSize * 3.2);
    }
    if (outFmt === 'webm') return Math.round(inputSize * 0.75);
    if (outFmt === 'mp4') return Math.round(inputSize * 0.90);
  }

  // 8. STEEL / FABRICATION
  if (['nc', 'nc1', 'dstv', 'gcode'].includes(inFmt)) {
    if (outFmt === 'dxf' || outFmt === 'svg') return Math.round(inputSize * 1.2 + 8192);
    if (outFmt === 'pdf' || outFmt === 'png') return Math.round(140 * 1024);
  }

  // Fallback heuristic
  return Math.max(1024, Math.round(inputSize * 0.70));
}

/**
 * Attempts to fetch a server-calculated estimated output size if the server endpoint is available.
 * Falls back to client-calculated heuristic if server is unavailable or on network error.
 */
export async function fetchEstimatedOutputSize(
  inputFormat: string,
  outputFormat: string,
  inputSize: number,
  options?: any
): Promise<number> {
  const localEstimate = calculateEstimatedSize(inputFormat, outputFormat, inputSize, options);
  if (!outputFormat || !inputSize) return localEstimate;

  try {
    const params = new URLSearchParams({
      inputFormat,
      outputFormat,
      fileSize: String(inputSize),
      ...(options?.quality ? { quality: String(options.quality) } : {}),
      ...(options?.dpi ? { dpi: String(options.dpi) } : {}),
    });

    const res = await fetch(`/api/estimate?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.estimatedOutputSize === 'number' && data.estimatedOutputSize > 0) {
        return data.estimatedOutputSize;
      }
    }
  } catch {
    // Graceful fallback to client estimate
  }

  return localEstimate;
}

/**
 * Calculates compression ratio and comparative savings between original and output sizes.
 */
export function getCompressionRatio(originalSize: number, outputSize: number): CompressionRatioInfo {
  if (!originalSize || originalSize <= 0 || !outputSize || outputSize <= 0) {
    return {
      percent: 0,
      isReduction: false,
      diffBytes: 0,
      formattedDiff: '0 Bytes',
      ratioLabel: '0%',
      multiplier: '1.0x',
      colorClass: 'slate',
    };
  }

  const diffBytes = originalSize - outputSize;
  const isReduction = diffBytes > 0;
  const percent = Math.round((Math.abs(diffBytes) / originalSize) * 100);

  let ratioLabel = '';
  let multiplier = '';
  let colorClass: 'emerald' | 'blue' | 'slate' | 'amber' = 'slate';

  if (isReduction) {
    ratioLabel = `-${percent}%`;
    const mult = (originalSize / outputSize).toFixed(1);
    multiplier = `${mult}x smaller`;
    colorClass = 'emerald';
  } else if (diffBytes < 0) {
    ratioLabel = `+${percent}%`;
    const mult = (outputSize / originalSize).toFixed(1);
    multiplier = `${mult}x expanded`;
    colorClass = percent > 50 ? 'amber' : 'blue';
  } else {
    ratioLabel = '0%';
    multiplier = 'Identical';
    colorClass = 'slate';
  }

  return {
    percent,
    isReduction,
    diffBytes: Math.abs(diffBytes),
    formattedDiff: formatFileSize(Math.abs(diffBytes)),
    ratioLabel,
    multiplier,
    colorClass,
  };
}
