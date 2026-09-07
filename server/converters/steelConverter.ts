import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

interface SteelHole {
  face: string; // 'o' (top flange), 'u' (bottom flange), 'v' (front web), 'h' (rear web)
  x: number;
  y: number;
  diameter: number;
}

interface DstvMember {
  orderNumber: string;
  drawingNumber: string;
  phase: string;
  pieceMark: string;
  steelGrade: string;
  quantity: number;
  profileType: string;
  length: number;
  flangeWidth: number;
  flangeThickness: number;
  webThickness: number;
  weight: number;
  holes: SteelHole[];
}

/**
 * Parses DSTV (Standard description of steel structures for NC-control) files.
 */
function parseDstvFile(content: string): DstvMember {
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const member: DstvMember = {
    orderNumber: '',
    drawingNumber: '',
    phase: '',
    pieceMark: 'MEMBER-1',
    steelGrade: 'S355JR',
    quantity: 1,
    profileType: 'HEA 200',
    length: 1000,
    flangeWidth: 200,
    flangeThickness: 10,
    webThickness: 6.5,
    weight: 0,
    holes: [],
  };

  let currentBlock = '';
  let stLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('**')) continue;

    if (line === 'ST' || line.startsWith('ST ')) {
      currentBlock = 'ST';
      stLineIndex = 0;
      continue;
    } else if (line === 'BO' || line.startsWith('BO ')) {
      currentBlock = 'BO';
      continue;
    } else if (line === 'AK' || line === 'IK' || line === 'SI' || line === 'EN') {
      currentBlock = line;
      continue;
    }

    if (currentBlock === 'ST') {
      stLineIndex++;
      if (stLineIndex === 1) member.orderNumber = line;
      else if (stLineIndex === 2) member.drawingNumber = line;
      else if (stLineIndex === 3) member.phase = line;
      else if (stLineIndex === 4) member.pieceMark = line;
      else if (stLineIndex === 5) member.steelGrade = line;
      else if (stLineIndex === 6) member.quantity = parseInt(line) || 1;
      else if (stLineIndex === 7) member.profileType = line;
      else if (stLineIndex === 9) member.length = parseFloat(line) || 1000;
      else if (stLineIndex === 10) member.flangeWidth = parseFloat(line) || 200;
      else if (stLineIndex === 11) member.flangeThickness = parseFloat(line) || 10;
      else if (stLineIndex === 12) member.webThickness = parseFloat(line) || 6.5;
    } else if (currentBlock === 'BO') {
      // BO format: face x y diameter
      const tokens = line.split(/\s+/);
      if (tokens.length >= 4) {
        const face = tokens[0].toLowerCase();
        const x = parseFloat(tokens[1]) || 0;
        const y = parseFloat(tokens[2]) || 0;
        const diameter = parseFloat(tokens[3]) || 18;
        member.holes.push({ face, x, y, diameter });
      }
    }
  }

  return member;
}

/**
 * Parses CNC G-Code toolpath coordinates and statistics.
 */
