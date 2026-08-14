import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  HelpCircle,
  Clock,
  ArrowRight,
  Info,
  Layers,
  FileCheck,
  Lock,
  Mail,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AppLimits, MonetizationConfig, PageView } from '../types.js';
import { DEFAULT_LIMITS, DEFAULT_MONETIZATION } from '../utils/usageTracker.js';
import { AffiliateSection } from './AffiliateSection.js';
import { AdSlot } from './AdSlot.js';

interface PricingPageProps {
  limits?: AppLimits;
  monetization?: MonetizationConfig;
  usedToday?: number;
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  limits = DEFAULT_LIMITS,
  monetization = DEFAULT_MONETIZATION,
  usedToday = 0,
  onNavigate,
}) => {
  const safeLimits = limits || DEFAULT_LIMITS;
  const safeMonetization = monetization || DEFAULT_MONETIZATION;
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const isPaymentConfigured = safeMonetization?.paymentConfigured ?? false;
  const configuredProPrice = safeMonetization?.pricing?.pro?.formattedPrice || '₹199';

  const safeDailyConversions = safeLimits?.dailyConversions ?? DEFAULT_LIMITS.dailyConversions;
  const safeMaxFileSizeMB = safeLimits?.maxFileSizeMB ?? DEFAULT_LIMITS.maxFileSizeMB;
  const safeMaxPdfPages = safeLimits?.maxPdfPages ?? DEFAULT_LIMITS.maxPdfPages;
  const safeUsedToday = typeof usedToday === 'number' && !isNaN(usedToday) ? Math.max(0, usedToday) : 0;

  const freeLimits = {
    maxSize: `${safeMaxFileSizeMB} MB`,
    daily: `${safeDailyConversions} conversions / day`,
    pdfPages: `${safeMaxPdfPages} pages max`,
  };

  const proPrice = billingPeriod === 'monthly' ? configuredProPrice : '₹1,990';
  const proSubtext = billingPeriod === 'monthly' ? '/ month' : '/ year (save 17%)';

  const handleProAction = () => {
    if (!isPaymentConfigured) {
      setShowNotifyModal(true);
    } else {
      // Future real payment provider checkout redirect
    }
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (notifyEmail.trim()) {
      setNotifySubmitted(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 transition-colors">
      {/* Header Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simple, Honest Plans</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Convert More. Work Faster.
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          Start for free with standard everyday conversions, or upgrade to Pro for higher 100MB file capacities, unlimited daily volume, batch queue management, and priority processing.
        </p>

        {/* Billing Switcher */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                billingPeriod === 'monthly'
                  ? 'bg-white dark:bg-[#111827] text-[#2563EB] dark:text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                billingPeriod === 'yearly'
                  ? 'bg-white dark:bg-[#111827] text-[#2563EB] dark:text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                -17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* FREE PLAN */}
        <div className="rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] p-8 shadow-sm flex flex-col justify-between space-y-6 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Free</h3>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold">
                  Active Plan
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                For casual everyday users needing quick document, raster, and vector conversions.
              </p>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">₹0</span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">/ forever</span>
            </div>

            {/* Quota status */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-[#0F172A] dark:text-[#F8FAFC]">Your Today's Usage</span>
                <span className="text-[#2563EB] dark:text-blue-400 font-bold">
                  {safeUsedToday} / {safeDailyConversions} used
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Resets daily at midnight. No credit card required.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{freeLimits.maxSize}</strong> maximum file size
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{freeLimits.daily}</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Supported formats: <strong>PNG, JPG, WEBP, PDF, SVG, DXF, PSD, AI</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Multi-page PDF extraction up to {freeLimits.pdfPages} pages</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Standard conversion queue</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero-retention memory purge privacy</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onNavigate('converter')}
            className="w-full py-3 rounded-xl border border-[#CBD5E1] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Current Plan — Start Converting
          </button>
        </div>

        {/* PRO PLAN */}
        <div className="relative rounded-3xl border-2 border-[#2563EB] bg-gradient-to-b from-blue-50/40 to-white dark:from-blue-950/20 dark:to-[#111827] p-8 shadow-xl shadow-blue-500/10 flex flex-col justify-between space-y-6 transition-all">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md">
            Convert More. Work Faster.
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                  <span>Pro</span>
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                </h3>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  High Capacity
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                For designers, developers, and architects handling larger files & high volume.
              </p>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                {proPrice}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">{proSubtext}</span>
            </div>

            {/* Launching soon notice when payment is not connected */}
            {!isPaymentConfigured && (
              <div className="p-3.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
                  <span className="font-bold">Pro is launching soon.</span> Checkout is being prepared. Join our early notification list to get launch priority.
                </div>
              </div>
            )}

            <ul className="space-y-3 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>100 MB</strong> maximum file size (4x larger)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Unlimited daily conversions</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Batch conversion queue</strong> with one-click Convert All
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Advanced controls:</strong> 300 DPI, precision dimension scaling, lossy/lossless tuning
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Priority queue</strong> & ultra-fast multi-threaded processing
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>100% Ad-Free</strong> clean workspace
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-[#64748B] dark:text-[#94A3B8]">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Extended Engine Pass: DWG binary & CDR rendering (<em>Coming Soon</em>)
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleProAction}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isPaymentConfigured ? 'Upgrade to Pro' : 'Notify Me When Pro Launches'}</span>
          </button>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="max-w-4xl mx-auto space-y-6 pt-6">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-[#0F172A] dark:text-[#F8FAFC]">
          Detailed Plan Feature Comparison
        </h2>

        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-[#E2E8F0] dark:border-[#1E293B] font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              <tr>
                <th className="p-4">Feature</th>
                <th className="p-4 text-center w-1/4">Free</th>
                <th className="p-4 text-center w-1/4 text-[#2563EB] dark:text-blue-400">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
              <tr>
                <td className="p-4 font-semibold">Max File Upload Size</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">{freeLimits.maxSize}</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">100 MB</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Daily Conversion Limit</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">{freeLimits.daily}</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Supported Format Engines</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">PNG, JPG, WEBP, PDF, SVG, DXF, PSD, AI</td>
                <td className="p-4 text-center font-bold text-[#2563EB] dark:text-blue-400">All Formats + Extended</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Batch Conversion Queue</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Standard Single / Multi</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Priority Multi-File Batch</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Advanced Resolution & DPI Settings</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Standard Preset</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Custom 72-300 DPI + Dimensions</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Multi-Page PDF Extraction</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Up to 10 pages</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited Pages + ZIP</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Advertising Experience</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Non-intrusive standard</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">100% Ad-Free</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Zero-Retention Privacy Purge</td>
                <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">Yes (Instant Purge)</td>
                <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">Yes (Instant Purge)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Design Tools Affiliate Section (Requirement 6) */}
      <div className="pt-8 border-t border-[#E2E8F0] dark:border-[#1E293B]">
        <AffiliateSection
          title="Recommended Design & Engineering Tools"
          subtitle="Discover curated software tools for graphic design, CAD blueprints, and creative workflows."
          limit={4}
          showCategoryFilter={false}
        />
      </div>

      {/* AdSlot (Requirement 4) */}
      <AdSlot slotId="pricing-bottom-slot" format="leaderboard" />

      {/* Launching Soon Modal / Notify Waitlist */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
            <button
              onClick={() => {
                setShowNotifyModal(false);
                setNotifySubmitted(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Pro is Launching Soon!
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                We are finishing the Pro payment checkout infrastructure. Enter your email to receive early access and a 20% launch discount code.
              </p>
            </div>

            {notifySubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  You're on the early priority list!
                </p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  We will notify {notifyEmail} as soon as Pro subscriptions go live.
                </p>
                <button
                  onClick={() => setShowNotifyModal(false)}
                  className="mt-2 px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                >
                  Back to Convert-X
                </button>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="designer@company.com"
                    className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Notify Me When Pro Launches
                </button>

                <p className="text-[10px] text-center text-[#64748B] dark:text-[#94A3B8]">
                  No spam. Unsubscribe at any time.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
