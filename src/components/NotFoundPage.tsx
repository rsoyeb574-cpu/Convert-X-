import React from 'react';
import { PageView } from '../types.js';
import { FileQuestion, ArrowRight, Home, Wrench, Sparkles } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const popularTools = [
    { slug: 'png-to-jpg', title: 'PNG to JPG Converter' },
    { slug: 'jpg-to-png', title: 'JPG to PNG Converter' },
    { slug: 'image-to-pdf', title: 'Image to PDF Converter' },
    { slug: 'pdf-to-png', title: 'PDF to PNG Converter' },
    { slug: 'image-compressor', title: 'Image Compressor' },
    { slug: 'pdf-compressor', title: 'PDF Compressor' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 text-center py-8 sm:py-16" id="not-found-container">
      <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
        <FileQuestion className="w-8 h-8" />
      </div>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] text-xs font-bold">
          <span>Error 404</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
          The file conversion tool or page you are looking for does not exist or may have been moved.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onNavigate('home')}
          className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home Workspace</span>
        </button>
        <button
          onClick={() => onNavigate('tools')}
          className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Wrench className="w-4 h-4 text-[#2563EB]" />
          <span>Browse Tools Directory</span>
        </button>
      </div>

      {/* Popular Conversion Tools */}
      <div className="pt-8 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-4">
        <h2 className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
          Popular Working Converters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {popularTools.map((tool) => (
            <a
              key={tool.slug}
              href={`/${tool.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate('seo', tool.slug);
              }}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-blue-500 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#2563EB] dark:hover:text-blue-400 flex items-center justify-between transition-colors group shadow-xs"
            >
              <span>{tool.title}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-transform" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
