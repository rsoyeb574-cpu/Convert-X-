import sharp from 'sharp';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export class SharpImageConverter implements ConverterEngine {
  id = 'sharp-image-engine';
  name = 'Sharp High-Performance Image Engine';
  description = 'Hardware-accelerated libvips raster engine for PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, and AVIF formats with precision resizing, transparency flattening, and PDF generation.';

  supportedInputFormats = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'avif'];
  supportedOutputFormats = ['png', 'jpg', 'webp', 'pdf'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return this.supportedInputFormats.includes(inFmt) && this.supportedOutputFormats.includes(outFmt);
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

    // 2. Output: PDF
    if (target === 'pdf') {
      const flattenedPng = await pipeline.png().toBuffer();
      const pdfDoc = await PDFDocument.create();
      const embeddedImage = await pdfDoc.embedPng(flattenedPng);

      const isLandscape = options.orientation === 'landscape';
      let [pageWidth, pageHeight] = PageSizes.A4;

      const pageSizeSetting = options.pageSize || 'a4';
      if (pageSizeSetting === 'a3') {
        pageWidth = 841.89; pageHeight = 1190.55;
      } else if (pageSizeSetting === 'a2') {
        pageWidth = 1190.55; pageHeight = 1683.78;
      } else if (pageSizeSetting === 'a1') {
        pageWidth = 1683.78; pageHeight = 2383.94;
      } else if (pageSizeSetting === 'a0') {
        pageWidth = 2383.94; pageHeight = 3370.39;
      } else if (pageSizeSetting === 'letter') {
        pageWidth = 612; pageHeight = 792;
      } else if (pageSizeSetting === 'legal') {
        pageWidth = 612; pageHeight = 1008;
      } else if (pageSizeSetting === 'auto') {
        pageWidth = embeddedImage.width;
        pageHeight = embeddedImage.height;
      }

      if (isLandscape && pageSizeSetting !== 'auto') {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const margin = typeof options.margin === 'number' ? options.margin : 20;

      let drawWidth = embeddedImage.width;
      let drawHeight = embeddedImage.height;
      let x = 0;
      let y = 0;

      if (pageSizeSetting !== 'auto') {
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const scale = Math.min(maxW / embeddedImage.width, maxH / embeddedImage.height);
        drawWidth = embeddedImage.width * scale;
        drawHeight = embeddedImage.height * scale;
        x = (pageWidth - drawWidth) / 2;
        y = (pageHeight - drawHeight) / 2;
      }

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });

      const pdfBytes = await pdfDoc.save();
      return {
        buffer: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
        pageCount: 1,
        width: Math.round(drawWidth),
        height: Math.round(drawHeight),
      };
    }

    // 3. Format encoding for raster images
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
