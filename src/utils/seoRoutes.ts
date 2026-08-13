import { SeoRouteConfig } from '../types.js';

export const SEO_ROUTES: Record<string, SeoRouteConfig> = {
  'png-to-jpg': {
    slug: 'png-to-jpg',
    title: 'PNG to JPG Converter — Fast & Free Online Image Conversion',
    description: 'Convert PNG images to JPG format instantly with adjustable compression quality, background color replacement, and high DPI resolution.',
    fromFormat: 'png',
    toFormat: 'jpg',
    category: 'images',
    content: {
      heroHeading: 'Convert PNG to High-Quality JPG Online',
      heroSubtitle: 'Transform PNG images into optimized JPG files. Reduce file sizes, remove transparent backgrounds, and adjust JPEG compression.',
      benefits: [
        'Optimized file size compression for web performance',
        'Custom background color selection for transparent PNGs',
        'Adjustable DPI and quality sliders (1-100%)',
        'Instant server processing with automatic file deletion',
      ],
      steps: [
        'Upload your PNG image using the drag-and-drop zone or file picker.',
        'ConvertX auto-detects your PNG file signature and prepares JPG output settings.',
        'Choose your desired JPEG quality, DPI resolution, and background color.',
        'Click "Convert Now" to process and download your optimized JPG image.',
      ],
      faq: [
        {
          question: 'What happens to transparent backgrounds when converting PNG to JPG?',
          answer: 'Because JPEG does not support alpha transparency, ConvertX allows you to select a solid background color (default is white) to seamlessly fill transparent pixels.',
        },
        {
          question: 'Are my uploaded PNG files stored permanently?',
          answer: 'No. ConvertX utilizes temporary secure buffers that are automatically scrubbed immediately after processing.',
        },
      ],
    },
  },

  'jpg-to-png': {
    slug: 'jpg-to-png',
    title: 'JPG to PNG Converter — Lossless Image Quality',
    description: 'Convert JPG images to PNG format for uncompressed quality, crisp vector-like graphics, and transparent image overlay preparation.',
    fromFormat: 'jpg',
    toFormat: 'png',
    category: 'images',
    content: {
      heroHeading: 'Convert JPG Photos to Lossless PNG Format',
      heroSubtitle: 'Convert JPEG photos into high-res PNG files without quality degradation. Ideal for graphics editing, digital publishing, and design software.',
      benefits: [
        'Lossless PNG compression preserves sharp text and line artwork',
        'Supports high DPI raster rendering for print design',
        'Compatible with all modern design tools and web browsers',
        'Fast single-click processing',
      ],
      steps: [
        'Drag & drop your JPG file or select a sample image.',
        'Verify detected .jpg format and select PNG output.',
        'Configure resolution scaling if higher pixel density is required.',
        'Download your crisp PNG image instantly.',
      ],
      faq: [
        {
          question: 'Will converting JPG to PNG improve image quality?',
          answer: 'Converting to PNG prevents further lossy compression artifacts during subsequent edits and saves.',
        },
      ],
    },
  },

  'webp-to-png': {
    slug: 'webp-to-png',
    title: 'WebP to PNG Converter — Universal Image Compatibility',
    description: 'Convert modern WebP images to standard PNG files for full compatibility with legacy graphics editors and desktop software.',
    fromFormat: 'webp',
    toFormat: 'png',
    category: 'images',
    content: {
      heroHeading: 'Convert WebP Images to Standard PNG Files',
      heroSubtitle: 'Easily turn WebP images from web pages into standard PNG graphics that open in any image viewer or editing suite.',
      benefits: [
        'Full compatibility with older desktop graphics applications',
        'Preserves original WebP alpha channel transparency',
        'Zero quality loss during format conversion',
      ],
      steps: [
        'Upload your .webp file to the workspace.',
        'Select PNG as the output format.',
        'Click Convert Now and download your PNG file.',
      ],
      faq: [
        {
          question: 'Does WebP to PNG conversion preserve transparent areas?',
          answer: 'Yes, full alpha channel transparency is preserved in the output PNG file.',
        },
      ],
    },
  },

  'image-to-pdf': {
    slug: 'image-to-pdf',
    title: 'Image to PDF Converter — Turn PNG, JPG & WEBP into PDF Documents',
    description: 'Convert photos, scans, and graphic design exports into formatted PDF files with custom page sizing (A4, Letter), orientation, and margins.',
    fromFormat: 'png',
    toFormat: 'pdf',
    category: 'pdf',
    content: {
      heroHeading: 'Convert Images into Professional PDF Documents',
      heroSubtitle: 'Turn PNG, JPG, and WebP images into clean PDF documents. Customize page sizes (A4, Letter, Legal), orientation, and fit-to-page settings.',
      benefits: [
        'Standard A4, Letter, and Legal document page layouts',
        'Portrait and Landscape orientation toggles',
        'Automatic fit-to-page scaling with clean margins',
        'Multi-image document support',
      ],
      steps: [
        'Upload any PNG, JPG, or WebP image file.',
        'Select PDF as the target output format.',
        'Set your preferred page size (A4, Letter, Legal, or Auto) and orientation.',
        'Download your formatted PDF document.',
      ],
      faq: [
        {
          question: 'Can I set custom page dimensions for my PDF output?',
          answer: 'Yes, choose between standard A4, Letter, Legal, or Auto (which matches the exact dimensions of your source image).',
        },
      ],
    },
  },

  'pdf-to-png': {
    slug: 'pdf-to-png',
    title: 'PDF to PNG Converter — Extract High-Resolution Pages as PNG Images',
    description: 'Convert PDF document pages into high-res PNG images for presentation slides, website graphics, and social media media posts.',
    fromFormat: 'pdf',
    toFormat: 'png',
    category: 'pdf',
    content: {
      heroHeading: 'Convert PDF Pages to High-Res PNG Images',
      heroSubtitle: 'Extract PDF document pages as clean PNG image files. High-DPI rendering produces crisp text and sharp graphic elements.',
      benefits: [
        'Extract high-resolution image pages from PDF documents',
        'Custom DPI density controls (150 DPI, 300 DPI)',
        'Ideal for embedding PDF graphics into web pages and presentations',
      ],
      steps: [
        'Upload your PDF document.',
        'Select PNG output format.',
        'Select page number and DPI density.',
        'Click Convert and download your PNG image.',
      ],
      faq: [
        {
          question: 'What DPI resolution is recommended for printing extracted PDF images?',
          answer: 'We recommend 300 DPI for high-quality printing and 150 DPI for web and digital displays.',
        },
      ],
    },
  },

  'svg-to-png': {
    slug: 'svg-to-png',
    title: 'SVG to PNG Converter — Rasterize Vector Graphics at Any DPI',
    description: 'Convert SVG vector files into high-resolution PNG images. Customize resolution density up to 300 DPI and toggle background transparency.',
    fromFormat: 'svg',
    toFormat: 'png',
    category: 'vector',
    content: {
      heroHeading: 'Convert SVG Vectors to Crisp PNG Graphics',
      heroSubtitle: 'Rasterize scalable vector graphics (SVG) into high-definition PNG files with custom DPI and transparency settings.',
      benefits: [
        'Ultra-sharp vector rasterization at 72, 150, or 300 DPI',
        'Preserves transparent vector background',
        'Custom scaling options for exact pixel widths',
      ],
      steps: [
        'Upload your SVG vector file.',
        'Select PNG output format.',
        'Choose DPI density or custom scaling.',
        'Download your crisp PNG graphic.',
      ],
      faq: [
        {
          question: 'Can I export high-res PNGs from small SVG icons?',
          answer: 'Yes! ConvertX renders SVGs using vector math, so you can scale to 300 DPI without blurriness or pixelation.',
        },
      ],
    },
  },

  'dxf-to-pdf': {
    slug: 'dxf-to-pdf',
    title: 'DXF to PDF Converter — CAD Drawing to PDF Vector Document',
    description: 'Convert Autodesk DXF architectural and engineering CAD files into printable PDF documents with layer colors and line weight preservation.',
    fromFormat: 'dxf',
    toFormat: 'pdf',
    category: 'cad',
    content: {
      heroHeading: 'Convert DXF CAD Drawings to Printable PDF Blueprints',
      heroSubtitle: 'Transform AutoCAD DXF files into standard PDF vector blueprints. Preserves CAD layers, entity geometry, line weights, and text annotations.',
      benefits: [
        'Native CAD parser extracts geometry, layers, and text without requiring AutoCAD',
        'A4 and Letter landscape document fitting',
        'Preserves ACI layer colors for clear schematic reading',
        'High resolution rendering for precision engineering prints',
      ],
      steps: [
        'Upload your .DXF CAD drawing file.',
        'ConvertX parses the DXF geometry and auto-selects PDF or SVG output.',
        'Choose page orientation and page size.',
        'Download your printable PDF blueprint.',
      ],
      faq: [
        {
          question: 'Do I need AutoCAD installed to convert DXF files?',
          answer: 'No! ConvertX features a built-in server-side vector CAD parser that renders DXF entities directly to PDF, SVG, or PNG.',
        },
      ],
    },
  },
};