function parseGCode(content: string) {
  const lines = content.split(/\r?\n/);
  let totalDistance = 0;
  let rapidDistance = 0;
  let cutDistance = 0;
  let currentX = 0;
  let currentY = 0;
  let currentZ = 0;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  const points: Array<{ x: number; y: number; z: number; type: string }> = [];

  for (const line of lines) {
    const clean = line.replace(/\(.*?\)/g, '').replace(/;.*$/, '').trim();
    if (!clean) continue;

    const tokens = clean.split(/\s+/);
    let cmd = '';
    let targetX = currentX;
    let targetY = currentY;
    let targetZ = currentZ;

    for (const t of tokens) {
      const code = t.toUpperCase();
      if (code === 'G0' || code === 'G00') cmd = 'G0';
      else if (code === 'G1' || code === 'G01') cmd = 'G1';
      else if (code.startsWith('X')) targetX = parseFloat(code.substring(1));
      else if (code.startsWith('Y')) targetY = parseFloat(code.substring(1));
      else if (code.startsWith('Z')) targetZ = parseFloat(code.substring(1));
    }

    if (cmd === 'G0' || cmd === 'G1') {
      const dist = Math.sqrt(
        Math.pow(targetX - currentX, 2) +
          Math.pow(targetY - currentY, 2) +
          Math.pow(targetZ - currentZ, 2)
      );
      totalDistance += dist;
      if (cmd === 'G0') rapidDistance += dist;
      else cutDistance += dist;

      currentX = targetX;
      currentY = targetY;
      currentZ = targetZ;

      minX = Math.min(minX, currentX);
      maxX = Math.max(maxX, currentX);
      minY = Math.min(minY, currentY);
      maxY = Math.max(maxY, currentY);

      if (points.length < 500) {
        points.push({ x: currentX, y: currentY, z: currentZ, type: cmd });
      }
    }
  }

  return {
    totalDistance: Math.round(totalDistance),
    rapidDistance: Math.round(rapidDistance),
    cutDistance: Math.round(cutDistance),
    bounds: { minX, maxX, minY, maxY, width: Math.round(maxX - minX), height: Math.round(maxY - minY) },
    points,
  };
}

export class SteelConverter implements ConverterEngine {
  id = 'steel-converter';
  name = 'Structural Steel & CNC Fabrication Engine';
  description = 'Converts DSTV / NC steel member data and CNC G-Code into 2D CAD DXF drawings, shop blueprints (SVG/PDF), and schedules.';

  supportedInputFormats = ['nc', 'dstv', 'mak', 'gcode', 'tap'];
  supportedOutputFormats = ['dxf', 'svg', 'pdf', 'png', 'json'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase();
    return this.supportedInputFormats.includes(inFmt) && this.supportedOutputFormats.includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase();
    if (!fileBuffer || fileBuffer.length < 10) {
      return { valid: false, reason: 'Steel fabrication data buffer is empty.' };
    }

    const text = fileBuffer.slice(0, 2000).toString('utf8');
    if (['nc', 'dstv', 'mak'].includes(fmt)) {
      if (text.includes('ST') || text.includes('BO') || text.includes('AK') || text.includes('SI')) {
        return { valid: true, detectedFormat: fmt };
      }
    } else if (['gcode', 'tap'].includes(fmt)) {
      if (/G0|G1|G2|G3|M\d+/i.test(text)) {
        return { valid: true, detectedFormat: fmt };
      }
    }

    return { valid: true, detectedFormat: fmt };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, inputFormat, outputFormat, fileName } = params;
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase();
    const textContent = inputBuffer.toString('utf8');

