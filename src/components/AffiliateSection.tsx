import React, { useState } from 'react';
import { Sparkles, Info, Filter } from 'lucide-react';
import { AFFILIATE_TOOLS } from '../data/affiliates.js';
import { AffiliateCard } from './AffiliateCard.js';

interface AffiliateSectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  showCategoryFilter?: boolean;
}

export const AffiliateSection: React.FC<AffiliateSectionProps> = ({
  title = 'Recommended Design & Engineering Tools',
  subtitle = 'Curated industry tools for graphic design, CAD workflows, 3D modeling, and asset productivity.',
  limit,
  showCategoryFilter = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Graphic Design', 'CAD & 3D', 'Cloud Storage', 'Productivity'];

  const filteredTools = AFFILIATE_TOOLS.filter((tool) => {
    if (selectedCategory === 'all') return true;
    return tool.category === selectedCategory;
  });

  const displayTools = limit ? filteredTools.slice(0, limit) : filteredTools;

  return (
    <div className="w-full space-y-6 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Designer Toolkit</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {subtitle}
          </p>
        </div>

        {showCategoryFilter && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Tools' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayTools.map((tool) => (
          <AffiliateCard key={tool.id} tool={tool} />
        ))}
      </div>

      {/* Transparent Disclosure */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Partner Disclosure:</strong> Convert-X may receive compensation or affiliate commission from partners when you click links and make purchases. Tools are curated to assist engineering, CAD, and vector workflows. No personal endorsement is implied.
        </p>
      </div>
    </div>
  );
};
