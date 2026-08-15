import React from 'react';
import { PageView } from '../types.js';
import {
  Layers,
  ShieldCheck,
  Zap,
  Lock,
  Cpu,
  Server,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AboutPageProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-12" id="about-page-container">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold shadow-xs">
          <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>About Convert-X</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          Fast, Ephemeral, and Private File Conversion
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          Convert-X was built to solve the frustration of slow, ad-cluttered, and insecure online file converters. We process your files directly on dedicated high-speed server engines and delete them immediately after conversion.
        </p>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">High-Speed Server Engine</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Powered by high-performance C++ binaries (Sharp/libvips, Node-Canvas, and pdf-lib) running on multi-core servers for sub-second conversions.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Zero-Retention Architecture</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Your files are processed in ephemeral memory buffers. They are automatically purged immediately after download or within a maximum of 15 minutes.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">256-bit TLS Encryption</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            All uploads and downloads are transmitted through secure, authenticated HTTPS/TLS connections. We never inspect or sell your file contents.
          </p>
        </div>
      </div>

      {/* Technical Infrastructure Deep Dive */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        <div className="space-y-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-[#2563EB]" />
            <span>How the Convert-X Engine Works</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Unlike client-side browser hacks that crash on large files or alter color spaces, Convert-X uses professional server-side codecs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5">
            <span className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Raster Optimization with Sharp / libvips</span>
            </span>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Provides multi-threaded color quantization, alpha channel preservation, and MozJPEG compression for ultra-clean images.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5">
            <span className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Hardware Canvas Vector Rasterization</span>
            </span>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Uses Node-Canvas with Cairo backends to rasterize PDF documents and vector files up to 300 DPI Ultra-HD without blurry fonts.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5">
            <span className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Structured PDF Assembly with pdf-lib</span>
            </span>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Constructs standards-compliant PDF documents with custom margins, paper sizes (A4, Letter), and losslessly embedded streams.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5">
            <span className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Crash-Resistant Worker Queue</span>
            </span>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Durable asynchronous job queue with automated retry recovery ensures that conversions never fail silently.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Ready to convert your first file?
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Launch Converter</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('tools')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Browse All Tools
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
