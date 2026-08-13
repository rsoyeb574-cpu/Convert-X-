export interface SampleDefinition {
  key: string;
  name: string;
  filename: string;
  format: string;
  category: string;
  description: string;
  getContent: () => Buffer;
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
    name: 'Product Render (PNG)',
    filename: '3d_product_render.png',
    format: 'png',
    category: 'Images',
    description: 'High-definition 3D product visualization with clean contrast.',
    getContent: () => {
      const svgPhoto = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#1e293b"/>
  <circle cx="400" cy="300" r="180" fill="#3b82f6" opacity="0.9"/>
  <polygon points="400,160 520,380 280,380" fill="#f59e0b" opacity="0.85"/>
  <text x="400" y="520" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">PRODUCT PHOTO SAMPLE</text>
</svg>`;
      return Buffer.from(svgPhoto, 'utf-8');
    },
  },
};
