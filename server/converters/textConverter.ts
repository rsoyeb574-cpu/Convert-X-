import PDFDocument from 'pdfkit';

export interface TextToPdfOptions {
  pageSize?: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  fontFamily?: 'Helvetica' | 'Times-Roman' | 'Courier';
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineGap?: number;
  pageNumbers?: boolean;
}

const FONT_MAP = {
  Helvetica: 'Helvetica',
  'Times-Roman': 'Times-Roman',
  Courier: 'Courier',
} as const;

function getFont(options: TextToPdfOptions) {
  if (options.fontFamily === 'Times-Roman') return 'Times-Roman';
  if (options.fontFamily === 'Courier') return 'Courier';
  return 'Helvetica';
}

export async function textToPdf(text: string, options: TextToPdfOptions = {}): Promise<Buffer> {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Text is required.');
  }
  if (text.length > 2_000_000) {
    throw new Error('Text is too large. Maximum size is 2 MB of text.');
  }

  const pageSize = options.pageSize ?? 'A4';
  const orientation = options.orientation ?? 'portrait';
  const margin = Math.max(18, Math.min(Number(options.margin ?? 48), 144));
  const fontSize = Math.max(8, Math.min(Number(options.fontSize ?? 12), 72));
  const align = options.align ?? 'left';
  const lineGap = Math.max(0, Math.min(Number(options.lineGap ?? 2), 20));

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: pageSize,
      layout: orientation,
      margins: { top: margin, bottom: margin, left: margin, right: margin },
      autoFirstPage: true,
      info: { Title: 'Convert-X Text Document', Producer: 'Convert-X' },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const baseFont = getFont(options);
    const fontName = options.bold && options.italic
      ? `${baseFont}-BoldOblique`
      : options.bold
        ? `${baseFont}-Bold`
        : options.italic
          ? `${baseFont}-Oblique`
          : baseFont;

    // Built-in PDF fonts have well-defined variants. Courier has BoldOblique,
    // Times has BoldItalic/Italic rather than the Helvetica naming scheme.
    const resolvedFont = options.italic || options.bold
      ? (baseFont === 'Times-Roman'
        ? (options.bold && options.italic ? 'Times-BoldItalic' : options.bold ? 'Times-Bold' : 'Times-Italic')
        : baseFont === 'Courier'
          ? (options.bold && options.italic ? 'Courier-BoldOblique' : options.bold ? 'Courier-Bold' : 'Courier-Oblique')
          : fontName)
      : baseFont;

    doc.font(FONT_MAP[options.fontFamily ?? 'Helvetica'] ? resolvedFont : 'Helvetica');
    doc.fontSize(fontSize);
    doc.fillColor('black');

    const textOptions: PDFKit.Mixins.TextOptions = {
      width: doc.page.width - margin * 2,
      align,
      lineGap,
      continued: false,
    };

    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    lines.forEach((line, index) => {
      doc.text(line || ' ', textOptions);
      if (options.underline && line) {
        // Draw an underline using the current line metrics without changing text layout.
        const y = doc.y - Math.max(1, fontSize * 0.08);
        doc.moveTo(margin, y).lineTo(doc.page.width - margin, y).stroke();
      }
      if (index < lines.length - 1) doc.moveDown(0.35);
    });

    if (options.pageNumbers) {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font('Helvetica').fontSize(9).fillColor('gray');
        doc.text(`${i + 1}`, margin, doc.page.height - margin + 12, {
          width: doc.page.width - margin * 2,
          align: 'center',
        });
      }
    }

    doc.end();
  });
}
