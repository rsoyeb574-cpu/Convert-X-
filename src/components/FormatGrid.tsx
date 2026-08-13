import React, { useState } from 'react';
import { FormatCapability } from '../types.js';
import { Search, CheckCircle2, Lock, Box, Image as ImageIcon, FileText, Layers, Sparkles, Cpu } from 'lucide-react';

interface FormatGridProps {
  capabilities: FormatCapability[];
  onSelectFormat?: (ext: string) => void;
}

export const FormatGrid: React.FC<FormatGridProps> = ({ capabilities, onSelectFormat }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', name: 'All Formats', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'images', name: 'Images', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'pdf', name: 'PDF', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'vector', name: 'Vector', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'cad', name: 'CAD / Architecture', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'adobe', name: 'Adobe Suite', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'corel', name: 'Corel', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: '3d', name: '3D Formats', icon: <Cpu className="w-3.5 h-3.5" /> },
  ];

  const filtered = capabilities.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`format-tab-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-[#1E293B]'
              }`}
            >
              {cat.icon}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="format-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search formats e.g. DXF, PNG, PSD..."
            className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B] dark:placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Grid Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const isSupported = item.status === 'supported';
          return (
            <div
              key={item.id}
              id={`format-card-${item.extension}`}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isSupported
                  ? 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] shadow-md hover:shadow-lg'
                  : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] opacity-80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                      .{item.extension}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700">
                      {item.category}
                    </span>
                  </div>

                  {isSupported ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-3 h-3" /> Active Engine
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40">
                      <Lock className="w-3 h-3" /> Coming Soon
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.name}</h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">{item.description}</p>
              </div>

              {/* Bottom Details */}
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
                {isSupported ? (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block mb-1">
                      Supported Export Targets:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.supportedOutputs.map((out) => (
                        <span
                          key={out}
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400"
                        >
                          → .{out}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    Engine Extension: {item.requiresEngine}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[#64748B] dark:text-[#94A3B8] text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl">
          No formats matched your search query "{searchQuery}".
        </div>
      )}
    </div>
  );
};
