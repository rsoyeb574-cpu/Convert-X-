import React, { useState, useMemo } from 'react';
import { PageView } from '../types.js';
import {
  Search,
  FileText,
  Image,
  Box,
  Compass,
  Building2,
  Activity,
  Wrench,
  Cpu,
  Layers,
  Sparkles,
  Database,
  Music,
  Video,
  Code,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface HomeDirectorySectionProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export type HomeCategoryKey =
  | 'all'
  | 'documents'
  | 'pdf'
  | 'images'
  | 'cad'
  | 'architecture'
  | 'structural'
  | 'steel'
  | 'mechanical'
  | 'threed'
  | 'adobe'
  | 'aiml'
  | 'data'
  | 'audio'
  | 'video'
  | 'developer';

interface SoftwareFormatItem {
  id: string;
  name: string;
  extension: string;
  category: HomeCategoryKey;
  softwareEcosystem: string;
  status: 'SUPPORTED' | 'PRO_STUDIO' | 'OPEN_EXCHANGE_GUIDED';
  badge: string;
  description: string;
  actionLabel: string;
  targetView: PageView;
  searchKeywords: string[];
}

const ALL_SOFTWARE_FORMATS: SoftwareFormatItem[] = [
  // 1. Documents
  {
    id: 'docx',
    name: 'Microsoft Word Document',
    extension: 'DOCX',
    category: 'documents',
    softwareEcosystem: 'Microsoft Office / 365',
    status: 'SUPPORTED',
    badge: 'Verified Engine',
    description: 'Convert DOCX into PDF, TXT, or high-resolution PNG/JPG layout pages.',
    actionLabel: 'Convert DOCX',
    targetView: 'converter',
    searchKeywords: ['docx', 'word', 'doc', 'microsoft', 'office', 'pages'],
  },
  {
    id: 'xlsx',
    name: 'Microsoft Excel Spreadsheet',
    extension: 'XLSX',
    category: 'documents',
    softwareEcosystem: 'Microsoft Office / Google Sheets',
    status: 'SUPPORTED',
    badge: 'Verified Engine',
    description: 'Render spreadsheets, tables, and multi-sheet workbooks to PDF or tabular CSV.',
    actionLabel: 'Convert XLSX',
    targetView: 'data-studio',
    searchKeywords: ['xlsx', 'excel', 'spreadsheet', 'sheets', 'tables', 'csv'],
  },
  {
    id: 'pptx',
    name: 'Microsoft PowerPoint Presentation',
    extension: 'PPTX',
    category: 'documents',
    softwareEcosystem: 'Microsoft PowerPoint / Keynote',
    status: 'SUPPORTED',
    badge: 'Slide Renderer',
    description: 'High-DPI slide deck page extraction and visual PDF publishing.',
    actionLabel: 'Convert PPTX',
    targetView: 'converter',
    searchKeywords: ['pptx', 'powerpoint', 'presentation', 'slides', 'deck'],
  },

  // 2. PDF
  {
    id: 'pdf',
    name: 'Portable Document Format',
    extension: 'PDF',
    category: 'pdf',
    softwareEcosystem: 'Adobe Acrobat / ISO 32000',
    status: 'SUPPORTED',
    badge: 'High-Fidelity',
    description: 'Extract editable text with OCR, compress file size, or convert to PNG, JPG, and DOCX.',
    actionLabel: 'PDF Studio',
    targetView: 'pdf-to-text',
    searchKeywords: ['pdf', 'acrobat', 'ocr', 'compress pdf', 'extract text'],
  },
  {
    id: 'text-to-pdf',
    name: 'Text & Markdown to PDF',
    extension: 'TXT / MD',
    category: 'pdf',
    softwareEcosystem: 'Markdown / Raw Text',
    status: 'PRO_STUDIO',
    badge: 'Typeset Studio',
    description: 'Typeset raw text and Markdown with custom margins, Unicode, Hindi, Arabic, and headers.',
    actionLabel: 'Open Text to PDF',
    targetView: 'text-to-pdf',
    searchKeywords: ['text to pdf', 'markdown to pdf', 'txt', 'md', 'typography'],
  },

  // 3. Images
  {
    id: 'png-jpg-webp',
    name: 'Raster & Photographic Images',
    extension: 'PNG / JPG / WEBP',
    category: 'images',
    softwareEcosystem: 'Web & Digital Photography',
    status: 'SUPPORTED',
    badge: 'Sharp Engine',
    description: 'Fast lossless conversion, transparency preserving, DPI adjustment, and compression.',
    actionLabel: 'Image Converter',
    targetView: 'converter',
    searchKeywords: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'bmp', 'photo', 'compress'],
  },

  // 4. CAD
  {
    id: 'dxf',
    name: 'AutoCAD Drawing Exchange',
    extension: 'DXF',
    category: 'cad',
    softwareEcosystem: 'AutoCAD / DraftSight / BricsCAD',
    status: 'PRO_STUDIO',
    badge: 'CAD Viewer & Engine',
    description: 'Interactive 2D vector CAD viewer with Pan, Zoom, Layers, and direct export to SVG and PDF.',
    actionLabel: 'Open CAD Studio',
    targetView: 'cad-studio',
    searchKeywords: ['dxf', 'cad', 'autocad', 'drawing', 'vector', 'blueprint'],
  },
  {
    id: 'dwg',
    name: 'AutoCAD Drawing Binary',
    extension: 'DWG',
    category: 'cad',
    softwareEcosystem: 'Autodesk AutoCAD',
    status: 'OPEN_EXCHANGE_GUIDED',
    badge: 'Coming Soon • Guided',
    description: 'Proprietary binary database. Recommended: Save as AutoCAD DXF or PDF in AutoCAD for 100% vector fidelity.',
    actionLabel: 'View CAD Workflow',
    targetView: 'cad-studio',
    searchKeywords: ['dwg', 'autocad', 'autodesk', 'draftsight', 'binary cad'],
  },

  // 5. Architecture & BIM
  {
    id: 'revit',
    name: 'Autodesk Revit Project & Family',
    extension: 'RVT / RFA',
    category: 'architecture',
    softwareEcosystem: 'Autodesk Revit BIM',
    status: 'OPEN_EXCHANGE_GUIDED',
    badge: 'IFC Exchange',
    description: 'Revit OLE database. Export to open IFC or DXF from Revit for universal multi-discipline web inspection.',
    actionLabel: 'BIM Workflow Guide',
    targetView: 'cad-studio',
    searchKeywords: ['revit', 'rvt', 'rfa', 'bim', 'autodesk revit', 'architecture'],
  },
  {
    id: 'ifc',
    name: 'Industry Foundation Classes',
    extension: 'IFC',
    category: 'architecture',
    softwareEcosystem: 'buildingSMART OpenBIM',
    status: 'SUPPORTED',
    badge: 'OpenBIM Standard',
    description: 'Open exchange format for architectural & structural models. Universal 3D coordination standard.',
    actionLabel: 'Inspect IFC in CAD',
    targetView: 'cad-studio',
    searchKeywords: ['ifc', 'openbim', 'bim', 'buildingsmart', 'archicad'],
  },

  // 6. Structural
  {
    id: 'staad',
    name: 'STAAD.Pro Structural Analysis',
    extension: 'STD',
    category: 'structural',
    softwareEcosystem: 'Bentley STAAD.Pro',
    status: 'OPEN_EXCHANGE_GUIDED',
    badge: 'Structural Guide',
    description: 'Finite element structural model. Export framing geometries to open CIS/2, IFC, or DXF for rendering.',
    actionLabel: 'Structural Guide',
    targetView: 'cad-studio',
    searchKeywords: ['staad', 'std', 'bentley', 'structural', 'civil', 'framing'],
  },
  {
    id: 'etabs',
    name: 'ETABS & SAP2000 Structural Models',
    extension: 'EDB / SDB',
    category: 'structural',
    softwareEcosystem: 'Computers and Structures Inc. (CSI)',
    status: 'OPEN_EXCHANGE_GUIDED',
    badge: 'Structural Guide',
    description: 'CSI analytical project files. Export to structural IFC or 3D DXF framing layouts.',
    actionLabel: 'Structural Guide',
    targetView: 'cad-studio',
    searchKeywords: ['etabs', 'edb', 'sap2000', 'sdb', 'csi', 'structural analysis'],
  },

  // 7. Steel & Metal
  {
    id: 'tekla',
    name: 'Tekla Structures & Advance Steel',
    extension: 'DSTV / NC / NC1',
    category: 'steel',
    softwareEcosystem: 'Trimble Tekla / Autodesk Advance Steel',
    status: 'PRO_STUDIO',
    badge: 'Steel Fabrication',
    description: 'Parse DSTV NC1 drilling/cutting coordinates, piece marks, steel grades, and export PDF shop drawings.',
    actionLabel: 'Steel Studio',
    targetView: 'cad-studio',
    searchKeywords: ['tekla', 'dstv', 'nc', 'nc1', 'advance steel', 'cutting list', 'shop drawing'],
  },
  {
    id: 'gcode',
    name: 'G-Code CNC Toolpaths',
    extension: 'GCODE / CNC',
    category: 'steel',
    softwareEcosystem: 'Mach3 / LinuxCNC / Fanuc / Haas',
    status: 'PRO_STUDIO',
    badge: 'Safe Sandbox',
    description: 'Zero execution sandbox for safe CNC G-code coordinate inspection and feed-rate analysis.',
    actionLabel: 'Inspect G-Code',
    targetView: 'cad-studio',
    searchKeywords: ['gcode', 'cnc', 'toolpath', 'mach3', 'fanuc', 'plasma'],
  },

  // 8. Mechanical CAD
  {
    id: 'solidworks',
    name: 'SolidWorks Part & Assembly',
    extension: 'SLDPRT / SLDASM',
    category: 'mechanical',
    softwareEcosystem: 'Dassault Systèmes SolidWorks',
    status: 'OPEN_EXCHANGE_GUIDED',
    badge: 'STEP / STL Guide',
    description: 'Parametric SolidWorks model trees. Save as STEP (.stp) or STL in SolidWorks for native 3D web viewing.',
    actionLabel: 'SolidWorks Guide',
    targetView: 'threed-studio',
    searchKeywords: ['solidworks', 'sldprt', 'sldasm', 'dassault', 'mechanical', 'cad part'],
  },
  {
    id: 'step-iges',
    name: 'STEP & IGES Boundary Models',
    extension: 'STEP / STP / IGES',
    category: 'mechanical',
    softwareEcosystem: 'ISO 10303 Mechanical Standard',
    status: 'SUPPORTED',
    badge: 'Open CAD Exchange',
    description: 'Universal vendor-neutral exchange standard for mechanical assemblies, tooling, and manufactured parts.',
    actionLabel: 'Mechanical 3D',
    targetView: 'threed-studio',
    searchKeywords: ['step', 'stp', 'iges', 'igs', 'mechanical', 'inventor'],
  },

  // 9. 3D Studio
  {
    id: 'obj-stl-ply',
    name: '3D Polygonal Meshes',
    extension: 'STL / OBJ / PLY / 3MF',
    category: 'threed',
    softwareEcosystem: 'Blender / Maya / 3D Printing',
    status: 'PRO_STUDIO',
    badge: '3D Orbit Viewer',
    description: 'Interactive 360° Orbit, Pan, Zoom, Wireframe/Solid shading, and mesh export for 3D printing.',
    actionLabel: 'Open 3D Studio',
    targetView: 'threed-studio',
    searchKeywords: ['stl', 'obj', 'ply', '3mf', '3d', 'mesh', '3d printing', 'blender'],
  },

  // 10. Adobe
  {
    id: 'psd',
    name: 'Adobe Photoshop Document',
    extension: 'PSD',
    category: 'adobe',
    softwareEcosystem: 'Adobe Creative Cloud',
    status: 'SUPPORTED',
    badge: 'AG-PSD Engine',
    description: 'Composite Photoshop document layer rasterization into lossless PNG, JPG, or PDF.',
    actionLabel: 'Convert PSD',
    targetView: 'converter',
    searchKeywords: ['psd', 'photoshop', 'adobe', 'layers', 'psb'],
  },
  {
    id: 'ai',
    name: 'Adobe Illustrator Artwork',
    extension: 'AI',
    category: 'adobe',
    softwareEcosystem: 'Adobe Illustrator',
    status: 'SUPPORTED',
    badge: 'PDF-Vector Engine',
    description: 'Render Illustrator vector artboards into high-DPI raster images or printable PDFs.',
    actionLabel: 'Convert AI',
    targetView: 'converter',
    searchKeywords: ['ai', 'illustrator', 'adobe illustrator', 'vector artwork'],
  },
  {
    id: 'eps',
    name: 'Encapsulated PostScript',
    extension: 'EPS',
    category: 'adobe',
    softwareEcosystem: 'Adobe / PostScript Vector',
    status: 'SUPPORTED',
    badge: 'PostScript Engine',
    description: 'Parse PostScript vector graphics and rasterize to PNG, JPG, or compile into PDF.',
    actionLabel: 'Convert EPS',
    targetView: 'converter',
    searchKeywords: ['eps', 'postscript', 'vector logo', 'print'],
  },

  // 11. AI / ML
  {
    id: 'safetensors',
    name: 'Hugging Face SafeTensors',
    extension: 'SAFETENSORS',
    category: 'aiml',
    softwareEcosystem: 'Hugging Face / PyTorch / Transformers',
    status: 'PRO_STUDIO',
    badge: 'Zero Bytecode Engine',
    description: 'Fast header inspection without executing unsafe code. Inspect tensor shapes, data types, and layer sizes.',
    actionLabel: 'Inspect SafeTensors',
    targetView: 'ml-studio',
    searchKeywords: ['safetensors', 'huggingface', 'weights', 'tensors', 'ai', 'model'],
  },
  {
    id: 'onnx',
    name: 'Open Neural Network Exchange',
    extension: 'ONNX',
    category: 'aiml',
    softwareEcosystem: 'Linux Foundation / Microsoft ONNX',
    status: 'PRO_STUDIO',
    badge: 'Neural Graph',
    description: 'Parse protocol buffers safely to inspect model architecture, inputs, outputs, and opset versions.',
    actionLabel: 'Inspect ONNX',
    targetView: 'ml-studio',
    searchKeywords: ['onnx', 'neural network', 'deep learning', 'pytorch', 'tensorflow'],
  },
  {
    id: 'gguf',
    name: 'GGUF Quantized LLM Weights',
    extension: 'GGUF',
    category: 'aiml',
    softwareEcosystem: 'llama.cpp / Ollama / Local AI',
    status: 'PRO_STUDIO',
    badge: 'Quantized Inspector',
    description: 'Header-only metadata parsing for llama.cpp quantized weights with parameter and quantization reporting.',
    actionLabel: 'Inspect GGUF',
    targetView: 'ml-studio',
    searchKeywords: ['gguf', 'llm', 'llama', 'ollama', 'quantization', 'mistral'],
  },

  // 12. Data Science
  {
    id: 'parquet-csv',
    name: 'Apache Parquet & Tabular Data',
    extension: 'PARQUET / CSV / TSV',
    category: 'data',
    softwareEcosystem: 'Apache Arrow / PyArrow / Pandas',
    status: 'PRO_STUDIO',
    badge: 'Tabular Studio',
    description: 'Live interactive grid with column type inference, search filtering, and bidirectional conversions.',
    actionLabel: 'Data Studio',
    targetView: 'data-studio',
    searchKeywords: ['parquet', 'csv', 'tsv', 'jsonl', 'pandas', 'arrow', 'dataset'],
  },

  // 13. Audio
  {
    id: 'audio-suite',
    name: 'Audio Transcoding Suite',
    extension: 'MP3 / WAV / FLAC',
    category: 'audio',
    softwareEcosystem: 'Digital Audio Workstations',
    status: 'SUPPORTED',
    badge: 'FFmpeg Engine',
    description: 'High-fidelity audio conversion across MP3, WAV, FLAC, AAC, M4A, OGG, OPUS, and AIFF.',
    actionLabel: 'Audio Converter',
    targetView: 'converter',
    searchKeywords: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus', 'aiff', 'audio'],
  },

  // 14. Video
  {
    id: 'video-suite',
    name: 'Video Container Suite',
    extension: 'MP4 / WEBM / MOV',
    category: 'video',
    softwareEcosystem: 'Video Production & Streaming',
    status: 'SUPPORTED',
    badge: 'FFmpeg Engine',
    description: 'Video container transcoding, audio extraction to MP3, and frame snapshot thumbnail generation.',
    actionLabel: 'Video Converter',
    targetView: 'converter',
    searchKeywords: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'video', 'extract audio'],
  },

  // 15. Developer
  {
    id: 'dev-formatters',
    name: 'Developer Code & Formatters',
    extension: 'JSON / XML / YAML',
    category: 'developer',
    softwareEcosystem: 'Web APIs / DevOps / Cloud',
    status: 'PRO_STUDIO',
    badge: 'Code Utilities',
    description: 'Validate, format, prettify, and minify JSON, XML, YAML documents with live syntax checking.',
    actionLabel: 'Open DevTools',
    targetView: 'data-studio',
    searchKeywords: ['json', 'xml', 'yaml', 'validator', 'formatter', 'minifier', 'code'],
  },
];

