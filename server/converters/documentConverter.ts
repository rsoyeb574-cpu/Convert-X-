import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import sharp from 'sharp';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

export class DocumentConverter implements ConverterEngine {
  id = 'office-document-engine';
  name = 'Document & Spreadsheet Visual Export Engine';
  description = 'Direct visual page renderer converting DOCX, XLSX, TXT, and HTML documents into crisp high-DPI PNG, JPG, and multi-page vector-embedded PDF documents.';

  supportedInputFormats = ['docx', 'xlsx', 'txt', 'html', 'htm'];
  supportedOutputFormats = ['png', 'jpg', 'pdf'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return this.supportedInputFormats.includes(inFmt) && ['png', 'jpg', 'pdf'].includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase();
    if (!this.supportedInputFormats.includes(fmt)) {
      return { valid: false, reason: `Format .${inputFormat} is not supported by document engine.` };
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return { valid: false, reason: 'Empty document file buffer.' };
    }

    if (fmt === 'docx' || fmt === 'xlsx') {
      // Must be a valid zip archive (starts with PK)
      if (fileBuffer.length < 4 || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4b) {
        return { valid: false, reason: `Invalid .${fmt.toUpperCase()} file header: Expected ZIP container.` };
      }
    }

    return { valid: true, detectedFormat: fmt };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, inputFormat, outputFormat, options, fileName } = params;
    const inFmt = inputFormat.toLowerCase();
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    let pageImages: Buffer[] = [];

    if (inFmt === 'docx') {
      pageImages = await this.renderDocxToPageImages(inputBuffer, options, fileName);
    } else if (inFmt === 'xlsx') {
      pageImages = await this.renderXlsxToPageImages(inputBuffer, options);
    } else if (inFmt === 'txt') {
      pageImages = await this.renderTextToPageImages(inputBuffer.toString('utf-8'), options, fileName);
    } else if (inFmt === 'html' || inFmt === 'htm') {
      pageImages = await this.renderHtmlToPageImages(inputBuffer.toString('utf-8'), options, fileName);
    } else {
      throw new Error(`Unsupported document input format: .${inFmt}`);
    }

    if (pageImages.length === 0) {
      throw new Error('Document renderer produced 0 pages. File may be empty.');
    }

    const totalPages = pageImages.length;

