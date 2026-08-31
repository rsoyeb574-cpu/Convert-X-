import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CompressParams {
  inputBuffer: Buffer;
  inputFormat: string;
  originalName: string;
  compressionLevel: 'max' | 'balanced' | 'high';
  quality?: number; // 10 - 100
  targetSizeMB?: number; // e.g. 1, 5, 10, 20
}

export interface CompressResult {
  buffer: Buffer;
  mimeType: string;
  outputFormat: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reductionPercent: number;
  notice?: string | null;
  targetReached?: boolean;
  pageCount?: number;
  width?: number;
  height?: number;
  pdfPageSize?: string;
  isAlreadyOptimized?: boolean;
}

export class CompressorEngine {
  readonly supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

  isSupported(format: string): boolean {
    const fmt = format.toLowerCase().replace('.', '');
    return this.supportedFormats.includes(fmt);
  }

  async compress(params: CompressParams): Promise<CompressResult> {
    const { inputBuffer, inputFormat, originalName, compressionLevel, targetSizeMB } = params;
    const rawFmt = inputFormat.toLowerCase().replace('.', '');
    const fmt = rawFmt === 'jpeg' ? 'jpg' : rawFmt;

    if (!this.isSupported(fmt)) {
      throw new Error(`This file type (.${inputFormat}) is not currently supported for compression.`);
    }

    if (!inputBuffer || inputBuffer.length === 0) {
      throw new Error('The uploaded file is empty.');
    }

    const originalSize = inputBuffer.length;
    let compressedBuffer: Buffer;
    let mimeType = 'application/octet-stream';
    let outputFormat = fmt;
    let pageCount: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let pdfPageSize: string | undefined;
    let notice: string | null = null;
    let targetReached: boolean | undefined = undefined;

    // Quality determination for images (default 80 if not specified)
    const userQuality = typeof params.quality === 'number' && params.quality >= 10 && params.quality <= 100
      ? params.quality
      : 80;

    if (fmt === 'pdf') {
      mimeType = 'application/pdf';
      outputFormat = 'pdf';
      const pdfRes = await this.compressPdf(inputBuffer, compressionLevel, targetSizeMB);
      compressedBuffer = pdfRes.buffer;
      pageCount = pdfRes.pageCount;
      pdfPageSize = pdfRes.pdfPageSize;
      if (pdfRes.notice) notice = pdfRes.notice;
    } else {
      // Raster image compression (JPG, PNG, WEBP)
      const imgRes = await this.compressImage(inputBuffer, fmt, compressionLevel, userQuality, targetSizeMB);
      compressedBuffer = imgRes.buffer;
      mimeType = imgRes.mimeType;
      outputFormat = imgRes.outputFormat;
      width = imgRes.width;
      height = imgRes.height;
      if (imgRes.notice) notice = imgRes.notice;
    }

    let finalBuffer = compressedBuffer;
    let isAlreadyOptimized = false;

    // Protection rule: Never deliver a file larger than the original!
    if (finalBuffer.length >= originalSize) {
      finalBuffer = inputBuffer;
      isAlreadyOptimized = true;
      notice = 'This file is already highly optimized. Further compression was not beneficial and was skipped to preserve original fidelity.';
    }

    const compressedSize = finalBuffer.length;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const reductionPercent = originalSize > 0 ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100)) : 0;

    if (targetSizeMB && targetSizeMB > 0) {
      const targetBytes = targetSizeMB * 1024 * 1024;
      targetReached = compressedSize <= targetBytes;
      if (!targetReached && !isAlreadyOptimized) {
        notice = `Could not reach target size of ${targetSizeMB} MB without severe quality degradation. Reduced safely to ${(compressedSize / (1024 * 1024)).toFixed(2)} MB (${reductionPercent}% saved).`;
      }
    }

    return {
      buffer: finalBuffer,
      mimeType,
      outputFormat,
      originalSize,
      compressedSize,
      savedBytes,
      reductionPercent,
      notice,
      targetReached,
      pageCount,
      width,
      height,
      pdfPageSize,
      isAlreadyOptimized,
    };
  }

  private async compressImage(
    inputBuffer: Buffer,
    format: string,
    level: 'max' | 'balanced' | 'high',
    quality: number,
    targetSizeMB?: number
  ): Promise<{ buffer: Buffer; mimeType: string; outputFormat: string; width?: number; height?: number; notice?: string }> {
    const meta = await sharp(inputBuffer).metadata();
    const origWidth = meta.width;
    const origHeight = meta.height;

    let targetBytes = targetSizeMB && targetSizeMB > 0 ? targetSizeMB * 1024 * 1024 : undefined;

    // Determine starting quality based on compression level and user slider
    let effectiveQuality = quality;
    if (level === 'max') {
      effectiveQuality = Math.min(quality, 60);
    } else if (level === 'balanced') {
      effectiveQuality = Math.min(quality, 80);
    } else if (level === 'high') {
      effectiveQuality = Math.max(quality, 88);
    }

    let mimeType = 'image/jpeg';
    if (format === 'png') mimeType = 'image/png';
    else if (format === 'webp') mimeType = 'image/webp';

    const renderOnce = async (q: number, scale = 1.0): Promise<Buffer> => {
      let pipeline = sharp(inputBuffer).rotate(); // auto-rotate based on EXIF before stripping

      if (scale < 1.0 && origWidth && origHeight) {
        pipeline = pipeline.resize({
          width: Math.max(100, Math.round(origWidth * scale)),
          height: Math.max(100, Math.round(origHeight * scale)),
          fit: 'inside',
        });
      }

      if (format === 'jpg') {
        return pipeline
          .jpeg({
            quality: Math.max(10, Math.min(100, Math.round(q))),
            mozjpeg: true,
            trellisQuantisation: true,
            overshootDeringing: true,
            optimizeScans: true,
            chromaSubsampling: level === 'high' ? '4:4:4' : '4:2:0',
          })
          .toBuffer();
      } else if (format === 'png') {
        if (level === 'max' || (meta.hasAlpha === false && level === 'balanced')) {
          // Palette-based quantization for maximum size savings while keeping transparency
          return pipeline
            .png({
              compressionLevel: 9,
              palette: true,
              quality: Math.max(20, Math.min(100, Math.round(q))),
              effort: 10,
              dither: 1.0,
            })
            .toBuffer();
        } else {
          return pipeline
            .png({
              compressionLevel: 9,
              quality: Math.max(40, Math.min(100, Math.round(q))),
              effort: 8,
            })
            .toBuffer();
        }
      } else if (format === 'webp') {
        return pipeline
          .webp({
            quality: Math.max(10, Math.min(100, Math.round(q))),
            effort: 6,
            smartSubsample: true,
          })
          .toBuffer();
      }
      return inputBuffer;
    };

    let bestBuf = await renderOnce(effectiveQuality);

    // If target size is specified and initial buffer exceeds target, iteratively search for best fit
    if (targetBytes && bestBuf.length > targetBytes) {
      let curQ = effectiveQuality;
      let curScale = 1.0;

      for (let attempt = 0; attempt < 5; attempt++) {
        if (bestBuf.length <= targetBytes) break;
        curQ = Math.max(15, curQ - 15);
        if (curQ <= 20 && attempt >= 2) {
          curScale = Math.max(0.6, curScale * 0.85);
        }
        const candidate = await renderOnce(curQ, curScale);
        if (candidate.length < bestBuf.length) {
          bestBuf = candidate;
        }
      }
    }

    const finalMeta = await sharp(bestBuf).metadata();

    return {
      buffer: bestBuf,
      mimeType,
      outputFormat: format,
      width: finalMeta.width || origWidth,
      height: finalMeta.height || origHeight,
    };
  }

  private async compressPdf(
    inputBuffer: Buffer,
    level: 'max' | 'balanced' | 'high',
    targetSizeMB?: number
  ): Promise<{ buffer: Buffer; pageCount: number; pdfPageSize?: string; notice?: string }> {
    // 1. Verify PDF header and read original document metadata
    const header = inputBuffer.subarray(0, 1024).toString('binary');
    if (!header.includes('%PDF-')) {
      throw new Error('The file does not contain a valid PDF header.');
    }

    const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
    const pageCount = srcDoc.getPageCount();
    if (pageCount === 0) {
      throw new Error('PDF document contains 0 pages.');
    }

    const firstPage = srcDoc.getPage(0);
    const box = firstPage.getCropBox() || firstPage.getMediaBox();
    const wPt = box ? box.width : firstPage.getWidth();
    const hPt = box ? box.height : firstPage.getHeight();
    const pdfPageSize = `${(wPt / 72).toFixed(1)}" × ${(hPt / 72).toFixed(1)}"`;

    let pdfSetting = '/ebook'; // 150 dpi, medium quality balanced
    if (level === 'max') {
      pdfSetting = '/screen'; // 72 dpi, lowest size
    } else if (level === 'high') {
      pdfSetting = '/printer'; // 300 dpi, high quality
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'convertx_compress_pdf_'));
    const inPdfPath = path.join(tempDir, 'input.pdf');
    const outPdfPath = path.join(tempDir, 'output.pdf');
    fs.writeFileSync(inPdfPath, inputBuffer);

    let compressedPdfBuf: Buffer | null = null;

    try {
      // Primary: High-fidelity Ghostscript PDF Optimization with vector/text and image preservation
      const gsArgs: string[] = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=${pdfSetting}`,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-dSAFER',
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        '-dEmbedAllFonts=true',
        '-dAutoRotatePages=/None', // strictly preserve page orientation!
        `-sOutputFile=${outPdfPath}`,
        inPdfPath,
      ];

      await execFileAsync('gs', gsArgs);

      if (fs.existsSync(outPdfPath)) {
        const gsOut = fs.readFileSync(outPdfPath);
        if (gsOut.length > 0) {
          // Verify with pdf-lib that page count matches perfectly
          const checkDoc = await PDFDocument.load(gsOut, { ignoreEncryption: true });
          if (checkDoc.getPageCount() === pageCount) {
            compressedPdfBuf = gsOut;
          }
        }
      }
    } catch (gsErr) {
      console.warn('Ghostscript PDF compression notice, falling back to pdf-lib stream optimizer:', gsErr);
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }

    // Secondary / Fallback: pdf-lib stream recompression & deduplication
    if (!compressedPdfBuf) {
      const optimizedDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
      const optimizedBytes = await optimizedDoc.save({ useObjectStreams: true });
      compressedPdfBuf = Buffer.from(optimizedBytes);
    }

    // If target size specified and level was high/balanced, try max if still too big
    if (targetSizeMB && targetSizeMB > 0 && compressedPdfBuf) {
      const targetBytes = targetSizeMB * 1024 * 1024;
      if (compressedPdfBuf.length > targetBytes && level !== 'max') {
        const moreCompressed = await this.compressPdf(inputBuffer, 'max');
        if (moreCompressed.buffer.length < compressedPdfBuf.length) {
          compressedPdfBuf = moreCompressed.buffer;
        }
      }
    }

    return {
      buffer: compressedPdfBuf,
      pageCount,
      pdfPageSize,
    };
  }
}

export const compressorEngine = new CompressorEngine();
