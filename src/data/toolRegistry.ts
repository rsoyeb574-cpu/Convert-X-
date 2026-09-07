import { PageView } from '../types.js';

export type ToolCategory = 'all' | 'converter' | 'pdf' | 'compress' | 'tts' | 'other';

export type ToolStatus = 'available' | 'coming-soon';

export interface ToolRoute {
  view: PageView;
  seoSlug?: string;
  targetFormat?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'converter' | 'pdf' | 'compress' | 'tts' | 'other';
  subCategory?: string;
  icon: string;
  inputFormats: string[];
  outputFormats: string[];
  status: ToolStatus;
  route: ToolRoute;
  popular?: boolean;
  badge?: string;
  keywords: string[];
}

export const CATEGORY_DEFINITIONS: { id: ToolCategory; label: string; description: string }[] = [
  { id: 'all', label: 'All Tools', description: 'Explore all conversion, compression, editing, and speech tools' },
  { id: 'converter', label: 'Converters', description: 'Document, image, Adobe, CAD, and 3D vector converters' },
  { id: 'pdf', label: 'PDF Tools', description: 'Extract text, edit, generate, rasterize, and assemble PDFs' },
  { id: 'compress', label: 'Compress', description: 'Reduce JPG, PNG, WebP, and PDF file sizes with instant preview' },
  { id: 'tts', label: 'Text to Voice', description: 'Convert written text and documents into natural human speech' },
  { id: 'other', label: 'Other Tools', description: 'Universal export, batch queue processing, and multi-file workflows' },
];

