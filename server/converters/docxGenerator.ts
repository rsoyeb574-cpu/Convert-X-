import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';

type AlignmentTypeValue = (typeof AlignmentType)[keyof typeof AlignmentType];
type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

export interface DocxPageItem {
  pageNumber: number;
  text?: string;
  html?: string;
  width?: number;
  height?: number;
}

export interface GenerateDocxOptions {
  title?: string;
  filename?: string;
  pageSize?: 'a4' | 'letter' | 'a3';
  orientation?: 'portrait' | 'landscape';
  margin?: 'small' | 'normal' | 'large' | number;
  fontFamily?: string;
  fontSize?: number;
  lineSpacing?: number | string;
}

interface InlineRun {
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  font?: string;
  size?: number; // in half-points (e.g. 24 = 12pt)
  color?: string;
}

interface ParsedBlock {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet' | 'numbered' | 'table';
  alignment?: AlignmentTypeValue;
  runs: InlineRun[];
  bulletLevel?: number;
  numberIndex?: number;
  tableRows?: string[][];
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

/**
 * Convert HTML page content into structured blocks for docx
 */
function parseHtmlToBlocks(html: string, defaultFont?: string, defaultFontSizeHalfPt?: number): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  if (!html || !html.trim()) return blocks;

  // Clean script, style, and comments
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim();

  // If there are no block tags, wrap everything in a <p>
  if (!/<(p|h[1-6]|ul|ol|li|table|div|blockquote)/i.test(cleaned)) {
    cleaned = `<p>${cleaned}</p>`;
  }

