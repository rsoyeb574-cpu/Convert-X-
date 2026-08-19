import React from 'react';
import { ConversionOptions } from '../types.js';
import { Sliders, FileText, Maximize2, Shield, Eye, Layers, Sparkles } from 'lucide-react';

interface ConversionSettingsProps {
  inputFormat?: string;
  outputFormat: string;
  options: ConversionOptions;
  onChangeOptions: (options: ConversionOptions) => void;
}

export const ConversionSettings: React.FC<ConversionSettingsProps> = ({
  inputFormat = '',
  outputFormat,
  options,
  onChangeOptions,
}) => {
  const inFmtClean = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();
  const outFmtClean = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();

  const isPdfOutput = outFmtClean === 'pdf';
  const isImageOutput = ['png', 'jpg', 'webp'].includes(outFmtClean);
  const isMultiPageToImage = ['pdf', 'docx', 'xlsx', 'txt', 'html'].includes(inFmtClean) && isImageOutput;

  const bgColors = [
    { label: 'White', value: '#ffffff' },
    { label: 'Dark Slate', value: '#0f172a' },
    { label: 'Light Slate', value: '#f8fafc' },
    { label: 'Transparent', value: 'transparent' },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg transition-colors">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
          <span>Conversion Parameters</span>
        </h3>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          Target: .{outFmtClean.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Multi-Page Document Page Extraction Control */}
        {isMultiPageToImage && (
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Document Page Selection</span>
              </label>
              <span className="text-[10px] font-bold text-[#2563EB] uppercase">Multi-Page Rendering</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="pdf-page-all-btn"
                onClick={() => {
                  const newOpts = { ...options };
                  delete newOpts.pageNumber;
                  onChangeOptions(newOpts);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  !options.pageNumber
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                    : 'bg-white dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                All Pages (ZIP Archive)
              </button>

              <button
                type="button"
                id="pdf-page-single-btn"
                onClick={() => onChangeOptions({ ...options, pageNumber: options.pageNumber || 1 })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  options.pageNumber
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                    : 'bg-white dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                Specific Page
              </button>
            </div>

            {options.pageNumber && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Page Number:</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={options.pageNumber}
                  onChange={(e) =>
                    onChangeOptions({ ...options, pageNumber: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="w-20 bg-white dark:bg-[#0B1120] border border-blue-300 dark:border-blue-800 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            )}
          </div>
        )}

        {/* Quality Slider (Images) */}
        {isImageOutput && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Compression Quality</label>
              <span className="font-bold text-[#2563EB] dark:text-blue-400">{options.quality || 90}%</span>
            </div>
            <input
              type="range"
              id="setting-quality-slider"
              min="10"
              max="100"
              step="5"
              value={options.quality || 90}
              onChange={(e) => onChangeOptions({ ...options, quality: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
            />
            <div className="flex justify-between text-[10px] text-[#64748B] dark:text-[#94A3B8]">
              <span>Small Size</span>
              <span>Balanced (90%)</span>
              <span>Maximum Fidelity</span>
            </div>
          </div>
        )}

        {/* DPI Density Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              DPI / Rendering Density
            </label>
            {inFmtClean === 'pdf' && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                Direct 1:1 PDF Page Render
              </span>
            )}
          </div>
          <select
            id="setting-dpi-select"
            value={options.dpi || 300}
            onChange={(e) => onChangeOptions({ ...options, dpi: parseInt(e.target.value) })}
            className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
          >
            <option value={72}>72 DPI — Standard Screen Resolution</option>
            <option value={150}>150 DPI — Medium Digital Resolution</option>
            <option value={300}>300 DPI — High Resolution Print (Default)</option>
            <option value={600}>600 DPI — Ultra-High Resolution / Archival Quality</option>
          </select>
          {inFmtClean === 'pdf' && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Calculates exact pixel dimensions: PDF width (in) × DPI by PDF height (in) × DPI (e.g. A4 @ 300 DPI = ~2480 × 3508 px).
            </p>
          )}
        </div>

        {/* Background Color Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Background Fill Color
            </label>
            {outFmtClean === 'jpg' && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                (JPG requires solid background)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {bgColors.map((bg) => {
              if (outFmtClean === 'jpg' && bg.value === 'transparent') return null;
              const isSelected = (options.backgroundColor || '#ffffff') === bg.value;
              return (
                <button
                  key={bg.value}
                  type="button"
                  id={`bg-color-${bg.label.toLowerCase().replace(' ', '-')}`}
                  onClick={() => onChangeOptions({ ...options, backgroundColor: bg.value })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400 font-bold ring-1 ring-[#2563EB]'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:border-slate-400'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0"
                    style={{
                      backgroundColor: bg.value === 'transparent' ? '#ffffff' : bg.value,
                      backgroundImage:
                        bg.value === 'transparent'
                          ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                          : 'none',
                      backgroundSize: '6px 6px',
                    }}
                  />
                  <span>{bg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PDF Specific Page Settings */}
        {isPdfOutput && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Document Page Size
              </label>
              <select
                id="setting-pagesize-select"
                value={options.pageSize || 'a4'}
                onChange={(e) => onChangeOptions({ ...options, pageSize: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="a4">A4 (210 x 297 mm — Standard)</option>
                <option value="a3">A3 (297 x 420 mm — Large Format)</option>
                <option value="a2">A2 (420 x 594 mm — Poster Format)</option>
                <option value="a1">A1 (594 x 841 mm — CAD Drawing)</option>
                <option value="a0">A0 (841 x 1189 mm — Master Blueprint)</option>
                <option value="letter">Letter (8.5 x 11 in)</option>
                <option value="legal">Legal (8.5 x 14 in)</option>
                <option value="auto">Auto Fit (Match Image Dimensions)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Page Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="orientation-portrait-btn"
                  onClick={() => onChangeOptions({ ...options, orientation: 'portrait' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    (options.orientation || 'portrait') === 'portrait'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400 font-bold ring-1 ring-[#2563EB]'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  Portrait (Vertical)
                </button>
                <button
                  type="button"
                  id="orientation-landscape-btn"
                  onClick={() => onChangeOptions({ ...options, orientation: 'landscape' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    options.orientation === 'landscape'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400 font-bold ring-1 ring-[#2563EB]'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  Landscape (Horizontal)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Custom Pixel Dimensions */}
        {isImageOutput && inFmtClean !== 'pdf' && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Custom Pixel Dimensions (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Width (px)</span>
                <input
                  type="number"
                  placeholder="Auto"
                  value={options.width || ''}
                  onChange={(e) =>
                    onChangeOptions({
                      ...options,
                      width: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Height (px)</span>
                <input
                  type="number"
                  placeholder="Auto"
                  value={options.height || ''}
                  onChange={(e) =>
                    onChangeOptions({
                      ...options,
                      height: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="flex items-center pt-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  <input
                    type="checkbox"
                    checked={options.maintainAspectRatio !== false}
                    onChange={(e) => onChangeOptions({ ...options, maintainAspectRatio: e.target.checked })}
                    className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Lock Ratio</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
