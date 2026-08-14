import React from 'react';

interface AdPlaceholderProps {
  slotId?: string;
  format?: 'leaderboard' | 'rectangle' | 'banner' | 'in-feed';
  className?: string;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({
  slotId,
  format = 'leaderboard',
  className = '',
}) => {
  return (
    <div
      className={`w-full my-6 flex flex-col items-center justify-center ${className}`}
      data-ad-slot={slotId || 'placeholder-slot'}
    >
      <div className="w-full max-w-4xl rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#334155] bg-slate-50/60 dark:bg-[#0F172A]/40 px-4 py-5 sm:py-6 text-center transition-colors">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-[10px] font-bold tracking-widest text-[#64748B] dark:text-[#94A3B8] uppercase mb-2">
          <span>Advertisement</span>
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
          Reserved responsive ad placement for verified Google AdSense / Sponsor network.
        </p>
      </div>
    </div>
  );
};
