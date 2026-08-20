import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { ConverterEngine, ConvertParams, ConvertResult, ValidationResult } from './types.js';

interface Vertex3D {
  x: number;
  y: number;
  z: number;
}

interface Triangle3D {
  v1: Vertex3D;
  v2: Vertex3D;
  v3: Vertex3D;
  normal?: Vertex3D;
}

interface Mesh3D {
  vertices: Vertex3D[];
  triangles: Triangle3D[];
  bounds: {
    min: Vertex3D;
    max: Vertex3D;
    center: Vertex3D;
    size: Vertex3D;
    maxDim: number;
  };
}

export class ThreeDConverter implements ConverterEngine {
  id = '3d-mesh-geometry-engine';
  name = '3D Mesh Geometry & CAD Visualization Engine';
  description = 'Direct 3D geometry engine converting Wavefront OBJ and Stereolithography STL models into high-resolution isometric blueprints (PNG, JPG, WEBP, PDF, SVG) and format cross-conversions (OBJ ↔ STL).';

  supportedInputFormats = ['obj', 'stl'];
  supportedOutputFormats = ['png', 'jpg', 'webp', 'pdf', 'svg', 'obj', 'stl'];

  supports(inputFormat: string, outputFormat: string): boolean {
    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    return this.supportedInputFormats.includes(inFmt) && this.supportedOutputFormats.includes(outFmt);
  }

  async validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult> {
    const fmt = inputFormat.toLowerCase();
    if (!this.supportedInputFormats.includes(fmt)) {
      return { valid: false, reason: `Format .${inputFormat} is not supported by 3D engine.` };
    }

    if (!fileBuffer || fileBuffer.length < 10) {
      return { valid: false, reason: 'Empty or invalid 3D model file buffer.' };
    }

    if (fmt === 'obj') {
      const sample = fileBuffer.slice(0, 1000).toString('utf8');
      if (!sample.includes('v ') && !sample.includes('f ') && !sample.includes('#')) {
        return { valid: false, reason: 'Invalid Wavefront .OBJ file: Missing vertex or face declarations.' };
      }
    } else if (fmt === 'stl') {
      const sample = fileBuffer.slice(0, 80).toString('utf8');
      const isAscii = sample.toLowerCase().includes('solid');
      if (!isAscii && fileBuffer.length < 84) {
        return { valid: false, reason: 'Invalid .STL file: File is smaller than binary STL header.' };
      }
    }

    return { valid: true, detectedFormat: fmt };
  }

