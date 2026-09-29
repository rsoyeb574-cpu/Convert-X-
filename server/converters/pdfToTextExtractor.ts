import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import { createCanvas } from '@napi-rs/canvas';
import { ocrManager } from '../ocr/ocrProvider.js';

const execFileAsync = promisify(execFile);

export interface PdfVisualTextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily?: string;
}

export interface ExtractedPageData {
  pageNumber: number;
  text: string;
  html?: string;
  width: number;
  height: number;
  isScanned: boolean;
  ocrApplied: boolean;
  thumbnailPath?: string;
  pageImagePath?: string;
  thumbnailUrl?: string;
  pageImageUrl?: string;
  downloadPngUrl?: string;
  downloadJpgUrl?: string;
  characterCount: number;
  wordCount: number;
  contentType: 'text' | 'scanned' | 'mixed';
  hasImages: boolean;
  ocrConfidence?: number | null;
  textBlocks?: PdfVisualTextBlock[];
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

  const validItems = items.filter((i) => i.str && i.str.length > 0);
  if (validItems.length === 0) return '';

  const fontSizes = validItems.map((i) => i.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  // Group items into visual lines based on vertical Y coordinate
  validItems.sort((a, b) => b.y - a.y);

  interface LineGroup {
    y: number;
    fontSize: number;
    items: RawTextItem[];
  }

  const lines: LineGroup[] = [];

  for (const item of validItems) {
    const lineTolerance = Math.max(3, (item.fontSize || 12) * 0.38);
    const existingLine = lines.find((l) => Math.abs(l.y - item.y) <= lineTolerance);

    if (existingLine) {
      existingLine.items.push(item);
      existingLine.fontSize = Math.max(existingLine.fontSize, item.fontSize);
    } else {
      lines.push({
        y: item.y,
        fontSize: item.fontSize,
        items: [item],
      });
    }
  }

  lines.sort((a, b) => b.y - a.y);

  const formattedLines: string[] = [];
  let prevLineY = lines[0]?.y ?? 0;
  let prevLineFontSize = lines[0]?.fontSize ?? 12;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    line.items.sort((a, b) => a.x - b.x);

    let lineText = '';
    for (let j = 0; j < line.items.length; j++) {
      const current = line.items[j];
      const prev = line.items[j - 1];

      if (prev) {
        const gap = current.x - (prev.x + prev.width);
        const avgCharWidth = Math.max(2, (current.fontSize || 12) * 0.28);

        if (gap > avgCharWidth && !lineText.endsWith(' ') && !current.str.startsWith(' ')) {
          lineText += ' ';
        }
      }

      lineText += current.str;
    }

    const trimmed = lineText.trim();
    if (!trimmed) continue;

    if (i > 0) {
      const lineGap = prevLineY - line.y;
      const expectedLineHeight = Math.max(prevLineFontSize, line.fontSize) * 1.5;

      if (lineGap > expectedLineHeight * 1.6) {
        formattedLines.push('');
      }
    }

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
 * Extracts structured visual text blocks with screen coordinates (top-left origin).
 * Merges adjacent text items on the same line into word/phrase blocks.
 */
function extractVisualTextBlocks(items: RawTextItem[], pageHeight: number): PdfVisualTextBlock[] {
  if (!items || items.length === 0) return [];
  const valid = items.filter((i) => i.str && i.str.trim().length > 0);
  if (valid.length === 0) return [];

  // Group by vertical Y (line tolerance)
  const lineTolerance = 4;
  const groups: { y: number; items: RawTextItem[] }[] = [];
  for (const it of valid) {
    const existing = groups.find((g) => Math.abs(g.y - it.y) <= Math.max(lineTolerance, it.fontSize * 0.35));
    if (existing) {
      existing.items.push(it);
    } else {
      groups.push({ y: it.y, items: [it] });
    }
  }

  // Sort groups top to bottom (in PDF coordinates, higher Y is top)
  groups.sort((a, b) => b.y - a.y);

  const blocks: PdfVisualTextBlock[] = [];
  let blockIndex = 1;

  for (const group of groups) {
    // Sort items left to right
    group.items.sort((a, b) => a.x - b.x);

    let currentChunk: RawTextItem[] = [];
    for (let i = 0; i < group.items.length; i++) {
      const it = group.items[i];
      if (currentChunk.length === 0) {
        currentChunk.push(it);
      } else {
        const prev = currentChunk[currentChunk.length - 1];
        const gap = it.x - (prev.x + prev.width);
        // Group words if they are close on the line
        if (gap < Math.max(18, it.fontSize * 1.5)) {
          currentChunk.push(it);
        } else {
          // Commit current chunk
          const minX = Math.min(...currentChunk.map((c) => c.x));
          const maxX = Math.max(...currentChunk.map((c) => c.x + c.width));
          const maxFontSize = Math.max(...currentChunk.map((c) => c.fontSize));
          const avgY = currentChunk[0].y;
          const textStr = currentChunk.map((c) => c.str).join(' ').replace(/\s+/g, ' ').trim();
          if (textStr) {
            blocks.push({
              id: `tb_${blockIndex++}`,
              text: textStr,
              x: Math.round(minX),
              y: Math.round(Math.max(0, pageHeight - avgY - maxFontSize)),
              width: Math.round(maxX - minX),
              height: Math.round(maxFontSize * 1.25),
              fontSize: Math.round(maxFontSize),
            });
          }
          currentChunk = [it];
        }
      }
    }

    if (currentChunk.length > 0) {
      const minX = Math.min(...currentChunk.map((c) => c.x));
      const maxX = Math.max(...currentChunk.map((c) => c.x + c.width));
      const maxFontSize = Math.max(...currentChunk.map((c) => c.fontSize));
      const avgY = currentChunk[0].y;
      const textStr = currentChunk.map((c) => c.str).join(' ').replace(/\s+/g, ' ').trim();
      if (textStr) {
        blocks.push({
          id: `tb_${blockIndex++}`,
          text: textStr,
          x: Math.round(minX),
          y: Math.round(Math.max(0, pageHeight - avgY - maxFontSize)),
          width: Math.round(maxX - minX),
          height: Math.round(maxFontSize * 1.25),
          fontSize: Math.round(maxFontSize),
        });
      }
    }
  }

  return blocks;
}

/**
 * Fallback page renderer using @napi-rs/canvas and pdfjs-dist
 */
async function renderPageWithCanvas(
  pdfJsDoc: any,
  pageNum: number,
  outputPath: string,
  scale: number = 2.0
): Promise<boolean> {
  try {
    const page = await pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext('2d');

    // Fill white background for transparent PDFs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx as any,
      viewport,
    }).promise;

    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buf);
    return true;
  } catch (err) {
    console.warn(`[CanvasRender] Fallback rendering failed for page ${pageNum}:`, err);
    return false;
  }
}

