import sharp from 'sharp';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export class SvgConverter implements ConverterEngine {
  id = 'svg-vector-engine';
  name = 'SVG High-Fidelity Vector Engine';
  description = 'Direct SVG vector rendering to crisp PNG, JPG, WEBP rasters and vector-embedded PDF documents at custom DPI.';

  supportedInputFormats = ['svg'];
  supportedOutputFormats = ['png', 'jpg', 'webp', 'pdf'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return inFmt === 'svg' && ['png', 'jpg', 'webp', 'pdf'].includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (inputFormat.toLowerCase() !== 'svg') {
      return { valid: false, reason: 'Only .SVG vector files are handled by the SVG engine.' };
    }

    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return { valid: false, reason: 'Empty SVG file buffer.' };
      }
      const text = fileBuffer.toString('utf-8');
      if (!text.includes('<svg') || !text.includes('</svg>')) {
        return { valid: false, reason: 'File does not contain valid <svg> XML root structure.' };
      }
      return { valid: true, detectedFormat: 'svg' };
    } catch (err: any) {
      return { valid: false, reason: `Invalid SVG: ${err.message || 'Corrupted text'}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    const dpi = options.dpi || 150;
    const density = Math.round((dpi / 72) * 150);

    // 1. SVG -> PDF
    if (target === 'pdf') {
      const pngBuffer = await sharp(inputBuffer, { density })
        .png({ quality: 100 })
        .toBuffer();

      const pdfDoc = await PDFDocument.create();
      const pngImage = await pdfDoc.embedPng(pngBuffer);

      let [pageWidth, pageHeight] = PageSizes.A4;
      const isLandscape = options.orientation === 'landscape';
      const pageSizeSetting = options.pageSize || 'a4';

      if (pageSizeSetting === 'letter') {
        pageWidth = 612; pageHeight = 792;
      } else if (pageSizeSetting === 'legal') {
        pageWidth = 612; pageHeight = 1008;
      } else if (pageSizeSetting === 'a3') {
        pageWidth = 841.89; pageHeight = 1190.55;
      } else if (pageSizeSetting === 'a2') {
        pageWidth = 1190.55; pageHeight = 1683.78;
      } else if (pageSizeSetting === 'a1') {
        pageWidth = 1683.78; pageHeight = 2383.94;
      } else if (pageSizeSetting === 'a0') {
        pageWidth = 2383.94; pageHeight = 3370.39;
      } else if (pageSizeSetting === 'auto') {
        pageWidth = pngImage.width;
        pageHeight = pngImage.height;
      }

      if (isLandscape && pageSizeSetting !== 'auto') {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const margin = typeof options.margin === 'number' ? options.margin : 20;

      let drawW = pngImage.width;
      let drawH = pngImage.height;
      let x = 0;
      let y = 0;

      if (pageSizeSetting !== 'auto') {
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const scale = Math.min(maxW / pngImage.width, maxH / pngImage.height);
        drawW = pngImage.width * scale;
        drawH = pngImage.height * scale;
        x = (pageWidth - drawW) / 2;
        y = (pageHeight - drawH) / 2;
      }

      page.drawImage(pngImage, {
        x,
        y,
        width: drawW,
        height: drawH,
      });

      const pdfBytes = await pdfDoc.save();
      return {
        buffer: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
        pageCount: 1,
      };
    }

    // 2. SVG -> Raster (PNG, JPG, WEBP)
    let pipeline = sharp(inputBuffer, { density });

    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width || null, options.height || null, {
        fit: options.maintainAspectRatio !== false ? 'contain' : 'fill',
      });
    }

    let outputBuf: Buffer;
    let mimeType: string;

    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;

    if (target === 'jpg') {
      const bgColor = options.backgroundColor && options.backgroundColor !== 'transparent'
        ? options.backgroundColor
        : '#ffffff';
      pipeline = pipeline.flatten({ background: bgColor });
      outputBuf = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      mimeType = 'image/jpeg';
    } else if (target === 'webp') {
      if (options.backgroundColor && options.backgroundColor !== 'transparent') {
        pipeline = pipeline.flatten({ background: options.backgroundColor });
      }
      outputBuf = await pipeline.webp({ quality }).toBuffer();
      mimeType = 'image/webp';
    } else {
      // Default PNG
      if (options.backgroundColor && options.backgroundColor !== 'transparent') {
        pipeline = pipeline.flatten({ background: options.backgroundColor });
      }
      outputBuf = await pipeline.png({ quality }).toBuffer();
      mimeType = 'image/png';
    }

    const metadata = await sharp(outputBuf).metadata();

    return {
      buffer: outputBuf,
      mimeType,
      outputExtension: target,
      width: metadata.width,
      height: metadata.height,
    };
  }
}
