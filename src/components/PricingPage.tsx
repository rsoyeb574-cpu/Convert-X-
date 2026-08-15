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
  Building,
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
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<'pro' | 'business'>('pro');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const isPaymentConfigured = safeMonetization?.paymentConfigured ?? false;
  const configuredProPrice = safeMonetization?.pricing?.pro?.formattedPrice || '₹99';
  const configuredBusinessPrice = safeMonetization?.pricing?.business?.formattedPrice || '₹499';

  const safeDailyConversions = safeLimits?.dailyConversions ?? DEFAULT_LIMITS.dailyConversions;
  const safeMaxFileSizeMB = safeLimits?.maxFileSizeMB ?? DEFAULT_LIMITS.maxFileSizeMB;
  const safeMaxPdfPages = safeLimits?.maxPdfPages ?? DEFAULT_LIMITS.maxPdfPages;
  const safeUsedToday = typeof usedToday === 'number' && !isNaN(usedToday) ? Math.max(0, usedToday) : 0;

  const freeLimits = {
    maxSize: `${safeMaxFileSizeMB} MB`,
    daily: `${safeDailyConversions} conversions / day`,
    pdfPages: `${safeMaxPdfPages} pages max`,
  };

  const proPrice = billingPeriod === 'monthly' ? configuredProPrice : '₹999';
  const proSubtext = billingPeriod === 'monthly' ? '/ month' : '/ year (save 16%)';

  const businessPrice = billingPeriod === 'monthly' ? configuredBusinessPrice : '₹4,990';
  const businessSubtext = billingPeriod === 'monthly' ? '/ month' : '/ year (save 17%)';

  const handlePlanAction = (plan: 'pro' | 'business') => {
    if (!isPaymentConfigured) {
      setSelectedPlanForModal(plan);
      setShowNotifyModal(true);
    } else {
      // Direct real payment integration flow
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
          Start for free with everyday conversions, or unlock high-capacity Pro and Business tiers for large files, batch processing, and priority processing.
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

      {/* Pricing Cards Grid: 3 Tiers (Free, Pro, Business) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* 1. FREE PLAN */}
        <div className="rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Free</h3>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold">
                  Active Plan
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                For casual everyday users needing fast image, document, and vector conversions.
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
                <span>Standard formats: PNG, JPG, WEBP, PDF, SVG, DXF</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Multi-page PDF extraction up to {freeLimits.pdfPages} pages</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Standard queue processing</span>
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

        {/* 2. PRO PLAN (Featured) */}
        <div className="relative rounded-3xl border-2 border-[#2563EB] bg-gradient-to-b from-blue-50/40 to-white dark:from-blue-950/20 dark:to-[#111827] p-6 sm:p-7 shadow-xl shadow-blue-500/10 flex flex-col justify-between space-y-6 transition-all">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md">
            Most Popular
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                  <span>Pro</span>
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                </h3>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  100 MB Limit
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                For designers, developers, and professionals converting high-res files daily.
              </p>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                {proPrice}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">{proSubtext}</span>
            </div>

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
                  <strong>Batch queue conversion</strong> (up to 20 files)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Advanced tuning:</strong> 300 DPI high-res export & lossless controls
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Priority queue</strong> & fast multi-threaded processing
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>100% Ad-Free</strong> clean workspace
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handlePlanAction('pro')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isPaymentConfigured ? 'Upgrade to Pro' : 'Pro — Coming Soon'}</span>
          </button>
        </div>

        {/* 3. BUSINESS PLAN */}
        <div className="rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                  <span>Business</span>
                  <Building className="w-4 h-4 text-violet-500" />
                </h3>
                <span className="px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-xs font-bold">
                  250 MB Limit
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                For agencies, engineering teams, and high-throughput enterprise pipelines.
              </p>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                {businessPrice}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">{businessSubtext}</span>
            </div>

            {!isPaymentConfigured && (
              <div className="p-3.5 rounded-2xl bg-violet-50/90 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <div className="text-violet-900 dark:text-violet-200 text-[11px] leading-relaxed">
                  <span className="font-bold">Business tier coming soon.</span> Early access includes API token beta & team licenses.
                </div>
              </div>
            )}

            <ul className="space-y-3 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>250 MB</strong> maximum file size (10x larger)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Unlimited batch queue</strong> (up to 50 files simultaneously)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Dedicated API access tokens</strong> for automated pipelines
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Dedicated worker instances</strong> with lowest queue latency
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>100% Ad-Free</strong> workspace & priority support SLA
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handlePlanAction('business')}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isPaymentConfigured ? 'Get Business Plan' : 'Business — Coming Soon'}</span>
          </button>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="max-w-5xl mx-auto space-y-6 pt-6">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-[#0F172A] dark:text-[#F8FAFC]">
          Detailed Plan Feature Comparison
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-[#E2E8F0] dark:border-[#1E293B] font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              <tr>
                <th className="p-4">Feature</th>
                <th className="p-4 text-center">Free</th>
                <th className="p-4 text-center text-[#2563EB] dark:text-blue-400">Pro (₹99/mo)</th>
                <th className="p-4 text-center text-violet-600 dark:text-violet-400">Business (₹499/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
              <tr>
                <td className="p-4 font-semibold">Max File Upload Size</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">{freeLimits.maxSize}</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">100 MB</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">250 MB</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Daily Conversion Limit</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">{freeLimits.daily}</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">Unlimited</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Supported Format Engines</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">PNG, JPG, WEBP, PDF, SVG, DXF</td>
                <td className="p-4 text-center font-bold text-[#2563EB] dark:text-blue-400">All Standard + High-DPI</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">All Standard + High-DPI + API</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Batch Conversion Queue</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Up to 3 files</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Up to 20 files</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">Up to 50 files</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Advanced Resolution & DPI Settings</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Standard Preset</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Custom 72-300 DPI + Dimensions</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">Custom 72-600 DPI + Dimensions</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Multi-Page PDF Extraction & Merge</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Up to 10 pages</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited Pages + ZIP</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">Unlimited Pages + ZIP + OCR</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Advertising Experience</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">Non-intrusive standard</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">100% Ad-Free</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">100% Ad-Free</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">API Token Access</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">—</td>
                <td className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">—</td>
                <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">Included</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold">Zero-Retention Privacy Purge</td>
                <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">Yes (Instant Purge)</td>
                <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">Yes (Instant Purge)</td>
                <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">Yes (Instant Purge)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Tools & Partner Section */}
      <AffiliateSection />

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto space-y-6 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-[#0F172A] dark:text-[#F8FAFC]">
          Frequently Asked Questions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              How does the Free daily limit work?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Free users receive {safeDailyConversions} conversions every day. The quota resets automatically at midnight in your local timezone. No registration is required.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Are my files secure and private?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Yes. All conversions happen in sandboxed server memory. Files are never viewed by humans and are immediately purged after download.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              When will Pro and Business plans launch?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              We are currently finalizing our secure payment processor integration. Leave your email to receive early access and launch discounts.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] space-y-2">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Can I cancel anytime?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Yes. When subscriptions go live, you will be able to cancel anytime directly from your dashboard with zero lock-in or cancellation penalties.
            </p>
          </div>
        </div>
      </div>

      {/* Early Access / Launch Notification Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => {
                setShowNotifyModal(false);
                setNotifySubmitted(false);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!notifySubmitted ? (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 w-fit">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {selectedPlanForModal === 'business' ? 'Business Plan Launch Waitlist' : 'Get Notified When Pro Launches'}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    We are completing payment provider integration. Be the first to know when {selectedPlanForModal === 'business' ? 'Business' : 'Pro'} unlocks with early-bird pricing.
                  </p>
                </div>

                <form onSubmit={handleNotifySubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B1120] text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    Join Early Access List
                  </button>
                </form>

                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] text-center">
                  We respect your privacy. No spam, ever.
                </p>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 w-fit mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  You're on the list!
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-xs mx-auto">
                  We'll send an update to <strong>{notifyEmail}</strong> as soon as {selectedPlanForModal === 'business' ? 'Business' : 'Pro'} checkout is live.
                </p>
                <button
                  onClick={() => setShowNotifyModal(false)}
                  className="mt-2 px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ad slot for free visitors */}
      <AdSlot slotId="pricing-bottom-banner" format="leaderboard" />
    </div>
  );
};
