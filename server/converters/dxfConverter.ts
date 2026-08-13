import DxfParser from 'dxf-parser';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

// AutoCAD ACI color to Hex color map
const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', // Red
  2: '#FFFF00', // Yellow
  3: '#00FF00', // Green
  4: '#00FFFF', // Cyan
  5: '#0000FF', // Blue
  6: '#FF00FF', // Magenta
  7: '#1E293B', // White/Black (dark slate for light background)
  8: '#808080', // Dark Gray
  9: '#C0C0C0', // Light Gray
};

export class DxfConverter implements ConverterEngine {
  id = 'dxf-cad-engine';
  name = 'DXF Vector CAD Engine';
  description = 'Direct CAD vector parser converting DXF drawings to SVG, PDF, PNG, and JPG with layer color mapping.';

  supportedInputFormats = ['dxf'];
  supportedOutputFormats = ['svg', 'pdf', 'png', 'jpg'];

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (inputFormat.toLowerCase() !== 'dxf') {
      return { valid: false, reason: 'Only DXF files are supported by the DXF engine.' };
    }

    try {
      const text = fileBuffer.toString('utf-8');
      const parser = new DxfParser();
      const parsed = parser.parseSync(text);
      if (!parsed || (!parsed.entities && !parsed.blocks)) {
        return { valid: false, reason: 'Invalid DXF CAD file structure.' };
      }
      return { valid: true, detectedFormat: 'dxf' };
    } catch (err: any) {
      return { valid: false, reason: `Invalid DXF file: ${err.message || 'Syntax error'}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // Parse DXF to SVG
    const dxfText = inputBuffer.toString('utf-8');
    const parser = new DxfParser();
    const dxfData = parser.parseSync(dxfText);

    const svgXml = this.dxfToSvg(dxfData, options);

    if (target === 'svg') {
      return {
        buffer: Buffer.from(svgXml, 'utf-8'),
        mimeType: 'image/svg+xml',
        outputExtension: 'svg',
      };
    }

    // DXF -> PNG or JPG via Sharp
    if (target === 'png' || target === 'jpg') {
      const dpi = options.dpi || 150;
      const density = Math.round((dpi / 72) * 150);
      let pipeline = sharp(Buffer.from(svgXml, 'utf-8'), { density });

      if (target === 'jpg') {
        const bg = options.backgroundColor && options.backgroundColor !== 'transparent'
          ? options.backgroundColor
          : '#ffffff';
        pipeline = pipeline.flatten({ background: bg });
        const buf = await pipeline.jpeg({ quality: options.quality || 90 }).toBuffer();
        return { buffer: buf, mimeType: 'image/jpeg', outputExtension: 'jpg' };
      } else {
        const buf = await pipeline.png({ quality: options.quality || 90 }).toBuffer();
        return { buffer: buf, mimeType: 'image/png', outputExtension: 'png' };
      }
    }

    // DXF -> PDF (DXF -> SVG -> PNG -> PDF)
    if (target === 'pdf') {
      const pngBuffer = await sharp(Buffer.from(svgXml, 'utf-8'), { density: 200 })
        .png()
        .toBuffer();

      const pdfDoc = await PDFDocument.create();
      const pngImage = await pdfDoc.embedPng(pngBuffer);

      const isLandscape = options.orientation === 'landscape';
      const pageWidth = isLandscape ? 841.89 : 595.28; // A4 dimensions in points
      const pageHeight = isLandscape ? 595.28 : 841.89;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const scale = Math.min((pageWidth - 40) / pngImage.width, (pageHeight - 40) / pngImage.height);
      const drawWidth = pngImage.width * scale;
      const drawHeight = pngImage.height * scale;
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      page.drawImage(pngImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });

      const pdfBytes = await pdfDoc.save();
      return {
        buffer: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
      };
    }

    throw new Error(`Unsupported output format ${outputFormat} for DXF Converter`);
  }

  private dxfToSvg(dxf: any, options: any): string {
    const elements: string[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      if (isNaN(x) || isNaN(y)) return;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };

    const getColor = (entity: any) => {
      if (entity.color && ACI_COLORS[entity.color]) {
        return ACI_COLORS[entity.color];
      }
      return '#2563EB'; // Royal blue default CAD accent
    };

    const strokeWidth = 1.2;

    const entities = dxf.entities || [];
    for (const entity of entities) {
      const color = getColor(entity);

      if (entity.type === 'LINE') {
        const { vertices } = entity;
        if (vertices && vertices.length >= 2) {
          const x1 = vertices[0].x, y1 = vertices[0].y;
          const x2 = vertices[1].x, y2 = vertices[1].y;
          updateBounds(x1, y1);
          updateBounds(x2, y2);
          elements.push(
            `<line x1="${x1}" y1="${-y1}" x2="${x2}" y2="${-y2}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
          );
        }
      } else if (entity.type === 'CIRCLE') {
        const { center, radius } = entity;
        if (center && radius) {
          updateBounds(center.x - radius, center.y - radius);
          updateBounds(center.x + radius, center.y + radius);
          elements.push(
            `<circle cx="${center.x}" cy="${-center.y}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`
          );
        }
      } else if (entity.type === 'ARC') {
        const { center, radius, startAngle, endAngle } = entity;
        if (center && radius) {
          const startX = center.x + radius * Math.cos(startAngle);
          const startY = center.y + radius * Math.sin(startAngle);
          const endX = center.x + radius * Math.cos(endAngle);
          const endY = center.y + radius * Math.sin(endAngle);

          updateBounds(center.x - radius, center.y - radius);
          updateBounds(center.x + radius, center.y + radius);

          const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
          const d = `M ${startX} ${-startY} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endX} ${-endY}`;
          elements.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`);
        }
      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const vertices = entity.vertices || [];
        if (vertices.length > 0) {
          const pointsStr = vertices
            .map((v: any) => {
              updateBounds(v.x, v.y);
              return `${v.x},${-v.y}`;
            })
            .join(' ');
          const isClosed = entity.shape || entity.closed;
          const tag = isClosed ? 'polygon' : 'polyline';
          elements.push(
            `<${tag} points="${pointsStr}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`
          );
        }
      } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
        const x = entity.startPoint?.x || entity.position?.x || 0;
        const y = entity.startPoint?.y || entity.position?.y || 0;
        const text = entity.text || '';
        updateBounds(x, y);
        elements.push(
          `<text x="${x}" y="${-y}" fill="${color}" font-family="monospace" font-size="${entity.height || 12}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`
        );
      }
    }

    // Fallback bounds if empty drawing
    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 500; maxY = 500;
    }

    const padding = Math.max((maxX - minX) * 0.05, 20);
    const vMinX = minX - padding;
    const vMinY = -maxY - padding;
    const vWidth = Math.max(maxX - minX + padding * 2, 100);
    const vHeight = Math.max(maxY - minY + padding * 2, 100);

    const bgColor = options?.backgroundColor && options.backgroundColor !== 'transparent'
      ? options.backgroundColor
      : '#f8fafc'; // Clean light slate background for CAD drawings

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vMinX} ${vMinY} ${vWidth} ${vHeight}" width="100%" height="100%">
  <rect x="${vMinX}" y="${vMinY}" width="${vWidth}" height="${vHeight}" fill="${bgColor}"/>
  <g transform="scale(1, 1)">
    ${elements.join('\n    ')}
  </g>
</svg>`;
  }
}