    // 1. G-CODE PROCESSING
    if (inFmt === 'gcode' || inFmt === 'tap') {
      const gcodeData = parseGCode(textContent);

      if (outFmt === 'json') {
        return {
          buffer: Buffer.from(JSON.stringify(gcodeData, null, 2), 'utf8'),
          mimeType: 'application/json',
          outputExtension: 'json',
        };
      }

      if (outFmt === 'dxf') {
        let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

        for (let i = 1; i < gcodeData.points.length; i++) {
          const p1 = gcodeData.points[i - 1];
          const p2 = gcodeData.points[i];
          const layer = p2.type === 'G0' ? 'RAPID_TRAVEL' : 'CUTTING_PATH';
          dxf += `0\nLINE\n8\n${layer}\n10\n${p1.x}\n20\n${p1.y}\n30\n${p1.z}\n11\n${p2.x}\n21\n${p2.y}\n31\n${p2.z}\n`;
        }

        dxf += `0\nENDSEC\n0\nEOF\n`;
        return {
          buffer: Buffer.from(dxf, 'utf8'),
          mimeType: 'image/vnd.dxf',
          outputExtension: 'dxf',
        };
      }

      if (outFmt === 'svg' || outFmt === 'png') {
        const padding = 40;
        const w = Math.max(gcodeData.bounds.width + padding * 2, 800);
        const h = Math.max(gcodeData.bounds.height + padding * 2, 600);

        let paths = '';
        for (let i = 1; i < gcodeData.points.length; i++) {
          const p1 = gcodeData.points[i - 1];
          const p2 = gcodeData.points[i];
          const color = p2.type === 'G0' ? '#94a3b8' : '#2563eb';
          const strokeWidth = p2.type === 'G0' ? '1' : '2';
          const dash = p2.type === 'G0' ? 'stroke-dasharray="4,4"' : '';
          paths += `<line x1="${p1.x + padding}" y1="${h - (p1.y + padding)}" x2="${p2.x + padding}" y2="${h - (p2.y + padding)}" stroke="${color}" stroke-width="${strokeWidth}" ${dash} />`;
        }

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f172a" />
  <text x="30" y="40" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">CNC TOOLPATH BLUEPRINT: ${fileName}</text>
  <text x="30" y="65" fill="#94a3b8" font-family="sans-serif" font-size="12">Cut Distance: ${gcodeData.cutDistance} mm | Rapid Distance: ${gcodeData.rapidDistance} mm</text>
  <g transform="translate(0, 50)">${paths}</g>
</svg>`;

        if (outFmt === 'svg') {
          return {
            buffer: Buffer.from(svg, 'utf8'),
            mimeType: 'image/svg+xml',
            outputExtension: 'svg',
          };
        }

        const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
        return {
          buffer: pngBuf,
          mimeType: 'image/png',
          outputExtension: 'png',
        };
      }
    }

    // 2. DSTV / NC STEEL MEMBER CONVERSION
    const member = parseDstvFile(textContent);

    if (outFmt === 'json') {
      return {
        buffer: Buffer.from(JSON.stringify(member, null, 2), 'utf8'),
        mimeType: 'application/json',
        outputExtension: 'json',
      };
    }

    // Convert member geometry to DXF
    if (outFmt === 'dxf') {
      let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

      // Draw Beam Outer Boundary Profile (Layer: STEEL_CONTOUR)
      const L = member.length;
      const H = member.flangeWidth;
      dxf += `0\nLINE\n8\nSTEEL_CONTOUR\n10\n0\n20\n0\n11\n${L}\n21\n0\n`;
      dxf += `0\nLINE\n8\nSTEEL_CONTOUR\n10\n${L}\n20\n0\n11\n${L}\n21\n${H}\n`;
      dxf += `0\nLINE\n8\nSTEEL_CONTOUR\n10\n${L}\n20\n${H}\n11\n0\n21\n${H}\n`;
      dxf += `0\nLINE\n8\nSTEEL_CONTOUR\n10\n0\n20\n${H}\n11\n0\n21\n0\n`;

      // Draw Bolt Holes (Layer: HOLES)
      for (const hole of member.holes) {
        const radius = hole.diameter / 2;
        dxf += `0\nCIRCLE\n8\nHOLES\n10\n${hole.x}\n20\n${hole.y}\n40\n${radius}\n`;
      }

      // Add Piece Mark Text (Layer: MARKING)
      dxf += `0\nTEXT\n8\nMARKING\n10\n${L / 2 - 50}\n20\n${H / 2}\n40\n25\n1\n${member.pieceMark} [${member.profileType} - ${member.steelGrade}]\n`;

      dxf += `0\nENDSEC\n0\nEOF\n`;
      return {
        buffer: Buffer.from(dxf, 'utf8'),
        mimeType: 'image/vnd.dxf',
        outputExtension: 'dxf',
      };
    }

    // Vector Blueprint (SVG)
    const svgWidth = 1200;
    const svgHeight = 600;
    const scale = Math.min((svgWidth - 200) / member.length, (svgHeight - 250) / member.flangeWidth);
    const beamW = member.length * scale;
    const beamH = member.flangeWidth * scale;
    const offsetX = 100;
    const offsetY = 200;

    let holesSvg = '';
    for (const hole of member.holes) {
      const hx = offsetX + hole.x * scale;
      const hy = offsetY + beamH - hole.y * scale;
      const hr = Math.max((hole.diameter / 2) * scale, 3);
      holesSvg += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="#ef4444" stroke="#991b1b" stroke-width="1.5" />
      <line x1="${hx - hr - 2}" y1="${hy}" x2="${hx + hr + 2}" y2="${hy}" stroke="#991b1b" stroke-width="0.75" />
      <line x1="${hx}" y1="${hy - hr - 2}" x2="${hx}" y2="${hy + hr + 2}" stroke="#991b1b" stroke-width="0.75" />`;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a0f1d" />
  
  <!-- Title Block Header -->
  <rect x="50" y="30" width="${svgWidth - 100}" height="80" fill="#1e293b" rx="6" stroke="#334155" />
  <text x="80" y="65" fill="#38bdf8" font-family="monospace" font-size="20" font-weight="bold">PIECE MARK: ${member.pieceMark}</text>
  <text x="80" y="92" fill="#94a3b8" font-family="sans-serif" font-size="14">Profile: ${member.profileType} | Steel: ${member.steelGrade} | Length: ${member.length} mm | Qty: ${member.quantity}</text>
  <text x="${svgWidth - 250}" y="75" fill="#f8fafc" font-family="sans-serif" font-size="13">DSTV NC FABRICATION SHEET</text>

  <!-- Steel Member Profile -->
  <rect x="${offsetX}" y="${offsetY}" width="${beamW}" height="${beamH}" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2.5" />
  
  <!-- Holes -->
  ${holesSvg}

  <!-- Dimensions Callout -->
  <line x1="${offsetX}" y1="${offsetY + beamH + 30}" x2="${offsetX + beamW}" y2="${offsetY + beamH + 30}" stroke="#facc15" stroke-width="1.5" />
  <line x1="${offsetX}" y1="${offsetY + beamH + 20}" x2="${offsetX}" y2="${offsetY + beamH + 40}" stroke="#facc15" stroke-width="1.5" />
  <line x1="${offsetX + beamW}" y1="${offsetY + beamH + 20}" x2="${offsetX + beamW}" y2="${offsetY + beamH + 40}" stroke="#facc15" stroke-width="1.5" />
  <text x="${offsetX + beamW / 2 - 40}" y="${offsetY + beamH + 50}" fill="#facc15" font-family="monospace" font-size="14">L = ${member.length} mm</text>

  <!-- Flange Width Dim -->
  <line x1="${offsetX - 25}" y1="${offsetY}" x2="${offsetX - 25}" y2="${offsetY + beamH}" stroke="#facc15" stroke-width="1.5" />
  <text x="${offsetX - 80}" y="${offsetY + beamH / 2 + 5}" fill="#facc15" font-family="monospace" font-size="13">H = ${member.flangeWidth}</text>

  <!-- Hole Schedule Footnote -->
  <text x="50" y="${svgHeight - 40}" fill="#64748b" font-family="sans-serif" font-size="12">Total Holes: ${member.holes.length} | Red Crosshairs: Fabricated Bolt Holes</text>
</svg>`;

    if (outFmt === 'svg') {
      return {
        buffer: Buffer.from(svg, 'utf8'),
        mimeType: 'image/svg+xml',
        outputExtension: 'svg',
      };
    }

    if (outFmt === 'png') {
      const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
      return {
        buffer: pngBuf,
        mimeType: 'image/png',
        outputExtension: 'png',
      };
    }

    if (outFmt === 'pdf') {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Render SVG blueprint as image into PDF
      const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
      const pngImage = await pdfDoc.embedPng(pngBuf);
      page.drawImage(pngImage, {
        x: 20,
        y: 20,
        width: 801.89,
        height: 555.28,
      });

      const pdfBytes = await pdfDoc.save();
      return {
        buffer: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
      };
    }

    throw new Error(`Unsupported output format .${outFmt} for steel fabrication data.`);
  }
}
