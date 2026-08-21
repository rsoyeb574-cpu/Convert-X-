import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export interface TextToPdfOptions {
  text: string;
  pageSize?: 'a4' | 'a3' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: 'small' | 'normal' | 'large' | 'custom' | number;
  customMargin?: { top?: number; right?: number; bottom?: number; left?: number };
  fontFamily?: 'helvetica' | 'times' | 'courier';
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineSpacing?: number | 'single' | '1.15' | '1.5' | 'double' | '2.0';
  pageNumbers?: 'none' | 'bottom-center' | 'bottom-right' | 'top-right';
  title?: string;
  filename?: string;
  headerText?: string;
  textColor?: string;
}

// Standard page dimensions in PDF points (72 pt/inch)
const PAGE_DIMENSIONS: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  letter: [612.0, 792.0],
  legal: [612.0, 1008.0],
};

const MARGIN_PRESETS: Record<string, { top: number; right: number; bottom: number; left: number }> = {
  small: { top: 20, right: 20, bottom: 20, left: 20 },
  normal: { top: 36, right: 36, bottom: 36, left: 36 },
  large: { top: 54, right: 54, bottom: 54, left: 54 },
};

/**
 * Normalizes unicode characters to standard WinAnsi / Latin-1 printable characters
 * preventing pdf-lib encoding crashes when users paste smart quotes or special punctuation.
 */
function normalizeTextForPdf(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2022\u25AA\u25CF\u2023]/g, '* ')
    .replace(/\t/g, '    ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, (char) => {
      // Return printable character if ASCII-convertible, or clean space
      const code = char.charCodeAt(0);
      if (code >= 32 && code <= 126) return char;
      return ' ';
    });
}

