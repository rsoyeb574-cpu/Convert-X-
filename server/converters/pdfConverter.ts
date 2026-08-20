import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import JSZip from 'jszip';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

const execFileAsync = promisify(execFile);

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
    // 1. Inspect original PDF document and get exact page metrics
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 0) {
      throw new Error('PDF document contains 0 pages.');
    }

    // Default DPI = 300; Supported DPI options: 72, 150, 300, 600
    const targetDpi = [72, 150, 300, 600].includes(options.dpi) ? options.dpi : (options.dpi || 300);
    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;
    const isTransparent = options.transparentBackground || options.backgroundColor === 'transparent';
    const customBg = options.backgroundColor && options.backgroundColor !== 'transparent' && options.backgroundColor !== '#ffffff'
      ? options.backgroundColor
      : null;

    // Read the first (or selected) page's actual physical MediaBox / CropBox dimensions
    const pageIndexToInspect = options.pageNumber ? Math.max(1, Math.min(options.pageNumber, totalPages)) - 1 : 0;
    const targetPage = pdfDoc.getPage(pageIndexToInspect);
    const cropBox = targetPage.getCropBox() || targetPage.getMediaBox();
    const ptWidth = cropBox ? cropBox.width : targetPage.getWidth();
    const ptHeight = cropBox ? cropBox.height : targetPage.getHeight();

    const detectedPageSize = this.detectPdfPageFormat(ptWidth, ptHeight);
    const expectedWidth = Math.round((ptWidth / 72) * targetDpi);
    const expectedHeight = Math.round((ptHeight / 72) * targetDpi);

    // Create temporary workspace for direct Ghostscript PDF rendering
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'convertx_pdf_'));
    const tempPdfPath = path.join(tempDir, 'input.pdf');
    fs.writeFileSync(tempPdfPath, buffer);

    try {
      // 2. Direct rendering of original PDF page using native Ghostscript engine
      // This preserves 100% font fidelity, embedded glyphs, kerning, line spacing, and dimensions
      const isSinglePage = Boolean(options.pageNumber) || totalPages === 1;
      const targetPageNum = isSinglePage
        ? Math.max(1, Math.min(options.pageNumber || 1, totalPages))
        : null;

      const outputPattern = isSinglePage
        ? path.join(tempDir, 'page_output.png')
        : path.join(tempDir, 'page_%03d.png');

      const gsArgs: string[] = [
        '-dNOPAUSE',
        '-dBATCH',
        '-dSAFER',
        isTransparent ? '-sDEVICE=pngalpha' : '-sDEVICE=png16m',
        `-r${targetDpi}`,
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        '-dUseCropBox',
      ];

      if (targetPageNum !== null) {
        gsArgs.push(`-dFirstPage=${targetPageNum}`, `-dLastPage=${targetPageNum}`);
      }

      gsArgs.push(`-sOutputFile=${outputPattern}`, tempPdfPath);

      let stdout = '';
      let stderr = '';
      try {
        const execResult = await execFileAsync('gs', gsArgs);
        stdout = execResult.stdout || '';
        stderr = execResult.stderr || '';
      } catch (err: any) {
        const errOutput = `${err.message || ''} ${err.stderr || ''}`;
        // Check for font-specific decoding/corruption errors
        if (
          errOutput.includes('invalidfont') ||
          errOutput.includes('Font not found') ||
          errOutput.includes('Failed to load font') ||
          errOutput.includes('Embedded font corrupted')
        ) {
          throw new Error(
            'PDF rendering failed: The document contains custom or embedded fonts that could not be decoded. Please verify that font outlines are properly embedded in the PDF.'
          );
        }
        throw new Error(`PDF rendering engine error: ${err.stderr || err.message}`);
      }

      // Check stderr for fatal font warnings
      if (stderr.includes('Error: /invalidfont') || stderr.includes('Fatal font error')) {
        throw new Error(
          'PDF rendering failed: The PDF contains a font that could not be rendered faithfully without distortion.'
        );
      }

      // 3. Process the rendered output files
      if (isSinglePage) {
        if (!fs.existsSync(outputPattern)) {
          throw new Error('PDF rendering did not produce the expected image output.');
        }

        const rawPngBuf = fs.readFileSync(outputPattern);
        let finalImageBuf: Buffer;
        let pipeline = sharp(rawPngBuf);

        if (outFmt === 'jpg') {
          const bg = customBg || '#ffffff';
          finalImageBuf = await pipeline.flatten({ background: bg }).jpeg({ quality, mozjpeg: true }).toBuffer();
        } else if (outFmt === 'webp') {
          if (customBg) {
            pipeline = pipeline.flatten({ background: customBg });
          }
          finalImageBuf = await pipeline.webp({ quality }).toBuffer();
        } else {
          // PNG
          if (customBg) {
            pipeline = pipeline.flatten({ background: customBg });
          }
          finalImageBuf = await pipeline.png({ quality }).toBuffer();
        }

        const meta = await sharp(finalImageBuf).metadata();
        const finalWidth = meta.width || expectedWidth;
        const finalHeight = meta.height || expectedHeight;
        const mime = outFmt === 'jpg' ? 'image/jpeg' : outFmt === 'webp' ? 'image/webp' : 'image/png';

        return {
          buffer: finalImageBuf,
          mimeType: mime,
          outputExtension: outFmt,
          pageCount: totalPages,
          width: finalWidth,
          height: finalHeight,
          pdfPageSize: detectedPageSize,
          pngResolution: `${finalWidth} × ${finalHeight} px`,
          dpi: targetDpi,
        };
      }

      // Multi-Page PDF archive export
      const maxPdfPages = process.env.FREE_MAX_PDF_PAGES ? parseInt(process.env.FREE_MAX_PDF_PAGES, 10) : 10;
      if (totalPages > maxPdfPages) {
        throw new Error(
          `This PDF document has ${totalPages} pages, exceeding the limit of ${maxPdfPages} pages for multi-page archive export. Please select a specific page in settings or upgrade.`
        );
      }

      const files = fs.readdirSync(tempDir).filter((f) => f.startsWith('page_') && f.endsWith('.png')).sort();
      if (files.length === 0) {
        throw new Error('PDF multi-page rendering produced no output files.');
      }

      const zip = new JSZip();
      let firstWidth = 0;
      let firstHeight = 0;

      for (let i = 0; i < files.length; i++) {
        const pageFile = path.join(tempDir, files[i]);
        const rawBuf = fs.readFileSync(pageFile);
        let pageImgBuf: Buffer;
        let pPipeline = sharp(rawBuf);

        if (outFmt === 'jpg') {
          const bg = customBg || '#ffffff';
          pageImgBuf = await pPipeline.flatten({ background: bg }).jpeg({ quality, mozjpeg: true }).toBuffer();
        } else if (outFmt === 'webp') {
          if (customBg) pPipeline = pPipeline.flatten({ background: customBg });
          pageImgBuf = await pPipeline.webp({ quality }).toBuffer();
        } else {
          if (customBg) pPipeline = pPipeline.flatten({ background: customBg });
          pageImgBuf = await pPipeline.png({ quality }).toBuffer();
        }

        if (i === 0) {
          const m = await sharp(pageImgBuf).metadata();
          firstWidth = m.width || expectedWidth;
          firstHeight = m.height || expectedHeight;
        }

        const archiveFileName = `page_${String(i + 1).padStart(3, '0')}.${outFmt}`;
        zip.file(archiveFileName, pageImgBuf);
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

      return {
        buffer: zipBuffer,
        mimeType: 'application/zip',
        outputExtension: 'zip',
        pageCount: totalPages,
        width: firstWidth || expectedWidth,
        height: firstHeight || expectedHeight,
        pdfPageSize: detectedPageSize,
        pngResolution: `${firstWidth || expectedWidth} × ${firstHeight || expectedHeight} px`,
        dpi: targetDpi,
      };
    } finally {
      // Safe cleanup of temporary working directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
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
