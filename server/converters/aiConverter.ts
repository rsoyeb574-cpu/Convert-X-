import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import { PdfConverter } from './pdfConverter.js';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

export class AiConverter implements ConverterEngine {
  id = 'ai-illustrator-engine';
  name = 'Adobe Illustrator Vector Engine';
  description = 'Renders vector Adobe Illustrator (.ai) artwork to high-DPI lossless PNG, high-efficiency JPG, and universal vector PDF documents.';

  supportedInputFormats = ['ai'];
  supportedOutputFormats = ['png', 'jpg', 'pdf'];

  private pdfEngine: PdfConverter;

  constructor() {
    this.pdfEngine = new PdfConverter();
  }

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return inFmt === 'ai' && ['png', 'jpg', 'pdf'].includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (inputFormat.toLowerCase() !== 'ai') {
      return { valid: false, reason: 'Only Adobe Illustrator (.ai) files are supported by this engine.' };
    }

    if (!fileBuffer || fileBuffer.length < 16) {
      return { valid: false, reason: 'File is too small to be a valid Adobe Illustrator artwork file.' };
    }

    // Check for PDF-compatible AI header (%PDF-1.x)
    const header = fileBuffer.slice(0, 1024).toString('binary');
    const pdfOffset = header.indexOf('%PDF-');

    if (pdfOffset !== -1) {
      return { valid: true, detectedFormat: 'ai' };
    }

    // Check if it's legacy PostScript AI
    if (header.includes('%!PS-Adobe') || header.includes('Creator: Adobe Illustrator')) {
      return { valid: true, detectedFormat: 'ai' };
    }

    return {
      valid: false,
      reason: 'Invalid Adobe Illustrator file signature. Expected PDF-compatible or PostScript vector stream.',
    };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options, fileName } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    const targetDpi = [72, 150, 300, 600].includes(Number(options.dpi)) ? Number(options.dpi) : 300;

    // Check for PDF offset if not starting at 0
    const header = inputBuffer.slice(0, 1024).toString('binary');
    const pdfOffset = header.indexOf('%PDF-');

    if (pdfOffset !== -1) {
      const pdfCompatibleBuffer = pdfOffset > 0 ? inputBuffer.slice(pdfOffset) : inputBuffer;

      // If converting AI -> PDF
      if (target === 'pdf') {
        return {
          buffer: pdfCompatibleBuffer,
          mimeType: 'application/pdf',
          outputExtension: 'pdf',
          pageCount: 1,
        };
      }

      // AI -> PNG or JPG via direct vector PDF rendering engine
      return await this.pdfEngine.convert({
        inputBuffer: pdfCompatibleBuffer,
        inputFormat: 'pdf',
        outputFormat: target as any,
        fileName: fileName ? fileName.replace(/\.ai$/i, '.pdf') : 'artwork.pdf',
        options: {
          ...options,
          dpi: targetDpi,
        },
      });
    }

    // If PostScript AI, render via Ghostscript engine
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'convertx_ai_'));
    const tempAiPath = path.join(tempDir, 'input.ai');
    fs.writeFileSync(tempAiPath, inputBuffer);

    try {
      if (target === 'pdf') {
        const outPdfPath = path.join(tempDir, 'output.pdf');
        await execFileAsync('gs', [
          '-dNOPAUSE',
          '-dBATCH',
          '-dSAFER',
          '-sDEVICE=pdfwrite',
          '-dEPSCrop',
          `-sOutputFile=${outPdfPath}`,
          tempAiPath,
        ]);
        const pdfBytes = fs.readFileSync(outPdfPath);
        return {
          buffer: pdfBytes,
          mimeType: 'application/pdf',
          outputExtension: 'pdf',
          pageCount: 1,
        };
      }

      const outPngPath = path.join(tempDir, 'output.png');
      await execFileAsync('gs', [
        '-dNOPAUSE',
        '-dBATCH',
        '-dSAFER',
        '-sDEVICE=png16m',
        `-r${targetDpi}`,
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        '-dEPSCrop',
        `-sOutputFile=${outPngPath}`,
        tempAiPath,
      ]);

      const rawPng = fs.readFileSync(outPngPath);
      let pipeline = sharp(rawPng);
      const quality = options.quality || 90;

      let finalBuf: Buffer;
      let mimeType: string;

      if (target === 'jpg') {
        const bg = options.backgroundColor || '#ffffff';
        finalBuf = await pipeline.flatten({ background: bg }).jpeg({ quality, mozjpeg: true }).toBuffer();
        mimeType = 'image/jpeg';
      } else {
        finalBuf = await pipeline.png({ quality }).toBuffer();
        mimeType = 'image/png';
      }

      const meta = await sharp(finalBuf).metadata();
      return {
        buffer: finalBuf,
        mimeType,
        outputExtension: target,
        width: meta.width,
        height: meta.height,
        dpi: targetDpi,
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