    // 1. Output: PDF (Create multi-page PDF document)
    if (target === 'pdf') {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < totalPages; i++) {
        const pagePng = pageImages[i];
        const embeddedImg = await pdfDoc.embedPng(pagePng);

        let [pageWidth, pageHeight] = PageSizes.A4;
        const isLandscape = options.orientation === 'landscape';
        const pageSizeSetting = options.pageSize || 'a4';

        if (pageSizeSetting === 'letter') {
          pageWidth = 612; pageHeight = 792;
        } else if (pageSizeSetting === 'legal') {
          pageWidth = 612; pageHeight = 1008;
        } else if (pageSizeSetting === 'a3') {
          pageWidth = 841.89; pageHeight = 1190.55;
        } else if (pageSizeSetting === 'auto') {
          pageWidth = embeddedImg.width;
          pageHeight = embeddedImg.height;
        }

        if (isLandscape && pageSizeSetting !== 'auto') {
          const temp = pageWidth;
          pageWidth = pageHeight;
          pageHeight = temp;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const margin = typeof options.margin === 'number' ? options.margin : 20;

        let drawW = embeddedImg.width;
        let drawH = embeddedImg.height;
        let x = 0;
        let y = 0;

        if (pageSizeSetting !== 'auto') {
          const maxW = pageWidth - margin * 2;
          const maxH = pageHeight - margin * 2;
          const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height);
          drawW = embeddedImg.width * scale;
          drawH = embeddedImg.height * scale;
          x = (pageWidth - drawW) / 2;
          y = (pageHeight - drawH) / 2;
        }

        page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH });
      }

      const pdfBytes = await pdfDoc.save();
      return {
        buffer: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
        pageCount: totalPages,
      };
    }

    // 2. Output: Single image if pageNumber is requested or totalPages === 1
    if (options.pageNumber || totalPages === 1) {
      const pageIdx = Math.max(1, Math.min(options.pageNumber || 1, totalPages)) - 1;
      const rawPng = pageImages[pageIdx];

      let pipeline = sharp(rawPng);
      const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;

      if (options.width || options.height) {
        pipeline = pipeline.resize(options.width || null, options.height || null, {
          fit: options.maintainAspectRatio !== false ? 'contain' : 'fill',
        });
      }

      let outBuffer: Buffer;
      let mimeType: string;

      if (target === 'jpg') {
        const bg = options.backgroundColor && options.backgroundColor !== 'transparent'
          ? options.backgroundColor
          : '#ffffff';
        pipeline = pipeline.flatten({ background: bg });
        outBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
        mimeType = 'image/jpeg';
      } else {
        if (options.backgroundColor && options.backgroundColor !== 'transparent') {
          pipeline = pipeline.flatten({ background: options.backgroundColor });
        }
        outBuffer = await pipeline.png({ quality }).toBuffer();
        mimeType = 'image/png';
      }

      const meta = await sharp(outBuffer).metadata();
      return {
        buffer: outBuffer,
        mimeType,
        outputExtension: target,
        pageCount: totalPages,
        width: meta.width,
        height: meta.height,
      };
    }

    // 3. Output: Multi-page ZIP archive of PNG or JPG images
    const zip = new JSZip();
    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? options.quality : 90;

    for (let i = 0; i < totalPages; i++) {
      const rawPng = pageImages[i];
      let pipeline = sharp(rawPng);

      let pageBuf: Buffer;
      if (target === 'jpg') {
        const bg = options.backgroundColor && options.backgroundColor !== 'transparent'
          ? options.backgroundColor
          : '#ffffff';
        pipeline = pipeline.flatten({ background: bg });
        pageBuf = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      } else {
        if (options.backgroundColor && options.backgroundColor !== 'transparent') {
          pipeline = pipeline.flatten({ background: options.backgroundColor });
        }
        pageBuf = await pipeline.png({ quality }).toBuffer();
      }

      const pageFileName = `page_${String(i + 1).padStart(3, '0')}.${target}`;
      zip.file(pageFileName, pageBuf);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return {
      buffer: zipBuffer,
      mimeType: 'application/zip',
      outputExtension: 'zip',
      pageCount: totalPages,
    };
  }

  // --- DOCX RENDERING ---
  private async renderDocxToPageImages(buffer: Buffer, options: any, fileName?: string): Promise<Buffer[]> {
    let extractedText = '';
    try {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } catch (err: any) {
      throw new Error(`Failed to extract text from DOCX: ${err.message || 'Corrupt Word document'}`);
    }

    if (!extractedText.trim()) {
      extractedText = `[Word Document: ${fileName || 'document.docx'}]\n(Document contains no printable plain text content)`;
    }

    return this.renderTextToPageImages(extractedText, options, fileName);
  }

  // --- XLSX RENDERING ---
  private async renderXlsxToPageImages(buffer: Buffer, options: any): Promise<Buffer[]> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (err: any) {
      throw new Error(`Failed to parse Excel workbook: ${err.message || 'Corrupt spreadsheet'}`);
    }

    const pages: Buffer[] = [];
    const dpi = options?.dpi || 150;
    const scale = dpi / 72;

    const canvasWidth = Math.round(1190 * (scale / 1.5)); // Landscape A4 dimension
    const canvasHeight = Math.round(842 * (scale / 1.5));

    workbook.eachSheet((worksheet) => {
      const sheetName = worksheet.name || 'Sheet 1';
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Header Bar
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(0, 0, canvasWidth, Math.round(50 * (scale / 1.5)));

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(18 * (scale / 1.5))}px sans-serif`;
      ctx.fillText(`📊 Excel Worksheet: ${sheetName}`, 30, Math.round(32 * (scale / 1.5)));

      // Collect grid data
      const rows: string[][] = [];
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const rowVals: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          let text = '';
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object' && 'result' in cell.value) {
              text = String((cell.value as any).result ?? '');
            } else if (typeof cell.value === 'object' && 'text' in cell.value) {
              text = String((cell.value as any).text ?? '');
            } else {
              text = String(cell.value);
            }
          }
          rowVals.push(text);
        });
        if (rowVals.length > 0) {
          rows.push(rowVals);
        }
      });

      if (rows.length === 0) {
        ctx.fillStyle = '#64748B';
        ctx.font = `${Math.round(16 * (scale / 1.5))}px sans-serif`;
        ctx.fillText('Empty worksheet.', 40, 100);
      } else {
        const maxCols = Math.min(Math.max(...rows.map((r) => r.length)), 10);
        const colWidth = Math.floor((canvasWidth - 80) / Math.max(maxCols, 1));
        const rowHeight = Math.round(32 * (scale / 1.5));
        const startY = Math.round(80 * (scale / 1.5));

        const maxDisplayRows = Math.min(rows.length, Math.floor((canvasHeight - startY - 40) / rowHeight));

        for (let r = 0; r < maxDisplayRows; r++) {
          const rowData = rows[r];
          const y = startY + r * rowHeight;
          const isHeader = r === 0;

          // Row background
          ctx.fillStyle = isHeader ? '#F1F5F9' : r % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          ctx.fillRect(40, y, canvasWidth - 80, rowHeight);

          // Row border
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 1;
          ctx.strokeRect(40, y, canvasWidth - 80, rowHeight);

          // Cells
          for (let c = 0; c < maxCols; c++) {
            const cellText = (rowData[c] || '').slice(0, 30);
            const x = 40 + c * colWidth;

            // Col divider
            if (c > 0) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + rowHeight);
              ctx.stroke();
            }

            ctx.fillStyle = isHeader ? '#0F172A' : '#334155';
            ctx.font = isHeader
              ? `bold ${Math.round(13 * (scale / 1.5))}px sans-serif`
              : `${Math.round(12 * (scale / 1.5))}px sans-serif`;
            ctx.fillText(cellText, x + 8, y + Math.round(20 * (scale / 1.5)));
          }
        }
      }

      // Footer
      ctx.fillStyle = '#94A3B8';
      ctx.font = `${Math.round(11 * (scale / 1.5))}px sans-serif`;
      ctx.fillText(
        `Generated by Convert-X Universal Document Renderer • Sheet 1 of ${workbook.worksheets.length}`,
        40,
        canvasHeight - 15
      );

      pages.push(canvas.toBuffer('image/png'));
    });

    return pages.length > 0 ? pages : [this.renderEmptyPage('Empty Spreadsheet')];
  }

  // --- TXT / MARKDOWN RENDERING ---
  private async renderTextToPageImages(rawText: string, options: any, title?: string): Promise<Buffer[]> {
    const lines = rawText.split(/\r?\n/);
    const dpi = options?.dpi || 150;
    const scale = dpi / 72;

    const isLandscape = options?.orientation === 'landscape';
    const canvasWidth = Math.round((isLandscape ? 1190 : 842) * (scale / 1.5));
    const canvasHeight = Math.round((isLandscape ? 842 : 1190) * (scale / 1.5));

    const marginX = Math.round(60 * (scale / 1.5));
    const startY = Math.round(90 * (scale / 1.5));
    const lineHeight = Math.round(24 * (scale / 1.5));
    const fontSize = Math.round(14 * (scale / 1.5));
    const availableWidth = canvasWidth - marginX * 2;
    const maxLinesPerPage = Math.floor((canvasHeight - startY - 60) / lineHeight);

    // Break raw text into wrapped lines
    const wrappedLines: string[] = [];
    const testCanvas = createCanvas(100, 100);
    const testCtx = testCanvas.getContext('2d');
    testCtx.font = `${fontSize}px sans-serif`;

    for (const rawLine of lines) {
      if (!rawLine.trim()) {
        wrappedLines.push('');
        continue;
      }
      const words = rawLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = testCtx.measureText(testLine);
        if (metrics.width > availableWidth && currentLine) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }

    if (wrappedLines.length === 0) {
      wrappedLines.push('(Empty Document)');
    }

    // Paginate wrapped lines
    const pages: Buffer[] = [];
    const totalPages = Math.ceil(wrappedLines.length / maxLinesPerPage) || 1;

    for (let p = 0; p < totalPages; p++) {
      const pageLines = wrappedLines.slice(p * maxLinesPerPage, (p + 1) * maxLinesPerPage);
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = options?.backgroundColor && options.backgroundColor !== 'transparent'
        ? options.backgroundColor
        : '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Header Banner
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(0, 0, canvasWidth, Math.round(40 * (scale / 1.5)));

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(14 * (scale / 1.5))}px sans-serif`;
      ctx.fillText(`📄 ${title || 'Document Export'}`, marginX, Math.round(26 * (scale / 1.5)));

      // Content Lines
      ctx.fillStyle = '#0F172A';
      ctx.font = `${fontSize}px sans-serif`;

      for (let i = 0; i < pageLines.length; i++) {
        const line = pageLines[i];
        const y = startY + i * lineHeight;
        ctx.fillText(line, marginX, y);
      }

      // Footer
      ctx.fillStyle = '#94A3B8';
      ctx.font = `${Math.round(11 * (scale / 1.5))}px sans-serif`;
      ctx.fillText(`Page ${p + 1} of ${totalPages}`, marginX, canvasHeight - Math.round(25 * (scale / 1.5)));
      ctx.fillText('Convert-X Universal Document Renderer', canvasWidth - marginX - 220, canvasHeight - Math.round(25 * (scale / 1.5)));

      pages.push(canvas.toBuffer('image/png'));
    }

    return pages;
  }

  // --- HTML RENDERING ---
  private async renderHtmlToPageImages(htmlText: string, options: any, title?: string): Promise<Buffer[]> {
    // Strip script/style tags and clean tags for structured visual representation
    const cleanText = htmlText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    return this.renderTextToPageImages(cleanText || '(HTML document containing no text)', options, title || 'HTML Web Export');
  }

  private renderEmptyPage(label: string): Buffer {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#64748B';
    ctx.font = '16px sans-serif';
    ctx.fillText(label, 50, 50);
    return canvas.toBuffer('image/png');
  }
}
