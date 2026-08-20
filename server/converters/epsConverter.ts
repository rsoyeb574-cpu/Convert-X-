import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

export class EpsConverter implements ConverterEngine {
  id = 'eps-postscript-engine';
  name = 'Encapsulated PostScript (EPS) Vector Engine';
  description = 'High-fidelity PostScript vector rasterizer and converter for .EPS graphics to crisp high-DPI PNG, JPG, WEBP, and vector-embedded PDF documents.';

  supportedInputFormats = ['eps'];
  supportedOutputFormats = ['png', 'jpg', 'webp', 'pdf'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return inFmt === 'eps' && this.supportedOutputFormats.includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (inputFormat.toLowerCase() !== 'eps') {
      return { valid: false, reason: 'Only Encapsulated PostScript (.eps) files are supported by this engine.' };
    }

    if (!fileBuffer || fileBuffer.length < 16) {
      return { valid: false, reason: 'File is too small to be a valid EPS document.' };
    }

    const header = fileBuffer.slice(0, 1024).toString('binary');
    // Standard EPS header starts with %!PS-Adobe or binary EPS header (0xC5D0D3C6)
    const isAsciiEps = header.includes('%!PS-Adobe') || header.includes('EPSF');
    const isBinaryEps = fileBuffer[0] === 0xc5 && fileBuffer[1] === 0xd0 && fileBuffer[2] === 0xd3 && fileBuffer[3] === 0xc6;

    if (isAsciiEps || isBinaryEps) {
      return { valid: true, detectedFormat: 'eps' };
    }

    return {
      valid: false,
      reason: 'Invalid EPS file header. Expected PostScript or EPS binary header signature.',
    };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // Default DPI = 300; Supported DPI options: 72, 150, 300, 600
    const targetDpi = [72, 150, 300, 600].includes(Number(options.dpi)) ? Number(options.dpi) : 300;
    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;
    const isTransparent = options.transparentBackground || options.backgroundColor === 'transparent';
    const customBg = options.backgroundColor && options.backgroundColor !== 'transparent' && options.backgroundColor !== '#ffffff'
      ? options.backgroundColor
      : null;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'convertx_eps_'));
    const tempEpsPath = path.join(tempDir, 'input.eps');
    fs.writeFileSync(tempEpsPath, inputBuffer);

    try {
      if (target === 'pdf') {
        const outPdfPath = path.join(tempDir, 'output.pdf');
        const gsArgs = [
          '-dNOPAUSE',
          '-dBATCH',
          '-dSAFER',
          '-sDEVICE=pdfwrite',
          '-dEPSCrop',
          `-sOutputFile=${outPdfPath}`,
          tempEpsPath,
        ];

        try {
          await execFileAsync('gs', gsArgs);
        } catch (err: any) {
          throw new Error(`EPS to PDF conversion failed: ${err.stderr || err.message}`);
        }

        if (!fs.existsSync(outPdfPath)) {
          throw new Error('EPS to PDF conversion produced no output file.');
        }

        const pdfBuffer = fs.readFileSync(outPdfPath);
        return {
          buffer: pdfBuffer,
          mimeType: 'application/pdf',
          outputExtension: 'pdf',
          pageCount: 1,
        };
      }

      // Raster output: PNG, JPG, WEBP
      const outPngPath = path.join(tempDir, 'output.png');
      const gsArgs = [
        '-dNOPAUSE',
        '-dBATCH',
        '-dSAFER',
        isTransparent ? '-sDEVICE=pngalpha' : '-sDEVICE=png16m',
        `-r${targetDpi}`,
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        '-dEPSCrop',
        `-sOutputFile=${outPngPath}`,
        tempEpsPath,
      ];

      try {
        await execFileAsync('gs', gsArgs);
      } catch (err: any) {
        throw new Error(`EPS rendering failed: ${err.stderr || err.message}`);
      }

      if (!fs.existsSync(outPngPath)) {
        throw new Error('EPS raster rendering produced no image.');
      }

      const rawPngBuf = fs.readFileSync(outPngPath);
      let finalBuffer: Buffer;
      let mimeType: string;

      if (target === 'jpg') {
        const bg = customBg || '#ffffff';
        finalBuffer = await sharp(rawPngBuf).flatten({ background: bg }).jpeg({ quality, mozjpeg: true }).toBuffer();
        mimeType = 'image/jpeg';
      } else if (target === 'webp') {
        let pipeline = sharp(rawPngBuf);
        if (customBg) pipeline = pipeline.flatten({ background: customBg });
        finalBuffer = await pipeline.webp({ quality }).toBuffer();
        mimeType = 'image/webp';
      } else {
        // PNG
        if (customBg) {
          finalBuffer = await sharp(rawPngBuf).flatten({ background: customBg }).png().toBuffer();
        } else {
          finalBuffer = rawPngBuf;
        }
        mimeType = 'image/png';
      }

      const meta = await sharp(finalBuffer).metadata();

      return {
        buffer: finalBuffer,
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