  async convert(params: ConvertParams): Promise<ConvertResult> {
    const { inputBuffer, inputFormat, outputFormat, options, fileName } = params;
    const inFmt = inputFormat.toLowerCase();
    const target = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

    // 1. Parse input 3D Mesh
    let mesh: Mesh3D;
    if (inFmt === 'obj') {
      mesh = this.parseObj(inputBuffer.toString('utf8'));
    } else {
      mesh = this.parseStl(inputBuffer);
    }

    if (mesh.triangles.length === 0) {
      throw new Error(`3D parser found 0 polygons in .${inFmt.toUpperCase()} file.`);
    }

    // 2. Direct 3D Mesh Cross-Conversion (OBJ ↔ STL)
    if (target === 'stl') {
      const stlBuf = this.exportToStlBinary(mesh, fileName || 'model');
      return {
        buffer: stlBuf,
        mimeType: 'model/stl',
        outputExtension: 'stl',
      };
    }

    if (target === 'obj') {
      const objStr = this.exportToObjString(mesh, fileName || 'model');
      return {
        buffer: Buffer.from(objStr, 'utf8'),
        mimeType: 'model/obj',
        outputExtension: 'obj',
      };
    }

    // 3. Vector SVG Blueprint
    if (target === 'svg') {
      const svgStr = this.renderMeshToSvg(mesh, options, fileName);
      return {
        buffer: Buffer.from(svgStr, 'utf8'),
        mimeType: 'image/svg+xml',
        outputExtension: 'svg',
      };
    }

    // 4. Raster Render (PNG, JPG, WEBP)
    const dpi = options.dpi && [72, 150, 300, 600].includes(Number(options.dpi)) ? Number(options.dpi) : 300;
    const renderedPng = this.renderMeshToCanvas(mesh, options, fileName, dpi);

    if (target === 'pdf') {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const embeddedImg = await pdfDoc.embedPng(renderedPng);

      const margin = 20;
      const drawW = 595.28 - margin * 2;
      const drawH = (embeddedImg.height / embeddedImg.width) * drawW;
      const y = (841.89 - drawH) / 2;

      page.drawImage(embeddedImg, {
        x: margin,
        y: Math.max(margin, y),
        width: drawW,
        height: Math.min(drawH, 841.89 - margin * 2),
      });

      const pdfBytes = await pdfDoc.save();
      return {
        buffer: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        outputExtension: 'pdf',
        width: 2480,
        height: 3508,
      };
    }

    const quality = options.quality && options.quality > 0 && options.quality <= 100 ? Number(options.quality) : 90;
    let finalBuffer: Buffer;
    let mimeType: string;

    if (target === 'jpg') {
      finalBuffer = await sharp(renderedPng)
        .flatten({ background: '#ffffff' })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      mimeType = 'image/jpeg';
    } else if (target === 'webp') {
      finalBuffer = await sharp(renderedPng)
        .webp({ quality })
        .toBuffer();
      mimeType = 'image/webp';
    } else {
      // PNG
      finalBuffer = renderedPng;
      mimeType = 'image/png';
    }

    const meta = await sharp(finalBuffer).metadata();
    return {
      buffer: finalBuffer,
      mimeType,
      outputExtension: target,
      width: meta.width,
      height: meta.height,
    };
  }

