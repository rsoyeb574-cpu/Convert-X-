import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import * as yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import ExcelJS from 'exceljs';
import { parquetReadObjects } from 'hyparquet';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Robust CSV parser that correctly handles quoted values, escaped quotes, and newlines.
 */
function parseCsvRows(csvText: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      if (currentRow.some((c) => c.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.some((c) => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Formats a 2D array of rows into clean escaped CSV string.
 */
function formatCsv(rows: string[][], delimiter: string = ','): string {
  return rows
    .map((row) =>
      row
        .map((val) => {
          const s = val === null || val === undefined ? '' : String(val);
          if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(delimiter)
    )
    .join('\n');
}

export class DataConverter implements ConverterEngine {
  id = 'data-converter';
  name = 'Tabular, Data Science & Developer Engine';
  description = 'Bidirectional transformation across CSV, JSON, JSONL, TSV, Parquet, XLSX, XML, YAML, and Markdown.';

  supportedInputFormats = ['csv', 'tsv', 'json', 'jsonl', 'parquet', 'yaml', 'yml', 'xml', 'md', 'markdown'];
  supportedOutputFormats = ['csv', 'tsv', 'json', 'jsonl', 'xlsx', 'xml', 'yaml', 'html', 'pdf', 'txt'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    if (['csv', 'tsv'].includes(inFmt)) {
      return ['json', 'jsonl', 'tsv', 'csv', 'xlsx', 'xml', 'yaml'].includes(outFmt);
    }
    if (['json'].includes(inFmt)) {
      return ['csv', 'tsv', 'jsonl', 'xlsx', 'xml', 'yaml'].includes(outFmt);
    }
    if (['jsonl'].includes(inFmt)) {
      return ['json', 'csv', 'tsv', 'yaml'].includes(outFmt);
    }
    if (['parquet'].includes(inFmt)) {
      return ['csv', 'json', 'tsv'].includes(outFmt);
    }
    if (['yaml', 'yml'].includes(inFmt)) {
      return ['json', 'csv', 'xml'].includes(outFmt);
    }
    if (['xml'].includes(inFmt)) {
      return ['json', 'csv', 'yaml'].includes(outFmt);
    }
    if (['md', 'markdown'].includes(inFmt)) {
      return ['html', 'pdf', 'txt'].includes(outFmt);
    }
    return false;
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase();
    if (!fileBuffer || fileBuffer.length === 0) {
      return { valid: false, reason: 'Uploaded file is empty.' };
    }

    try {
      if (fmt === 'parquet') {
        if (fileBuffer.length < 4 || fileBuffer.subarray(0, 4).toString('utf8') !== 'PAR1') {
          return { valid: false, reason: 'Invalid Apache Parquet file: Missing PAR1 magic bytes header.' };
        }
      } else if (fmt === 'json') {
        const text = fileBuffer.toString('utf8').trim();
        JSON.parse(text);
      } else if (fmt === 'jsonl') {
        const lines = fileBuffer.toString('utf8').split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          JSON.parse(lines[0]);
        }
      } else if (fmt === 'yaml' || fmt === 'yml') {
        yaml.load(fileBuffer.toString('utf8'));
      } else if (fmt === 'xml') {
        const parser = new XMLParser();
        parser.parse(fileBuffer.toString('utf8'));
      }
      return { valid: true, detectedFormat: fmt };
    } catch (err: any) {
      return { valid: false, reason: `Syntax validation failed for .${fmt.toUpperCase()}: ${err.message}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, inputFormat, outputFormat, fileName } = params;
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase();

    // 1. CSV / TSV INPUT
    if (inFmt === 'csv' || inFmt === 'tsv') {
      const delimiter = inFmt === 'tsv' ? '\t' : ',';
      const text = inputBuffer.toString('utf8');
      const rows = parseCsvRows(text, delimiter);

      if (rows.length === 0) {
        throw new Error('CSV file contains no data rows.');
      }

      const headers = rows[0].map((h, i) => (h.trim().length > 0 ? h.trim() : `col_${i + 1}`));
      const dataObjects = rows.slice(1).map((row) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] !== undefined ? row[i] : '';
        });
        return obj;
      });

      if (outFmt === 'json') {
        const jsonStr = JSON.stringify(dataObjects, null, 2);
        return {
          buffer: Buffer.from(jsonStr, 'utf8'),
          mimeType: 'application/json',
          outputExtension: 'json',
        };
      }

      if (outFmt === 'jsonl') {
        const jsonlStr = dataObjects.map((d) => JSON.stringify(d)).join('\n') + '\n';
        return {
          buffer: Buffer.from(jsonlStr, 'utf8'),
          mimeType: 'application/x-ndjson',
          outputExtension: 'jsonl',
        };
      }

      if (outFmt === 'tsv' || (inFmt === 'tsv' && outFmt === 'csv')) {
        const targetDelim = outFmt === 'tsv' ? '\t' : ',';
        const formatted = formatCsv(rows, targetDelim);
        return {
          buffer: Buffer.from(formatted, 'utf8'),
          mimeType: outFmt === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
          outputExtension: outFmt,
        };
      }

      if (outFmt === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');
        worksheet.addRows(rows);

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        };

        // Auto-fit column widths
        worksheet.columns.forEach((col) => {
          let maxLen = 10;
          col.eachCell?.({ includeEmpty: true }, (cell) => {
            const val = cell.value ? String(cell.value) : '';
            if (val.length > maxLen) maxLen = Math.min(val.length, 50);
          });
          col.width = maxLen + 2;
        });

        const xlsxBuf = await workbook.xlsx.writeBuffer();
        return {
          buffer: Buffer.from(xlsxBuf),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          outputExtension: 'xlsx',
        };
      }

      if (outFmt === 'xml') {
        const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
        const xmlObj = {
          dataset: {
            record: dataObjects,
          },
        };
        const xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(xmlObj);
        return {
          buffer: Buffer.from(xmlStr, 'utf8'),
          mimeType: 'application/xml',
          outputExtension: 'xml',
        };
      }

      if (outFmt === 'yaml') {
        const yamlStr = yaml.dump(dataObjects, { indent: 2 });
        return {
          buffer: Buffer.from(yamlStr, 'utf8'),
          mimeType: 'text/yaml',
          outputExtension: 'yaml',
        };
      }
    }

    // 2. JSON INPUT
    if (inFmt === 'json') {
      const text = inputBuffer.toString('utf8');
      const parsed = JSON.parse(text);

      let records: any[] = [];
      if (Array.isArray(parsed)) {
        records = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Find first array property, or treat single object as 1 row
        const arrayProp = Object.values(parsed).find((v) => Array.isArray(v));
        if (arrayProp && Array.isArray(arrayProp)) {
          records = arrayProp;
        } else {
          records = [parsed];
        }
      }

      if (outFmt === 'csv' || outFmt === 'tsv') {
        const delimiter = outFmt === 'tsv' ? '\t' : ',';
        const headersSet = new Set<string>();
        records.forEach((r) => {
          if (typeof r === 'object' && r !== null) {
            Object.keys(r).forEach((k) => headersSet.add(k));
          }
        });
        const headers = Array.from(headersSet);
        if (headers.length === 0) headers.push('value');

        const rows: string[][] = [headers];
        records.forEach((r) => {
          const row: string[] = [];
          headers.forEach((h) => {
            const val = typeof r === 'object' && r !== null ? r[h] : r;
            row.push(val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val));
          });
          rows.push(row);
        });

        const csvStr = formatCsv(rows, delimiter);
        return {
          buffer: Buffer.from(csvStr, 'utf8'),
          mimeType: outFmt === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
          outputExtension: outFmt,
        };
      }

      if (outFmt === 'jsonl') {
        const jsonlStr = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
        return {
          buffer: Buffer.from(jsonlStr, 'utf8'),
          mimeType: 'application/x-ndjson',
          outputExtension: 'jsonl',
        };
      }

      if (outFmt === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Records');

        const headersSet = new Set<string>();
        records.forEach((r) => {
          if (typeof r === 'object' && r !== null) {
            Object.keys(r).forEach((k) => headersSet.add(k));
          }
        });
        const headers = Array.from(headersSet);
        worksheet.addRow(headers);

        records.forEach((r) => {
          const rowValues = headers.map((h) => {
            const val = typeof r === 'object' && r !== null ? r[h] : r;
            return val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
          });
          worksheet.addRow(rowValues);
        });

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' },
        };

        const xlsxBuf = await workbook.xlsx.writeBuffer();
        return {
          buffer: Buffer.from(xlsxBuf),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          outputExtension: 'xlsx',
        };
      }

      if (outFmt === 'yaml') {
        const yamlStr = yaml.dump(parsed, { indent: 2 });
        return {
          buffer: Buffer.from(yamlStr, 'utf8'),
          mimeType: 'text/yaml',
          outputExtension: 'yaml',
        };
      }

      if (outFmt === 'xml') {
        const builder = new XMLBuilder({ format: true });
        const root = Array.isArray(parsed) ? { root: { item: parsed } } : { root: parsed };
        const xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(root);
        return {
          buffer: Buffer.from(xmlStr, 'utf8'),
          mimeType: 'application/xml',
          outputExtension: 'xml',
        };
      }
    }

    // 3. JSONL INPUT
    if (inFmt === 'jsonl') {
      const lines = inputBuffer.toString('utf8').split('\n').map((l) => l.trim()).filter(Boolean);
      const records = lines.map((l) => JSON.parse(l));

      if (outFmt === 'json') {
        const jsonStr = JSON.stringify(records, null, 2);
        return {
          buffer: Buffer.from(jsonStr, 'utf8'),
          mimeType: 'application/json',
          outputExtension: 'json',
        };
      }

      if (outFmt === 'csv' || outFmt === 'tsv') {
        const delimiter = outFmt === 'tsv' ? '\t' : ',';
        const headersSet = new Set<string>();
        records.forEach((r) => {
          if (typeof r === 'object' && r !== null) {
            Object.keys(r).forEach((k) => headersSet.add(k));
          }
        });
        const headers = Array.from(headersSet);
        const rows: string[][] = [headers];

        records.forEach((r) => {
          const row: string[] = [];
          headers.forEach((h) => {
            const val = r[h];
            row.push(val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val));
          });
          rows.push(row);
        });

        const csvStr = formatCsv(rows, delimiter);
        return {
          buffer: Buffer.from(csvStr, 'utf8'),
          mimeType: outFmt === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
          outputExtension: outFmt,
        };
      }

      if (outFmt === 'yaml') {
        const yamlStr = yaml.dump(records, { indent: 2 });
        return {
          buffer: Buffer.from(yamlStr, 'utf8'),
          mimeType: 'text/yaml',
          outputExtension: 'yaml',
        };
      }
    }

    // 4. APACHE PARQUET INPUT (using pure JS hyparquet)
    if (inFmt === 'parquet') {
      const arrayBuffer = inputBuffer.buffer.slice(
        inputBuffer.byteOffset,
        inputBuffer.byteOffset + inputBuffer.byteLength
      );
      const records = await parquetReadObjects({ file: arrayBuffer });

      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Parquet file contains no data rows.');
      }

      if (outFmt === 'json') {
        const jsonStr = JSON.stringify(records, null, 2);
        return {
          buffer: Buffer.from(jsonStr, 'utf8'),
          mimeType: 'application/json',
          outputExtension: 'json',
        };
      }

      if (outFmt === 'csv' || outFmt === 'tsv') {
        const delimiter = outFmt === 'tsv' ? '\t' : ',';
        const headers = Object.keys(records[0]);
        const rows: string[][] = [headers];

        records.forEach((rec) => {
          const row: string[] = [];
          headers.forEach((h) => {
            const val = rec[h];
            row.push(val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val));
          });
          rows.push(row);
        });

        const csvStr = formatCsv(rows, delimiter);
        return {
          buffer: Buffer.from(csvStr, 'utf8'),
          mimeType: outFmt === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
          outputExtension: outFmt,
        };
      }
    }

    // 5. YAML INPUT
    if (inFmt === 'yaml' || inFmt === 'yml') {
      const yamlText = inputBuffer.toString('utf8');
      const loaded = yaml.load(yamlText);

      if (outFmt === 'json') {
        const jsonStr = JSON.stringify(loaded, null, 2);
        return {
          buffer: Buffer.from(jsonStr, 'utf8'),
          mimeType: 'application/json',
          outputExtension: 'json',
        };
      }

      if (outFmt === 'csv') {
        const list = Array.isArray(loaded) ? loaded : [loaded];
        const headersSet = new Set<string>();
        list.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach((k) => headersSet.add(k));
          }
        });
        const headers = Array.from(headersSet);
        const rows: string[][] = [headers];
        list.forEach((item) => {
          const row = headers.map((h) => {
            const v = item[h];
            return v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
          });
          rows.push(row);
        });

        const csvStr = formatCsv(rows);
        return {
          buffer: Buffer.from(csvStr, 'utf8'),
          mimeType: 'text/csv',
          outputExtension: 'csv',
        };
      }

      if (outFmt === 'xml') {
        const builder = new XMLBuilder({ format: true });
        const root = Array.isArray(loaded) ? { dataset: { item: loaded } } : { root: loaded };
        const xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(root);
        return {
          buffer: Buffer.from(xmlStr, 'utf8'),
          mimeType: 'application/xml',
          outputExtension: 'xml',
        };
      }
    }

    // 6. XML INPUT
    if (inFmt === 'xml') {
      const xmlText = inputBuffer.toString('utf8');
      const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true });
      const parsed = parser.parse(xmlText);

      if (outFmt === 'json') {
        const jsonStr = JSON.stringify(parsed, null, 2);
        return {
          buffer: Buffer.from(jsonStr, 'utf8'),
          mimeType: 'application/json',
          outputExtension: 'json',
        };
      }

      if (outFmt === 'yaml') {
        const yamlStr = yaml.dump(parsed, { indent: 2 });
        return {
          buffer: Buffer.from(yamlStr, 'utf8'),
          mimeType: 'text/yaml',
          outputExtension: 'yaml',
        };
      }

      if (outFmt === 'csv') {
        // Flatten array if root has children array
        let items: any[] = [];
        const rootKeys = Object.keys(parsed);
        if (rootKeys.length === 1 && typeof parsed[rootKeys[0]] === 'object') {
          const rootObj = parsed[rootKeys[0]];
          const childKeys = Object.keys(rootObj);
          if (childKeys.length === 1 && Array.isArray(rootObj[childKeys[0]])) {
            items = rootObj[childKeys[0]];
          } else {
            items = [rootObj];
          }
        } else {
          items = [parsed];
        }

        const headersSet = new Set<string>();
        items.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach((k) => headersSet.add(k));
          }
        });
        const headers = Array.from(headersSet);
        const rows: string[][] = [headers];
        items.forEach((item) => {
          const row = headers.map((h) => {
            const v = item[h];
            return v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
          });
          rows.push(row);
        });

        const csvStr = formatCsv(rows);
        return {
          buffer: Buffer.from(csvStr, 'utf8'),
          mimeType: 'text/csv',
          outputExtension: 'csv',
        };
      }
    }

    // 7. MARKDOWN INPUT
    if (inFmt === 'md' || inFmt === 'markdown') {
      const mdText = inputBuffer.toString('utf8');

      if (outFmt === 'html') {
        // Simple, clean Markdown to HTML transformation
        let html = mdText
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*)\*/gim, '<em>$1</em>')
          .replace(/`([^`]+)`/gim, '<code>$1</code>')
          .replace(/^\- (.*$)/gim, '<li>$1</li>')
          .replace(/\n\n/gim, '</p><p>');

        html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px;color:#1e293b;}h1,h2,h3{color:#0f172a;}code{background:#f1f5f9;padding:2px 6px;border-radius:4px;}pre{background:#0f172a;color:#f8fafc;padding:16px;border-radius:8px;}</style></head><body><p>${html}</p></body></html>`;

        return {
          buffer: Buffer.from(html, 'utf8'),
          mimeType: 'text/html',
          outputExtension: 'html',
        };
      }

      if (outFmt === 'txt') {
        // Strip markdown tokens
        const plain = mdText
          .replace(/#+\s/g, '')
          .replace(/(\*\*|\*|`|~~)/g, '')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1');
        return {
          buffer: Buffer.from(plain, 'utf8'),
          mimeType: 'text/plain',
          outputExtension: 'txt',
        };
      }

      if (outFmt === 'pdf') {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { height } = page.getSize();
        let y = height - 50;

        const lines = mdText.split('\n');
        for (const line of lines) {
          if (y < 50) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - 50;
          }

          if (line.startsWith('# ')) {
            y -= 10;
            page.drawText(line.replace('# ', ''), { x: 50, y, size: 20, font: boldFont, color: rgb(0.1, 0.15, 0.25) });
            y -= 25;
          } else if (line.startsWith('## ')) {
            y -= 8;
            page.drawText(line.replace('## ', ''), { x: 50, y, size: 16, font: boldFont, color: rgb(0.15, 0.2, 0.3) });
            y -= 20;
          } else if (line.startsWith('### ')) {
            y -= 6;
            page.drawText(line.replace('### ', ''), { x: 50, y, size: 13, font: boldFont, color: rgb(0.2, 0.25, 0.35) });
            y -= 18;
          } else if (line.trim().length === 0) {
            y -= 12;
          } else {
            // regular paragraph text
            const cleanText = line.replace(/(\*\*|\*|`)/g, '');
            // word wrap text roughly
            const words = cleanText.split(' ');
            let lineBuf = '';
            for (const w of words) {
              if ((lineBuf + ' ' + w).length > 80) {
                page.drawText(lineBuf, { x: 50, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
                y -= 14;
                lineBuf = w;
                if (y < 50) {
                  page = pdfDoc.addPage([595.28, 841.89]);
                  y = height - 50;
                }
              } else {
                lineBuf = lineBuf ? lineBuf + ' ' + w : w;
              }
            }
            if (lineBuf) {
              page.drawText(lineBuf, { x: 50, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
              y -= 14;
            }
          }
        }

        const pdfBytes = await pdfDoc.save();
        return {
          buffer: Buffer.from(pdfBytes),
          mimeType: 'application/pdf',
          outputExtension: 'pdf',
        };
      }
    }

    throw new Error(`Unsupported tabular conversion from .${inFmt} to .${outFmt}`);
  }
}
