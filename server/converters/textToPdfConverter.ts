import 'regenerator-runtime/runtime.js';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export interface TextToPdfOptions {
  text: string;
  pageSize?: 'a4' | 'a3' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: 'small' | 'normal' | 'large' | 'custom' | number;
  customMargin?: { top?: number; right?: number; bottom?: number; left?: number };
  fontFamily?: 'helvetica' | 'sans' | 'times' | 'serif' | 'courier' | 'mono' | 'devanagari' | 'arabic';
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineSpacing?: number | 'single' | '1.0' | '1.15' | '1.5' | 'double' | '2.0';
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

// Font cache for fast server-side reuse
const fontBufferCache: Map<string, Buffer> = new Map();

function getCachedFontBuffer(filename: string): Buffer | null {
  if (fontBufferCache.has(filename)) {
    return fontBufferCache.get(filename)!;
  }
  const fontPath = path.join(process.cwd(), 'server', 'fonts', filename);
  if (fs.existsSync(fontPath)) {
    try {
      const buf = fs.readFileSync(fontPath);
      fontBufferCache.set(filename, buf);
      return buf;
    } catch (e) {
      console.warn(`Could not load font from ${fontPath}:`, e);
    }
  }
  return null;
}

function parseHexColor(hex?: string): { r: number; g: number; b: number } {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return { r: 0.07, g: 0.09, b: 0.15 }; // Default slate #111827
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

/**
 * Detect script characteristics to choose the optimal font & text direction
 */
function isDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function isArabicOrUrdu(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

interface EmbeddedFontSet {
  regular: PDFFont;
  bold: PDFFont;
  devaRegular?: PDFFont;
  devaBold?: PDFFont;
  arabicRegular?: PDFFont;
  serifRegular?: PDFFont;
  serifBold?: PDFFont;
  monoRegular?: PDFFont;
}

interface LineItem {
  text: string;
  size: number;
  font: PDFFont;
  isHeading: boolean;
  headingLevel?: number;
  isListItem: boolean;
  listBullet?: string;
  indent: number;
  isParagraphBreak: boolean;
  isRtl: boolean;
  words: string[];
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

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // 1. Page Dimensions & Orientation
  const sizeKey = (options.pageSize || 'a4').toLowerCase();
  const [baseW, baseH] = PAGE_DIMENSIONS[sizeKey] || PAGE_DIMENSIONS.a4;
  const isLandscape = options.orientation === 'landscape';
  const pageWidth = isLandscape ? baseH : baseW;
  const pageHeight = isLandscape ? baseW : baseH;

  // 2. Margins
  let margins = { ...MARGIN_PRESETS.normal };
  if (typeof options.margin === 'string' && MARGIN_PRESETS[options.margin.toLowerCase()]) {
    margins = { ...MARGIN_PRESETS[options.margin.toLowerCase()] };
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

  // Reserve space for header and footer to guarantee zero overlap
  const hasHeader = Boolean(options.headerText && options.headerText.trim().length > 0);
  const pageNumStyle = options.pageNumbers || 'bottom-center';
  const hasFooter = pageNumStyle !== 'none';

  const effectiveTopMargin = hasHeader ? Math.max(margins.top, 42) : margins.top;
  const effectiveBottomMargin = hasFooter ? Math.max(margins.bottom, 42) : margins.bottom;

  const printableWidth = pageWidth - margins.left - margins.right;
  const printableHeight = pageHeight - effectiveTopMargin - effectiveBottomMargin;

  if (printableWidth <= 60 || printableHeight <= 60) {
    throw new Error('Specified margins are too large for the chosen page size.');
  }

  // 3. Load & Embed High-Quality Unicode Fonts (Lazy on-demand embedding)
  const userFontFam = (options.fontFamily || 'sans').toLowerCase();
  const hasDevanagari = isDevanagari(rawText);
  const hasArabic = isArabicOrUrdu(rawText);

  const sansRegBuf = getCachedFontBuffer('NotoSans-Regular.ttf');
  const mainFont = sansRegBuf ? await pdfDoc.embedFont(sansRegBuf) : await pdfDoc.embedFont(StandardFonts.Helvetica);

  let devaFont: PDFFont | undefined;
  if (hasDevanagari) {
    const devaRegBuf = getCachedFontBuffer('NotoSansDevanagari-Regular.ttf');
    if (devaRegBuf) {
      devaFont = await pdfDoc.embedFont(devaRegBuf);
    }
  }

  let arabicFont: PDFFont | undefined;
  if (hasArabic) {
    const arabicRegBuf = getCachedFontBuffer('NotoSansArabic-Regular.ttf');
    if (arabicRegBuf) {
      arabicFont = await pdfDoc.embedFont(arabicRegBuf);
    }
  }

  let serifFont: PDFFont | undefined;
  if (userFontFam === 'serif' || userFontFam === 'times') {
    const serifRegBuf = getCachedFontBuffer('NotoSerif-Regular.ttf');
    if (serifRegBuf) {
      serifFont = await pdfDoc.embedFont(serifRegBuf);
    }
  }

  let monoFont: PDFFont | undefined;
  if (userFontFam === 'mono' || userFontFam === 'courier') {
    const monoRegBuf = getCachedFontBuffer('NotoSansMono-Regular.ttf');
    if (monoRegBuf) {
      monoFont = await pdfDoc.embedFont(monoRegBuf);
    }
  }

  const fontSet: EmbeddedFontSet = {
    regular: mainFont,
    bold: mainFont,
    devaRegular: devaFont,
    arabicRegular: arabicFont,
    serifRegular: serifFont,
    monoRegular: monoFont,
  };

  // Helper to pick the appropriate font based on user preference and text script
  const selectFontForText = (str: string, isHeading: boolean = false): PDFFont => {
    if (isDevanagari(str) && fontSet.devaRegular) {
      return fontSet.devaRegular;
    }
    if (isArabicOrUrdu(str) && fontSet.arabicRegular) {
      return fontSet.arabicRegular;
    }
    if ((userFontFam === 'times' || userFontFam === 'serif') && fontSet.serifRegular) {
      return fontSet.serifRegular;
    }
    if ((userFontFam === 'courier' || userFontFam === 'mono') && fontSet.monoRegular) {
      return fontSet.monoRegular;
    }
    return fontSet.regular;
  };

  // 4. Typography Parameters
  const baseFontSize = Math.max(6, Math.min(72, Number(options.fontSize) || 12));

  let lineSpacingMultiplier = 1.25;
  if (typeof options.lineSpacing === 'number' && !isNaN(options.lineSpacing)) {
    lineSpacingMultiplier = Math.max(0.9, Math.min(3.0, options.lineSpacing * 1.15));
  } else if (typeof options.lineSpacing === 'string') {
    const val = options.lineSpacing.toLowerCase();
    if (val === 'single' || val === '1.0' || val === '1') lineSpacingMultiplier = 1.15;
    else if (val === '1.15') lineSpacingMultiplier = 1.35;
    else if (val === '1.5') lineSpacingMultiplier = 1.75;
    else if (val === 'double' || val === '2.0' || val === '2') lineSpacingMultiplier = 2.3;
  }

  const baseAlignment = (options.alignment || 'left').toLowerCase();
  const shouldUnderline = Boolean(options.underline);
  const colorRgb = parseHexColor(options.textColor);
  const textColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b);

  // 5. Structure & Markdown-Like Header/List Parser
  const linesToRender: LineItem[] = [];
  const rawParagraphs = rawText.split(/\r\n|\r|\n/);

  for (const rawLine of rawParagraphs) {
    const trimmed = rawLine.trim();

    // Empty line -> paragraph separator
    if (!trimmed) {
      linesToRender.push({
        text: '',
        size: baseFontSize,
        font: fontSet.regular,
        isHeading: false,
        isListItem: false,
        indent: 0,
        isParagraphBreak: true,
        isRtl: false,
        words: [],
      });
      continue;
    }

    // Check for Headings: # Heading 1, ## Heading 2, ### Heading 3
    let headingLevel = 0;
    let lineContent = rawLine;
    let currentFontSize = baseFontSize;
    let isHeading = false;

    if (/^#\s+/.test(trimmed)) {
      headingLevel = 1;
      lineContent = trimmed.replace(/^#\s+/, '');
      currentFontSize = Math.round(baseFontSize * 1.5);
      isHeading = true;
    } else if (/^##\s+/.test(trimmed)) {
      headingLevel = 2;
      lineContent = trimmed.replace(/^##\s+/, '');
      currentFontSize = Math.round(baseFontSize * 1.25);
      isHeading = true;
    } else if (/^###\s+/.test(trimmed)) {
      headingLevel = 3;
      lineContent = trimmed.replace(/^###\s+/, '');
      currentFontSize = Math.round(baseFontSize * 1.1);
      isHeading = true;
    }

    // Check for Lists: Bullet points (•, *, -) or Numbered (1., 2., 10.)
    let isListItem = false;
    let listBullet = '';
    let indent = 0;

    if (!isHeading) {
      const bulletMatch = rawLine.match(/^(\s*)([•\*\-]|(?:\d+\.))\s+(.*)$/);
      if (bulletMatch) {
        isListItem = true;
        const leadingSpaces = bulletMatch[1].length;
        indent = Math.min(60, 16 + leadingSpaces * 4);
        listBullet = bulletMatch[2].match(/^[\*\-]$/) ? '•' : bulletMatch[2];
        lineContent = bulletMatch[3];
      }
    }

    const currentFont = selectFontForText(lineContent, isHeading);
    const isRtl = isArabicOrUrdu(lineContent);
    const effectiveWidth = printableWidth - indent;

    // Word Wrap with precise font measurement
    const words = lineContent.split(' ');
    let currentLineWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLineWords.length === 0 ? word : `${currentLineWords.join(' ')} ${word}`;
      let testWidth = 0;
      try {
        testWidth = currentFont.widthOfTextAtSize(testLine, currentFontSize);
      } catch {
        testWidth = testLine.length * (currentFontSize * 0.55);
      }

      if (testWidth <= effectiveWidth) {
        currentLineWords.push(word);
      } else {
        if (currentLineWords.length > 0) {
          linesToRender.push({
            text: currentLineWords.join(' '),
            size: currentFontSize,
            font: currentFont,
            isHeading,
            headingLevel,
            isListItem,
            listBullet: linesToRender.length > 0 && linesToRender[linesToRender.length - 1].isListItem ? '' : listBullet,
            indent,
            isParagraphBreak: false,
            isRtl,
            words: currentLineWords,
          });
          currentLineWords = [word];
          // For wrapped lines of a list item, subsequent lines do not re-print the bullet symbol
          listBullet = '';
        } else {
          // Single word exceeds printable area: break by characters
          let partialWord = '';
          for (const char of word) {
            const testPartial = partialWord + char;
            let partialWidth = 0;
            try {
              partialWidth = currentFont.widthOfTextAtSize(testPartial, currentFontSize);
            } catch {
              partialWidth = testPartial.length * (currentFontSize * 0.55);
            }

            if (partialWidth <= effectiveWidth) {
              partialWord = testPartial;
            } else {
              if (partialWord.length > 0) {
                linesToRender.push({
                  text: partialWord,
                  size: currentFontSize,
                  font: currentFont,
                  isHeading,
                  headingLevel,
                  isListItem,
                  listBullet,
                  indent,
                  isParagraphBreak: false,
                  isRtl,
                  words: [partialWord],
                });
                listBullet = '';
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
        size: currentFontSize,
        font: currentFont,
        isHeading,
        headingLevel,
        isListItem,
        listBullet,
        indent,
        isParagraphBreak: false,
        isRtl,
        words: currentLineWords,
      });
    }
  }

  // Handle empty input gracefully
  if (linesToRender.length === 0) {
    linesToRender.push({
      text: '',
      size: baseFontSize,
      font: fontSet.regular,
      isHeading: false,
      isListItem: false,
      indent: 0,
      isParagraphBreak: true,
      isRtl: false,
      words: [],
    });
  }

  // 6. Multi-Page Rendering Engine with Strict Bounds
  let currentPage: PDFPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - effectiveTopMargin - baseFontSize;

  for (let i = 0; i < linesToRender.length; i++) {
    const item = linesToRender[i];
    const itemLineHeight = item.size * lineSpacingMultiplier;

    // Paragraph break spacing
    if (item.isParagraphBreak) {
      currentY -= itemLineHeight * 0.65;
      if (currentY < effectiveBottomMargin + baseFontSize) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - effectiveTopMargin - baseFontSize;
      }
      continue;
    }

    // Extra top spacing for headings
    if (item.isHeading && item.headingLevel === 1 && currentY < pageHeight - effectiveTopMargin - 30) {
      currentY -= itemLineHeight * 0.4;
    }

    // New page trigger if content exceeds bottom margin boundary
    if (currentY < effectiveBottomMargin + item.size) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - effectiveTopMargin - item.size;
    }

    let measuredLineWidth = 0;
    try {
      measuredLineWidth = item.font.widthOfTextAtSize(item.text, item.size);
    } catch {
      measuredLineWidth = item.text.length * (item.size * 0.55);
    }

    const startX = margins.left + item.indent;
    const availWidth = printableWidth - item.indent;

    // Draw List Bullet if applicable
    if (item.isListItem && item.listBullet) {
      const bulletFont = selectFontForText(item.listBullet, false);
      const bulletX = margins.left + Math.max(0, item.indent - 14);
      try {
        currentPage.drawText(item.listBullet, {
          x: bulletX,
          y: currentY,
          size: item.size,
          font: bulletFont,
          color: textColor,
        });
      } catch (e) {
        console.warn('Bullet render fallback:', e);
      }
    }

    // Determine Alignment (support explicit or automatic RTL for Urdu/Arabic)
    let alignment = baseAlignment;
    if (item.isRtl && alignment === 'left') {
      alignment = 'right';
    }

    let renderX = startX;

    if (alignment === 'center') {
      renderX = startX + Math.max(0, (availWidth - measuredLineWidth) / 2);
      try {
        currentPage.drawText(item.text, {
          x: renderX,
          y: currentY,
          size: item.size,
          font: item.font,
          color: textColor,
        });
      } catch (e) {
        console.warn('Draw text fallback:', e);
      }
      if (shouldUnderline || item.headingLevel === 1) {
        currentPage.drawLine({
          start: { x: renderX, y: currentY - 2 },
          end: { x: renderX + measuredLineWidth, y: currentY - 2 },
          thickness: item.headingLevel === 1 ? 1.2 : Math.max(0.6, item.size * 0.05),
          color: textColor,
        });
      }
    } else if (alignment === 'right') {
      renderX = startX + Math.max(0, availWidth - measuredLineWidth);
      try {
        currentPage.drawText(item.text, {
          x: renderX,
          y: currentY,
          size: item.size,
          font: item.font,
          color: textColor,
        });
      } catch (e) {
        console.warn('Draw text fallback:', e);
      }
      if (shouldUnderline) {
        currentPage.drawLine({
          start: { x: renderX, y: currentY - 2 },
          end: { x: renderX + measuredLineWidth, y: currentY - 2 },
          thickness: Math.max(0.6, item.size * 0.05),
          color: textColor,
        });
      }
    } else if (alignment === 'justify' && item.words.length > 1 && i < linesToRender.length - 1 && !linesToRender[i + 1].isParagraphBreak) {
      // Justified alignment across available width
      let wordsTotalWidth = 0;
      for (const w of item.words) {
        try {
          wordsTotalWidth += item.font.widthOfTextAtSize(w, item.size);
        } catch {
          wordsTotalWidth += w.length * (item.size * 0.55);
        }
      }
      const totalSpace = availWidth - wordsTotalWidth;
      const spaceBetween = totalSpace / (item.words.length - 1);

      let runningX = startX;
      for (const word of item.words) {
        try {
          currentPage.drawText(word, {
            x: runningX,
            y: currentY,
            size: item.size,
            font: item.font,
            color: textColor,
          });
          runningX += item.font.widthOfTextAtSize(word, item.size) + spaceBetween;
        } catch {
          runningX += word.length * (item.size * 0.55) + spaceBetween;
        }
      }
      if (shouldUnderline) {
        currentPage.drawLine({
          start: { x: startX, y: currentY - 2 },
          end: { x: startX + availWidth, y: currentY - 2 },
          thickness: Math.max(0.6, item.size * 0.05),
          color: textColor,
        });
      }
    } else {
      // Left alignment default
      renderX = startX;
      try {
        currentPage.drawText(item.text, {
          x: renderX,
          y: currentY,
          size: item.size,
          font: item.font,
          color: textColor,
        });
      } catch (e) {
        console.warn('Draw text fallback:', e);
      }
      if (shouldUnderline || item.headingLevel === 1) {
        currentPage.drawLine({
          start: { x: renderX, y: currentY - 2 },
          end: { x: renderX + (item.headingLevel === 1 ? availWidth : measuredLineWidth), y: currentY - 2 },
          thickness: item.headingLevel === 1 ? 0.8 : Math.max(0.6, item.size * 0.05),
          color: textColor,
        });
      }
    }

    currentY -= itemLineHeight;
  }

  // 7. Header and Footer / Page Numbering on All Pages (Never overlaps content)
  const totalPages = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();
  const metaFont = fontSet.regular;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];

    // Optional Header
    if (options.headerText && options.headerText.trim()) {
      const headerStr = options.headerText.trim();
      const headerFont = selectFontForText(headerStr, false);
      const headerY = pageHeight - Math.max(16, effectiveTopMargin / 2);

      try {
        p.drawText(headerStr, {
          x: margins.left,
          y: headerY,
          size: 9,
          font: headerFont,
          color: rgb(0.45, 0.45, 0.5),
        });
        // Subtle divider line under header
        p.drawLine({
          start: { x: margins.left, y: headerY - 4 },
          end: { x: pageWidth - margins.right, y: headerY - 4 },
          thickness: 0.5,
          color: rgb(0.85, 0.88, 0.92),
        });
      } catch (e) {
        console.warn('Header render error:', e);
      }
    }

    // Page Numbers
    if (pageNumStyle !== 'none') {
      const pageNumStr = `Page ${i + 1} of ${totalPages}`;
      let numWidth = 50;
      try {
        numWidth = metaFont.widthOfTextAtSize(pageNumStr, 9);
      } catch {
        numWidth = 50;
      }

      const footerY = Math.max(12, effectiveBottomMargin / 2 - 4);

      if (pageNumStyle === 'bottom-center') {
        p.drawText(pageNumStr, {
          x: (pageWidth - numWidth) / 2,
          y: footerY,
          size: 9,
          font: metaFont,
          color: rgb(0.45, 0.45, 0.5),
        });
      } else if (pageNumStyle === 'bottom-right') {
        p.drawText(pageNumStr, {
          x: pageWidth - margins.right - numWidth,
          y: footerY,
          size: 9,
          font: metaFont,
          color: rgb(0.45, 0.45, 0.5),
        });
      } else if (pageNumStyle === 'top-right') {
        p.drawText(pageNumStr, {
          x: pageWidth - margins.right - numWidth,
          y: pageHeight - Math.max(16, effectiveTopMargin / 2),
          size: 9,
          font: metaFont,
          color: rgb(0.45, 0.45, 0.5),
        });
      }
    }
  }

  // 8. Standard PDF Metadata
  pdfDoc.setTitle(options.title || 'Text Document');
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
  description = 'Direct typographic vector PDF layout engine with Unicode font embedding and multi-page flow.';
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

