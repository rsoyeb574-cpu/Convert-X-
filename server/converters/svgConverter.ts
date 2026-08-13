import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export class SvgConverter implements ConverterEngine {
  id = 'svg-vector-engine';
  name = 'SVG Vector Processing Engine';
  description = 'Resolution-independent SVG vector converter preserving paths, viewports, fonts, and alpha transparency.';

  supportedInputFormats = ['svg'];
  supportedOutputFormats = ['png', 'jpg', 'jpeg', 'webp', 'pdf'];

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (inputFormat.toLowerCase() !== 'svg') {
      return { valid: false, reason: 'Only SVG vector files are supported by the SVG engine.' };
    }

    try {
      const head = fileBuffer.slice(0, 4096).toString('utf-8').toLowerCase();
      if (!head.includes('<svg') && !head.includes('<?xml')) {
        return { valid: false, reason: 'Invalid SVG file header structure.' };
      }
      return { valid: true, detectedFormat: 'svg' };
    } catch (err: any) {
      return { valid: false, reason: `Invalid SVG file: ${err.message || 'Syntax error'}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    const dpi = options.dpi || 150;
    const density = Math.round((dpi / 72) * 150);

    let pipeline = sharp(inputBuffer, { density });

    // Handle custom width / height if provided
    if (options.width || options.height) {
      const fitMode = options.maintainAspectRatio !== false ? 'contain' : 'fill';
      pipeline = pipeline.resize(options.width || null, options.height || null, { fit: fitMode });
    }

    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;

    // Background color
    if (target === 'jpg') {
      const bgColor = options.backgroundColor && options.backgroundColor !== 'transparent'
        ? options.backgroundColor
        : '#ffffff';
      pipeline = pipeline.flatten({ background: bgColor });
    } else if (options.backgroundColor && options.backgroundColor !== 'transparent') {
      pipeline = pipeline.flatten({ background: options.backgroundColor });
    }

    // Raster outputs
    if (['png', 'jpg', 'webp'].includes(target)) {
      let outputBuffer: Buffer;
      let mimeType: string;

      if (target === 'png') {
        outputBuffer = await pipeline.png({ quality }).toBuffer();
        mimeType = 'image/png';
      } else if (target === 'jpg') {
        outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
        mimeType = 'image/jpeg';
      } else {
        outputBuffer = await pipeline.webp({ quality }).toBuffer();
        mimeType = 'image/webp';
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

    // SVG -> PDF
    if (target === 'pdf') {
      const highResPng = await sharp(inputBuffer, { density: 300 }).png().toBuffer();
      const pdfDoc = await PDFDocument.create();
      const embedImg = await pdfDoc.embedPng(highResPng);

      const isLandscape = options.orientation === 'landscape';
      let pageWidth = 595.28; // A4 default
      let pageHeight = 841.89;

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
        pageWidth = embedImg.width; pageHeight = embedImg.height;
      }

      if (isLandscape && pageSizeSetting !== 'auto') {
        const tmp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = tmp;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const margin = typeof options.margin === 'number' ? options.margin : 20;

      let drawW = embedImg.width;
      let drawH = embedImg.height;
      let x = 0;
      let y = 0;

      if (pageSizeSetting !== 'auto') {
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const scale = Math.min(maxW / embedImg.width, maxH / embedImg.height);
        drawW = embedImg.width * scale;
        drawH = embedImg.height * scale;
        x = (pageWidth - drawW) / 2;
        y = (pageHeight - drawH) / 2;
      }

      page.drawImage(embedImg, { x, y, width: drawW, height: drawH });
      const pdfBytes = await pdfDoc.save();

      return {
        buffer: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
        pageCount: 1,
      };
    }

    throw new Error(`Unsupported output format ${outputFormat} for SVG Converter Engine.`);
  }
}
