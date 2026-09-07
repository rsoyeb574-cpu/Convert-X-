import React from 'react';
import { PageView } from '../types.js';
import { getPopularTools, ToolItem } from '../data/toolRegistry.js';
import { ToolCard } from './ToolCard.js';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PopularToolsSectionProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const PopularToolsSection: React.FC<PopularToolsSectionProps> = ({ onNavigate }) => {
  const popularTools = getPopularTools().slice(0, 6);

  const handleOpenTool = (tool: ToolItem) => {
    if (tool.status === 'coming-soon') {
      onNavigate('tools');
      return;
    }

    if (tool.route.view === 'seo' && tool.route.seoSlug) {
      onNavigate('seo', tool.route.seoSlug);
    } else {
      onNavigate(tool.route.view);
    }
  };

  return (
    <section className="space-y-6" id="popular-tools-section">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Essential Utilities</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Popular Tools
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Quickly jump into our most frequently used conversion and editing studios.
          </p>
        </div>

        <button
          onClick={() => onNavigate('tools')}
          id="home-view-all-tools-btn"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-bold transition-all group"
        >
          <span>View All Tools (40+)</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {popularTools.map((tool) => (
          <ToolCard key={`home-pop-${tool.id}`} tool={tool} onOpenTool={handleOpenTool} />
        ))}
      </div>
    </section>
  );
};
