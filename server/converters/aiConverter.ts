import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import { PdfConverter } from './pdfConverter.js';

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

    // Check if it's legacy PostScript-only AI
    if (header.includes('%!PS-Adobe') || header.includes('Creator: Adobe Illustrator')) {
      return {
        valid: false,
        reason:
          'This legacy Illustrator file was saved without PDF compatibility. Modern AI conversion requires the default "Create PDF Compatible File" option enabled.',
      };
    }

    return {
      valid: false,
      reason: 'Invalid Adobe Illustrator file signature. Expected PDF-compatible vector stream.',
    };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options, fileName } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // Check for PDF offset if not starting at 0
    const header = inputBuffer.slice(0, 1024).toString('binary');
    const pdfOffset = header.indexOf('%PDF-');

    let pdfCompatibleBuffer = inputBuffer;
    if (pdfOffset > 0) {
      pdfCompatibleBuffer = inputBuffer.slice(pdfOffset);
    } else if (pdfOffset === -1) {
      throw new Error(
        'This legacy Illustrator file was saved without PDF compatibility. Please re-save with "Create PDF Compatible File" enabled in Illustrator.'
      );
    }

    // If converting AI -> PDF
    if (target === 'pdf') {
      return {
        buffer: pdfCompatibleBuffer,
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
        pageCount: 1,
      };
    }

    // AI -> PNG or JPG via vector PDF rendering engine
    return await this.pdfEngine.convert({
      inputBuffer: pdfCompatibleBuffer,
      inputFormat: 'pdf',
      outputFormat: target as any,
      fileName: fileName ? fileName.replace(/\.ai$/i, '.pdf') : 'artwork.pdf',
      options: {
        ...options,
        dpi: options.dpi || 150,
      },
    });
  }
}
