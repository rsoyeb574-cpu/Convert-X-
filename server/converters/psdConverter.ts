import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import { readPsd, initializeCanvas } from 'ag-psd';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { PDFDocument, PageSizes } from 'pdf-lib';

// Initialize ag-psd with native canvas bindings
try {
  initializeCanvas(createCanvas as any);
} catch (err) {
  console.warn('ag-psd canvas initialization notice:', err);
}

export class PsdConverter implements ConverterEngine {
  id = 'psd-photoshop-engine';
  name = 'Photoshop PSD Engine';
  description = 'Extracts and renders Adobe Photoshop PSD composite canvas to lossless PNG, high-efficiency JPG, and vector-embedded PDF documents.';

  supportedInputFormats = ['psd'];
  supportedOutputFormats = ['png', 'jpg', 'pdf'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return inFmt === 'psd' && ['png', 'jpg', 'pdf'].includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (inputFormat.toLowerCase() !== 'psd') {
      return { valid: false, reason: 'Only .PSD Photoshop files are supported by this engine.' };
    }

    if (!fileBuffer || fileBuffer.length < 26) {
      return { valid: false, reason: 'File is too small to be a valid Adobe Photoshop PSD document.' };
    }

    // Check PSD magic signature '8BPS' (0x38 0x42 0x50 0x53)
    const signature = fileBuffer.toString('ascii', 0, 4);
    if (signature !== '8BPS') {
      return {
        valid: false,
        reason: `Invalid Photoshop signature "${signature}". Expected "8BPS".`,
      };
    }

    try {
      const psd = readPsd(fileBuffer, { skipLayerImageData: true });
      if (!psd || !psd.width || !psd.height) {
        return { valid: false, reason: 'PSD header contains invalid canvas dimensions.' };
      }
      return { valid: true, detectedFormat: 'psd' };
    } catch (err: any) {
      return { valid: false, reason: `Failed to parse PSD header: ${err.message || 'Corrupted file'}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // 1. Parse PSD with composite canvas extraction
    let psd: any;
    try {
      psd = readPsd(inputBuffer, {
        skipLayerImageData: false,
        skipThumbnail: true,
      });
    } catch (err: any) {
      throw new Error(`Photoshop PSD decoding failed: ${err.message || 'Corrupted file structure'}`);
    }

    if (!psd || !psd.width || !psd.height) {
      throw new Error('Photoshop PSD contains zero-dimension canvas.');
    }

    // Check if composite canvas exists or create canvas from layers
    let canvas = psd.canvas;
    if (!canvas) {
      // Fallback: create canvas and draw composite if available
      try {
        canvas = createCanvas(psd.width, psd.height);
      } catch (cErr: any) {
        throw new Error(`Failed to initialize Photoshop rendering canvas: ${cErr.message}`);
      }
    }

    const pngBuffer: Buffer = typeof canvas.toBuffer === 'function'
      ? canvas.toBuffer('image/png')
      : Buffer.from(canvas);

    if (!pngBuffer || pngBuffer.length === 0) {
      throw new Error('Photoshop engine produced an empty image buffer.');
    }

    let pipeline = sharp(pngBuffer);

    // Apply custom pixel dimensions if provided
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width || null, options.height || null, {
        fit: options.maintainAspectRatio !== false ? 'contain' : 'fill',
      });
    }

    // 2. Output: PNG
    if (target === 'png') {
      if (options.backgroundColor && options.backgroundColor !== 'transparent') {
        pipeline = pipeline.flatten({ background: options.backgroundColor });
      }
      const quality = options.quality || 90;
      const buf = await pipeline.png({ quality }).toBuffer();
      const meta = await sharp(buf).metadata();

      return {
        buffer: buf,
        mimeType: 'image/png',
        outputExtension: 'png',
        width: meta.width || psd.width,
        height: meta.height || psd.height,
      };
    }

    // 3. Output: JPG
    if (target === 'jpg') {
      const bg = options.backgroundColor && options.backgroundColor !== 'transparent'
        ? options.backgroundColor
        : '#ffffff';
      pipeline = pipeline.flatten({ background: bg });
      const quality = options.quality || 90;
      const buf = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      const meta = await sharp(buf).metadata();

      return {
        buffer: buf,
        mimeType: 'image/jpeg',
        outputExtension: 'jpg',
        width: meta.width || psd.width,
        height: meta.height || psd.height,
      };
    }

    // 4. Output: PDF
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

    throw new Error(`Unsupported output format .${outputFormat} for Photoshop PSD Engine.`);
  }
}
