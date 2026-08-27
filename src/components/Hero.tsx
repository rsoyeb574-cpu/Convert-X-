import React from 'react';
import { UploadZone } from './UploadZone.js';
import { PageView } from '../types.js';
import { Image, FileText, Box, ShieldCheck, Sparkles, Layers, Cpu, ArrowRight } from 'lucide-react';

interface HeroProps {
  onFileSelected?: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  onSampleSelected: (sampleKey: string) => void;
  onNavigate: (view: PageView, seoSlug?: string) => void;
  isLoading?: boolean;
  error?: string | null;
  maxFileSizeMB?: number;
  onViewPro?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onFileSelected,
  onFilesSelected,
  onSampleSelected,
  onNavigate,
  isLoading,
  error,
  maxFileSizeMB = 25,
  onViewPro,
}) => {
  const categories = [
    { name: 'Universal Export', icon: <FileText className="w-4 h-4 text-[#7C3AED]" />, desc: 'DOCX, XLSX, TXT, HTML to PNG/JPG/PDF' },
    { name: 'Images', icon: <Image className="w-4 h-4 text-[#2563EB]" />, desc: 'PNG, JPG, WEBP, GIF, BMP, TIFF' },
    { name: 'PDF Documents', icon: <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, desc: 'PDF to PNG, JPG, PDF Compilation' },
    { name: 'Vector & CAD', icon: <Box className="w-4 h-4 text-cyan-500" />, desc: 'SVG, DXF, PSD, AI to PNG, JPG, PDF' },
  ];

  const popularQuickConverters = [
    { slug: 'png-to-jpg', label: 'PNG to JPG' },
    { slug: 'jpg-to-png', label: 'JPG to PNG' },
    { slug: 'png-to-webp', label: 'PNG to WEBP' },
    { slug: 'webp-to-png', label: 'WEBP to PNG' },
    { slug: 'jpg-to-webp', label: 'JPG to WEBP' },
    { slug: 'png-to-pdf', label: 'PNG to PDF' },
    { slug: 'pdf-to-png', label: 'PDF to PNG' },
    { slug: 'jpg-to-pdf', label: 'JPG to PDF' },
    { slug: 'svg-to-png', label: 'SVG to PNG' },
    { slug: 'svg-to-pdf', label: 'SVG to PDF' },
    { slug: 'dxf-to-pdf', label: 'DXF to PDF' },
    { slug: 'dxf-to-svg', label: 'DXF to SVG' },
  ];

  return (
    <section className="relative pt-8 pb-12 sm:pt-14 sm:pb-20 overflow-hidden">
      {/* Soft abstract blue-to-violet gradient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-blue-100/60 via-violet-100/30 to-transparent dark:from-blue-950/30 dark:via-purple-950/20 dark:to-transparent pointer-events-none blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
        {/* Main Hero Headings */}
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-[11px] sm:text-xs font-bold shadow-xs max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
            <span className="truncate sm:whitespace-normal">High-Speed Online File & Image Converter</span>
          </div>

          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-tight">
            Convert Files <span className="bg-gradient-to-r from-[#2563EB] via-indigo-600 to-[#7C3AED] bg-clip-text text-transparent">Fast and Easily</span>
          </h1>

          <p className="text-sm sm:text-lg text-[#64748B] dark:text-[#94A3B8] leading-relaxed font-medium max-w-2xl mx-auto">
            Convert images and documents directly in your browser and server without complicated software.
          </p>
        </div>

        {/* Upload Zone */}
        <UploadZone
          onFileSelected={onFileSelected}
          onFilesSelected={onFilesSelected}
          onSampleSelected={onSampleSelected}
          isLoading={isLoading}
          error={error}
          maxFileSizeMB={maxFileSizeMB}
          onViewPro={onViewPro}
        />

        {/* Plan Overview Badges: Free Plan vs Pro Plan (Coming Soon) */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
          {/* Free Plan Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#2563EB] tracking-wider">Free Plan</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                Active Tier
              </span>
            </div>
            <ul className="text-xs text-[#0F172A] dark:text-[#F8FAFC] space-y-1 font-medium">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> 5 conversions/day
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> 25 MB/file
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> Maximum 5 files/batch
              </li>
            </ul>
          </div>

          {/* Pro Plan Card */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#0B1120] border border-dashed border-slate-300 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Pro Plan</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                Coming Soon
              </span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="text-slate-400">•</span> 100 MB/file size limit
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-400">•</span> Unlimited daily conversions
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-400">•</span> Up to 20 files per batch & 0 ads
              </li>
            </ul>
          </div>
        </div>

        {/* Popular Converter Quicklinks */}
        <div className="pt-2">
          <p className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-3">
            Popular Real-Time Converters
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {popularQuickConverters.map((c) => (
              <a
                key={c.slug}
                href={`/${c.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('seo', c.slug);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-blue-400 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#2563EB] transition-all shadow-2xs"
              >
                {c.label}
              </a>
            ))}
          </div>
        </div>

        {/* Category Cards */}
        <div className="pt-4">
          <p className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-4">
            Active Server-Side Processing Engines
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <div
                key={cat.name}
                onClick={() => onNavigate('formats')}
                className="p-4 rounded-2xl bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] shadow-xs hover:shadow-sm transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {cat.icon}
                  <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors">
                    {cat.name}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

