import React from 'react';
import { ConversionOptions } from '../types.js';
import { Sliders, Sun, FileText, Move, Maximize2, Shield } from 'lucide-react';

interface ConversionSettingsProps {
  outputFormat: string;
  options: ConversionOptions;
  onChangeOptions: (options: ConversionOptions) => void;
}

export const ConversionSettings: React.FC<ConversionSettingsProps> = ({
  outputFormat,
  options,
  onChangeOptions,
}) => {
  const isPdf = outputFormat === 'pdf';

  const bgColors = [
    { label: 'White', value: '#ffffff' },
    { label: 'Dark Slate', value: '#0f172a' },
    { label: 'Light Slate', value: '#f8fafc' },
    { label: 'Transparent', value: 'transparent' },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-5 space-y-5 shadow-lg transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#2563EB]" />
          <span>Conversion Options</span>
        </h3>
        <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Engine Parameters</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quality Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Compression Quality</label>
            <span className="font-bold text-[#2563EB]">{options.quality || 90}%</span>
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
            <span>Smaller File</span>
            <span>Balanced</span>
            <span>Maximum Quality</span>
          </div>
        </div>

        {/* DPI Density Dropdown */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">DPI / Rendering Density</label>
          <select
            id="setting-dpi-select"
            value={options.dpi || 150}
            onChange={(e) => onChangeOptions({ ...options, dpi: parseInt(e.target.value) })}
            className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
          >
            <option value={72}>72 DPI (Standard Web Display)</option>
            <option value={150}>150 DPI (High-Definition Digital)</option>
            <option value={300}>300 DPI (Ultra-Sharp Print Quality)</option>
          </select>
        </div>

        {/* Background Color Selection */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Background Fill Color</label>
          <div className="flex flex-wrap items-center gap-2">
            {bgColors.map((bg) => {
              if (outputFormat === 'jpg' && bg.value === 'transparent') return null;
              const isSelected = (options.backgroundColor || '#ffffff') === bg.value;
              return (
                <button
                  key={bg.value}
                  type="button"
                  id={`bg-color-${bg.label.toLowerCase().replace(' ', '-')}`}
                  onClick={() => onChangeOptions({ ...options, backgroundColor: bg.value })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400'
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
        {isPdf && (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Document Page Size</label>
              <select
                id="setting-pagesize-select"
                value={options.pageSize || 'a4'}
                onChange={(e) => onChangeOptions({ ...options, pageSize: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="a4">A4 (210 x 297 mm)</option>
                <option value="letter">Letter (8.5 x 11 in)</option>
                <option value="legal">Legal (8.5 x 14 in)</option>
                <option value="auto">Auto Fit (Match Image Bounds)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Page Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="orientation-portrait-btn"
                  onClick={() => onChangeOptions({ ...options, orientation: 'portrait' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    (options.orientation || 'portrait') === 'portrait'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400'
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
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  Landscape (Horizontal)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
