import React, { useState } from 'react';
import { PageView } from '../types.js';
import { UploadZone } from './UploadZone.js';
import { SeoRouteConfig, SEO_ROUTES } from '../data/seoRoutes.js';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Lock,
  FileCheck,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowUpRight,
  Info,
  Clock,
  HardDrive,
} from 'lucide-react';

interface SeoLandingPageProps {
  slug: string;
  onFileSelected?: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  onSampleSelected: (sampleKey: string) => void;
  onNavigate: (view: PageView, seoSlug?: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const SeoLandingPage: React.FC<SeoLandingPageProps> = ({
  slug,
  onFileSelected,
  onFilesSelected,
  onSampleSelected,
  onNavigate,
  isLoading,
  error,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Fallback to png-to-jpg if slug not found
  const cleanSlug = slug.replace(/^seo-/, '');
  const config: SeoRouteConfig = SEO_ROUTES[cleanSlug] || SEO_ROUTES['png-to-jpg'];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <article className="space-y-16 max-w-5xl mx-auto">
      {/* 1. Hero Header */}
      <header className="text-center max-w-3xl mx-auto space-y-4 pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{config.badge}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          {config.h1}
        </h1>

        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
          {config.shortExplanation}
        </p>

        {/* Supported Input / Output Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8]">Input:</span>
            <span className="text-[#2563EB] font-bold">.{config.fromFormat.toUpperCase()}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8]" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            <span className="text-emerald-600/70 dark:text-emerald-400/70">Output:</span>
            <span className="font-bold">.{config.toFormat.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Upload Box */}
      <section aria-label="Upload Converter Zone">
        <UploadZone
          onFileSelected={onFileSelected}
          onFilesSelected={onFilesSelected}
          onSampleSelected={onSampleSelected}
          isLoading={isLoading}
          error={error}
        />
      </section>

      {/* 3. Key Feature Bullets */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-4">
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#2563EB]" />
            <span>Why Use Convert-X for {config.fromFormat.toUpperCase()} to {config.toFormat.toUpperCase()}?</span>
          </h2>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40 hidden sm:inline-block">
            100% Real Server Processing
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.features.map((feat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                {feat}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Step-by-Step "How to Use" Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            How to Convert {config.fromFormat.toUpperCase()} to {config.toFormat.toUpperCase()}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Four quick steps to transform and download your file in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.howToUse.map((step) => (
            <div
              key={step.step}
              className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs relative space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                  {step.step}
                </div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {step.title}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Unique Format Comparison & Benefits */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            {config.whyConvert.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {config.whyConvert.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {config.whyConvert.points.map((pt, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5"
            >
              <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {pt.title}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                {pt.text}
              </p>
            </div>
          ))}
        </div>

        {/* Technical Side-by-Side Comparison Table */}
        <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            Technical Specification Comparison
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
              <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                {config.comparison.fromTitle}
              </span>
              <ul className="space-y-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                {config.comparison.fromPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {config.comparison.toTitle}
              </span>
              <ul className="space-y-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                {config.comparison.toPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Privacy & Security Explanation */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Enterprise Zero-Retention Security Guarantee
              </h2>
              <p className="text-xs text-slate-300">
                Your private images, documents, and graphics remain 100% confidential.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/40 shrink-0">
            <Lock className="w-4 h-4" />
            <span>256-bit TLS Encrypted</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
            <span className="font-bold text-white block">Instant Memory Scrubbing</span>
            <p className="text-slate-400">Temporary processing files are purged from disk and memory buffers immediately after conversion.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
            <span className="font-bold text-white block">No User Tracking or Logs</span>
            <p className="text-slate-400">We never store your personal identifiers, IP logs, file contents, or rendered metadata.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
            <span className="font-bold text-white block">No Account Registration</span>
            <p className="text-slate-400">Use all basic converters completely free without providing email addresses or credentials.</p>
          </div>
        </div>
      </section>

      {/* 7. Unique Frequently Asked Questions (FAQ) */}
      <section className="space-y-4">
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Specific questions about {config.fromFormat.toUpperCase()} to {config.toFormat.toUpperCase()} conversion.
          </p>
        </div>

        <div className="space-y-3">
          {config.faq.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#2563EB]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Related Converters (Internal Linking) */}
      <section className="space-y-4 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Related File Converters
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Discover more fast converters for your design, photo, and vector workflows.
            </p>
          </div>
          <button
            onClick={() => onNavigate('formats')}
            className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <span>View All Supported Formats</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {config.relatedSlugs.map((relSlug) => {
            const relConfig = SEO_ROUTES[relSlug];
            if (!relConfig) return null;
            return (
              <a
                key={relSlug}
                href={`/${relSlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('seo', relSlug);
                }}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-blue-500 shadow-xs transition-all group flex flex-col justify-between block"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors">
                      {relConfig.fromFormat.toUpperCase()} → {relConfig.toFormat.toUpperCase()}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-1">
                    {relConfig.h1}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </article>
  );
};