  // --- PARSERS ---
  private parseObj(objContent: string): Mesh3D {
    const vertices: Vertex3D[] = [];
    const triangles: Triangle3D[] = [];
    const lines = objContent.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('v ')) {
        const parts = trimmed.split(/\s+/).slice(1).map(Number);
        if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          vertices.push({ x: parts[0], y: parts[1], z: parts[2] });
        }
      } else if (trimmed.startsWith('f ')) {
        const parts = trimmed
          .split(/\s+/)
          .slice(1)
          .map((p) => {
            const idx = parseInt(p.split('/')[0], 10);
            return idx > 0 ? idx - 1 : vertices.length + idx;
          })
          .filter((i) => i >= 0 && i < vertices.length);

        if (parts.length >= 3) {
          // Triangulate polygon fan
          for (let i = 1; i < parts.length - 1; i++) {
            triangles.push({
              v1: vertices[parts[0]],
              v2: vertices[parts[i]],
              v3: vertices[parts[i + 1]],
            });
          }
        }
      }
    }

    return this.calculateMeshBounds(vertices, triangles);
  }

  private parseStl(buffer: Buffer): Mesh3D {
    const vertices: Vertex3D[] = [];
    const triangles: Triangle3D[] = [];

    const str = buffer.slice(0, 500).toString('utf8');
    const isAscii = str.trim().toLowerCase().startsWith('solid') && buffer.toString('utf8').includes('facet normal');

    if (isAscii) {
      const fullText = buffer.toString('utf8');
      const vertexMatches = [...fullText.matchAll(/vertex\s+([\d.\-eE]+)\s+([\d.\-eE]+)\s+([\d.\-eE]+)/gi)];
      for (let i = 0; i < vertexMatches.length; i += 3) {
        if (i + 2 < vertexMatches.length) {
          const v1 = { x: Number(vertexMatches[i][1]), y: Number(vertexMatches[i][2]), z: Number(vertexMatches[i][3]) };
          const v2 = { x: Number(vertexMatches[i + 1][1]), y: Number(vertexMatches[i + 1][2]), z: Number(vertexMatches[i + 1][3]) };
          const v3 = { x: Number(vertexMatches[i + 2][1]), y: Number(vertexMatches[i + 2][2]), z: Number(vertexMatches[i + 2][3]) };
          vertices.push(v1, v2, v3);
          triangles.push({ v1, v2, v3 });
        }
      }
    } else {
      // Binary STL
      if (buffer.length >= 84) {
        const triCount = buffer.readUInt32LE(80);
        let offset = 84;
        for (let i = 0; i < triCount && offset + 50 <= buffer.length; i++) {
          const nx = buffer.readFloatLE(offset);
          const ny = buffer.readFloatLE(offset + 4);
          const nz = buffer.readFloatLE(offset + 8);

          const v1 = {
            x: buffer.readFloatLE(offset + 12),
            y: buffer.readFloatLE(offset + 16),
            z: buffer.readFloatLE(offset + 20),
          };
          const v2 = {
            x: buffer.readFloatLE(offset + 24),
            y: buffer.readFloatLE(offset + 28),
            z: buffer.readFloatLE(offset + 32),
          };
          const v3 = {
            x: buffer.readFloatLE(offset + 36),
            y: buffer.readFloatLE(offset + 40),
            z: buffer.readFloatLE(offset + 44),
          };

          vertices.push(v1, v2, v3);
          triangles.push({
            v1,
            v2,
            v3,
            normal: { x: nx, y: ny, z: nz },
          });
          offset += 50;
        }
      }
    }

    return this.calculateMeshBounds(vertices, triangles);
  }

  private calculateMeshBounds(vertices: Vertex3D[], triangles: Triangle3D[]): Mesh3D {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const v of vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
      if (v.z > maxZ) maxZ = v.z;
    }

    if (vertices.length === 0) {
      minX = minY = minZ = -1;
      maxX = maxY = maxZ = 1;
    }

    const sizeX = Math.max(maxX - minX, 0.0001);
    const sizeY = Math.max(maxY - minY, 0.0001);
    const sizeZ = Math.max(maxZ - minZ, 0.0001);
    const maxDim = Math.max(sizeX, sizeY, sizeZ);

    return {
      vertices,
      triangles,
      bounds: {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
        size: { x: sizeX, y: sizeY, z: sizeZ },
        maxDim,
      },
    };
  }

  // --- 3D CANVAS RENDERER ---
  private renderMeshToCanvas(mesh: Mesh3D, options: any, fileName?: string, dpi = 300): Buffer {
    const scaleFactor = dpi / 72;
    const width = Math.round(1200 * (scaleFactor / 2));
    const height = Math.round(900 * (scaleFactor / 2));

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Gradient Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0F172A');
    bgGradient.addColorStop(1, '#1E293B');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Header Overlay
    ctx.fillStyle = '#38BDF8';
    ctx.font = `bold ${Math.round(18 * (scaleFactor / 2))}px sans-serif`;
    ctx.fillText(`📐 3D Mesh CAD Visualizer: ${fileName || 'Model'}`, 30, Math.round(35 * (scaleFactor / 2)));

    ctx.fillStyle = '#94A3B8';
    ctx.font = `${Math.round(12 * (scaleFactor / 2))}px sans-serif`;
    ctx.fillText(
      `Triangles: ${mesh.triangles.length.toLocaleString()} • Vertices: ${mesh.vertices.length.toLocaleString()} • Bounds: ${mesh.bounds.size.x.toFixed(2)} × ${mesh.bounds.size.y.toFixed(2)} × ${mesh.bounds.size.z.toFixed(2)} units`,
      30,
      Math.round(58 * (scaleFactor / 2))
    );

    // Draw Coordinate Grid Floor
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    const gridCenterY = height * 0.8;
    for (let g = -5; g <= 5; g++) {
      ctx.beginPath();
      ctx.moveTo(width * 0.15 + g * 35, gridCenterY - 60 + g * 12);
      ctx.lineTo(width * 0.85 + g * 35, gridCenterY + 40 + g * 12);
      ctx.stroke();
    }

    // 3D Isometric Projection Transformation
    // Angles: yaw = 45 deg, pitch = 30 deg
    const yaw = Math.PI / 4;
    const pitch = Math.PI / 6;

    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    const centerX = width / 2;
    const centerY = height / 2 + Math.round(20 * (scaleFactor / 2));
    const renderScale = (Math.min(width, height) * 0.55) / mesh.bounds.maxDim;

    const project = (v: Vertex3D) => {
      // Center model
      const dx = v.x - mesh.bounds.center.x;
      const dy = v.y - mesh.bounds.center.y;
      const dz = v.z - mesh.bounds.center.z;

      // Rotate Y (yaw)
      const x1 = dx * cosY + dz * sinY;
      const z1 = -dx * sinY + dz * cosY;

      // Rotate X (pitch)
      const y2 = dy * cosP - z1 * sinP;
      const z2 = dy * sinP + z1 * cosP;

      return {
        screenX: centerX + x1 * renderScale,
        screenY: centerY - y2 * renderScale,
        depth: z2,
      };
    };

    // Sort Triangles for Painter's Algorithm (Back to Front)
    const sortedTriangles = mesh.triangles
      .map((tri) => {
        const p1 = project(tri.v1);
        const p2 = project(tri.v2);
        const p3 = project(tri.v3);
        const avgDepth = (p1.depth + p2.depth + p3.depth) / 3;

        // Normal calculation for Lambert shading
        const ax = tri.v2.x - tri.v1.x, ay = tri.v2.y - tri.v1.y, az = tri.v2.z - tri.v1.z;
        const bx = tri.v3.x - tri.v1.x, by = tri.v3.y - tri.v1.y, bz = tri.v3.z - tri.v1.z;
        let nx = ay * bz - az * by;
        let ny = az * bx - ax * bz;
        let nz = ax * by - ay * bx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= len; ny /= len; nz /= len;

        // Light direction: [0.577, 0.577, 0.577]
        const lightDot = Math.max(0.15, nx * 0.577 + ny * 0.577 + nz * 0.577);

        return { p1, p2, p3, avgDepth, lightDot };
      })
      .sort((a, b) => a.avgDepth - b.avgDepth);

    // Render Triangles
    for (const tri of sortedTriangles) {
      const intensity = Math.round(tri.lightDot * 180 + 40);
      const r = Math.min(255, Math.round(intensity * 0.5));
      const g = Math.min(255, Math.round(intensity * 0.8));
      const b = Math.min(255, Math.round(intensity * 1.1));

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.strokeStyle = `rgba(14, 165, 233, 0.3)`;
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(tri.p1.screenX, tri.p1.screenY);
      ctx.lineTo(tri.p2.screenX, tri.p2.screenY);
      ctx.lineTo(tri.p3.screenX, tri.p3.screenY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Footer
    ctx.fillStyle = '#64748B';
    ctx.font = `${Math.round(11 * (scaleFactor / 2))}px sans-serif`;
    ctx.fillText('Convert-X Direct 3D Mesh CAD & Geometry Engine', 30, height - 20);

    return canvas.toBuffer('image/png');
  }

  private renderMeshToSvg(mesh: Mesh3D, options: any, fileName?: string): string {
    const width = 1000;
    const height = 750;
    const yaw = Math.PI / 4;
    const pitch = Math.PI / 6;

    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    const centerX = width / 2;
    const centerY = height / 2;
    const renderScale = (Math.min(width, height) * 0.55) / mesh.bounds.maxDim;

    const project = (v: Vertex3D) => {
      const dx = v.x - mesh.bounds.center.x;
      const dy = v.y - mesh.bounds.center.y;
      const dz = v.z - mesh.bounds.center.z;
      const x1 = dx * cosY + dz * sinY;
      const z1 = -dx * sinY + dz * cosY;
      const y2 = dy * cosP - z1 * sinP;
      return {
        x: (centerX + x1 * renderScale).toFixed(2),
        y: (centerY - y2 * renderScale).toFixed(2),
      };
    };

    let paths = '';
    for (const tri of mesh.triangles.slice(0, 5000)) {
      const p1 = project(tri.v1);
      const p2 = project(tri.v2);
      const p3 = project(tri.v3);
      paths += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="0.75"/>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#0f172a"/>
  <text x="30" y="40" font-family="sans-serif" font-size="18" font-weight="bold" fill="#38bdf8">${fileName || '3D Model'} - Vector Wireframe Blueprint</text>
  <text x="30" y="65" font-family="sans-serif" font-size="12" fill="#94a3b8">Polygons: ${mesh.triangles.length} | Generated by Convert-X 3D Vector Engine</text>
  <g id="mesh-geometry">
    ${paths}
  </g>
</svg>`;
  }

  // --- CROSS EXPORTERS ---
  private exportToStlBinary(mesh: Mesh3D, name: string): Buffer {
    const triCount = mesh.triangles.length;
    const bufferSize = 84 + triCount * 50;
    const buf = Buffer.alloc(bufferSize);

    // 80-byte header
    buf.write(`Convert-X Binary STL Export: ${name.slice(0, 50)}`, 0, 80, 'ascii');
    buf.writeUInt32LE(triCount, 80);

    let offset = 84;
    for (const tri of mesh.triangles) {
      // Normal (0,0,0)
      buf.writeFloatLE(0, offset);
      buf.writeFloatLE(0, offset + 4);
      buf.writeFloatLE(0, offset + 8);

      // Vertex 1
      buf.writeFloatLE(tri.v1.x, offset + 12);
      buf.writeFloatLE(tri.v1.y, offset + 16);
      buf.writeFloatLE(tri.v1.z, offset + 20);

      // Vertex 2
      buf.writeFloatLE(tri.v2.x, offset + 24);
      buf.writeFloatLE(tri.v2.y, offset + 28);
      buf.writeFloatLE(tri.v2.z, offset + 32);

      // Vertex 3
      buf.writeFloatLE(tri.v3.x, offset + 36);
      buf.writeFloatLE(tri.v3.y, offset + 40);
      buf.writeFloatLE(tri.v3.z, offset + 44);

      // Attribute byte count
      buf.writeUInt16LE(0, offset + 48);
      offset += 50;
    }

    return buf;
  }

  private exportToObjString(mesh: Mesh3D, name: string): string {
    let out = `# Wavefront OBJ generated by Convert-X 3D Engine\n# Model: ${name}\n# Vertices: ${mesh.vertices.length}\n# Faces: ${mesh.triangles.length}\no ${name.replace(/\s+/g, '_')}\n\n`;

    const vertMap = new Map<string, number>();
    const uniqueVerts: Vertex3D[] = [];

    const getVertIdx = (v: Vertex3D) => {
      const key = `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;
      if (vertMap.has(key)) return vertMap.get(key)!;
      uniqueVerts.push(v);
      const idx = uniqueVerts.length;
      vertMap.set(key, idx);
      return idx;
    };

    const faceIndices: number[][] = [];
    for (const tri of mesh.triangles) {
      const i1 = getVertIdx(tri.v1);
      const i2 = getVertIdx(tri.v2);
      const i3 = getVertIdx(tri.v3);
      faceIndices.push([i1, i2, i3]);
    }

    for (const v of uniqueVerts) {
      out += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
    }

    out += '\ns 1\n';
    for (const f of faceIndices) {
      out += `f ${f[0]} ${f[1]} ${f[2]}\n`;
    }

    return out;
  }
}
