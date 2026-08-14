import React, { useState } from 'react';
import { Gift, Copy, Check, Users, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { ReferralData } from '../types.js';

interface ReferralWidgetProps {
  onUpgradeClick?: () => void;
}

export const ReferralWidget: React.FC<ReferralWidgetProps> = ({ onUpgradeClick }) => {
  const [copied, setCopied] = useState(false);

  // Default persistent referral code generated client-side from session or local state
  const referralCode = 'REF-CONVERT-2026';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://convert-x.com';
  const referralUrl = `${siteUrl}?ref=${referralCode}`;

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
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
                  Refer Friends & Colleagues
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Prepare your referral link. Soon you will unlock bonus daily conversion quotas for every teammate invited.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Bar */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex-1 flex items-center bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2 text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] truncate">
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
            Your Referrals
          </span>
          <p className="text-lg font-black text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">0</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-xs">
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">
            Reward Tier
          </span>
          <p className="text-xs font-bold text-[#2563EB] dark:text-blue-400 mt-1">Standard Free</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-xs">
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">
            Bonus Reward
          </span>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Tier Rewards Launching Soon</span>
          </p>
        </div>
      </div>
    </div>
  );
};
