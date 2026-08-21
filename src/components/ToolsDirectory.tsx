import React, { useState } from 'react';
import { PageView } from '../types.js';
import { SEO_ROUTES } from '../data/seoRoutes.js';
import {
  Wrench,
  Search,
  ArrowRight,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Minimize2,
  Cpu,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface ToolsDirectoryProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const ToolsDirectory: React.FC<ToolsDirectoryProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toolsList = Object.values(SEO_ROUTES);

  const categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'images', label: 'Image Converters' },
    { id: 'pdf', label: 'PDF & Document Tools' },
    { id: 'compression', label: 'Compression' },
    { id: 'vector', label: 'Vector & CAD' },
  ];

  const filteredTools = toolsList.filter((tool) => {
    const matchesSearch =
      tool.h1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.fromFormat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.toFormat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.shortExplanation.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'compression') {
      return tool.slug.includes('compressor');
    }
    if (selectedCategory === 'vector') {
      return tool.category === 'vector' || tool.category === 'cad';
    }
    return tool.category === selectedCategory;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-10" id="tools-directory-container">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold shadow-xs">
          <Wrench className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Online Converter Directory</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          All Free Online Conversion Tools
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          Browse our complete catalog of fast, private, and free online file converters. No registration required.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            id="tools-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools (e.g., PNG to JPG, PDF to Image, Compressor)..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-xs"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map((tool) => (
          <a
            key={tool.slug}
            href={`/${tool.slug}`}
            onClick={(e) => {
              e.preventDefault();
              if (tool.slug === 'text-to-pdf') {
                onNavigate('text-to-pdf');
              } else {
                onNavigate('seo', tool.slug);
              }
            }}
            className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                  {tool.fromFormat.toUpperCase()} → {tool.toFormat.toUpperCase()}
                </span>
                <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                  {tool.badge}
                </span>
              </div>

              <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
                <span>{tool.h1}</span>
                <ArrowUpRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#2563EB] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </h2>

              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 leading-relaxed">
                {tool.shortExplanation}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Retention</span>
              </span>
              <span className="font-bold text-[#2563EB] dark:text-blue-400 group-hover:underline flex items-center gap-1">
                <span>Open Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </a>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl space-y-3">
          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            No conversion tools match "{searchQuery}"
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
