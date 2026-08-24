import React, { useState, useEffect } from 'react';
import { Gift, Copy, Check, Users, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { PageView } from '../types.js';

interface ReferralWidgetProps {
  onUpgradeClick?: () => void;
  onNavigate?: (view: PageView) => void;
}

export const ReferralWidget: React.FC<ReferralWidgetProps> = ({ onUpgradeClick, onNavigate }) => {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{
    referralCode: string;
    totalReferred: number;
    qualifiedReferrals: number;
    bonusConversionsAvailable: number;
    maxMonthlyBonus: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/referral/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data);
        }
      })
      .catch(() => {});
  }, []);

  const referralCode = stats?.referralCode || 'CONVERTX-FREE';
  const siteUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://convert-x.onrender.com';
  const referralUrl = `${siteUrl}/?ref=${referralCode}`;

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] p-6 shadow-sm space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Refer Friends & Earn Conversions
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  Active Reward
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Earn +1 daily bonus conversion for every friend who completes their first conversion on Convert-X.
              </p>
            </div>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('referral')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white transition-colors cursor-pointer shrink-0"
          >
            <span>Full Program</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Referral Link Bar */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex-1 flex items-center bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2 text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] truncate select-all">
          <span className="truncate">{referralUrl}</span>
        </div>
        <button
          onClick={handleCopyCode}
          className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Invite Link</span>
            </>
          )}
        </button>
      </div>

      {/* Stats and Reward Tier Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-xs">
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">
            Friends Invited
          </span>
          <p className="text-lg font-black text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
            {stats?.totalReferred ?? 0}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-xs">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
            Qualified Conversions
          </span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats?.qualifiedReferrals ?? 0}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-xs">
          <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 uppercase">
            Bonus Daily Quota
          </span>
          <p className="text-lg font-black text-[#2563EB] dark:text-blue-400 mt-0.5">
            +{stats?.bonusConversionsAvailable ?? 0} / day
          </p>
        </div>
      </div>
    </div>
  );
};
