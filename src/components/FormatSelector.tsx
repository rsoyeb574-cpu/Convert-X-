import React from 'react';
import { FormatCapability } from '../types.js';
import { Check, Lock, Sparkles, ArrowRight, Info, Layers, FileText, Image as ImageIcon, Box } from 'lucide-react';

interface FormatSelectorProps {
  inputFormat: string;
  selectedOutputFormat: string;
  onSelectFormat: (format: string) => void;
  capabilities: FormatCapability[];
  supportedOutputs: string[];
}

const FORMAT_DESCRIPTIONS: Record<string, { label: string; subtext: string; icon: string }> = {
  png: { label: 'PNG', subtext: 'Lossless Image with Alpha Transparency', icon: '🖼️' },
  jpg: { label: 'JPG / JPEG', subtext: 'Standard High-Efficiency Photo', icon: '📷' },
  jpeg: { label: 'JPEG', subtext: 'Standard Compressed Photo', icon: '📷' },
  webp: { label: 'WEBP', subtext: 'Modern High-Performance Web Image', icon: '🌐' },
  pdf: { label: 'PDF', subtext: 'Portable Document Format', icon: '📄' },
  svg: { label: 'SVG', subtext: 'Scalable Vector Graphics', icon: '📐' },
  dxf: { label: 'DXF', subtext: 'CAD Vector Blueprint', icon: '🏗️' },
  psd: { label: 'PSD', subtext: 'Adobe Photoshop Document', icon: '🎨' },
  ai: { label: 'AI', subtext: 'Adobe Illustrator Vector File', icon: '✨' },
  eps: { label: 'EPS', subtext: 'Encapsulated PostScript Vector', icon: '📐' },
  zip: { label: 'ZIP', subtext: 'Multi-Page Image Archive', icon: '📦' },
};

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  inputFormat,
  selectedOutputFormat,
  onSelectFormat,
  capabilities,
  supportedOutputs,
}) => {
  const inFmtClean = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();

  // Active supported outputs for this input format (excluding the source format itself)
  const activeOutputs = capabilities.filter(
    (c) => c.status === 'supported' && supportedOutputs.includes(c.extension) && c.extension !== inFmtClean
  );

  const isRasterInput = ['png', 'jpg', 'jpeg', 'webp'].includes(inFmtClean);

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg transition-colors">
      {/* Header with clear Directional Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E2E8F0] dark:border-[#1E293B] gap-2">
        <div>
          <span className="text-[10px] font-extrabold text-[#2563EB] dark:text-blue-400 uppercase tracking-wider block">
            Bidirectional Conversion Matrix
          </span>
          <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Convert <span className="text-[#2563EB] dark:text-blue-400">.{inFmtClean.toUpperCase()}</span> To:
          </h3>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          <span className="text-slate-500 dark:text-slate-400">Detected Source:</span>
          <strong className="text-[#2563EB] dark:text-blue-400 font-extrabold uppercase">.{inFmtClean}</strong>
        </div>
      </div>

      {/* Target Format Cards */}
      <div>
        <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5">
          Select Target Format:
        </label>

        {activeOutputs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeOutputs.map((fmt) => {
              const isSelected = selectedOutputFormat === fmt.extension;
              const meta = FORMAT_DESCRIPTIONS[fmt.extension] || {
                label: fmt.extension.toUpperCase(),
                subtext: fmt.name,
                icon: '📁',
              };

              return (
                <button
                  key={fmt.id}
                  type="button"
                  id={`format-option-${fmt.extension}`}
                  onClick={() => onSelectFormat(fmt.extension)}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/60 dark:to-indigo-950/40 border-[#2563EB] dark:border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-[#2563EB]/20'
                      : 'bg-slate-50/80 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]/60 hover:bg-slate-100/70 dark:hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label={fmt.extension}>
                        {meta.icon}
                      </span>
                      <span className="text-lg font-black uppercase text-[#0F172A] dark:text-[#F8FAFC]">
                        {fmt.extension}
                      </span>
                    </div>

                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold tracking-wide uppercase border border-emerald-300 dark:border-emerald-800/40">
                        Supported
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 leading-relaxed">
                    {meta.subtext}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
            No direct converter engine available for input format .{inFmtClean}.
          </div>
        )}
      </div>

      {/* Technical Accuracy Notice for Raster -> SVG & Format Nuances */}
      {isRasterInput && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs text-[#64748B] dark:text-[#94A3B8] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#2563EB] dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Raster → SVG vector conversion is not supported:
            </span>{' '}
            Converting pixel-based bitmaps ({inFmtClean.toUpperCase()}) into scalable bezier vector graphics requires
            lossy vector auto-tracing. Convert-X strictly delivers authentic, high-fidelity conversions to{' '}
            <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
              {activeOutputs.map((o) => `.${o.extension.toUpperCase()}`).join(', ')}
            </strong>.
          </div>
        </div>
      )}

      {inFmtClean === 'pdf' && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-[#2563EB] dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">High-Fidelity PDF Rasterization:</span> Converts PDF vector drawings, fonts,
            and layout pages directly to crisp PNG, JPG, or modern WebP images. Multi-page PDFs can be extracted page-by-page or downloaded as a complete ZIP archive.
          </div>
        </div>
      )}

      {inFmtClean === 'svg' && (
        <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-300 flex items-start gap-2.5">
          <Box className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">True Vector Rendering:</span> Converts resolution-independent SVG vector graphics to crisp high-DPI raster images (PNG, JPG, WEBP) or embeds them losslessly into PDF documents.
          </div>
        </div>
      )}

      {inFmtClean === 'dxf' && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">CAD Vector Engine:</span> Directly parses AutoCAD DXF entities, layers, line weights, and annotations into vector SVG, print-ready PDF, or high-res PNG/JPG images.
          </div>
        </div>
      )}

      {inFmtClean === 'psd' && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-[#2563EB] dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Photoshop Composite Engine:</span> Renders Adobe Photoshop layered design composites into transparent PNG, high-density JPG, or print-ready PDF files.
          </div>
        </div>
      )}

      {inFmtClean === 'ai' && (
        <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs text-orange-900 dark:text-orange-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Illustrator Vector Engine:</span> Renders vector artwork and design layout paths from Adobe Illustrator (.ai) files into crisp vector PDF or high-resolution PNG/JPG images.
          </div>
        </div>
      )}

      {inFmtClean === 'eps' && (
        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
          <Box className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Encapsulated PostScript Engine:</span> Renders vector artwork, typography, and graphics from .EPS files into crisp high-DPI raster images (PNG, JPG, WEBP) or lossless vector PDF documents.
          </div>
        </div>
      )}

      {inFmtClean === 'docx' && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Word Document Engine:</span> Renders Microsoft Word DOCX content, paragraphs, headings, bullet lists, and tables into high-DPI PNG, JPG images, or vector PDF documents.
          </div>
        </div>
      )}

      {inFmtClean === 'xlsx' && (
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Spreadsheet Grid Engine:</span> Renders Microsoft Excel XLSX workbooks, worksheets, styled headers, and data grids into PNG, JPG images, or PDF documents.
          </div>
        </div>
      )}

      {inFmtClean === 'txt' && (
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Typography Document Engine:</span> Formats and paginates plain text files into clean multi-page PNG, JPG images, or PDF documents with page numbers.
          </div>
        </div>
      )}
    </div>
  );
};
