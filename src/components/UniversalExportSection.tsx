import React, { useState, useEffect } from 'react';
import { UniversalExportCapability } from '../types.js';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileDown,
  RefreshCw,
} from 'lucide-react';

interface UniversalExportSectionProps {
  onSelectSample?: (sampleKey: string) => void;
  onNavigateToConverter?: () => void;
}

export const UniversalExportSection: React.FC<UniversalExportSectionProps> = ({
  onSelectSample,
  onNavigateToConverter,
}) => {
  const [capabilities, setCapabilities] = useState<UniversalExportCapability[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetch('/api/universal-export/capabilities')
      .then((res) => res.json())
      .then((data) => {
        const caps = data.capabilities || (Array.isArray(data) ? data : []);
        setCapabilities(caps);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load universal export capabilities:', err);
        setIsLoading(false);
      });
  }, []);

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'txt':
      case 'html':
        return <FileCode className="w-5 h-5 text-slate-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'psd':
      case 'ai':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'dxf':
      case 'svg':
        return <Layers className="w-5 h-5 text-indigo-500" />;
      default:
        return <FileDown className="w-5 h-5 text-blue-500" />;
    }
  };

  const sampleButtons = [
    { key: 'docx', label: 'Sample DOCX', icon: '📄', format: 'docx' },
    { key: 'xlsx', label: 'Sample XLSX', icon: '📊', format: 'xlsx' },
    { key: 'txt', label: 'Sample TXT', icon: '📝', format: 'txt' },
    { key: 'svg', label: 'Sample SVG', icon: '📐', format: 'svg' },
    { key: 'dxf', label: 'Sample DXF', icon: '🏗️', format: 'dxf' },
  ];

  const categories = [
    { id: 'all', label: 'All Document & Design Formats' },
    { id: 'Document', label: 'Documents & Spreadsheets' },
    { id: 'Vector / CAD', label: 'Vector & CAD' },
    { id: 'Design', label: 'Adobe Design' },
    { id: 'Image', label: 'Images' },
  ];

  const filtered = capabilities.filter((cap) => {
    if (filterCategory === 'all') return true;
    return cap.category === filterCategory;
  });

  return (
    <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2 border border-purple-200 dark:border-purple-800/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Universal File Export System</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Document & Design Vector Export Engine
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            Parse, layout, and render document workbooks, text files, vector blueprints, and design files into crisp PNG, JPG, or PDF documents.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shrink-0">
          <ShieldCheck className="w-4 h-4" />
          <span>Real Server Rendering (No File Renaming)</span>
        </div>
      </div>

      {/* Interactive Sample Bar */}
      {onSelectSample && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-blue-200 dark:border-blue-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-black uppercase text-[#2563EB] dark:text-blue-400">
              Try Sample Documents:
            </span>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Test real document conversion without uploading your own file:
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => onSelectSample(btn.key)}
                id={`universal-sample-btn-${btn.key}`}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-blue-950 text-xs font-bold text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] shadow-xs flex items-center gap-1.5 transition-all hover:scale-105"
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterCategory === cat.id
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-50 dark:bg-[#0B1120] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-[#1E293B]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Capabilities Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-sm text-[#64748B]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
          <span>Loading Universal Export Matrix...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cap) => {
            const isSupported = cap.status === 'supported';
            return (
              <div
                key={cap.inputFormat}
                id={`universal-card-${cap.inputFormat}`}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isSupported
                    ? 'bg-slate-50/70 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]'
                    : 'bg-slate-50/40 dark:bg-[#070B14] border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xs">
                        {getFormatIcon(cap.inputFormat)}
                      </div>
                      <div>
                        <span className="text-sm font-black uppercase text-[#0F172A] dark:text-[#F8FAFC]">
                          .{cap.inputFormat}
                        </span>
                        <p className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                          {cap.name}
                        </p>
                      </div>
                    </div>

                    {isSupported ? (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" /> Live
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40">
                        <Lock className="w-3 h-3" /> Coming Soon
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    {cap.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Render Engine:</span>
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{cap.renderer}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Multi-Page:</span>
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {cap.multiPageSupport ? 'Yes (ZIP / Range)' : 'Single Page'}
                    </span>
                  </div>

                  {isSupported && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] mr-1">
                        Exports to:
                      </span>
                      {cap.outputFormats.map((out) => (
                        <span
                          key={out}
                          className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300"
                        >
                          .{out}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
