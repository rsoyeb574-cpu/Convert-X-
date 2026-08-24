import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Twitter,
  Linkedin,
  MessageCircle,
  Sparkles,
  Gift,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { PageView } from '../types.js';
import { AdSlot } from './AdSlot.js';

interface ReferralPageProps {
  referralCode?: string;
  onNavigate?: (view: PageView) => void;
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

interface ReferralStats {
  referralCode: string;
  totalReferred: number;
  qualifiedReferrals: number;
  monthlyBonusEarned: number;
  maxMonthlyBonus: number;
  bonusConversionsAvailable: number;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({
  referralCode: initialCode,
  onNavigate,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/referral/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const activeCode = stats?.referralCode || initialCode || 'CONVERTX-SHARE';
  const siteUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://convert-x.onrender.com';
  const referralLink = `${siteUrl}/?ref=${activeCode}`;

  const shareText = `Convert files online with zero file retention on Convert-X. Use my link to get fast, secure conversions:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      onToast?.('Referral Link Copied!', 'Share it with your teammates and friends.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Convert-X File Converter',
          text: shareText,
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Gift className="w-3.5 h-3.5" />
          <span>Convert-X Referral Program</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          Invite Friends & Earn Free Conversions
        </h1>
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto">
          Share your referral link with colleagues and friends. Whenever a friend completes their first qualifying conversion, you receive <strong className="text-[#0F172A] dark:text-white">+1 bonus conversion</strong> for the day.
        </p>
      </div>

      {/* Referral Link Box Card */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Your Personal Referral Link
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] font-mono text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center select-all truncate">
              {referralLink}
            </div>
            <button
              onClick={handleCopyLink}
              id="copy-referral-link-btn"
              className="px-6 py-3 rounded-2xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block">
            1-Click Social Sharing
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-emerald-300 text-xs font-semibold text-[#0F172A] dark:text-white flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-blue-300 text-xs font-semibold text-[#0F172A] dark:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="w-4 h-4 text-blue-500" />
              <span>Telegram</span>
            </a>

            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-sky-300 text-xs font-semibold text-[#0F172A] dark:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Twitter className="w-4 h-4 text-sky-500" />
              <span>Twitter / X</span>
            </a>

            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-blue-300 text-xs font-semibold text-[#0F172A] dark:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Linkedin className="w-4 h-4 text-blue-600" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live Referral Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Referred */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-lg space-y-1">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
            Friends Invited
          </span>
          <div className="text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            {isLoading ? '...' : stats?.totalReferred || 0}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Total friends who joined via your link
          </p>
        </div>

        {/* Qualified Referrals */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-lg space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Qualified Actions
          </span>
          <div className="text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
            {isLoading ? '...' : stats?.qualifiedReferrals || 0}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Friends who finished their 1st conversion
          </p>
        </div>

        {/* Bonus Conversions Available */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-lg space-y-1">
          <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 uppercase tracking-wider block">
            Bonus Conversions
          </span>
          <div className="text-3xl font-black text-[#2563EB] dark:text-blue-400">
            {isLoading ? '...' : `+${stats?.bonusConversionsAvailable || 0} / day`}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Capped at max +5 bonus / month
          </p>
        </div>
      </div>

      {/* How It Works Steps */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
          How Convert-X Referrals Work
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#2563EB] font-black text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">Share Your Link</h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Send your referral link to friends, designers, architects, or students who need quick file conversion.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 font-black text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">Friend Converts File</h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              When your referred friend completes their first real file conversion, the referral qualifies automatically.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 font-black text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">Receive Bonus Quota</h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Your daily conversion limit expands with +1 free conversion credit (up to 5 bonus conversions every month).
            </p>
          </div>
        </div>

        {/* Anti-Abuse Integrity Badge */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Strict integrity policy: Referrals are only credited when genuine unique users convert files. Self-referrals and automated bots are automatically rejected by the server.
          </span>
        </div>
      </div>

      {/* AdSlot */}
      <AdSlot slotId="referral-page-slot" format="banner" />
    </div>
  );
};
