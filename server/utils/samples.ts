import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';

export interface SampleDefinition {
  key: string;
  name: string;
  filename: string;
  format: string;
  category: string;
  description: string;
  getContent: () => Promise<Buffer> | Buffer;
}

export const SAMPLE_FILES: Record<string, SampleDefinition> = {
  cad_blueprint: {
    key: 'cad_blueprint',
    name: 'Architectural Blueprint (DXF)',
    filename: 'floor_plan_blueprint.dxf',
    format: 'dxf',
    category: 'CAD / Architecture',
    description: 'Sample CAD architectural floorplan with layer colors, walls, doors, and dimensional text.',
    getContent: () => {
      const dxfContent = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
WALLS
62
1
10
0.0
20
0.0
11
300.0
21
0.0
0
LINE
8
WALLS
62
1
10
300.0
20
0.0
11
300.0
21
200.0
0
LINE
8
WALLS
62
1
10
300.0
20
200.0
11
0.0
21
200.0
0
LINE
8
WALLS
62
1
10
0.0
20
200.0
11
0.0
21
0.0
0
LINE
8
INTERIOR
62
3
10
120.0
20
0.0
11
120.0
21
200.0
0
CIRCLE
8
DOORS
62
2
10
120.0
20
40.0
40
30.0
0
ARC
8
DOORS
62
2
10
120.0
20
40.0
40
30.0
50
0.0
51
90.0
0
TEXT
8
ANNOTATIONS
62
4
10
30.0
20
100.0
40
14.0
1
EXECUTIVE SUITE 101
0
TEXT
8
ANNOTATIONS
62
4
10
160.0
20
100.0
40
14.0
1
CONFERENCE ROOM 102
0
ENDSEC
0
EOF`;
      return Buffer.from(dxfContent, 'utf-8');
    },
  },

  vector_artwork: {
    key: 'vector_artwork',
    name: 'Modern Branding Logo (SVG)',
    filename: 'convertx_vector_logo.svg',
    format: 'svg',
    category: 'Vector Graphics',
    description: 'Scalable vector branding asset with geometric curves, gradients, and typography.',
    getContent: () => {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#EC4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="16" fill="#0F172A" />
  <circle cx="200" cy="200" r="100" fill="url(#grad1)" opacity="0.8" />
  <rect x="220" y="120" width="160" height="160" rx="24" fill="url(#grad2)" opacity="0.85" transform="rotate(15 300 200)" />
  <text x="300" y="350" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#F8FAFC" text-anchor="middle" letter-spacing="2">CONVERTX VECTOR ASSET</text>
</svg>`;
      return Buffer.from(svgContent, 'utf-8');
    },
  },

  sample_photo: {
    key: 'sample_photo',
    name: 'Transparent Badge (PNG)',
    filename: 'convertx_badge.png',
    format: 'png',
    category: 'Images',
    description: 'High-definition 24-bit PNG raster graphic with alpha transparency.',
    getContent: async () => {
      const svgSource = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <circle cx="300" cy="300" r="260" fill="url(#g)"/>
  <circle cx="300" cy="300" r="220" fill="#0F172A"/>
  <polygon points="300,160 380,380 220,380" fill="#F59E0B"/>
  <text x="300" y="440" font-family="sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle">CONVERTX PRO</text>
</svg>`);
      return await sharp(svgSource).png().toBuffer();
    },
  },

  sample_document: {
    key: 'sample_document',
    name: 'Engineering Spec Sheet (PDF)',
    filename: 'engineering_spec_sheet.pdf',
    format: 'pdf',
    category: 'PDF Documents',
    description: 'Multi-element vector PDF document with headers, geometry, and specifications.',
    getContent: async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size

      page.drawText('CONVERTX ENGINEERING SPECIFICATION', {
        x: 50,
        y: 720,
        size: 18,
        color: rgb(0.06, 0.09, 0.16),
      });

      page.drawText('Document ID: CX-SPEC-2026-08 • Classification: Public Vector Test', {
        x: 50,
        y: 695,
        size: 10,
        color: rgb(0.4, 0.45, 0.53),
      });

      page.drawLine({
        start: { x: 50, y: 680 },
        end: { x: 562, y: 680 },
        thickness: 1.5,
        color: rgb(0.14, 0.38, 0.92),
      });

      page.drawRectangle({
        x: 50,
        y: 500,
        width: 512,
        height: 150,
        color: rgb(0.95, 0.97, 1.0),
        borderColor: rgb(0.8, 0.85, 0.95),
        borderWidth: 1,
      });

      page.drawText('Architecture Overview & Vector Coordinate Mapping', {
        x: 70,
        y: 620,
        size: 14,
        color: rgb(0.06, 0.09, 0.16),
      });

      page.drawText('This sample PDF document is rendered directly on the server to verify high-fidelity rasterization and text extraction.', {
        x: 70,
        y: 590,
        size: 11,
        color: rgb(0.2, 0.25, 0.35),
      });

      page.drawCircle({
        x: 100,
        y: 540,
        size: 20,
        color: rgb(0.14, 0.38, 0.92),
      });

      page.drawRectangle({
        x: 150,
        y: 525,
        width: 80,
        height: 30,
        color: rgb(0.48, 0.23, 0.93),
      });

      page.drawText('High-Resolution Vector Graphics Module Active', {
        x: 250,
        y: 535,
        size: 10,
        color: rgb(0.06, 0.09, 0.16),
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    },
  },
};

// Aliases for frontend sample keys
SAMPLE_FILES['sample-dxf'] = SAMPLE_FILES.cad_blueprint;
SAMPLE_FILES['sample-svg'] = SAMPLE_FILES.vector_artwork;
SAMPLE_FILES['sample-png'] = SAMPLE_FILES.sample_photo;
SAMPLE_FILES['sample-pdf'] = SAMPLE_FILES.sample_document;
