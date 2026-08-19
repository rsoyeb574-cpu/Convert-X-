import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import JSZip from 'jszip';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export class PdfConverter implements ConverterEngine {
  id = 'pdf-document-engine';
  name = 'PDF High-Fidelity Vector & Document Engine';
  description = 'Renders vector and text PDF pages to high-resolution PNG/JPG and embeds raster images into formatted PDF documents.';

  supportedInputFormats = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'svg'];
  supportedOutputFormats = ['pdf', 'png', 'jpg', 'webp'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    if (inFmt === 'pdf') {
      return ['png', 'jpg', 'webp', 'pdf'].includes(outFmt);
    }
    if (['png', 'jpg', 'webp', 'svg'].includes(inFmt)) {
      return outFmt === 'pdf';
    }
    return false;
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
    if (!this.supportedInputFormats.includes(fmt)) {
      return { valid: false, reason: `Format .${inputFormat} is not supported by PDF engine.` };
    }

    if (fmt === 'pdf') {
      try {
        if (!fileBuffer || fileBuffer.length < 10) {
          return { valid: false, reason: 'Empty or corrupted PDF file.' };
        }
        // Verify PDF header %PDF-
        const header = fileBuffer.subarray(0, 1024).toString('binary');
        if (!header.includes('%PDF-')) {
          return { valid: false, reason: 'File does not contain a valid PDF header.' };
        }

        const doc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const count = doc.getPageCount();
        if (count === 0) {
          return { valid: false, reason: 'PDF document contains 0 pages.' };
        }
        return { valid: true, detectedFormat: 'pdf' };
      } catch (err: any) {
        return { valid: false, reason: `Invalid PDF document: ${err.message || 'Corrupted stream'}` };
      }
    }

    return { valid: true, detectedFormat: fmt };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, inputFormat, outputFormat, options } = params;
    const inFmt = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // 1. Image / Vector -> PDF
    if (['png', 'jpg', 'webp', 'svg'].includes(inFmt) && outFmt === 'pdf') {
      return this.convertImageToPdf(inputBuffer, inFmt, options);
    }

    // 2. PDF -> PNG, JPG, or WEBP (Render actual pages)
    if (inFmt === 'pdf' && (outFmt === 'png' || outFmt === 'jpg' || outFmt === 'webp')) {
      return this.convertPdfToImage(inputBuffer, outFmt, options);
    }

    // 3. PDF -> PDF (Re-paginate, compress, orientation change)
    if (inFmt === 'pdf' && outFmt === 'pdf') {
      return this.reformatPdf(inputBuffer, options);
    }

    throw new Error(`Conversion from .${inputFormat} to .${outputFormat} is not supported by PDF Engine.`);
  }

  private async convertImageToPdf(
    buffer: Buffer,
    format: string,
    options: any
  ): Promise<ConvertResult> {
    const pdfDoc = await PDFDocument.create();

    const dpi = options.dpi || 150;
    const density = Math.round((dpi / 72) * 150);

    // Convert input image buffer to PNG with sharp for lossless embedding
    const pngBuf = await sharp(buffer, { density })
      .png({ quality: 100 })
      .toBuffer();

    const embedImage = await pdfDoc.embedPng(pngBuf);
    const imgWidth = embedImage.width;
    const imgHeight = embedImage.height;

    // Sizing
    let pageWidth: number;
    let pageHeight: number;

    const pageSizeSetting = options.pageSize || 'a4';
    const isLandscape = options.orientation === 'landscape';

    if (pageSizeSetting === 'letter') {
      pageWidth = isLandscape ? 792 : 612;
      pageHeight = isLandscape ? 612 : 792;
    } else if (pageSizeSetting === 'legal') {
      pageWidth = isLandscape ? 1008 : 612;
      pageHeight = isLandscape ? 612 : 1008;
    } else if (pageSizeSetting === 'a3') {
      pageWidth = isLandscape ? 1190.55 : 841.89;
      pageHeight = isLandscape ? 841.89 : 1190.55;
    } else if (pageSizeSetting === 'a2') {
      pageWidth = isLandscape ? 1683.78 : 1190.55;
      pageHeight = isLandscape ? 1190.55 : 1683.78;
    } else if (pageSizeSetting === 'a1') {
      pageWidth = isLandscape ? 2383.94 : 1683.78;
      pageHeight = isLandscape ? 1683.78 : 2383.94;
    } else if (pageSizeSetting === 'a0') {
      pageWidth = isLandscape ? 3370.39 : 2383.94;
      pageHeight = isLandscape ? 2383.94 : 3370.39;
    } else if (pageSizeSetting === 'auto') {
      pageWidth = imgWidth;
      pageHeight = imgHeight;
    } else {
      // Default A4
      const [a4W, a4H] = PageSizes.A4;
      pageWidth = isLandscape ? a4H : a4W;
      pageHeight = isLandscape ? a4W : a4H;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    let drawW = imgWidth;
    let drawH = imgHeight;
    let x = 0;
    let y = 0;

    if (options.fitToPage !== false && pageSizeSetting !== 'auto') {
      const margin = typeof options.margin === 'number' ? options.margin : 20;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;

      const scale = Math.min(maxW / imgWidth, maxH / imgHeight);
      drawW = imgWidth * scale;
      drawH = imgHeight * scale;

      x = (pageWidth - drawW) / 2;
      y = (pageHeight - drawH) / 2;
    }

    page.drawImage(embedImage, {
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
      width: Math.round(pageWidth),
      height: Math.round(pageHeight),
    };
  }

  private detectPdfPageFormat(ptWidth: number, ptHeight: number): string {
    const minPt = Math.min(ptWidth, ptHeight);
    const maxPt = Math.max(ptWidth, ptHeight);
    const isLandscape = ptWidth > ptHeight;
    const tol = 6; // tolerance in points

    const standardSizes: { name: string; min: number; max: number }[] = [
      { name: 'A0', min: 2384, max: 3370 },
      { name: 'A1', min: 1684, max: 2384 },
      { name: 'A2', min: 1191, max: 1684 },
      { name: 'A3', min: 842, max: 1191 },
      { name: 'A4', min: 595.28, max: 841.89 },
      { name: 'A5', min: 419.53, max: 595.28 },
      { name: 'A6', min: 297.64, max: 419.53 },
      { name: 'Letter', min: 612, max: 792 },
      { name: 'Legal', min: 612, max: 1008 },
      { name: 'Tabloid', min: 792, max: 1224 },
      { name: 'Executive', min: 522, max: 756 },
    ];

    for (const s of standardSizes) {
      if (Math.abs(minPt - s.min) <= tol && Math.abs(maxPt - s.max) <= tol) {
        return isLandscape ? `${s.name} (Landscape)` : `${s.name} (Portrait)`;
      }
    }

    const wInches = (ptWidth / 72).toFixed(2);
    const hInches = (ptHeight / 72).toFixed(2);
    return `Custom (${wInches}" × ${hInches}")`;
  }

  private async convertPdfToImage(
    buffer: Buffer,
    outFmt: 'png' | 'jpg' | 'webp',
    options: any
  ): Promise<ConvertResult> {
    const uint8 = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8, verbosity: 0 });
    const doc = await loadingTask.promise;
    const totalPages = doc.numPages;

    if (totalPages === 0) {
      throw new Error('PDF document has 0 pages.');
    }

    // Default DPI = 300; Supported DPI options: 72, 150, 300, 600
    const targetDpi = [72, 150, 300, 600].includes(options.dpi) ? options.dpi : (options.dpi || 300);
    // In PDF standard, 1 point = 1/72 inch. Scale factor for PDF.js = targetDpi / 72
    const scale = targetDpi / 72;

    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;
    const bgColor = options.backgroundColor && options.backgroundColor !== 'transparent'
      ? options.backgroundColor
      : '#ffffff';

    const renderSinglePage = async (pageIndex: number): Promise<{ buffer: Buffer; width: number; height: number; pageSize: string }> => {
      const pdfPage = await doc.getPage(pageIndex);

      // Read unscaled page dimensions from the PDF itself (points = 1/72 inch)
      const unscaledViewport = pdfPage.getViewport({ scale: 1.0 });
      const pageSize = this.detectPdfPageFormat(unscaledViewport.width, unscaledViewport.height);

      // Calculate PNG dimensions directly from PDF page dimensions in inches and DPI:
      // PNG width  = PDF page width in inches × DPI = (unscaledViewport.width / 72) * targetDpi
      // PNG height = PDF page height in inches × DPI = (unscaledViewport.height / 72) * targetDpi
      const canvasWidth = Math.round((unscaledViewport.width / 72) * targetDpi);
      const canvasHeight = Math.round((unscaledViewport.height / 72) * targetDpi);

      // Render the complete PDF page at the selected DPI so that all content keeps its original relative size
      const viewport = pdfPage.getViewport({ scale });

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const rawCtx = canvas.getContext('2d');

      // Compatibility polyfills for @napi-rs/canvas with pdfjs CanvasGraphics
      const originalFill = rawCtx.fill.bind(rawCtx);
      rawCtx.fill = function (...args: any[]) {
        if (args.length === 1 && typeof args[0] === 'string') {
          return originalFill(args[0]);
        } else if (args.length === 0) {
          return originalFill('nonzero');
        } else if (args[0] instanceof Path2D) {
          return originalFill(args[0], args[1] || 'nonzero');
        }
        return originalFill('nonzero');
      };

      const originalClip = rawCtx.clip.bind(rawCtx);
      rawCtx.clip = function (...args: any[]) {
        if (args.length === 1 && typeof args[0] === 'string') {
          return originalClip(args[0]);
        } else if (args.length === 0) {
          return originalClip('nonzero');
        } else if (args[0] instanceof Path2D) {
          return originalClip(args[0], args[1] || 'nonzero');
        }
        return originalClip('nonzero');
      };

      // Fill background for clean rendering
      if (outFmt === 'jpg' || (options.backgroundColor && options.backgroundColor !== 'transparent') || !options.transparentBackground) {
        rawCtx.fillStyle = bgColor;
        rawCtx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await (pdfPage.render as any)({
        canvasContext: rawCtx,
        canvas: canvas,
        viewport,
      }).promise;

      const rawPng = canvas.toBuffer('image/png');

      let pipeline = sharp(rawPng);
      let pageImageBuf: Buffer;
      if (outFmt === 'jpg') {
        pageImageBuf = await pipeline.flatten({ background: bgColor }).jpeg({ quality, mozjpeg: true }).toBuffer();
      } else if (outFmt === 'webp') {
        if (options.backgroundColor && options.backgroundColor !== 'transparent') {
          pipeline = pipeline.flatten({ background: options.backgroundColor });
        }
        pageImageBuf = await pipeline.webp({ quality }).toBuffer();
      } else {
        if (options.backgroundColor && options.backgroundColor !== 'transparent') {
          pipeline = pipeline.flatten({ background: options.backgroundColor });
        }
        pageImageBuf = await pipeline.png({ quality }).toBuffer();
      }

      return {
        buffer: pageImageBuf,
        width: canvasWidth,
        height: canvasHeight,
        pageSize,
      };
    };

    // Case A: Specific Page Requested (e.g. pageNumber: 2) or Single-Page PDF
    if (options.pageNumber || totalPages === 1) {
      const pageToRender = Math.max(1, Math.min(options.pageNumber || 1, totalPages));
      const { buffer: imageBuf, width, height, pageSize } = await renderSinglePage(pageToRender);

      const mime = outFmt === 'jpg' ? 'image/jpeg' : outFmt === 'webp' ? 'image/webp' : 'image/png';
      return {
        buffer: imageBuf,
        mimeType: mime,
        outputExtension: outFmt,
        pageCount: totalPages,
        width,
        height,
        pdfPageSize: pageSize,
        pngResolution: `${width} × ${height} px`,
        dpi: targetDpi,
      };
    }

    // Case B: Multi-Page PDF without specific pageNumber -> Package all pages in a high-res ZIP
    const maxPdfPages = process.env.FREE_MAX_PDF_PAGES ? parseInt(process.env.FREE_MAX_PDF_PAGES, 10) : 10;
    if (totalPages > maxPdfPages) {
      throw new Error(
        `This PDF document has ${totalPages} pages, exceeding the Free plan limit of ${maxPdfPages} pages for multi-page archive export. Please select a specific page in settings or upgrade to Pro.`
      );
    }

    const zip = new JSZip();
    let firstWidth = 0;
    let firstHeight = 0;
    let firstPageSize = '';

    for (let i = 1; i <= totalPages; i++) {
      const { buffer: pageBuf, width, height, pageSize } = await renderSinglePage(i);
      if (i === 1) {
        firstWidth = width;
        firstHeight = height;
        firstPageSize = pageSize;
      }
      const pageFileName = `page_${String(i).padStart(3, '0')}.${outFmt}`;
      zip.file(pageFileName, pageBuf);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return {
      buffer: zipBuffer,
      mimeType: 'application/zip',
      outputExtension: 'zip',
      pageCount: totalPages,
      width: firstWidth,
      height: firstHeight,
      pdfPageSize: firstPageSize,
      pngResolution: `${firstWidth} × ${firstHeight} px`,
      dpi: targetDpi,
    };
  }

  private async reformatPdf(buffer: Buffer, options: any): Promise<ConvertResult> {
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pdfDoc = await PDFDocument.create();

    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);

    for (const page of copiedPages) {
      if (options.orientation === 'landscape' && page.getWidth() < page.getHeight()) {
        page.setSize(page.getHeight(), page.getWidth());
      } else if (options.orientation === 'portrait' && page.getWidth() > page.getHeight()) {
        page.setSize(page.getHeight(), page.getWidth());
      }
      pdfDoc.addPage(page);
    }

    const pdfBytes = await pdfDoc.save();
    return {
      buffer: Buffer.from(pdfBytes),
      mimeType: 'application/pdf',
      outputExtension: 'pdf',
      pageCount: pageIndices.length,
    };
  }
}
