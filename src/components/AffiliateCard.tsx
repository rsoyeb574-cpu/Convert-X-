import React from 'react';
import { ExternalLink, Sparkles, Check } from 'lucide-react';
import { AffiliateTool } from '../types.js';

interface AffiliateCardProps {
  tool: AffiliateTool;
}

export const AffiliateCard: React.FC<AffiliateCardProps> = ({ tool }) => {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">{tool.name}</h4>
              {tool.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                  {tool.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              {tool.category}
            </span>
          </div>

          {tool.isAffiliate ? (
            <span
              title="Convert-X may earn a commission from purchases made via this partner link at no additional cost to you."
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] shrink-0"
            >
              Affiliate link
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] shrink-0">
              Community Tool
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          {tool.description}
        </p>

        {/* Feature bullets */}
        <ul className="space-y-1.5 pt-1 text-[11px] text-[#0F172A] dark:text-[#F8FAFC]">
          {tool.features.map((feat, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer / CTA */}
      <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-3">
        {tool.discountText ? (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {tool.discountText}
          </span>
        ) : (
          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Official Partner Site</span>
        )}

        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-[#2563EB] dark:hover:text-blue-400 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] transition-colors shrink-0"
        >
          <span>Explore</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