/**
 * Renders complete original PDF page to high-resolution PNG image
 * Preserves 100% of visual elements: photos, logos, Aadhaar/ID layouts, stamps, signatures, tables, borders.
 */
export async function renderPdfPageImages(
  pdfPath: string,
  pageNum: number,
  outputDir: string,
  pdfJsDoc?: any,
  dpi: number = 150
): Promise<{ fullPath?: string; thumbPath?: string }> {
  const fullPath = path.join(outputDir, `page_${pageNum}_full.png`);
  const thumbPath = path.join(outputDir, `page_${pageNum}_thumb.png`);

  let renderedFull = false;

  // 1. Primary native rendering engine: Ghostscript
  try {
    const gsArgs = [
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-sDEVICE=png16m',
      `-r${dpi}`,
      '-dTextAlphaBits=4',
      '-dGraphicsAlphaBits=4',
      `-dFirstPage=${pageNum}`,
      `-dLastPage=${pageNum}`,
      `-sOutputFile=${fullPath}`,
      pdfPath,
    ];

    await execFileAsync('gs', gsArgs);
    if (fs.existsSync(fullPath)) {
      renderedFull = true;
    }
  } catch (err) {
    console.warn(`[PageRender] Ghostscript failed for page ${pageNum}, attempting Canvas fallback:`, err);
  }

  // 2. Secondary fallback engine: Canvas + PDF.js
  if (!renderedFull && pdfJsDoc) {
    const scale = (dpi / 72);
    renderedFull = await renderPageWithCanvas(pdfJsDoc, pageNum, fullPath, scale);
  }

  // 3. Generate high-quality thumbnail from full image using Sharp
  if (renderedFull && fs.existsSync(fullPath)) {
    try {
      await sharp(fullPath)
        .resize({ width: 280, withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 6 })
        .toFile(thumbPath);
    } catch {
      // If thumbnail creation fails, copy fullPath
      try {
        fs.copyFileSync(fullPath, thumbPath);
      } catch {}
    }
  }

  return {
    fullPath: renderedFull && fs.existsSync(fullPath) ? fullPath : undefined,
    thumbPath: fs.existsSync(thumbPath) ? thumbPath : undefined,
  };
}

/**
 * Returns storage directory for a job's rendered page images
 */
