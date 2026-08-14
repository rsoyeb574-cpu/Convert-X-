import sharp from 'sharp';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export class SharpImageConverter implements ConverterEngine {
  id = 'sharp-image-engine';
  name = 'Sharp High-Performance Image Engine';
  description = 'Hardware-accelerated libvips raster engine for PNG, JPG, JPEG, and WEBP formats with precision resizing, transparency flattening, and metadata handling.';

  supportedInputFormats = ['png', 'jpg', 'jpeg', 'webp'];
  supportedOutputFormats = ['png', 'jpg', 'webp'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return ['png', 'jpg', 'webp'].includes(inFmt) && ['png', 'jpg', 'webp'].includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
    if (!this.supportedInputFormats.includes(fmt)) {
      return { valid: false, reason: `Format .${inputFormat} is not supported by the raster image engine.` };
    }

    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return { valid: false, reason: 'Empty file buffer.' };
      }
      const metadata = await sharp(fileBuffer).metadata();
      if (!metadata.format) {
        return { valid: false, reason: 'Invalid or corrupt image header.' };
      }
      return { valid: true, detectedFormat: metadata.format === 'jpeg' ? 'jpg' : metadata.format };
    } catch (err: any) {
      return { valid: false, reason: `Invalid image: ${err.message || 'Corrupted raster data'}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    let pipeline = sharp(inputBuffer);

    // 1. Resizing
    if (options.width || options.height) {
      const resizeOptions: { width?: number; height?: number; fit?: 'inside' | 'fill' | 'cover' | 'contain' | 'outside'; withoutEnlargement?: boolean } = {
        width: options.width ? parseInt(String(options.width), 10) : undefined,
        height: options.height ? parseInt(String(options.height), 10) : undefined,
        fit: options.maintainAspectRatio !== false ? 'inside' : 'fill',
        withoutEnlargement: false,
      };
      pipeline = pipeline.resize(resizeOptions);
    }

    // 2. Format encoding
    let outputBuffer: Buffer;
    let mimeType: string;

    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;

    if (target === 'jpg') {
      const bgColor = options.backgroundColor && options.backgroundColor !== 'transparent'
        ? options.backgroundColor
        : '#ffffff';
      pipeline = pipeline.flatten({ background: bgColor });
      outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      mimeType = 'image/jpeg';
    } else if (target === 'webp') {
      if (options.backgroundColor && options.backgroundColor !== 'transparent') {
        pipeline = pipeline.flatten({ background: options.backgroundColor });
      }
      outputBuffer = await pipeline.webp({ quality }).toBuffer();
      mimeType = 'image/webp';
    } else {
      // Default PNG
      if (options.backgroundColor && options.backgroundColor !== 'transparent') {
        pipeline = pipeline.flatten({ background: options.backgroundColor });
      }
      outputBuffer = await pipeline.png({ quality: Math.min(100, quality) }).toBuffer();
      mimeType = 'image/png';
    }

    const metadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      mimeType,
      outputExtension: target,
      width: metadata.width,
      height: metadata.height,
    };
  }
}