export const TOOL_REGISTRY: ToolItem[] = [
  // ==================== 1. PDF TOOLS ====================
  {
    id: 'pdf-to-text',
    name: 'PDF to Text Studio',
    slug: 'pdf-to-text',
    description: 'Extract text from PDF with paragraph reconstruction, neural OCR for scanned pages, edit inline, and save as TXT, PDF or DOCX.',
    category: 'pdf',
    subCategory: 'ocr-editor',
    icon: 'FileText',
    inputFormats: ['PDF'],
    outputFormats: ['TXT', 'PDF', 'DOCX'],
    status: 'available',
    route: { view: 'pdf-to-text' },
    popular: true,
    badge: 'New Studio',
    keywords: ['pdf to text', 'extract text', 'ocr', 'edit pdf', 'scanned pdf', 'txt', 'word', 'docx', 'text editor', 'paragraph'],
  },
  {
    id: 'text-to-pdf',
    name: 'Text to PDF Studio',
    slug: 'text-to-pdf',
    description: 'Create beautifully typeset, printable PDFs from raw text or Markdown with custom fonts, margins, headers, and layouts.',
    category: 'pdf',
    subCategory: 'generator',
    icon: 'FileType',
    inputFormats: ['TXT', 'MD', 'Text'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'text-to-pdf' },
    popular: true,
    badge: 'Editor',
    keywords: ['text to pdf', 'create pdf', 'markdown to pdf', 'generate pdf', 'pdf maker', 'typography', 'document'],
  },
  {
    id: 'pdf-compressor',
    name: 'PDF Compressor',
    slug: 'pdf-compressor',
    description: 'Reduce PDF file size by stripping redundant metadata, optimizing embedded raster streams, and compressing vector assets.',
    category: 'compress',
    subCategory: 'document-compress',
    icon: 'Minimize2',
    inputFormats: ['PDF'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'compress' },
    popular: true,
    badge: 'Optimized',
    keywords: ['pdf compressor', 'compress pdf', 'reduce pdf size', 'shrink pdf', 'document compression', 'optimize pdf'],
  },
  {
    id: 'pdf-to-png',
    name: 'PDF to PNG',
    slug: 'pdf-to-png',
    description: 'Rasterize PDF pages into crystal-clear 300 DPI PNG images with preserved typography and transparent margins.',
    category: 'pdf',
    subCategory: 'rasterize',
    icon: 'Image',
    inputFormats: ['PDF'],
    outputFormats: ['PNG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'pdf-to-png' },
    popular: true,
    keywords: ['pdf to png', 'extract pages as png', 'rasterize pdf', 'pdf to image', 'high dpi'],
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    slug: 'pdf-to-jpg',
    description: 'Convert multi-page PDF documents into lightweight, web-ready JPG images with configurable compression quality.',
    category: 'pdf',
    subCategory: 'rasterize',
    icon: 'Image',
    inputFormats: ['PDF'],
    outputFormats: ['JPG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'pdf-to-jpg' },
    popular: true,
    keywords: ['pdf to jpg', 'pdf to jpeg', 'pdf pages to images', 'convert pdf to jpg'],
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    slug: 'image-to-pdf',
    description: 'Convert single or multiple image files (PNG, JPG, WebP) into an organized, standard vector PDF document.',
    category: 'pdf',
    subCategory: 'assemble',
    icon: 'FileText',
    inputFormats: ['PNG', 'JPG', 'WEBP'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'image-to-pdf' },
    popular: true,
    keywords: ['image to pdf', 'photos to pdf', 'pictures to pdf', 'combine images to pdf'],
  },
  {
    id: 'png-to-pdf',
    name: 'PNG to PDF',
    slug: 'png-to-pdf',
    description: 'Package high-resolution PNG images into crisp, shareable PDF documents with sharp resolution retention.',
    category: 'pdf',
    subCategory: 'assemble',
    icon: 'FileText',
    inputFormats: ['PNG'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'png-to-pdf' },
    keywords: ['png to pdf', 'convert png to pdf', 'transparent png to pdf'],
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    slug: 'jpg-to-pdf',
    description: 'Transform camera photos, scanned receipts, and JPG graphics into clean, standardized PDF pages.',
    category: 'pdf',
    subCategory: 'assemble',
    icon: 'FileText',
    inputFormats: ['JPG'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'jpg-to-pdf' },
    keywords: ['jpg to pdf', 'jpeg to pdf', 'scanned image to pdf'],
  },
  {
    id: 'svg-to-pdf',
    name: 'SVG to PDF',
    slug: 'svg-to-pdf',
    description: 'Render scalable vector graphics (SVG) into infinite-resolution, vector-accurate PDF documents for print.',
    category: 'pdf',
    subCategory: 'vector-pdf',
    icon: 'FileText',
    inputFormats: ['SVG'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'svg-to-pdf' },
    keywords: ['svg to pdf', 'vector to pdf', 'scalable graphics to pdf', 'print pdf'],
  },
  {
    id: 'pdf-merge-split',
    name: 'PDF Merge & Split',
    slug: 'pdf-merge-split',
    description: 'Combine multiple PDF files into one master document or split specific page ranges into standalone files.',
    category: 'pdf',
    subCategory: 'utility',
    icon: 'Scissors',
    inputFormats: ['PDF'],
    outputFormats: ['PDF'],
    status: 'coming-soon',
    route: { view: 'tools' },
    badge: 'Coming Soon',
    keywords: ['pdf merge', 'pdf split', 'combine pdf', 'extract pages', 'reorder pdf'],
  },

  // ==================== 2. COMPRESSION TOOLS ====================
  {
    id: 'file-compressor',
    name: 'Universal File Compressor',
    slug: 'compress',
    description: 'Interactive compression studio for JPG, PNG, WebP, and PDF with target reduction slider and live preview.',
    category: 'compress',
    subCategory: 'universal-compress',
    icon: 'Minimize2',
    inputFormats: ['JPG', 'PNG', 'WEBP', 'PDF'],
    outputFormats: ['JPG', 'PNG', 'WEBP', 'PDF'],
    status: 'available',
    route: { view: 'compress' },
    popular: true,
    badge: 'Popular',
    keywords: ['compress files', 'reduce file size', 'image compressor', 'pdf compressor', 'shrink size', 'optimize files'],
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    slug: 'image-compressor',
    description: 'Intelligently compress photos and graphics using MozJPEG, Oxipng, and WebP encoders with up to 85% savings.',
    category: 'compress',
    subCategory: 'image-compress',
    icon: 'Minimize2',
    inputFormats: ['JPG', 'PNG', 'WEBP'],
    outputFormats: ['JPG', 'PNG', 'WEBP'],
    status: 'available',
    route: { view: 'compress' },
    popular: true,
    keywords: ['image compressor', 'compress jpg', 'compress png', 'compress webp', 'photo shrink'],
  },

  // ==================== 3. TEXT TO VOICE ====================
  {
    id: 'text-to-voice',
    name: 'Text to Voice Studio',
    slug: 'text-to-voice',
    description: 'Convert scripts, articles, and book chapters into lifelike human audio speech with speed, pitch, and voice controls.',
    category: 'tts',
    subCategory: 'speech-synthesis',
    icon: 'Volume2',
    inputFormats: ['Text', 'TXT', 'Script'],
    outputFormats: ['MP3', 'WAV'],
    status: 'available',
    route: { view: 'text-to-voice' },
    popular: true,
    badge: 'AI Audio',
    keywords: ['text to voice', 'text to speech', 'tts', 'speech', 'audio synthesis', 'voice generator', 'mp3', 'narration', 'hindi', 'urdu', 'english'],
  },

  // ==================== 4. FILE CONVERTERS (IMAGES, ADOBE, CAD, 3D, DOCS) ====================
  {
    id: 'converter-workspace',
    name: 'Universal Converter Workspace',
    slug: 'converter',
    description: 'Universal multi-format conversion workspace supporting over 40+ document, image, vector, CAD, and 3D formats.',
    category: 'converter',
    subCategory: 'universal',
    icon: 'RefreshCw',
    inputFormats: ['All 40+ Formats'],
    outputFormats: ['PNG', 'JPG', 'WEBP', 'PDF', 'SVG', 'TXT'],
    status: 'available',
    route: { view: 'converter' },
    popular: true,
    badge: 'Core Engine',
    keywords: ['converter', 'universal converter', 'file converter', 'convert files', 'format converter'],
  },
  {
    id: 'png-to-jpg',
    name: 'PNG to JPG Converter',
    slug: 'png-to-jpg',
    description: 'Convert lossless PNGs to high-efficiency JPGs with background flattening and custom compression quality.',
    category: 'converter',
    subCategory: 'image',
    icon: 'Image',
    inputFormats: ['PNG'],
    outputFormats: ['JPG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'png-to-jpg' },
    popular: true,
    keywords: ['png to jpg', 'convert png to jpg', 'png to jpeg', 'reduce png size'],
  },
  {
    id: 'jpg-to-png',
    name: 'JPG to PNG Converter',
    slug: 'jpg-to-png',
    description: 'Convert JPG photos to lossless PNG format with zero compression artifacts and crisp edge reproduction.',
    category: 'converter',
    subCategory: 'image',
    icon: 'Image',
    inputFormats: ['JPG'],
    outputFormats: ['PNG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'jpg-to-png' },
    popular: true,
    keywords: ['jpg to png', 'convert jpg to png', 'jpeg to png', 'lossless png'],
  },
  {
    id: 'png-to-webp',
    name: 'PNG to WebP Converter',
    slug: 'png-to-webp',
    description: 'Transform PNGs into next-generation WebP images for websites, slashing bandwidth while preserving alpha transparency.',
    category: 'converter',
    subCategory: 'image',
    icon: 'Image',
    inputFormats: ['PNG'],
    outputFormats: ['WEBP'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'png-to-webp' },
    keywords: ['png to webp', 'convert png to webp', 'web performance', 'google webp'],
  },
  {
    id: 'jpg-to-webp',
    name: 'JPG to WebP Converter',
    slug: 'jpg-to-webp',
    description: 'Optimize photography for web loading speeds by converting legacy JPGs into modern Google WebP assets.',
    category: 'converter',
    subCategory: 'image',
    icon: 'Image',
    inputFormats: ['JPG'],
    outputFormats: ['WEBP'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'jpg-to-webp' },
    keywords: ['jpg to webp', 'jpeg to webp', 'next gen images', 'speed up website'],
  },
  {
    id: 'webp-to-png',
    name: 'WebP to PNG Converter',
    slug: 'webp-to-png',
    description: 'Convert WebP images into universally compatible PNG files with full transparency preservation.',
    category: 'converter',
    subCategory: 'image',
    icon: 'Image',
    inputFormats: ['WEBP'],
    outputFormats: ['PNG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'webp-to-png' },
    keywords: ['webp to png', 'convert webp', 'extract webp image'],
  },
  {
    id: 'webp-to-jpg',
    name: 'WebP to JPG Converter',
    slug: 'webp-to-jpg',
    description: 'Convert WebP graphics into standard JPG images for desktop software and legacy photo viewers.',
    category: 'converter',
    subCategory: 'image',
    icon: 'Image',
    inputFormats: ['WEBP'],
    outputFormats: ['JPG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'webp-to-jpg' },
    keywords: ['webp to jpg', 'webp to jpeg', 'save webp as jpg'],
  },
  {
    id: 'svg-to-png',
    name: 'SVG to PNG Converter',
    slug: 'svg-to-png',
    description: 'Rasterize SVG vector illustrations into ultra-crisp PNG images with custom DPI scaling and transparent backgrounds.',
    category: 'converter',
    subCategory: 'vector',
    icon: 'Image',
    inputFormats: ['SVG'],
    outputFormats: ['PNG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'svg-to-png' },
    popular: true,
    keywords: ['svg to png', 'rasterize svg', 'convert vector to png', 'transparent svg'],
  },
  {
    id: 'svg-to-jpg',
    name: 'SVG to JPG Converter',
    slug: 'svg-to-jpg',
    description: 'Render SVG vector graphics onto a solid background and export as lightweight, compressed JPG images.',
    category: 'converter',
    subCategory: 'vector',
    icon: 'Image',
    inputFormats: ['SVG'],
    outputFormats: ['JPG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'svg-to-jpg' },
    keywords: ['svg to jpg', 'vector to jpeg', 'svg rasterize jpg'],
  },
  {
    id: 'psd-to-png',
    name: 'PSD to PNG Converter',
    slug: 'psd-to-png',
    description: 'Extract and flatten Adobe Photoshop PSD projects into high-resolution PNG images without needing Photoshop.',
    category: 'converter',
    subCategory: 'adobe',
    icon: 'Sparkles',
    inputFormats: ['PSD'],
    outputFormats: ['PNG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'psd-to-png' },
    popular: true,
    badge: 'Adobe Engine',
    keywords: ['psd to png', 'photoshop to png', 'open psd without photoshop', 'convert psd', 'psd image'],
  },
  {
    id: 'psd-to-pdf',
    name: 'PSD to PDF Converter',
    slug: 'psd-to-pdf',
    description: 'Convert layered Photoshop PSD design mockups into client-ready, multi-page vector PDF presentations.',
    category: 'converter',
    subCategory: 'adobe',
    icon: 'Sparkles',
    inputFormats: ['PSD'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'psd-to-pdf' },
    keywords: ['psd to pdf', 'photoshop to pdf', 'convert design mockup to pdf'],
  },
  {
    id: 'ai-to-pdf',
    name: 'AI to PDF Converter',
    slug: 'ai-to-pdf',
    description: 'Convert Adobe Illustrator (.ai) vector artboards into standard vector PDF documents readable on any device.',
    category: 'converter',
    subCategory: 'adobe',
    icon: 'Sparkles',
    inputFormats: ['AI'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'ai-to-pdf' },
    popular: true,
    badge: 'Adobe Engine',
    keywords: ['ai to pdf', 'illustrator to pdf', 'open ai file', 'vector ai to pdf'],
  },
  {
    id: 'ai-to-png',
    name: 'AI to PNG Converter',
    slug: 'ai-to-png',
    description: 'Rasterize Adobe Illustrator (.ai) artwork into high-definition transparent PNG graphics for web and app design.',
    category: 'converter',
    subCategory: 'adobe',
    icon: 'Sparkles',
    inputFormats: ['AI'],
    outputFormats: ['PNG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'ai-to-png' },
    keywords: ['ai to png', 'illustrator to png', 'vector art to png', 'ai graphic'],
  },
  {
    id: 'dxf-to-pdf',
    name: 'DXF to PDF (CAD Blueprint)',
    slug: 'dxf-to-pdf',
    description: 'Parse AutoCAD DXF drawings and export scaled, multi-layer PDF blueprints with precise vector line weights.',
    category: 'converter',
    subCategory: 'cad',
    icon: 'Cpu',
    inputFormats: ['DXF', 'DWG'],
    outputFormats: ['PDF', 'SVG'],
    status: 'available',
    route: { view: 'seo', seoSlug: 'dxf-to-pdf' },
    popular: true,
    badge: 'CAD Engine',
    keywords: ['dxf to pdf', 'cad to pdf', 'autocad to pdf', 'blueprint to pdf', 'engineering drawing', 'dwg'],
  },
  {
    id: 'obj-stl-3d',
    name: '3D Mesh Converter (OBJ & STL)',
    slug: 'converter-3d',
    description: 'Convert 3D models and polygon meshes between Wavefront OBJ and Stereolithography STL formats for 3D printing.',
    category: 'converter',
    subCategory: '3d',
    icon: 'Box',
    inputFormats: ['OBJ', 'STL'],
    outputFormats: ['STL', 'OBJ', 'PNG'],
    status: 'available',
    route: { view: 'converter' },
    keywords: ['3d converter', 'obj to stl', 'stl to obj', '3d printing', 'mesh converter', 'cad 3d'],
  },
  {
    id: 'docx-converter',
    name: 'DOCX Document Converter',
    slug: 'docx-converter',
    description: 'Convert Microsoft Word DOCX documents into clean PDF files, formatted plain text TXT, or HTML.',
    category: 'converter',
    subCategory: 'document',
    icon: 'FileText',
    inputFormats: ['DOCX'],
    outputFormats: ['PDF', 'TXT', 'HTML'],
    status: 'available',
    route: { view: 'converter' },
    keywords: ['docx to pdf', 'word to pdf', 'word converter', 'office docx', 'docx to text'],
  },
  {
    id: 'xlsx-converter',
    name: 'XLSX Spreadsheet Converter',
    slug: 'xlsx-converter',
    description: 'Transform Microsoft Excel XLSX workbooks into PDF report tables, structured CSV, or plain text summaries.',
    category: 'converter',
    subCategory: 'document',
    icon: 'FileSpreadsheet',
    inputFormats: ['XLSX', 'XLS'],
    outputFormats: ['PDF', 'CSV', 'TXT'],
    status: 'available',
    route: { view: 'converter' },
    keywords: ['xlsx to pdf', 'excel to pdf', 'excel to csv', 'spreadsheet converter', 'table export'],
  },
  {
    id: 'pptx-converter',
    name: 'PPTX Presentation Converter',
    slug: 'pptx-converter',
    description: 'Export PowerPoint PPTX slide decks into clean, printable vector PDF documents.',
    category: 'converter',
    subCategory: 'document',
    icon: 'FileText',
    inputFormats: ['PPTX', 'PPT'],
    outputFormats: ['PDF'],
    status: 'available',
    route: { view: 'converter' },
    keywords: ['pptx to pdf', 'powerpoint to pdf', 'slides to pdf', 'presentation converter'],
  },
  {
    id: 'epub-to-pdf',
    name: 'EPUB to PDF Converter',
    slug: 'epub-to-pdf',
    description: 'Convert EPUB e-books and digital publications into printable, readable PDF documents with preserved chapters.',
    category: 'converter',
    subCategory: 'document',
    icon: 'BookOpen',
    inputFormats: ['EPUB', 'MOBI'],
    outputFormats: ['PDF', 'TXT'],
    status: 'coming-soon',
    route: { view: 'tools' },
    badge: 'Coming Soon',
    keywords: ['epub to pdf', 'ebook converter', 'mobi to pdf', 'read epub as pdf'],
  },
  {
    id: 'video-converter',
    name: 'Video & Animated GIF Converter',
    slug: 'video-converter',
    description: 'Transcode MP4, MOV, and AVI videos or create short, high-fidelity animated GIFs with custom framerates.',
    category: 'converter',
    subCategory: 'video',
    icon: 'Film',
    inputFormats: ['MP4', 'MOV', 'AVI'],
    outputFormats: ['MP4', 'GIF', 'WEBM'],
    status: 'coming-soon',
    route: { view: 'tools' },
    badge: 'Coming Soon',
    keywords: ['video converter', 'mp4 to gif', 'video to gif', 'mov to mp4', 'webm'],
  },

  // ==================== 5. OTHER TOOLS ====================
  {
    id: 'batch-converter',
    name: 'Batch Queue & PDF Combiner',
    slug: 'batch-converter',
    description: 'Upload dozens of mixed files, assign individual output formats, monitor live queue status, and merge into a single PDF.',
    category: 'other',
    subCategory: 'batch',
    icon: 'Layers',
    inputFormats: ['Multi-Files'],
    outputFormats: ['ZIP', 'Batch', 'Combined PDF'],
    status: 'available',
    route: { view: 'dashboard' },
    popular: true,
    badge: 'Workflow',
    keywords: ['batch converter', 'queue', 'bulk convert', 'combine pdf', 'batch processing', 'multiple files'],
  },
  {
    id: 'universal-export',
    name: 'Universal Export Hub',
    slug: 'universal-export',
    description: 'Explore the full capabilities matrix of cross-format engines for Microsoft Office, CAD blueprints, and vector graphics.',
    category: 'other',
    subCategory: 'matrix',
    icon: 'FileSpreadsheet',
    inputFormats: ['DOCX', 'XLSX', 'PPTX', 'DXF', 'AI'],
    outputFormats: ['PDF', 'CSV', 'TXT', 'PNG'],
    status: 'available',
    route: { view: 'formats' },
    keywords: ['universal export', 'office export', 'format matrix', 'capabilities', 'file engines'],
  },
  {
    id: 'audio-converter',
    name: 'Audio Extractor & Converter',
    slug: 'audio-converter',
    description: 'Extract audio tracks from multimedia files and convert between MP3, WAV, AAC, and FLAC with bitrate controls.',
    category: 'other',
    subCategory: 'audio',
    icon: 'Music',
    inputFormats: ['MP3', 'WAV', 'AAC', 'FLAC', 'M4A'],
    outputFormats: ['MP3', 'WAV'],
    status: 'coming-soon',
    route: { view: 'tools' },
    badge: 'Coming Soon',
    keywords: ['audio converter', 'mp3 converter', 'wav converter', 'extract audio', 'sound converter'],
  },
];

export const getPopularTools = (): ToolItem[] => {
  return TOOL_REGISTRY.filter((t) => t.popular);
};

export const getToolsByCategory = (category: ToolCategory): ToolItem[] => {
  if (category === 'all') return TOOL_REGISTRY;
  return TOOL_REGISTRY.filter((t) => t.category === category);
};

export const getAllFormatsList = (): string[] => {
  const formatsSet = new Set<string>();
  TOOL_REGISTRY.forEach((tool) => {
    tool.inputFormats.forEach((f) => formatsSet.add(f.toUpperCase()));
    tool.outputFormats.forEach((f) => formatsSet.add(f.toUpperCase()));
  });
  return Array.from(formatsSet).sort();
};

export const searchToolRegistry = (
  query: string,
  category: ToolCategory = 'all',
  formatFilter?: string
): ToolItem[] => {
  const cleanQuery = query.trim().toLowerCase();

  return TOOL_REGISTRY.filter((tool) => {
    // Category match
    if (category !== 'all' && tool.category !== category) {
      // Special allowance: if category is 'pdf' and tool is 'pdf-compressor'
      const matchesCategory =
        (category === 'pdf' && (tool.category === 'pdf' || tool.id === 'pdf-compressor' || tool.inputFormats.includes('PDF') || tool.outputFormats.includes('PDF'))) ||
        (category === 'compress' && (tool.category === 'compress' || tool.id === 'file-compressor' || tool.id === 'image-compressor' || tool.id === 'pdf-compressor')) ||
        (category === 'converter' && tool.category === 'converter') ||
        (category === 'tts' && tool.category === 'tts') ||
        (category === 'other' && tool.category === 'other');

      if (!matchesCategory) {
        return false;
      }
    }

    // Format filter match
    if (formatFilter && formatFilter !== 'all') {
      const targetFmt = formatFilter.toUpperCase();
      const hasInput = tool.inputFormats.some((f) => f.toUpperCase().includes(targetFmt));
      const hasOutput = tool.outputFormats.some((f) => f.toUpperCase().includes(targetFmt));
      if (!hasInput && !hasOutput) {
        return false;
      }
    }

    // Search query match
    if (!cleanQuery) return true;

    return (
      tool.name.toLowerCase().includes(cleanQuery) ||
      tool.description.toLowerCase().includes(cleanQuery) ||
      tool.slug.toLowerCase().includes(cleanQuery) ||
      tool.inputFormats.some((f) => f.toLowerCase().includes(cleanQuery)) ||
      tool.outputFormats.some((f) => f.toLowerCase().includes(cleanQuery)) ||
      tool.keywords.some((k) => k.toLowerCase().includes(cleanQuery)) ||
      (tool.subCategory && tool.subCategory.toLowerCase().includes(cleanQuery))
    );
  });
};
