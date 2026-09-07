import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import { ocrManager } from '../ocr/ocrProvider.js';

const execFileAsync = promisify(execFile);

export interface ExtractedPageData {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
  isScanned: boolean;
  ocrApplied: boolean;
  thumbnailPath?: string;
  characterCount: number;
  wordCount: number;
}

export interface ExtractionResult {
  jobId: string;
  fileName: string;
  originalFileSize: number;
  totalPages: number;
  pdfType: 'text' | 'scanned' | 'mixed';
  detectedPageSize: string;
  ocrConfigured: boolean;
  ocrEngineName: string;
  pages: ExtractedPageData[];
}

/**
 * Detect standard page dimensions in PDF points
 */
function detectPageFormat(ptWidth: number, ptHeight: number): string {
  const minPt = Math.min(ptWidth, ptHeight);
  const maxPt = Math.max(ptWidth, ptHeight);
  const isLandscape = ptWidth > ptHeight;
  const tol = 8; // tolerance in points

  const standardSizes: { name: string; min: number; max: number }[] = [
    { name: 'A3', min: 842, max: 1191 },
    { name: 'A4', min: 595.28, max: 841.89 },
    { name: 'A5', min: 419.53, max: 595.28 },
    { name: 'Letter', min: 612, max: 792 },
    { name: 'Legal', min: 612, max: 1008 },
    { name: 'Tabloid', min: 792, max: 1224 },
  ];

  for (const s of standardSizes) {
    if (Math.abs(minPt - s.min) <= tol && Math.abs(maxPt - s.max) <= tol) {
      return isLandscape ? `${s.name} (Landscape)` : `${s.name} (Portrait)`;
    }
  }

  const wInches = (ptWidth / 72).toFixed(1);
  const hInches = (ptHeight / 72).toFixed(1);
  return `${wInches}" × ${hInches}" (${isLandscape ? 'Landscape' : 'Portrait'})`;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

/**
 * Spatial text reconstruction engine:
 * Reorganizes raw PDF items into cohesive lines, paragraphs, and headings.
 */
function reconstructPageText(items: RawTextItem[]): string {
  if (!items || items.length === 0) return '';

  // Filter out empty or whitespace-only items
  const validItems = items.filter((i) => i.str && i.str.length > 0);
  if (validItems.length === 0) return '';

  // Calculate modal/median font size to detect headings
  const fontSizes = validItems.map((i) => i.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  // 1. Group items into visual lines based on vertical Y coordinate
  // Note: in PDF coordinate space, Y = 0 is at bottom, increasing upwards.
  validItems.sort((a, b) => b.y - a.y);

  interface LineGroup {
    y: number;
    fontSize: number;
    items: RawTextItem[];
  }

  const lines: LineGroup[] = [];

  for (const item of validItems) {
    // Check if this item fits into an existing line group
    const lineTolerance = Math.max(3, (item.fontSize || 12) * 0.38);
    const existingLine = lines.find((l) => Math.abs(l.y - item.y) <= lineTolerance);

    if (existingLine) {
      existingLine.items.push(item);
      // Update running average Y and max font size
      existingLine.fontSize = Math.max(existingLine.fontSize, item.fontSize);
    } else {
      lines.push({
        y: item.y,
        fontSize: item.fontSize,
        items: [item],
      });
    }
  }

  // 2. Sort lines top to bottom (Y descending)
  lines.sort((a, b) => b.y - a.y);

  const formattedLines: string[] = [];
  let prevLineY = lines[0]?.y ?? 0;
  let prevLineFontSize = lines[0]?.fontSize ?? 12;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Sort items within this line left to right (X ascending)
    line.items.sort((a, b) => a.x - b.x);

    let lineText = '';
    for (let j = 0; j < line.items.length; j++) {
      const current = line.items[j];
      const prev = line.items[j - 1];

      if (prev) {
        const gap = current.x - (prev.x + prev.width);
        const avgCharWidth = Math.max(2, (current.fontSize || 12) * 0.28);

        // If there is an optical gap and current doesn't start with space, add one space
        if (gap > avgCharWidth && !lineText.endsWith(' ') && !current.str.startsWith(' ')) {
          lineText += ' ';
        }
      }

      lineText += current.str;
    }

    const trimmed = lineText.trim();
    if (!trimmed) continue;

    // Check vertical gap between previous line and current line for paragraph breaks
    if (i > 0) {
      const lineGap = prevLineY - line.y;
      const expectedLineHeight = Math.max(prevLineFontSize, line.fontSize) * 1.5;

      if (lineGap > expectedLineHeight * 1.6) {
        // Significant gap -> paragraph separator
        formattedLines.push('');
      }
    }

    // Check if line looks like a heading
    const isHeading1 = line.fontSize >= medianFontSize * 1.4 && trimmed.length < 80;
    const isHeading2 = line.fontSize >= medianFontSize * 1.2 && !isHeading1 && trimmed.length < 90;

    if (isHeading1 && !trimmed.startsWith('#')) {
      formattedLines.push(`# ${trimmed}`);
    } else if (isHeading2 && !trimmed.startsWith('#')) {
      formattedLines.push(`## ${trimmed}`);
    } else {
      formattedLines.push(trimmed);
    }

    prevLineY = line.y;
    prevLineFontSize = line.fontSize;
  }

  return formattedLines.join('\n');
}

/**
 * Renders a PDF page to a PNG thumbnail using Ghostscript
 */
async function renderPageThumbnail(
  pdfPath: string,
  pageNum: number,
  outputDir: string
): Promise<string | undefined> {
  const outputPath = path.join(outputDir, `page_${pageNum}_thumb.png`);
  const gsArgs = [
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    '-sDEVICE=png16m',
    '-r120', // 120 DPI for crisp visual preview
    '-dTextAlphaBits=4',
    '-dGraphicsAlphaBits=4',
    `-dFirstPage=${pageNum}`,
    `-dLastPage=${pageNum}`,
    `-sOutputFile=${outputPath}`,
    pdfPath,
  ];

  try {
    await execFileAsync('gs', gsArgs);
    if (fs.existsSync(outputPath)) {
      return outputPath;
    }
  } catch (err) {
    console.warn(`[Thumbnail] Ghostscript failed for page ${pageNum}:`, err);
  }
  return undefined;
}

/**
 * Main PDF text extractor & analyzer
 */
export async function extractTextFromPdfBuffer(params: {
  pdfBuffer: Buffer;
  fileName: string;
  jobId: string;
  progressCallback?: (status: string) => void;
}): Promise<ExtractionResult> {
  const { pdfBuffer, fileName, jobId } = params;

  if (!pdfBuffer || pdfBuffer.length < 10) {
    throw new Error('PDF file buffer is empty or corrupted.');
  }

  // 1. Verify PDF header
  const header = pdfBuffer.subarray(0, 1024).toString('binary');
  if (!header.includes('%PDF-')) {
    throw new Error('Uploaded file does not contain a valid PDF document header.');
  }

  // 2. Load with pdf-lib to get metadata, dimensions, and page count
  let pdfLibDoc: PDFDocument;
  try {
    pdfLibDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  } catch (err: any) {
    throw new Error(`Corrupted or password-protected PDF document: ${err.message || 'Cannot load'}`);
  }

  const totalPages = pdfLibDoc.getPageCount();
  if (totalPages === 0) {
    throw new Error('The uploaded PDF document contains 0 pages.');
  }

  // 3. Prepare temporary working directory for thumbnail generation
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `cx_extract_${jobId}_`));
  const tempPdfPath = path.join(tempDir, 'input.pdf');
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  // 4. Initialize pdfjs-dist for text extraction
  const standardFontsPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');
  const standardFontUrl = standardFontsPath.endsWith('/') ? standardFontsPath : `${standardFontsPath}/`;

  const loadingTask = (pdfjsLib as any).getDocument({
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: standardFontUrl,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });

  const pdfJsDoc = await loadingTask.promise;

  const ocrProvider = ocrManager.getActiveProvider();
  const isOcrConfigured = ocrProvider.isConfigured();

  const pagesData: ExtractedPageData[] = [];
  let scannedPagesCount = 0;
  let textPagesCount = 0;

  // Inspect first page for detected page format
  const firstPage = pdfLibDoc.getPage(0);
  const firstBox = firstPage.getCropBox() || firstPage.getMediaBox();
  const detectedPageSize = detectPageFormat(
    firstBox ? firstBox.width : firstPage.getWidth(),
    firstBox ? firstBox.height : firstPage.getHeight()
  );

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNum = pageIdx + 1;
    const pdfLibPage = pdfLibDoc.getPage(pageIdx);
    const cropBox = pdfLibPage.getCropBox() || pdfLibPage.getMediaBox();
    const width = Math.round(cropBox ? cropBox.width : pdfLibPage.getWidth());
    const height = Math.round(cropBox ? cropBox.height : pdfLibPage.getHeight());

    // Extract text items from PDF.js
    let extractedText = '';
    try {
      const page = await pdfJsDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const rawItems: RawTextItem[] = [];
      for (const item of textContent.items as any[]) {
        if (item.str && typeof item.str === 'string') {
          const transform = item.transform || [12, 0, 0, 12, 0, 0];
          const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 12;
          rawItems.push({
            str: item.str,
            x: transform[4] || 0,
            y: transform[5] || 0,
            width: item.width || fontSize * item.str.length * 0.5,
            height: item.height || fontSize,
            fontSize,
          });
        }
      }

      extractedText = reconstructPageText(rawItems);
    } catch (err) {
      console.warn(`[Extract] PDF.js page ${pageNum} extraction warning:`, err);
    }

    // Render visual thumbnail
    const thumbPath = await renderPageThumbnail(tempPdfPath, pageNum, tempDir);

    // Determine if page is scanned or text
    const cleanChars = extractedText.replace(/\s+/g, '');
    const isScanned = cleanChars.length < 25;
    let ocrApplied = false;

    if (isScanned) {
      scannedPagesCount++;

      // If OCR engine is configured and thumbnail is available, run OCR
      if (isOcrConfigured && thumbPath && fs.existsSync(thumbPath)) {
        try {
          const thumbBuffer = fs.readFileSync(thumbPath);
          const ocrText = await ocrProvider.recognizeText(thumbBuffer, 'image/png');
          if (ocrText && ocrText.trim().length > 0) {
            extractedText = ocrText;
            ocrApplied = true;
          }
        } catch (ocrErr) {
          console.warn(`[OCR] OCR recognition failed for page ${pageNum}:`, ocrErr);
        }
      }
    } else {
      textPagesCount++;
    }

    const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;

    pagesData.push({
      pageNumber: pageNum,
      text: extractedText,
      width,
      height,
      isScanned,
      ocrApplied,
      thumbnailPath: thumbPath,
      characterCount: extractedText.length,
      wordCount,
    });
  }

  // Determine overall PDF type
  let pdfType: 'text' | 'scanned' | 'mixed' = 'text';
  if (scannedPagesCount === totalPages) {
    pdfType = 'scanned';
  } else if (scannedPagesCount > 0 && textPagesCount > 0) {
    pdfType = 'mixed';
  }

  return {
    jobId,
    fileName,
    originalFileSize: pdfBuffer.length,
    totalPages,
    pdfType,
    detectedPageSize,
    ocrConfigured: isOcrConfigured,
    ocrEngineName: ocrProvider.name,
    pages: pagesData,
  };
}
