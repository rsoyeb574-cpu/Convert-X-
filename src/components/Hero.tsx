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
    { name: 'Images', icon: <Image className="w-4 h-4 text-[#2563EB]" />, desc: 'PNG, JPG, WEBP' },
    { name: 'PDF', icon: <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, desc: 'PDF to PNG, JPG, PDF Compilation' },
    { name: 'Vector', icon: <Box className="w-4 h-4 text-cyan-500" />, desc: 'SVG to PNG, JPG, PDF' },
    { name: 'CAD', icon: <Layers className="w-4 h-4 text-amber-500" />, desc: 'DXF Architectural CAD to PDF' },
  ];

  const popularQuickConverters = [
    { slug: 'png-to-jpg', label: 'PNG to JPG' },
    { slug: 'jpg-to-png', label: 'JPG to PNG' },
    { slug: 'png-to-webp', label: 'PNG to WEBP' },
    { slug: 'jpg-to-webp', label: 'JPG to WEBP' },
    { slug: 'webp-to-png', label: 'WEBP to PNG' },
    { slug: 'png-to-pdf', label: 'PNG to PDF' },
    { slug: 'jpg-to-pdf', label: 'JPG to PDF' },
    { slug: 'pdf-to-png', label: 'PDF to PNG' },
    { slug: 'svg-to-png', label: 'SVG to PNG' },
    { slug: 'svg-to-pdf', label: 'SVG to PDF' },
  ];

  return (
    <section className="relative pt-8 pb-12 sm:pt-14 sm:pb-20 overflow-hidden">
      {/* Soft abstract blue-to-violet gradient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-blue-100/60 via-violet-100/30 to-transparent dark:from-blue-950/30 dark:via-purple-950/20 dark:to-transparent pointer-events-none blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
        {/* Main Hero Headings */}
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>High-Speed Online File Converter & Image Converter</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-tight">
            Universal Online <span className="bg-gradient-to-r from-[#2563EB] via-indigo-600 to-[#7C3AED] bg-clip-text text-transparent">Design File Converter</span>
          </h1>

          <p className="text-base sm:text-lg text-[#64748B] dark:text-[#94A3B8] leading-relaxed font-medium max-w-2xl mx-auto">
            Convert images, PDFs, vector blueprints and CAD drawings with server-side vector rendering. Fast, secure, and easy to use with Convert-X.
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
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

