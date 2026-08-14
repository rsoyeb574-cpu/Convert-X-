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
} from 'lucide-react';
import { AppLimits, MonetizationConfig, PageView } from '../types.js';
import { AdPlaceholder } from './AdPlaceholder.js';

interface PricingPageProps {
  limits: AppLimits;
  monetization: MonetizationConfig;
  usedToday: number;
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  limits,
  monetization,
  usedToday,
  onNavigate,
}) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const isPaymentConfigured = monetization.paymentConfigured;
  const paymentMessage = monetization.paymentMessage || 'Pro payments are coming soon.';

  const freeLimits = {
    maxSize: `${limits.maxFileSizeMB} MB`,
    daily: `${limits.dailyConversions} conversions / day`,
    pdfPages: `${limits.maxPdfPages} pages max`,
  };

  const proPrice = billingPeriod === 'monthly' ? '₹199' : '₹1,990';
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
          <span>Simple, Transparent Plans</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Convert without Limits
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          Start for free with standard conversion capabilities, or unlock high-capacity batch processing, 100MB file allowances, and priority engine queues.
        </p>

        {/* Billing Switcher */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white dark:bg-[#111827] text-[#2563EB] dark:text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
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
                For casual users needing fast everyday document & image conversions.
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
                  {usedToday} / {limits.dailyConversions} used
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Resets daily at midnight.
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
                  Supported formats: <strong>PNG, JPG, WEBP, PDF, SVG, DXF</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Multi-page PDF extraction up to {freeLimits.pdfPages}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Standard conversion speed</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero-retention privacy guarantee</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onNavigate('converter')}
            className="w-full py-3 rounded-xl border border-[#CBD5E1] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white font-bold text-xs transition-colors"
          >
            Current Plan — Start Converting
          </button>
        </div>

        {/* PRO PLAN */}
        <div className="relative rounded-3xl border-2 border-[#2563EB] bg-gradient-to-b from-blue-50/40 to-white dark:from-blue-950/20 dark:to-[#111827] p-8 shadow-xl shadow-blue-500/10 flex flex-col justify-between space-y-6 transition-all">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md">
            Recommended for Professionals
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
                For designers, developers, and architects handling large files & high volume.
              </p>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                {proPrice}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">{proSubtext}</span>
            </div>

            {/* Payment readiness notice */}
            {!isPaymentConfigured && (
              <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
                  <strong>Pro payments are coming soon.</strong> Sign up to be notified first when payments launch.
                </p>
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
                  <strong>Unlimited multi-page PDF</strong> extraction & ZIP packaging
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
                <Clock className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <span>
                  Extended Engine Pass: DWG, PSD, AI conversion (<em>Coming Soon</em>)
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
      <div className="max-w-4xl mx-auto space-y-6 pt-8">
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
                <td className="p-4 font-semibold">PDF Multi-Page Extraction</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Up to {freeLimits.pdfPages}</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited Pages</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Image & Vector Conversions</td>
                <td className="p-4 text-center">PNG, JPG, WEBP, PDF, SVG, DXF</td>
                <td className="p-4 text-center font-bold">All Supported + Priority Engines</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Batch Queue Processing</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Sequential Queue</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Multi-Thread Priority</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Ad-Free Interface</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Standard Sponsored Units</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">100% Ad-Free</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Automatic Zero-Retention Purging</td>
                <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">Instant Scrubbing</td>
                <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">Instant Scrubbing</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Commercial Native Engines (DWG, PSD, AI)</td>
                <td className="p-4 text-center text-[#94A3B8]">Coming Soon</td>
                <td className="p-4 text-center text-violet-600 dark:text-violet-400 font-semibold">Priority Beta (Coming Soon)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Ad Placement (Safe and non-intrusive) */}
      <AdPlaceholder slotId="pricing-bottom-ad" />

      {/* Pricing FAQs */}
      <div className="max-w-4xl mx-auto space-y-6 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-[#0F172A] dark:text-[#F8FAFC]">
          Frequently Asked Questions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              How does the Free daily conversion limit work?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Every free user receives {limits.dailyConversions} conversions per calendar day. The counter resets automatically every night at 00:00 local time.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              When will Pro payments be available?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              We are finalizing payment provider integration. When live, you will be able to upgrade instantly with credit/debit cards, UPI, or international methods with complete security.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Are my uploaded files safe and private?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Yes, 100%. Both Free and Pro users benefit from our strict zero-retention policy. Files are processed in memory and deleted immediately after download or 15 minutes of inactivity.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Can I convert batch files simultaneously?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Yes. You can select multiple files or drop folders into the converter queue. Free handles batch files sequentially, while Pro offers multi-threaded parallel execution.
            </p>
          </div>
        </div>
      </div>

      {/* Notify Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#2563EB] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowNotifyModal(false)}
                className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Pro Payments Launching Soon
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                We are setting up certified payment processing. Leave your email address below to receive an instant launch discount and early Pro access.
              </p>
            </div>

            {notifySubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                <p className="font-bold">✓ You're on the early access list!</p>
                <p>We'll email you at {notifyEmail} as soon as Pro goes live.</p>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Join Pro Waitlist
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Meanwhile, feel free to use the Free Plan for your files.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
