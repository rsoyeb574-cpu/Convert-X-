import DxfParser from 'dxf-parser';
import sharp from 'sharp';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

// AutoCAD ACI standard color to Hex palette
const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', // Red
  2: '#FFFF00', // Yellow
  3: '#00FF00', // Green
  4: '#00FFFF', // Cyan
  5: '#0000FF', // Blue
  6: '#FF00FF', // Magenta
  7: '#1E293B', // White/Black (dark slate for light background visibility)
  8: '#808080', // Dark Gray
  9: '#A0AEC0', // Light Gray
  10: '#FF0000',
  20: '#FFA500',
  30: '#FFFF00',
  40: '#7FFF00',
  50: '#00FF00',
  60: '#00FF7F',
  70: '#00FFFF',
  80: '#007FFF',
  90: '#0000FF',
  100: '#7F00FF',
  110: '#FF00FF',
  120: '#FF007F',
  130: '#334155',
  140: '#475569',
  150: '#64748B',
  250: '#1E293B',
  255: '#0F172A',
};

export class DxfConverter implements ConverterEngine {
  id = 'dxf-cad-engine';
  name = 'DXF Vector CAD Engine';
  description = 'Direct CAD vector parser converting DXF architectural & engineering drawings to SVG, PDF, PNG, and JPG with layer color mapping.';