const CATEGORY_ITEMS: { key: HomeCategoryKey; label: string; icon: any }[] = [
  { key: 'all', label: 'All Formats', icon: Layers },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'pdf', label: 'PDF', icon: FileText },
  { key: 'images', label: 'Images', icon: Image },
  { key: 'cad', label: 'CAD', icon: Compass },
  { key: 'architecture', label: 'Architecture', icon: Building2 },
  { key: 'structural', label: 'Structural', icon: Activity },
  { key: 'steel', label: 'Steel & Metal', icon: Wrench },
  { key: 'mechanical', label: 'Mechanical', icon: Cpu },
  { key: 'threed', label: '3D', icon: Box },
  { key: 'adobe', label: 'Adobe', icon: Sparkles },
  { key: 'aiml', label: 'AI / ML', icon: Cpu },
  { key: 'data', label: 'Data', icon: Database },
  { key: 'audio', label: 'Audio', icon: Music },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'developer', label: 'Developer', icon: Code },
];

const POPULAR_SEARCH_EXAMPLES = [
  'DWG',
  'Revit',
  'Tekla',
  'STAAD',
  'SolidWorks',
  'PSD',
  'AI',
  'ONNX',
  'OBJ',
  'STL',
  'Parquet',
  'G-Code',
];

export const HomeDirectorySection: React.FC<HomeDirectorySectionProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HomeCategoryKey>('all');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_SOFTWARE_FORMATS.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;

      return (
        item.name.toLowerCase().includes(q) ||
        item.extension.toLowerCase().includes(q) ||
        item.softwareEcosystem.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.searchKeywords.some((k) => k.includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  return (
    <section className="space-y-8" id="home-directory-section">
      {/* Section Header & Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 text-xs font-extrabold uppercase tracking-wider border border-blue-200 dark:border-blue-900/60">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Format & Software Directory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Explore Converters by Software & Engineering Standard
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Search by software application, file extension, or standard. Convert-X routes your files
            directly into verified engines and guided exchange workflows.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              id="home-format-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file format or software (e.g. DWG, Revit, Tekla, STAAD, SolidWorks, PSD, AI, ONNX, OBJ, STL)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Examples Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold">Try searching:</span>
            {POPULAR_SEARCH_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setSearchQuery(example)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* 15 Category Filter Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORY_ITEMS.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid of Formats & Guided Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isSupported = item.status === 'SUPPORTED';
          const isStudio = item.status === 'PRO_STUDIO';

          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800/60 transition-all group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/60">
                    {item.extension}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSupported
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                        : isStudio
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.name}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-medium">{item.softwareEcosystem}</div>
                </div>

                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {item.category}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(item.targetView)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No formats found matching &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
};
