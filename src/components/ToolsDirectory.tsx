import React, { useState, useMemo, useEffect } from 'react';
import { PageView } from '../types.js';
import {
  ToolItem,
  ToolCategory,
  CATEGORY_DEFINITIONS,
  searchToolRegistry,
  getPopularTools,
  getAllFormatsList,
} from '../data/toolRegistry.js';
import { ToolCard } from './ToolCard.js';
import {
  Wrench,
  Search,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface ToolsDirectoryProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const ToolsDirectory: React.FC<ToolsDirectoryProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [comingSoonTool, setComingSoonTool] = useState<ToolItem | null>(null);
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);

  // Load recent tools from history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('convertx_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ids: string[] = [];
          parsed.slice(0, 8).forEach((item: any) => {
            const out = (item.outputFormat || '').toLowerCase();
            const inp = (item.inputFormat || item.fileName || '').toLowerCase();

            if (item.action === 'compress' || out.includes('compress')) {
              ids.push('file-compressor');
            } else if (item.action === 'pdf-to-text' || out.includes('pdf-to-text')) {
              ids.push('pdf-to-text');
            } else if (item.action === 'text-to-pdf' || out.includes('text-to-pdf')) {
              ids.push('text-to-pdf');
            } else if (item.action === 'tts' || out.includes('tts') || out.includes('mp3')) {
              ids.push('text-to-voice');
            } else if (inp.includes('png') && out.includes('jpg')) {
              ids.push('png-to-jpg');
            } else if (inp.includes('jpg') && out.includes('png')) {
              ids.push('jpg-to-png');
            } else if (inp.includes('pdf') && out.includes('png')) {
              ids.push('pdf-to-png');
            } else if (inp.includes('dxf')) {
              ids.push('dxf-to-pdf');
            } else if (inp.includes('psd')) {
              ids.push('psd-to-png');
            } else {
              ids.push('converter-workspace');
            }
          });
          setRecentToolIds(Array.from(new Set(ids)).slice(0, 4));
        }
      }
    } catch (e) {
      console.warn('Failed to parse recent history for tools directory', e);
    }
  }, []);

  // Filter tools based on search, category, and format filter
  const filteredTools = useMemo(() => {
    return searchToolRegistry(searchQuery, selectedCategory, selectedFormat);
  }, [searchQuery, selectedCategory, selectedFormat]);

  // Popular tools list
  const popularTools = useMemo(() => {
    return getPopularTools().slice(0, 6);
  }, []);

  // Format options for quick pill filtering
  const popularFormats = useMemo(() => {
    return ['all', 'PDF', 'PNG', 'JPG', 'WEBP', 'SVG', 'PSD', 'AI', 'DXF', 'DOCX', 'MP3'];
  }, []);

  // Handle opening a tool
  const handleOpenTool = (tool: ToolItem) => {
    if (tool.status === 'coming-soon') {
      setComingSoonTool(tool);
      return;
    }

    // Persist tool usage in recent list
    setRecentToolIds((prev) => [tool.id, ...prev.filter((id) => id !== tool.id)].slice(0, 4));

    if (tool.route.view === 'seo' && tool.route.seoSlug) {
      onNavigate('seo', tool.route.seoSlug);
    } else {
      onNavigate(tool.route.view);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedFormat('all');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8" id="tools-directory-container">
      {/* 1. Header Section */}
      <div className="text-center space-y-3 max-w-3xl mx-auto pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold shadow-xs">
          <Wrench className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Convert-X Tool Center</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          All Tools
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
          Everything you need to convert, compress, edit and create.
        </p>
      </div>

      {/* 2. Prominent Real-time Search Box */}
      <div className="max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-[#2563EB] transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="tools-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools... (e.g. PDF, compress, voice, PSD, DOCX)"
            aria-label="Search all tools"
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 text-sm font-medium text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 shadow-sm focus:shadow-md transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Category & Format Filters */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap" role="tablist" aria-label="Tool Categories">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-800 hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Format Filter Pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Format:</span>
          </span>
          {popularFormats.map((fmt) => {
            const isActive = selectedFormat === fmt;
            return (
              <button
                key={`fmt-${fmt}`}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {fmt === 'all' ? 'All Formats' : fmt}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Recent & Popular Quick Section (Only shown when no search query active) */}
      {!searchQuery && selectedCategory === 'all' && selectedFormat === 'all' && (
        <div className="space-y-6 pt-2">
          {recentToolIds.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Recently Visited Tools</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {recentToolIds.map((id) => {
                  const tool = searchToolRegistry(id)[0];
                  if (!tool) return null;
                  return (
                    <ToolCard
                      key={`recent-${tool.id}`}
                      tool={tool}
                      onOpenTool={handleOpenTool}
                      isRecent={true}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Popular Tools Highlights */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Popular Tools</span>
              </div>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Most frequently used utilities
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {popularTools.map((tool) => (
                <ToolCard key={`popular-${tool.id}`} tool={tool} onOpenTool={handleOpenTool} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Tool Grid (Responsive: 1 col mobile, 2 col tablet, 3-4 col desktop) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] pb-1 border-b border-slate-200 dark:border-slate-800">
          <span>
            Showing <strong className="text-[#0F172A] dark:text-white">{filteredTools.length}</strong>{' '}
            {filteredTools.length === 1 ? 'tool' : 'tools'}
            {searchQuery && ` for "${searchQuery}"`}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
            {selectedFormat !== 'all' && ` (${selectedFormat})`}
          </span>

          {(searchQuery || selectedCategory !== 'all' || selectedFormat !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="text-[#2563EB] dark:text-blue-400 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredTools.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-[#111827]">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                No matching tools found
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
                No tools matched &quot;{searchQuery}&quot;. Try searching for general terms like &quot;PDF&quot;,
                &quot;compress&quot;, &quot;image&quot;, or &quot;voice&quot;.
              </p>
            </div>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm"
            >
              Clear Search & View All Tools
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onOpenTool={handleOpenTool} />
            ))}
          </div>
        )}
      </div>

      {/* 6. Coming Soon Modal */}
      {comingSoonTool && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="coming-soon-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <button
              onClick={() => setComingSoonTool(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                In Active Engineering
              </span>
              <h2 id="coming-soon-title" className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                {comingSoonTool.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                {comingSoonTool.description}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                This tool is currently under active development as part of the Convert-X server engine rollout.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setComingSoonTool(null);
                  onNavigate('converter');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-colors text-center flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Try Converter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setComingSoonTool(null)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold transition-colors"
              >
                Back to Tools
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