function parseHexColor(hex?: string): { r: number; g: number; b: number } {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return { r: 0.07, g: 0.09, b: 0.15 }; // Default dark slate #111827
  }
  let c = hex.slice(1);
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export async function generateTextToPdf(options: TextToPdfOptions): Promise<{
  buffer: Buffer;
  pageCount: number;
  width: number;
  height: number;
  pdfPageSize: string;
}> {
  const rawText = options.text || '';
  if (rawText.length > 500000) {
    throw new Error('Text exceeds maximum limit of 500,000 characters for a single conversion.');
  }

  const cleanText = normalizeTextForPdf(rawText);

  const pdfDoc = await PDFDocument.create();

  // 1. Page Dimensions & Orientation
  const sizeKey = (options.pageSize || 'a4').toLowerCase();
  const [baseW, baseH] = PAGE_DIMENSIONS[sizeKey] || PAGE_DIMENSIONS.a4;
  const isLandscape = options.orientation === 'landscape';
  const pageWidth = isLandscape ? baseH : baseW;
  const pageHeight = isLandscape ? baseW : baseH;

  // 2. Margins
  let margins = MARGIN_PRESETS.normal;
  if (typeof options.margin === 'string' && MARGIN_PRESETS[options.margin.toLowerCase()]) {
    margins = MARGIN_PRESETS[options.margin.toLowerCase()];
  } else if (typeof options.margin === 'number' && !isNaN(options.margin)) {
    const m = Math.max(10, Math.min(100, options.margin));
    margins = { top: m, right: m, bottom: m, left: m };
  } else if (options.customMargin) {
    margins = {
      top: options.customMargin.top ?? 36,
      right: options.customMargin.right ?? 36,
      bottom: options.customMargin.bottom ?? 36,
      left: options.customMargin.left ?? 36,
    };
  }

  const printableWidth = pageWidth - margins.left - margins.right;
  const printableHeight = pageHeight - margins.top - margins.bottom;

  if (printableWidth <= 50 || printableHeight <= 50) {
    throw new Error('Specified margins are too large for the chosen page size.');
  }

  // 3. Font Selection
  const fontFamily = (options.fontFamily || 'helvetica').toLowerCase();
  const isBold = Boolean(options.bold);
  const isItalic = Boolean(options.italic);

  let fontName: StandardFonts = StandardFonts.Helvetica;
  if (fontFamily === 'times') {
    if (isBold && isItalic) fontName = StandardFonts.TimesRomanBoldItalic;
    else if (isBold) fontName = StandardFonts.TimesRomanBold;
    else if (isItalic) fontName = StandardFonts.TimesRomanItalic;
    else fontName = StandardFonts.TimesRoman;
  } else if (fontFamily === 'courier') {
    if (isBold && isItalic) fontName = StandardFonts.CourierBoldOblique;
    else if (isBold) fontName = StandardFonts.CourierBold;
    else if (isItalic) fontName = StandardFonts.CourierOblique;
    else fontName = StandardFonts.Courier;
  } else {
    // Helvetica default
    if (isBold && isItalic) fontName = StandardFonts.HelveticaBoldOblique;
    else if (isBold) fontName = StandardFonts.HelveticaBold;
    else if (isItalic) fontName = StandardFonts.HelveticaOblique;
    else fontName = StandardFonts.Helvetica;
  }

  const font = await pdfDoc.embedFont(fontName);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 4. Typography Parameters
  const fontSize = Math.max(6, Math.min(72, Number(options.fontSize) || 12));
  
  // Line spacing multiplier
  let lineSpacingFactor = 1.25;
  if (typeof options.lineSpacing === 'number' && !isNaN(options.lineSpacing)) {
    lineSpacingFactor = Math.max(0.9, Math.min(3.0, options.lineSpacing * 1.15));
  } else if (typeof options.lineSpacing === 'string') {
    const val = options.lineSpacing.toLowerCase();
    if (val === 'single' || val === '1.0' || val === '1') lineSpacingFactor = 1.15;
    else if (val === '1.15') lineSpacingFactor = 1.35;
    else if (val === '1.5') lineSpacingFactor = 1.75;
    else if (val === 'double' || val === '2.0' || val === '2') lineSpacingFactor = 2.3;
  }

  const lineHeight = fontSize * lineSpacingFactor;
  const alignment = (options.alignment || 'left').toLowerCase();
  const shouldUnderline = Boolean(options.underline);
  const colorRgb = parseHexColor(options.textColor);
  const textColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b);

  // 5. Line Wrapping Algorithm
  interface FormattedLine {
    text: string;
    isParagraphEnd: boolean;
    words: string[];
  }

  const linesToRender: FormattedLine[] = [];
  const paragraphs = cleanText.split(/\r\n|\r|\n/);

  for (const para of paragraphs) {
    if (para.trim() === '') {
      linesToRender.push({ text: '', isParagraphEnd: true, words: [] });
      continue;
    }

    const words = para.split(' ');
    let currentLineWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLineWords.length === 0 ? word : `${currentLineWords.join(' ')} ${word}`;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= printableWidth) {
        currentLineWords.push(word);
      } else {
        if (currentLineWords.length > 0) {
          linesToRender.push({
            text: currentLineWords.join(' '),
            isParagraphEnd: false,
            words: currentLineWords,
          });
          currentLineWords = [word];
        } else {
          // Word itself is wider than printable area: break word by characters
          let partialWord = '';
          for (const char of word) {
            const testPartial = partialWord + char;
            if (font.widthOfTextAtSize(testPartial, fontSize) <= printableWidth) {
              partialWord = testPartial;
            } else {
              if (partialWord.length > 0) {
                linesToRender.push({
                  text: partialWord,
                  isParagraphEnd: false,
                  words: [partialWord],
                });
              }
              partialWord = char;
            }
          }
          if (partialWord.length > 0) {
            currentLineWords = [partialWord];
          }
        }
      }
    }

    if (currentLineWords.length > 0) {
      linesToRender.push({
        text: currentLineWords.join(' '),
        isParagraphEnd: true,
        words: currentLineWords,
      });
    }
  }

  // Handle empty input gracefully (create single page with clean layout)
  if (linesToRender.length === 0) {
    linesToRender.push({ text: '', isParagraphEnd: true, words: [] });
  }

  // 6. Multi-Page Layout & Drawing
  let currentPage: PDFPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margins.top - fontSize;

  for (const lineObj of linesToRender) {
    // If empty line, add paragraph separation
    if (lineObj.text === '') {
      currentY -= lineHeight * 0.75;
      if (currentY < margins.bottom + fontSize) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margins.top - fontSize;
      }
      continue;
    }

    // Check if line exceeds bottom margin
    if (currentY < margins.bottom + fontSize) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margins.top - fontSize;
    }

    const lineWidth = font.widthOfTextAtSize(lineObj.text, fontSize);

    let startX = margins.left;
    const isJustifyActive = alignment === 'justify' && !lineObj.isParagraphEnd && lineObj.words.length > 1;

    if (alignment === 'center') {
      startX = margins.left + Math.max(0, (printableWidth - lineWidth) / 2);
      currentPage.drawText(lineObj.text, {
        x: startX,
        y: currentY,
        size: fontSize,
        font,
        color: textColor,
      });
      if (shouldUnderline) {
        currentPage.drawLine({
          start: { x: startX, y: currentY - 2 },
          end: { x: startX + lineWidth, y: currentY - 2 },
          thickness: Math.max(0.6, fontSize * 0.05),
          color: textColor,
        });
      }
    } else if (alignment === 'right') {
      startX = margins.left + Math.max(0, printableWidth - lineWidth);
      currentPage.drawText(lineObj.text, {
        x: startX,
        y: currentY,
        size: fontSize,
        font,
        color: textColor,
      });
      if (shouldUnderline) {
        currentPage.drawLine({
          start: { x: startX, y: currentY - 2 },
          end: { x: startX + lineWidth, y: currentY - 2 },
          thickness: Math.max(0.6, fontSize * 0.05),
          color: textColor,
        });
      }
    } else if (isJustifyActive) {
      // Justify words across full printable width
      const wordsTotalWidth = lineObj.words.reduce((sum, w) => sum + font.widthOfTextAtSize(w, fontSize), 0);
      const totalSpacing = printableWidth - wordsTotalWidth;
      const spaceBetween = totalSpacing / (lineObj.words.length - 1);

      let runningX = margins.left;
      for (const word of lineObj.words) {
        currentPage.drawText(word, {
          x: runningX,
          y: currentY,
          size: fontSize,
          font,
          color: textColor,
        });
        runningX += font.widthOfTextAtSize(word, fontSize) + spaceBetween;
      }
      if (shouldUnderline) {
        currentPage.drawLine({
          start: { x: margins.left, y: currentY - 2 },
          end: { x: margins.left + printableWidth, y: currentY - 2 },
          thickness: Math.max(0.6, fontSize * 0.05),
          color: textColor,
        });
      }
    } else {
      // Left alignment default
      startX = margins.left;
      currentPage.drawText(lineObj.text, {
        x: startX,
        y: currentY,
        size: fontSize,
        font,
        color: textColor,
      });
      if (shouldUnderline) {
        currentPage.drawLine({
          start: { x: startX, y: currentY - 2 },
          end: { x: startX + lineWidth, y: currentY - 2 },
          thickness: Math.max(0.6, fontSize * 0.05),
          color: textColor,
        });
      }
    }

    currentY -= lineHeight;
  }

  // 7. Page Numbers & Header Footer Layering
  const totalPages = pdfDoc.getPageCount();
  const pageNumStyle = options.pageNumbers || 'bottom-center';

  if (pageNumStyle !== 'none' || options.headerText) {
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const pageNumStr = `Page ${i + 1} of ${totalPages}`;
      const numWidth = regularFont.widthOfTextAtSize(pageNumStr, 9);

      if (pageNumStyle === 'bottom-center') {
        p.drawText(pageNumStr, {
          x: (pageWidth - numWidth) / 2,
          y: Math.max(12, margins.bottom / 2 - 4),
          size: 9,
          font: regularFont,
          color: rgb(0.45, 0.45, 0.45),
        });
      } else if (pageNumStyle === 'bottom-right') {
        p.drawText(pageNumStr, {
          x: pageWidth - margins.right - numWidth,
          y: Math.max(12, margins.bottom / 2 - 4),
          size: 9,
          font: regularFont,
          color: rgb(0.45, 0.45, 0.45),
        });
      } else if (pageNumStyle === 'top-right') {
        p.drawText(pageNumStr, {
          x: pageWidth - margins.right - numWidth,
          y: pageHeight - Math.max(12, margins.top / 2),
          size: 9,
          font: regularFont,
          color: rgb(0.45, 0.45, 0.45),
        });
      }

      if (options.headerText) {
        const cleanHeader = normalizeTextForPdf(options.headerText);
        p.drawText(cleanHeader, {
          x: margins.left,
          y: pageHeight - Math.max(12, margins.top / 2),
          size: 9,
          font: regularFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
  }

  // 8. Document Metadata
  pdfDoc.setTitle(options.title || 'Document');
  pdfDoc.setAuthor('Convert-X User');
  pdfDoc.setCreator('Convert-X Universal PDF Engine');
  pdfDoc.setProducer('pdf-lib & Convert-X Text-to-PDF Studio');
  pdfDoc.setCreationDate(new Date());

  const pdfBytes = await pdfDoc.save();

  return {
    buffer: Buffer.from(pdfBytes),
    pageCount: totalPages,
    width: pageWidth,
    height: pageHeight,
    pdfPageSize: `${sizeKey.toUpperCase()} (${isLandscape ? 'Landscape' : 'Portrait'})`,
  };
}

/**
 * TextToPdfConverter Engine for Convert-X Engine Registry
 */
export class TextToPdfConverter implements ConverterEngine {
  id = 'text_to_pdf_engine';
  name = 'Convert-X Universal Text-to-PDF Engine';
  description = 'Direct typographic vector PDF layout engine with multi-page flow and word wrap.';
  supportedInputFormats = ['txt', 'text'];
  supportedOutputFormats = ['pdf'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase();
    return (inFmt === 'txt' || inFmt === 'text') && outFmt === 'pdf';
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      return { valid: false, reason: 'Text content is empty.' };
    }
    if (fileBuffer.length > 5000000) {
      return { valid: false, reason: 'Text file exceeds maximum size of 5MB.' };
    }
    return { valid: true, detectedFormat: 'txt', mimeType: 'text/plain' };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const rawText = params.inputBuffer.toString('utf-8');
    const opts = params.options as any;

    const result = await generateTextToPdf({
      text: rawText,
      pageSize: opts.pageSize || 'a4',
      orientation: opts.orientation || 'portrait',
      margin: opts.margin || 'normal',
      fontFamily: opts.fontFamily || 'helvetica',
      fontSize: opts.fontSize || 12,
      bold: opts.bold,
      italic: opts.italic,
      underline: opts.underline,
      alignment: opts.alignment || 'left',
      lineSpacing: opts.lineSpacing || '1.15',
      pageNumbers: opts.pageNumbers || 'bottom-center',
      title: opts.title || params.fileName,
      filename: params.fileName,
      headerText: opts.headerText,
      textColor: opts.textColor,
    });

    return {
      buffer: result.buffer,
      mimeType: 'application/pdf',
      outputExtension: 'pdf',
      width: result.width,
      height: result.height,
      pageCount: result.pageCount,
      pdfPageSize: result.pdfPageSize,
    };
  }
}
