import React from 'react';
import { Sparkles, AlertCircle, ArrowRight, HardDrive, CheckCircle, Zap, Shield, Clock } from 'lucide-react';
import { AppLimits, PageView } from '../types.js';
import { DEFAULT_LIMITS } from '../utils/usageTracker.js';

interface UsageWidgetProps {
  usedToday?: number;
  limits?: AppLimits;
  onNavigate: (view: PageView) => void;
  compact?: boolean;
}

export const UsageWidget: React.FC<UsageWidgetProps> = ({
  usedToday = 0,
  limits = DEFAULT_LIMITS,
  onNavigate,
  compact = false,
}) => {
  const safeLimits = limits || DEFAULT_LIMITS;
  const maxConversions = safeLimits?.dailyConversions ?? DEFAULT_LIMITS.dailyConversions;
  const maxFileSizeMB = safeLimits?.maxFileSizeMB ?? DEFAULT_LIMITS.maxFileSizeMB;
  const safeUsedToday = typeof usedToday === 'number' && !isNaN(usedToday) ? Math.max(0, usedToday) : 0;
  const remaining = Math.max(0, maxConversions - safeUsedToday);
  const isLimitReached = safeUsedToday >= maxConversions;
  const isNearLimit = safeUsedToday >= Math.max(1, maxConversions - 3) && !isLimitReached;
  const percentage = Math.min(100, Math.round((safeUsedToday / (maxConversions || 1)) * 100));

  if (compact) {
    return (
      <div
        onClick={() => onNavigate('pricing')}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all hover:scale-[1.02] ${
          isLimitReached
            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            : isNearLimit
            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
            : 'bg-slate-50 dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]'
        }`}
        title={`Conversions today: ${safeUsedToday}/${maxConversions}. Free file size limit: ${maxFileSizeMB}MB.`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isLimitReached ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'
          }`}
        />
        <span>
          Plan: <strong>Free</strong> ({safeUsedToday}/{maxConversions})
        </span>
        {isLimitReached ? (
          <span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-[10px] font-bold">
            Limit Reached
          </span>
        ) : (
          <span className="text-[10px] text-[#2563EB] dark:text-blue-400 font-bold flex items-center gap-0.5">
            <span>Upgrade</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
    );
  }

  // When Limit is reached (Requirement 8)
  if (isLimitReached) {
    return (
      <div className="w-full rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/30 p-5 text-amber-900 dark:text-amber-200 shadow-sm transition-colors">
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
                You have used all <strong>{maxConversions} of {maxConversions}</strong> free conversions for today. Your daily limit resets at midnight, or you can unlock unlimited conversions with Pro.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={() => onNavigate('converter')}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-amber-200 dark:border-amber-800/40 hover:bg-slate-50 transition-colors"
            >
              Try again tomorrow
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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

  // When approaching limit (Requirement 8)
  if (isNearLimit) {
    return (
      <div className="w-full rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 sm:p-5 text-blue-900 dark:text-blue-200 shadow-sm transition-colors space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
                Plan: Free
              </span>
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                File limit: {maxFileSizeMB} MB
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
              You have used {safeUsedToday} of {maxConversions} free conversions today.
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Only {remaining} {remaining === 1 ? 'conversion' : 'conversions'} remaining today. Upgrade to Pro for unlimited files and 100MB uploads.
            </p>
          </div>

          <button
            onClick={() => onNavigate('pricing')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade to Pro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-blue-100 dark:bg-blue-900/40 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  // Standard Usage Card (Requirement 9)
  return (
    <div className="w-full rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] p-4 sm:p-5 shadow-sm transition-colors space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-wider">
              Plan: Free
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              File size limit: <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{maxFileSizeMB} MB</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span>
              Today's conversions: <strong className="text-[#0F172A] dark:text-[#F8FAFC] font-bold">{safeUsedToday} / {maxConversions}</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {remaining} remaining
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-24 sm:w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <button
            onClick={() => onNavigate('pricing')}
            className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0 border border-blue-200 dark:border-blue-800/40"
          >
            <span>Upgrade to Pro</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
