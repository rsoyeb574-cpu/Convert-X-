import React from 'react';
import { Sparkles, AlertCircle, ArrowRight, HardDrive, CheckCircle } from 'lucide-react';
import { AppLimits, PageView } from '../types.js';

interface UsageWidgetProps {
  usedToday: number;
  limits: AppLimits;
  onNavigate: (view: PageView) => void;
  compact?: boolean;
}

export const UsageWidget: React.FC<UsageWidgetProps> = ({
  usedToday,
  limits,
  onNavigate,
  compact = false,
}) => {
  const maxConversions = limits.dailyConversions || 10;
  const remaining = Math.max(0, maxConversions - usedToday);
  const isLimitReached = usedToday >= maxConversions;
  const percentage = Math.min(100, Math.round((usedToday / maxConversions) * 100));

  if (compact) {
    return (
      <div
        onClick={() => onNavigate('pricing')}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold border cursor-pointer transition-all hover:scale-[1.02] ${
          isLimitReached
            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            : 'bg-slate-50 dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]'
        }`}
        title={`Conversions today: ${usedToday}/${maxConversions}. Max file size: ${limits.maxFileSizeMB}MB.`}
      >
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span>
          Conversions today: <strong className="font-bold">{usedToday}</strong> / {maxConversions}
        </span>
        {isLimitReached ? (
          <span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-[10px] font-bold">
            Limit Reached
          </span>
        ) : (
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
            ({remaining} left)
          </span>
        )}
      </div>
    );
  }

  if (isLimitReached) {
    return (
      <div className="w-full rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-5 text-amber-900 dark:text-amber-200 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                You have reached today's free conversion limit.
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 max-w-xl">
                You have used all <strong>{maxConversions}</strong> free conversions for today ({usedToday}/{maxConversions}). Your daily quota will reset tomorrow, or you can unlock higher limits with Pro.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={() => onNavigate('pricing')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>View Pro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] p-4 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Free Plan Quota
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800/40">
              {limits.maxFileSizeMB} MB Max File Size
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span>
              Conversions today: <strong className="text-[#0F172A] dark:text-[#F8FAFC] font-bold">{usedToday}</strong> / {maxConversions}
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {remaining} remaining today
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-28 sm:w-36 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentage > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-600 to-violet-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <button
            onClick={() => onNavigate('pricing')}
            className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Upgrade</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
