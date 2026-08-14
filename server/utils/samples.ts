import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';
import { writePsdBuffer, initializeCanvas } from 'ag-psd';
import { createCanvas } from '@napi-rs/canvas';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

try {
  initializeCanvas(createCanvas as any);
} catch (e) {
  // canvas initialized
}

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
  sample_docx: {
    key: 'sample_docx',
    name: 'Executive Report (DOCX)',
    filename: 'executive_summary.docx',
    format: 'docx',
    category: 'Universal File Export',
    description: 'Microsoft Word DOCX document with headers, formatted paragraphs, bullet points, and corporate metrics.',
    getContent: async () => {
      const zip = new JSZip();

      // [Content_Types].xml
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
      );

      // _rels/.rels
      zip.file(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
      );

      // word/document.xml
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>CONVERTX EXECUTIVE SUMMARY &amp; QUARTERLY REPORT</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Prepared for: Technical Architecture Review</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Universal Document &amp; File Export Engine</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Key Performance Indicators:</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>• Server-side parsing and real canvas rendering</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>• High-DPI rasterization to PNG and JPG (90+ MozJPEG quality)</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>• Direct multi-page PDF generation with vector embeddings</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>• Zero-retention memory processing and automated temporary file cleanup</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Architecture Status: Operational &amp; Production Ready.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

      zip.file('word/document.xml', documentXml);
      return await zip.generateAsync({ type: 'nodebuffer' });
    },
  },

  sample_xlsx: {
    key: 'sample_xlsx',
    name: 'Financial Ledger (XLSX)',
    filename: 'quarterly_ledger.xlsx',
    format: 'xlsx',
    category: 'Universal File Export',
    description: 'Microsoft Excel spreadsheet with styled columns, data rows, numeric calculations, and multi-column headers.',
    getContent: async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Q3 Financial Overview');

      sheet.columns = [
        { header: 'Account ID', key: 'id', width: 14 },
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Description', key: 'desc', width: 32 },
        { header: 'Budget (INR)', key: 'budget', width: 18 },
        { header: 'Actual (INR)', key: 'actual', width: 18 },
        { header: 'Status', key: 'status', width: 14 },
      ];

      sheet.addRow({ id: 'ACC-101', category: 'Infrastructure', desc: 'Cloud Run Compute Nodes', budget: 45000, actual: 41200, status: 'Active' });
      sheet.addRow({ id: 'ACC-102', category: 'Storage & I/O', desc: 'Temporary Buffer Storage', budget: 12000, actual: 9800, status: 'Active' });
      sheet.addRow({ id: 'ACC-103', category: 'Media Engines', desc: 'Libvips & Ghostscript Runtimes', budget: 28000, actual: 26500, status: 'Active' });
      sheet.addRow({ id: 'ACC-104', category: 'Security & TLS', desc: 'Automated Token Verifiers', budget: 15000, actual: 14900, status: 'Active' });
      sheet.addRow({ id: 'ACC-105', category: 'CDN Edge', desc: 'Global Asset Acceleration', budget: 35000, actual: 32000, status: 'Active' });

      const buf = await workbook.xlsx.writeBuffer();
      return Buffer.from(buf);
    },
  },

  sample_txt: {
    key: 'sample_txt',
    name: 'System Specification (TXT)',
    filename: 'system_specification.txt',
    format: 'txt',
    category: 'Universal File Export',
    description: 'Structured text document demonstrating dynamic typography pagination, margins, and page numbering.',
    getContent: () => {
      const text = `CONVERTX UNIVERSAL EXPORT SPECIFICATION
==================================================
Version: 3.2.0 • Release: Production
Platform: Linux Server Architecture

1. OVERVIEW
Convert-X Universal File Export provides a unified pipeline for rendering
diverse office, CAD, vector, and image documents into universal PNG, JPG,
and PDF formats.

2. SUPPORTED CORE RENDERING CAPABILITIES
- Microsoft Word (.docx) -> Direct text layout & page extraction
- Microsoft Excel (.xlsx) -> Formatted table matrix with sheet tabs
- Plain Text (.txt) -> Multi-page document typography pagination
- HTML Web Documents (.html) -> Structured markup rendering
- CAD Architecture (.dxf) -> Vector entity wireframe renderer
- Adobe Photoshop (.psd) -> Multi-layer composite engine
- Adobe Illustrator (.ai) -> Vector artboard stream renderer
- Vector Graphics (.svg) -> Resolution-independent vector rasterizer
- Image Formats (.png, .jpg, .webp, .gif, .bmp, .tiff, .avif)

3. SECURITY & PRIVACY MANDATES
- Strictly zero data retention on all uploads
- Automatic cron purging of temporary buffers within 30 minutes
- 100% server-side processing with magic-byte format validation

Convert-X Engine Core • All systems operational.`;
      return Buffer.from(text, 'utf-8');
    },
  },

  sample_psd: {
    key: 'sample_psd',
    name: 'Branding Poster (PSD)',
    filename: 'design_poster.psd',
    format: 'psd',
    category: 'Adobe Creative Suite',
    description: 'Adobe Photoshop PSD layered artwork with background gradient, badge shape, and text canvas.',
    getContent: async () => {
      const canvas = createCanvas(600, 400);
      const ctx = canvas.getContext('2d');
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 400);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#312e81');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 400);

      // Card
      ctx.fillStyle = '#4338ca';
      ctx.fillRect(80, 60, 440, 280);

      // Accent circle
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(200, 200, 70, 0, Math.PI * 2);
      ctx.fill();

      // Heading
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('PHOTOSHOP COMPOSITE', 300, 180);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '16px sans-serif';
      ctx.fillText('Real PSD Engine Parsing', 300, 220);

      const psdBuffer = writePsdBuffer({
        width: 600,
        height: 400,
        canvas: canvas as any,
      });

      return Buffer.from(psdBuffer);
    },
  },

  sample_ai: {
    key: 'sample_ai',
    name: 'Vector Identity (AI)',
    filename: 'brand_identity.ai',
    format: 'ai',
    category: 'Adobe Creative Suite',
    description: 'Adobe Illustrator vector artwork file with PDF compatibility containing vector curves and typography.',
    getContent: async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);

      page.drawRectangle({
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        color: rgb(0.06, 0.09, 0.16),
      });

      page.drawCircle({
        x: 200,
        y: 200,
        size: 90,
        color: rgb(0.14, 0.38, 0.92),
      });

      page.drawRectangle({
        x: 240,
        y: 140,
        width: 140,
        height: 140,
        color: rgb(0.48, 0.23, 0.93),
      });

      page.drawText('ADOBE ILLUSTRATOR VECTOR', {
        x: 100,
        y: 70,
        size: 20,
        color: rgb(0.97, 0.98, 0.99),
      });

      page.drawText('PDF-Compatible Vector Artboard Stream', {
        x: 140,
        y: 40,
        size: 12,
        color: rgb(0.58, 0.64, 0.72),
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    },
  },

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
SAMPLE_FILES['sample-docx'] = SAMPLE_FILES.sample_docx;
SAMPLE_FILES['sample-xlsx'] = SAMPLE_FILES.sample_xlsx;
SAMPLE_FILES['sample-txt'] = SAMPLE_FILES.sample_txt;
SAMPLE_FILES['sample-psd'] = SAMPLE_FILES.sample_psd;
SAMPLE_FILES['sample-ai'] = SAMPLE_FILES.sample_ai;
SAMPLE_FILES['sample-dxf'] = SAMPLE_FILES.cad_blueprint;
SAMPLE_FILES['sample-svg'] = SAMPLE_FILES.vector_artwork;
SAMPLE_FILES['sample-png'] = SAMPLE_FILES.sample_photo;
SAMPLE_FILES['sample-pdf'] = SAMPLE_FILES.sample_document;
