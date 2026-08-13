import sharp from 'sharp';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export class SharpImageConverter implements ConverterEngine {
  id = 'sharp-image-engine';
  name = 'Sharp High-Performance Image Engine';
  description = 'Ultra-fast image processing engine supporting PNG, JPG, WEBP, and SVG vector rendering.';

  supportedInputFormats = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
  supportedOutputFormats = ['png', 'jpg', 'webp', 'svg'];

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    try {
      const normalized = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
      if (!this.supportedInputFormats.includes(normalized)) {
        return { valid: false, reason: `Format ${inputFormat} is not supported by Sharp engine.` };
      }

      // Metadata check
      const meta = await sharp(fileBuffer).metadata();
      if (!meta || !meta.format) {
        return { valid: false, reason: 'Invalid or corrupt image buffer.' };
      }

      return { valid: true, detectedFormat: meta.format };
    } catch (err: any) {
      return { valid: false, reason: `Image validation failed: ${err.message || 'Corrupt file'}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // DPI & density calculation (72 default -> scale up for higher DPIs like 150 or 300)
    const dpi = options.dpi || 72;
    const density = Math.round((dpi / 72) * 72);

    let pipeline = sharp(inputBuffer, { density: density > 72 ? density : 300 });

    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;

    // Background color handling
    if (target === 'jpg') {
      // JPEG doesn't support transparency -> flatten with selected background color
      const bgColor = options.backgroundColor && options.backgroundColor !== 'transparent'
        ? options.backgroundColor
        : '#ffffff';
      pipeline = pipeline.flatten({ background: bgColor });
    } else if (options.backgroundColor && options.backgroundColor !== 'transparent') {
      pipeline = pipeline.flatten({ background: options.backgroundColor });
    }

    // Resolution / scale handling if requested
    if (options.resolution && options.resolution > 0 && options.resolution !== 100) {
      const meta = await sharp(inputBuffer).metadata();
      if (meta.width && meta.height) {
        const scale = options.resolution / 100;
        const targetWidth = Math.round(meta.width * scale);
        pipeline = pipeline.resize(targetWidth, null, { fit: 'contain' });
      }
    }

    let outputBuffer: Buffer;
    let mimeType: string;

    switch (target) {
      case 'png':
        outputBuffer = await pipeline.png({ quality, compressionLevel: 8 }).toBuffer();
        mimeType = 'image/png';
        break;
      case 'jpg':
        outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
        mimeType = 'image/jpeg';
        break;
      case 'webp':
        outputBuffer = await pipeline.webp({ quality }).toBuffer();
        mimeType = 'image/webp';
        break;
      default:
        throw new Error(`Unsupported output format ${outputFormat} for Sharp engine`);
    }

    const outMeta = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      mimeType,
      outputExtension: target,
      width: outMeta.width,
      height: outMeta.height,
    };
  }
}
