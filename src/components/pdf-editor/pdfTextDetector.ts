/**
 * pdfTextDetector.ts
 * Line detection, grouping, and OCR bounding box synthesis for the Visual PDF Editor.
 */

import { PdfTextLine, PdfVisualTextBlock, PdfToTextPage } from '../../types.js';

/**
 * Initializes a list of interactive PdfTextLine objects from extracted page text blocks or OCR lines.
 */
export function initializePageTextLines(page: PdfToTextPage): PdfTextLine[] {
  const lines: PdfTextLine[] = [];

  // Case 1: Page has pre-extracted structured visual text blocks
  if (page.textBlocks && page.textBlocks.length > 0) {
    page.textBlocks.forEach((block, idx) => {
      const trimmed = (block.text || '').trim();
      if (!trimmed) return;

      lines.push({
        id: block.id || `line_${page.pageNumber}_${idx + 1}`,
        pageNumber: page.pageNumber,
        originalText: trimmed,
        currentText: trimmed,
        isModified: false,
        isDeleted: false,
        x: Math.round(block.x),
        y: Math.round(block.y),
        width: Math.max(24, Math.round(block.width)),
        height: Math.max(14, Math.round(block.height)),
        fontSize: Math.max(8, Math.min(60, Math.round(block.fontSize || 12))),
        fontFamily: block.fontFamily || 'sans',
        fontWeight: block.fontWeight || 'normal',
        fontStyle: block.fontStyle || 'normal',
        textAlign: block.textAlign || 'left',
        color: block.color || '#000000',
        coverColor: '#ffffff',
        isOcr: Boolean(block.isOcr || page.isScanned),
      });
    });

    return lines;
  }

  // Case 2: Scanned / Image document with plain or OCR text
  if (page.text && page.text.trim().length > 0) {
    const rawLines = page.text
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const pageW = page.width || 595.28;
    const pageH = page.height || 841.89;

    let yCursor = Math.round(pageH * 0.12);
    const availH = pageH * 0.76;
    const step = Math.min(32, Math.max(16, Math.round(availH / Math.max(1, rawLines.length))));
    const fontSize = Math.max(10, Math.min(16, Math.round(step * 0.68)));

    rawLines.forEach((str, idx) => {
      const estWidth = Math.min(pageW - 60, Math.max(60, Math.round(str.length * fontSize * 0.55)));
      lines.push({
        id: `ocr_line_${page.pageNumber}_${idx + 1}`,
        pageNumber: page.pageNumber,
        originalText: str,
        currentText: str,
        isModified: false,
        isDeleted: false,
        x: Math.round(pageW * 0.08),
        y: yCursor,
        width: estWidth,
        height: Math.round(fontSize * 1.35),
        fontSize,
        fontFamily: 'sans',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        color: '#000000',
        coverColor: '#ffffff',
        isOcr: true,
      });
      yCursor += step;
    });

    return lines;
  }

  return [];
}

/**
 * Splits a text line into word-level sub-blocks for partial text editing if requested.
 */
export function splitLineIntoWords(line: PdfTextLine): {
  word: string;
  x: number;
  width: number;
}[] {
  const words = line.currentText.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [{ word: line.currentText, x: line.x, width: line.width }];
  }

  const avgCharW = line.width / Math.max(1, line.currentText.length);
  let curX = line.x;

  return words.map((w) => {
    const wWidth = Math.round(w.length * avgCharW);
    const res = { word: w, x: curX, width: wWidth };
    curX += wWidth + Math.round(avgCharW * 1.2);
    return res;
  });
}