  // Split into top-level HTML chunks
  const blockRegex = /<(h[1-6]|p|div|blockquote|ul|ol|table)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleaned)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const innerHtml = match[3];

    // Determine alignment from style or align attribute
    let alignment: AlignmentTypeValue = AlignmentType.LEFT;
    if (/text-align:\s*center/i.test(attrs) || /align=["']?center["']?/i.test(attrs)) {
      alignment = AlignmentType.CENTER;
    } else if (/text-align:\s*right/i.test(attrs) || /align=["']?right["']?/i.test(attrs)) {
      alignment = AlignmentType.RIGHT;
    } else if (/text-align:\s*justify/i.test(attrs) || /align=["']?justify["']?/i.test(attrs)) {
      alignment = AlignmentType.JUSTIFIED;
    }

    if (tag === 'table') {
      // Parse table rows and cells
      const rowMatches = innerHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      const tableRows: string[][] = [];
      for (const rowHtml of rowMatches) {
        const cellMatches = rowHtml.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
        const cells = cellMatches.map((c) =>
          decodeHtmlEntities(c.replace(/<[^>]+>/g, '').trim())
        );
        if (cells.length > 0) tableRows.push(cells);
      }
      if (tableRows.length > 0) {
        blocks.push({ type: 'table', runs: [], tableRows });
      }
    } else if (tag === 'ul' || tag === 'ol') {
      // List items
      const isOrdered = tag === 'ol';
      const liMatches = innerHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      let num = 1;
      for (const liHtml of liMatches) {
        const liInner = liHtml.replace(/^<li[^>]*>/i, '').replace(/<\/li>$/i, '');
        const runs = parseInlineRuns(liInner, defaultFont, defaultFontSizeHalfPt);
        if (runs.length > 0) {
          blocks.push({
            type: isOrdered ? 'numbered' : 'bullet',
            alignment,
            runs,
            bulletLevel: 0,
            numberIndex: isOrdered ? num++ : undefined,
          });
        }
      }
    } else if (/^h[1-6]$/.test(tag)) {
      let type: ParsedBlock['type'] = 'heading1';
      if (tag === 'h2') type = 'heading2';
      else if (tag >= 'h3') type = 'heading3';

      const runs = parseInlineRuns(innerHtml, defaultFont, defaultFontSizeHalfPt, true);
      if (runs.length > 0) {
        blocks.push({ type, alignment, runs });
      }
    } else {
      // Paragraph or div or blockquote
      // Check if innerHtml contains <br> or multiple paragraphs
      const subParagraphs = innerHtml.split(/<br\s*\/?>/gi);
      for (const sub of subParagraphs) {
        const runs = parseInlineRuns(sub, defaultFont, defaultFontSizeHalfPt);
        if (runs.length > 0) {
          blocks.push({ type: 'paragraph', alignment, runs });
        }
      }
    }

    lastIndex = blockRegex.lastIndex;
  }

  // If no blocks were matched, fallback to raw text parsing
  if (blocks.length === 0) {
    const cleanText = decodeHtmlEntities(cleaned.replace(/<[^>]+>/g, ' ')).trim();
    if (cleanText) {
      blocks.push({
        type: 'paragraph',
        alignment: AlignmentType.LEFT,
        runs: [{ text: cleanText, font: defaultFont, size: defaultFontSizeHalfPt }],
      });
    }
  }

  return blocks;
}

/**
 * Parse inline HTML tags like <b>, <i>, <u>, <span> into styled runs
 */
function parseInlineRuns(
  html: string,
  defaultFont?: string,
  defaultFontSizeHalfPt?: number,
  isHeaderParent: boolean = false
): InlineRun[] {
  const runs: InlineRun[] = [];
  if (!html) return runs;

  // Tokenize tag openings, closings, and plain text
  const tagRegex = /<(\/)?([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let match: RegExpExecArray | null;

  let isBold = isHeaderParent;
  let isItalic = false;
  let isUnderline = false;

  while ((match = tagRegex.exec(html)) !== null) {
    const isClose = !!match[1];
    const tagName = match[2]?.toLowerCase();
    const textNode = match[4];

    if (textNode) {
      const decoded = decodeHtmlEntities(textNode);
      if (decoded.length > 0) {
        runs.push({
          text: decoded,
          bold: isBold,
          italics: isItalic,
          underline: isUnderline,
          font: defaultFont,
          size: defaultFontSizeHalfPt,
        });
      }
    } else if (tagName) {
      if (tagName === 'b' || tagName === 'strong') {
        isBold = !isClose;
      } else if (tagName === 'i' || tagName === 'em') {
        isItalic = !isClose;
      } else if (tagName === 'u') {
        isUnderline = !isClose;
      }
    }
  }

  // Consolidate adjacent runs with identical styling
  const merged: InlineRun[] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.bold === r.bold &&
      last.italics === r.italics &&
      last.underline === r.underline &&
      last.font === r.font &&
      last.size === r.size &&
      last.color === r.color
    ) {
      last.text += r.text;
    } else {
      merged.push({ ...r });
    }
  }

  return merged;
}

/**
 * Convert plain text (markdown or lines) into structured blocks
 */
function parsePlainTextToBlocks(
  text: string,
  defaultFont?: string,
  defaultFontSizeHalfPt?: number
): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  if (!text) return blocks;

  const lines = text.split(/\r\n|\r|\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#\s+/.test(trimmed)) {
      blocks.push({
        type: 'heading1',
        alignment: AlignmentType.LEFT,
        runs: [
          {
            text: trimmed.replace(/^#\s+/, ''),
            bold: true,
            font: defaultFont,
            size: (defaultFontSizeHalfPt || 24) + 8,
          },
        ],
      });
    } else if (/^##\s+/.test(trimmed)) {
      blocks.push({
        type: 'heading2',
        alignment: AlignmentType.LEFT,
        runs: [
          {
            text: trimmed.replace(/^##\s+/, ''),
            bold: true,
            font: defaultFont,
            size: (defaultFontSizeHalfPt || 24) + 4,
          },
        ],
      });
    } else if (/^###\s+/.test(trimmed)) {
      blocks.push({
        type: 'heading3',
        alignment: AlignmentType.LEFT,
        runs: [
          {
            text: trimmed.replace(/^###\s+/, ''),
            bold: true,
            font: defaultFont,
            size: (defaultFontSizeHalfPt || 24) + 2,
          },
        ],
      });
    } else if (/^[-*•]\s+/.test(trimmed)) {
      blocks.push({
        type: 'bullet',
        alignment: AlignmentType.LEFT,
        bulletLevel: 0,
        runs: [
          {
            text: trimmed.replace(/^[-*•]\s+/, ''),
            font: defaultFont,
            size: defaultFontSizeHalfPt,
          },
        ],
      });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const matchNum = trimmed.match(/^(\d+)\.\s+(.*)$/);
      blocks.push({
        type: 'numbered',
        alignment: AlignmentType.LEFT,
        numberIndex: matchNum ? Number(matchNum[1]) : 1,
        runs: [
          {
            text: matchNum ? matchNum[2] : trimmed,
            font: defaultFont,
            size: defaultFontSizeHalfPt,
          },
        ],
      });
    } else {
      blocks.push({
        type: 'paragraph',
        alignment: AlignmentType.LEFT,
        runs: [{ text: line, font: defaultFont, size: defaultFontSizeHalfPt }],
      });
    }
  }

  return blocks;
}

/**
 * Generate fully standard OpenXML Microsoft Word (.docx) document
 */
export async function generateDocxFromPages(
  pages: DocxPageItem[],
  options?: GenerateDocxOptions
): Promise<Buffer> {
  const title = options?.title || 'Convert-X Document';
  const requestedPageSize = options?.pageSize || 'a4';
  const orientation = options?.orientation || 'portrait';
  const fontFamily = options?.fontFamily || 'Calibri';
  const fontSizePt = options?.fontSize || 11;
  const fontSizeHalfPt = fontSizePt * 2; // Word uses half-points (11pt = 22)

  // Standard dimensions in twips (1 inch = 1440 twips)
  let pageWidthTwips = 11906; // A4 width: 210mm = 8.27 in
  let pageHeightTwips = 16838; // A4 height: 297mm = 11.69 in

  if (requestedPageSize === 'letter') {
    pageWidthTwips = 12240; // 8.5 in
    pageHeightTwips = 15840; // 11.0 in
  } else if (requestedPageSize === 'a3') {
    pageWidthTwips = 16838;
    pageHeightTwips = 23811;
  }

  if (orientation === 'landscape') {
    const temp = pageWidthTwips;
    pageWidthTwips = pageHeightTwips;
    pageHeightTwips = temp;
  }

  let marginTwips = 1440; // 1.0 inch default
  if (options?.margin === 'small') marginTwips = 720; // 0.5 in
  else if (options?.margin === 'large') marginTwips = 2160; // 1.5 in
  else if (typeof options?.margin === 'number') marginTwips = Math.round(options.margin * 20);

  const sectionChildren: (Paragraph | Table)[] = [];

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx];

    // Prefer html if present, else fallback to text
    let blocks: ParsedBlock[] = [];
    if (page.html && page.html.trim().length > 0) {
      blocks = parseHtmlToBlocks(page.html, fontFamily, fontSizeHalfPt);
    } else if (page.text) {
      blocks = parsePlainTextToBlocks(page.text, fontFamily, fontSizeHalfPt);
    }

    if (blocks.length === 0) {
      // Empty page placeholder
      sectionChildren.push(
        new Paragraph({
          children: [new TextRun({ text: '', font: fontFamily, size: fontSizeHalfPt })],
          spacing: { after: 120 },
        })
      );
    } else {
      for (const block of blocks) {
        if (block.type === 'table' && block.tableRows) {
          const docxRows = block.tableRows.map((row) => {
            return new TableRow({
              children: row.map(
                (cellText) =>
                  new TableCell({
                    width: {
                      size: Math.floor(100 / Math.max(1, row.length)),
                      type: WidthType.PERCENTAGE,
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cellText,
                            font: fontFamily,
                            size: fontSizeHalfPt,
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            });
          });

          sectionChildren.push(
            new Table({
              rows: docxRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            })
          );
        } else {
          let headingLevel: HeadingLevelValue | undefined;
          if (block.type === 'heading1') headingLevel = HeadingLevel.HEADING_1;
          else if (block.type === 'heading2') headingLevel = HeadingLevel.HEADING_2;
          else if (block.type === 'heading3') headingLevel = HeadingLevel.HEADING_3;

          const textRuns = block.runs.map(
            (r) =>
              new TextRun({
                text: r.text,
                bold: r.bold,
                italics: r.italics,
                underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
                font: r.font || fontFamily,
                size: r.size || fontSizeHalfPt,
                color: r.color,
              })
          );

          if (block.type === 'bullet') {
            sectionChildren.push(
              new Paragraph({
                bullet: { level: block.bulletLevel || 0 },
                alignment: block.alignment || AlignmentType.LEFT,
                children: textRuns,
                spacing: { after: 100 },
              })
            );
          } else if (block.type === 'numbered') {
            // Include readable numbered prefix for compatibility across all office suites
            const numPrefix = block.numberIndex ? `${block.numberIndex}. ` : '1. ';
            sectionChildren.push(
              new Paragraph({
                alignment: block.alignment || AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: numPrefix,
                    bold: true,
                    font: fontFamily,
                    size: fontSizeHalfPt,
                  }),
                  ...textRuns,
                ],
                spacing: { after: 100 },
              })
            );
          } else {
            sectionChildren.push(
              new Paragraph({
                heading: headingLevel,
                alignment: block.alignment || AlignmentType.LEFT,
                children: textRuns,
                spacing: {
                  before: headingLevel ? 200 : 0,
                  after: headingLevel ? 120 : 120,
                  line: 276, // 1.15 line spacing
                },
              })
            );
          }
        }
      }
    }

    // Insert hard page break between pages (except after the final page)
    if (pIdx < pages.length - 1) {
      sectionChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }
  }

  const doc = new Document({
    creator: 'Convert-X Professional Document Studio',
    title,
    description: 'Editable Microsoft Word document generated by Convert-X',
    styles: {
      default: {
        document: {
          run: {
            font: fontFamily,
            size: fontSizeHalfPt,
            color: '111827',
          },
          paragraph: {
            spacing: {
              line: 276,
              after: 120,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageWidthTwips,
              height: pageHeightTwips,
            },
            margin: {
              top: marginTwips,
              right: marginTwips,
              bottom: marginTwips,
              left: marginTwips,
            },
          },
        },
        children: sectionChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