export function getJobPageDir(jobId: string): string {
  const dir = path.join(process.cwd(), 'tmp_uploads', 'pdf_pages', jobId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Main PDF text extractor & visual analyzer
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

  // 3. Prepare dedicated persistent working directory for this job's rendered pages
  const pageDir = getJobPageDir(jobId);
  const tempPdfPath = path.join(pageDir, 'input.pdf');
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  // 4. Initialize pdfjs-dist for text extraction and visual inspection
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
  let mixedPagesCount = 0;
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

    // Extract text items & detect embedded images from PDF.js
    let extractedText = '';
    let visualTextBlocks: PdfVisualTextBlock[] = [];
    let hasImages = false;

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
      visualTextBlocks = extractVisualTextBlocks(rawItems, height);

      // Check operator list for image drawing commands
      const ops = await page.getOperatorList();
      const imageOpCodes = new Set(
        [
          (pdfjsLib as any).OPS?.paintImageXObject,
          (pdfjsLib as any).OPS?.paintInlineImageXObject,
          (pdfjsLib as any).OPS?.paintImageMaskXObject,
        ].filter(Boolean)
      );

      if (ops && Array.isArray(ops.fnArray)) {
        hasImages = ops.fnArray.some((op: number) => imageOpCodes.has(op));
      }
    } catch (err) {
      console.warn(`[Extract] PDF.js page ${pageNum} inspection warning:`, err);
    }

    // Render original page preview (150 DPI) + thumbnail
    const { fullPath, thumbPath } = await renderPdfPageImages(
      tempPdfPath,
      pageNum,
      pageDir,
      pdfJsDoc,
      150
    );

    // Determine page content type: Text, Scanned, or Mixed
    const cleanChars = extractedText.replace(/\s+/g, '');
    let isScanned = false;
    let contentType: 'text' | 'scanned' | 'mixed' = 'text';

    // A scanned page is detected when:
    // - extracted text is empty or nearly empty (< 25 characters)
    // - or page contains a raster image and text is sparse (< 60 characters)
    if (cleanChars.length < 25 || (hasImages && cleanChars.length < 60)) {
      isScanned = true;
      contentType = 'scanned';
    } else if (hasImages) {
      isScanned = false;
      contentType = 'mixed';
    } else {
      isScanned = false;
      contentType = 'text';
    }

    let ocrApplied = false;

    // Run OCR for scanned / image pages if engine is configured
    if (isScanned) {
      scannedPagesCount++;

      if (isOcrConfigured && fullPath && fs.existsSync(fullPath)) {
        try {
          const imageBuffer = fs.readFileSync(fullPath);
          const ocrText = await ocrProvider.recognizeText(imageBuffer, 'image/png');
          if (ocrText && ocrText.trim().length > 0) {
            extractedText = ocrText.trim();
            ocrApplied = true;
          }
        } catch {
          // Sensitive document privacy: do not log error details or OCR content
          console.warn(`[OCR] Recognition failed for page ${pageNum}`);
        }
      }
    } else if (contentType === 'mixed') {
      mixedPagesCount++;
    } else {
      textPagesCount++;
    }

    const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).filter(Boolean).length : 0;

    // Generate semantic HTML for the page to feed directly into the rich text editor
    const htmlLines: string[] = [];
    const textLines = extractedText.split(/\r\n|\r|\n/);
    for (const tl of textLines) {
      const trimmed = tl.trim();
      if (!trimmed) continue;
      const safeText = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (trimmed.startsWith('# ')) {
        htmlLines.push(`<h1>${safeText.slice(2)}</h1>`);
      } else if (trimmed.startsWith('## ')) {
        htmlLines.push(`<h2>${safeText.slice(3)}</h2>`);
      } else if (trimmed.startsWith('### ')) {
        htmlLines.push(`<h3>${safeText.slice(4)}</h3>`);
      } else if (/^[-*•]\s+/.test(trimmed)) {
        htmlLines.push(`<ul><li>${safeText.replace(/^[-*•]\s+/, '')}</li></ul>`);
      } else if (/^\d+\.\s+/.test(trimmed)) {
        htmlLines.push(`<ol><li>${safeText.replace(/^\d+\.\s+/, '')}</li></ol>`);
      } else {
        htmlLines.push(`<p>${safeText}</p>`);
      }
    }
    const pageHtml = htmlLines.length > 0 ? htmlLines.join('\n') : '<p><br></p>';

    pagesData.push({
      pageNumber: pageNum,
      text: extractedText,
      html: pageHtml,
      width,
      height,
      isScanned,
      ocrApplied,
      thumbnailPath: thumbPath,
      pageImagePath: fullPath,
      thumbnailUrl: `/api/pdf-to-text/thumbnail/${jobId}/${pageNum}`,
      pageImageUrl: `/api/pdf-to-text/page-image/${jobId}/${pageNum}`,
      downloadPngUrl: `/api/pdf-to-text/download-page-image/${jobId}/${pageNum}?format=png`,
      downloadJpgUrl: `/api/pdf-to-text/download-page-image/${jobId}/${pageNum}?format=jpg`,
      characterCount: extractedText.length,
      wordCount,
      contentType,
      hasImages,
      ocrConfidence: ocrApplied ? 96 : null,
      textBlocks: visualTextBlocks,
    });
  }

  // Determine overall PDF document type
  let pdfType: 'text' | 'scanned' | 'mixed' = 'text';
  if (scannedPagesCount === totalPages) {
    pdfType = 'scanned';
  } else if (scannedPagesCount > 0 || mixedPagesCount > 0) {
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
