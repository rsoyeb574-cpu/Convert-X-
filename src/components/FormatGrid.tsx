import React, { useState } from 'react';
import { FormatCapability } from '../types.js';
import { Search, CheckCircle2, Lock, Box, Image as ImageIcon, FileText, Layers, Sparkles, Cpu, ArrowLeftRight, ArrowRight, Info, ShieldCheck } from 'lucide-react';

interface FormatGridProps {
  capabilities: FormatCapability[];
  onSelectFormat?: (ext: string) => void;
}

interface ConversionPair {
  source: string;
  target: string;
  bidirectional: boolean;
  category: string;
  notes: string;
}

const MATRIX_PAIRS: ConversionPair[] = [
  { source: 'DOCX', target: 'PNG / JPG / PDF', bidirectional: false, category: 'Document', notes: 'Renders Microsoft Word DOCX text hierarchy, headings, tables, and pages to high-DPI PNG, JPG, or PDF.' },
  { source: 'PPTX', target: 'PNG / JPG / PDF', bidirectional: false, category: 'Presentation', notes: 'Renders PowerPoint slides into high-DPI slide canvas images or multi-page PDF presentation deck.' },
  { source: 'XLSX', target: 'PNG / JPG / PDF', bidirectional: false, category: 'Document', notes: 'Visualizes spreadsheet workbooks, cell data, and tabular layouts into PNG, JPG, or PDF.' },
  { source: 'ODT', target: 'PNG / JPG / PDF', bidirectional: false, category: 'Document', notes: 'Renders OpenDocument text headings, paragraphs, and tables to high-DPI PNG, JPG, or PDF.' },
  { source: 'RTF', target: 'PNG / JPG / PDF', bidirectional: false, category: 'Document', notes: 'Parses Rich Text Format styled documents into clean, paginated PNG, JPG, or PDF.' },
  { source: 'TXT', target: 'PNG / JPG / PDF', bidirectional: false, category: 'Document', notes: 'Formatted multi-page document pagination with typography layout, headers, and page numbering.' },
  { source: 'PNG', target: 'JPG / JPEG', bidirectional: true, category: 'Image', notes: 'Full bidirectional raster conversion. Transparency gracefully flattened to solid background on JPG export.' },
  { source: 'PNG', target: 'WEBP', bidirectional: true, category: 'Image', notes: 'Full bidirectional modern image conversion with alpha transparency preservation.' },
  { source: 'PNG', target: 'PDF', bidirectional: true, category: 'Document', notes: 'Bidirectional: Lossless image embedding into PDF or high-resolution PDF page rasterization.' },
  { source: 'JPG', target: 'WEBP', bidirectional: true, category: 'Image', notes: 'Bidirectional high-speed lossy/lossless compression conversion.' },
  { source: 'JPG', target: 'PDF', bidirectional: true, category: 'Document', notes: 'Bidirectional: Convert photo to formatted PDF or render PDF pages into JPEG images.' },
  { source: 'WEBP', target: 'PDF', bidirectional: true, category: 'Document', notes: 'Bidirectional: Convert modern WebP to PDF document or extract PDF pages to WebP.' },
  { source: 'SVG', target: 'PNG / JPG / WEBP / PDF', bidirectional: false, category: 'Vector', notes: 'Render resolution-independent vector graphics to high-DPI raster images or vector PDF.' },
  { source: 'DXF', target: 'SVG / PDF / PNG / JPG', bidirectional: false, category: 'CAD', notes: 'Parse AutoCAD CAD entities & layers directly into vector SVG, blueprint PDF, or high-res raster.' },
  { source: 'PSD', target: 'PNG / JPG / PDF', bidirectional: false, category: 'Adobe', notes: 'Parses Adobe Photoshop layered design composites into crisp PNG (with alpha), JPG, or print-ready PDF.' },
  { source: 'AI', target: 'PDF / PNG / JPG', bidirectional: false, category: 'Adobe', notes: 'Extracts and renders vector artwork and layout paths from Adobe Illustrator vector files.' },
  { source: 'EPS', target: 'PNG / JPG / WEBP / PDF', bidirectional: false, category: 'Adobe', notes: 'Renders Encapsulated PostScript vector graphics to high-DPI raster images or vector-embedded PDF.' },
  { source: 'OBJ', target: 'STL / SVG / PDF / PNG / JPG', bidirectional: true, category: '3D Mesh', notes: 'Direct 3D geometry engine: renders shaded isometric blueprints and cross-converts OBJ ↔ STL.' },
  { source: 'STL', target: 'OBJ / SVG / PDF / PNG / JPG', bidirectional: true, category: '3D Mesh', notes: 'Direct 3D stereolithography mesh engine: renders CAD blueprints and cross-converts STL ↔ OBJ.' },
];