  supportedInputFormats = ['dxf'];
  supportedOutputFormats = ['svg', 'pdf', 'png', 'jpg'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return inFmt === 'dxf' && ['svg', 'pdf', 'png', 'jpg'].includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    if (inputFormat.toLowerCase() !== 'dxf') {
      return { valid: false, reason: 'Only .DXF CAD drawings are supported by the DXF engine.' };
    }

    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return { valid: false, reason: 'Empty file buffer.' };
      }
      const text = fileBuffer.toString('utf-8');
      const parser = new DxfParser();
      const parsed = parser.parseSync(text);
      if (!parsed) {
        return { valid: false, reason: 'Invalid DXF CAD file syntax.' };
      }
      return { valid: true, detectedFormat: 'dxf' };
    } catch (err: any) {
      return { valid: false, reason: `Invalid DXF file: ${err.message || 'Corrupt CAD structure'}` };
    }
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, outputFormat, options } = params;
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // Parse DXF into geometry
    const dxfText = inputBuffer.toString('utf-8');
    const parser = new DxfParser();
    let dxfData: any;
    try {
      dxfData = parser.parseSync(dxfText);
    } catch (err: any) {
      throw new Error(`Failed to parse DXF drawing: ${err.message || 'Syntax error'}`);
    }

    if (!dxfData) {
      throw new Error('DXF file contains no parseable CAD database.');
    }

    const svgXml = this.dxfToSvg(dxfData, options);

    // 1. DXF -> SVG
    if (target === 'svg') {
      const buf = Buffer.from(svgXml, 'utf-8');
      return {
        buffer: buf,
        mimeType: 'image/svg+xml',
        outputExtension: 'svg',
      };
    }

    // 2. DXF -> PNG or JPG via Sharp
    if (target === 'png' || target === 'jpg') {
      const dpi = options.dpi || 150;
      const density = Math.round((dpi / 72) * 150);
      let pipeline = sharp(Buffer.from(svgXml, 'utf-8'), { density });

      if (options.width || options.height) {
        pipeline = pipeline.resize(options.width || null, options.height || null, {
          fit: options.maintainAspectRatio !== false ? 'contain' : 'fill',
        });
      }

      if (target === 'jpg') {
        const bg = options.backgroundColor && options.backgroundColor !== 'transparent'
          ? options.backgroundColor
          : '#ffffff';
        pipeline = pipeline.flatten({ background: bg });
        const buf = await pipeline.jpeg({ quality: options.quality || 90, mozjpeg: true }).toBuffer();
        const meta = await sharp(buf).metadata();
        return {
          buffer: buf,
          mimeType: 'image/jpeg',
          outputExtension: 'jpg',
          width: meta.width,
          height: meta.height,
        };
      } else {
        if (options.backgroundColor && options.backgroundColor !== 'transparent') {
          pipeline = pipeline.flatten({ background: options.backgroundColor });
        }
        const buf = await pipeline.png({ quality: options.quality || 90 }).toBuffer();
        const meta = await sharp(buf).metadata();
        return {
          buffer: buf,
          mimeType: 'image/png',
          outputExtension: 'png',
          width: meta.width,
          height: meta.height,
        };
      }
    }

    // 3. DXF -> PDF (Vector-to-PDF Embedding)
    if (target === 'pdf') {
      const dpi = options.dpi || 200;
      const density = Math.round((dpi / 72) * 200);
      const pngBuffer = await sharp(Buffer.from(svgXml, 'utf-8'), { density })
        .png()
        .toBuffer();

      const pdfDoc = await PDFDocument.create();
      const pngImage = await pdfDoc.embedPng(pngBuffer);

      const isLandscape = options.orientation === 'landscape';
      let [pageWidth, pageHeight] = PageSizes.A4;

      const pageSizeSetting = options.pageSize || 'a4';
      if (pageSizeSetting === 'a3') {
        pageWidth = 841.89; pageHeight = 1190.55;
      } else if (pageSizeSetting === 'a2') {
        pageWidth = 1190.55; pageHeight = 1683.78;
      } else if (pageSizeSetting === 'a1') {
        pageWidth = 1683.78; pageHeight = 2383.94;
      } else if (pageSizeSetting === 'a0') {
        pageWidth = 2383.94; pageHeight = 3370.39;
      } else if (pageSizeSetting === 'letter') {
        pageWidth = 612; pageHeight = 792;
      } else if (pageSizeSetting === 'legal') {
        pageWidth = 612; pageHeight = 1008;
      } else if (pageSizeSetting === 'auto') {
        pageWidth = pngImage.width;
        pageHeight = pngImage.height;
      }

      if (isLandscape && pageSizeSetting !== 'auto') {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const margin = typeof options.margin === 'number' ? options.margin : 20;

      let drawWidth = pngImage.width;
      let drawHeight = pngImage.height;
      let x = 0;
      let y = 0;

      if (pageSizeSetting !== 'auto') {
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const scale = Math.min(maxW / pngImage.width, maxH / pngImage.height);
        drawWidth = pngImage.width * scale;
        drawHeight = pngImage.height * scale;
        x = (pageWidth - drawWidth) / 2;
        y = (pageHeight - drawHeight) / 2;
      }

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
        pageCount: 1,
      };
    }

    throw new Error(`Unsupported output format .${outputFormat} for DXF Converter Engine.`);
  }

  private dxfToSvg(dxf: any, options: any): string {
    const elements: string[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) return;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };

    // Layer table color resolution
    const layerColors: Record<string, string> = {};
    if (dxf.tables && dxf.tables.layer && dxf.tables.layer.layers) {
      for (const [name, l] of Object.entries<any>(dxf.tables.layer.layers)) {
        if (l.color && ACI_COLORS[l.color]) {
          layerColors[name] = ACI_COLORS[l.color];
        }
      }
    }

    const getColor = (entity: any) => {
      if (entity.color && ACI_COLORS[entity.color]) {
        return ACI_COLORS[entity.color];
      }
      if (entity.layer && layerColors[entity.layer]) {
        return layerColors[entity.layer];
      }
      return '#2563EB'; // Royal blue default CAD accent
    };

    const strokeWidth = 1.2;
    const entities = dxf.entities || [];

    for (const entity of entities) {
      try {
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
              `<${tag} points="${pointsStr}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
            );
          }
        } else if (entity.type === 'SPLINE') {
          const controlPoints = entity.controlPoints || entity.fitPoints || [];
          if (controlPoints.length > 1) {
            const pathSegments: string[] = [];
            controlPoints.forEach((pt: any, idx: number) => {
              updateBounds(pt.x, pt.y);
              if (idx === 0) {
                pathSegments.push(`M ${pt.x} ${-pt.y}`);
              } else {
                pathSegments.push(`L ${pt.x} ${-pt.y}`);
              }
            });
            elements.push(`<path d="${pathSegments.join(' ')}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`);
          }
        } else if (entity.type === 'ELLIPSE') {
          const { center, majorAxisEndPoint, ratio } = entity;
          if (center && majorAxisEndPoint) {
            const rx = Math.hypot(majorAxisEndPoint.x, majorAxisEndPoint.y);
            const ry = rx * (ratio || 0.5);
            const rotAngle = Math.atan2(majorAxisEndPoint.y, majorAxisEndPoint.x) * (180 / Math.PI);
            updateBounds(center.x - rx, center.y - rx);
            updateBounds(center.x + rx, center.y + rx);
            elements.push(
              `<ellipse cx="${center.x}" cy="${-center.y}" rx="${rx}" ry="${ry}" transform="rotate(${-rotAngle} ${center.x} ${-center.y})" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`
            );
          }
        } else if (entity.type === 'POINT') {
          const { position } = entity;
          if (position) {
            updateBounds(position.x, position.y);
            elements.push(
              `<circle cx="${position.x}" cy="${-position.y}" r="2" fill="${color}"/>`
            );
          }
        } else if (entity.type === 'SOLID' || entity.type === 'TRACE') {
          const points = entity.points || [];
          if (points.length >= 3) {
            const pointsStr = points
              .map((p: any) => {
                updateBounds(p.x, p.y);
                return `${p.x},${-p.y}`;
              })
              .join(' ');
            elements.push(`<polygon points="${pointsStr}" fill="${color}" opacity="0.6"/>`);
          }
        } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
          const x = entity.startPoint?.x || entity.position?.x || 0;
          const y = entity.startPoint?.y || entity.position?.y || 0;
          const text = entity.text || '';
          updateBounds(x, y);
          const sanitizedText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          elements.push(
            `<text x="${x}" y="${-y}" fill="${color}" font-family="sans-serif" font-size="${entity.height || 12}">${sanitizedText}</text>`
          );
        }
      } catch {
        // Skip unrenderable entity gracefully without crashing
      }
    }

    // Default bounds if empty drawing
    if (minX === Infinity || isNaN(minX)) {
      minX = 0; minY = 0; maxX = 500; maxY = 500;
    }

    const padding = Math.max((maxX - minX) * 0.05, 20);
    const vMinX = minX - padding;
    const vMinY = -maxY - padding;
    const vWidth = Math.max(maxX - minX + padding * 2, 100);
    const vHeight = Math.max(maxY - minY + padding * 2, 100);

    const bgColor = options?.backgroundColor && options.backgroundColor !== 'transparent'
      ? options.backgroundColor
      : '#ffffff';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vMinX} ${vMinY} ${vWidth} ${vHeight}" width="100%" height="100%">
  <rect x="${vMinX}" y="${vMinY}" width="${vWidth}" height="${vHeight}" fill="${bgColor}"/>
  <g transform="scale(1, 1)">
    ${elements.join('\n    ')}
  </g>
</svg>`;
  }
}