export const FormatGrid: React.FC<FormatGridProps> = ({ capabilities, onSelectFormat }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', name: 'All Formats', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'documents', name: 'Universal Documents', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'images', name: 'Images', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'pdf', name: 'PDF Documents', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'vector', name: 'Vector Graphics', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'cad', name: 'CAD / Architecture', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'adobe', name: 'Adobe Creative Suite', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'corel', name: 'CorelDRAW', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: '3d', name: '3D Formats', icon: <Cpu className="w-3.5 h-3.5" /> },
  ];

  const filtered = capabilities.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* 1. Bidirectional Conversion Matrix Highlight Section */}
      <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-[#0B1120] dark:via-[#111827] dark:to-[#0F172A] border border-blue-200 dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-blue-200/60 dark:border-[#1E293B]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Full Bidirectional Matrix</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              Verified Two-Way Conversions
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Genuine Backend Processing (Zero Fake Conversions)</span>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MATRIX_PAIRS.map((pair, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 uppercase">
                    {pair.source}
                  </span>
                  {pair.bidirectional ? (
                    <ArrowLeftRight className="w-4 h-4 text-[#2563EB] shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-[#2563EB] shrink-0" />
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] uppercase">
                    {pair.target}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    pair.bidirectional
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                      : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50'
                  }`}
                >
                  {pair.bidirectional ? 'Bidirectional ↔' : 'One-Way Engine →'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                {pair.notes}
              </p>
            </div>
          ))}
        </div>

        {/* Technical Accuracy Notice */}
        <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs text-[#64748B] dark:text-[#94A3B8] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Why Raster (PNG / JPG / WEBP) → SVG is not supported:
            </span>{' '}
            Raster images are made of fixed pixel grids, while SVG is mathematical vector paths. Converting raster pixels into vectors requires lossy vector auto-tracing rather than a clean mathematical transform. To guarantee 100% genuine data fidelity, Convert-X only supports authentic bidirectional raster-to-raster, raster-to-PDF, vector-to-raster, and vector-to-PDF conversions.
          </div>
        </div>
      </div>

      {/* 2. Format Catalog & Engine Capabilities */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`format-tab-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-[#1E293B]'
                }`}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="format-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search formats e.g. DXF, PNG, PSD..."
              className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B] dark:placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        {/* Grid Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isSupported = item.status === 'supported';
            return (
              <div
                key={item.id}
                id={`format-card-${item.extension}`}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isSupported
                    ? 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] shadow-md hover:shadow-lg'
                    : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] opacity-80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                        .{item.extension}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700">
                        {item.category}
                      </span>
                    </div>

                    {isSupported ? (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" /> Active Engine
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40">
                        <Lock className="w-3 h-3" /> Coming Soon
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.name}</h4>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>

                {/* Bottom Details */}
                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
                  {isSupported ? (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block mb-1">
                        Supported Export Targets:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.supportedOutputs.map((out) => (
                          <span
                            key={out}
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400"
                          >
                            → .{out}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      Engine Extension: {item.requiresEngine}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#64748B] dark:text-[#94A3B8] text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl">
            No formats matched your search query "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
