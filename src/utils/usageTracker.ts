import { AppLimits, MonetizationConfig, UsageData } from '../types.js';
import { safeParseJson } from './apiHelper.js';

export const DEFAULT_LIMITS: AppLimits = {
  maxFileSizeMB: 25,
  maxFileSizeBytes: 25 * 1024 * 1024,
  dailyConversions: 5,
  maxPdfPages: 10,
};

export const DEFAULT_USAGE: UsageData = {
  dailyConversions: 0,
  dailyLimit: 5,
  maxFileSizeMB: 25,
  plan: 'free',
};

export const DEFAULT_MONETIZATION: MonetizationConfig = {
  paymentConfigured: false,
  paymentMessage: 'Pro and Business payments are coming soon.',
  adsenseConfigured: false,
  pricing: {
    free: {
      id: 'free',
      name: 'Free Plan',
      amount: 0,
      currency: 'INR',
      formattedPrice: '₹0',
      period: 'forever',
      maxFileSizeMB: 25,
      dailyConversions: 5,
      maxPdfPages: 10,
      features: [
        '5 conversions per day',
        '25 MB maximum file size',
        'Standard JPG/PNG/PDF/WEBP conversions',
        'Basic compression tuning',
        'Normal queue priority',
        'Non-intrusive advertisements',
      ],
    },
    pro: {
      id: 'pro',
      name: 'Pro Plan',
      amount: 99,
      currency: 'INR',
      formattedPrice: '₹99',
      period: 'per month',
      maxFileSizeMB: 100,
      dailyConversions: 'Unlimited',
      maxPdfPages: 'Unlimited',
      features: [
        '100 MB maximum file size',
        'Unlimited daily conversions',
        'Batch conversion queue (up to 20 files)',
        '300 DPI high-resolution export',
        '100% Ad-Free workspace',
        'Priority queue processing',
      ],
    },
    business: {
      id: 'business',
      name: 'Business Plan',
      amount: 499,
      currency: 'INR',
      formattedPrice: '₹499',
      period: 'per month',
      maxFileSizeMB: 250,
      dailyConversions: 'Unlimited',
      maxPdfPages: 'Unlimited',
      features: [
        '250 MB maximum file size',
        'Unlimited high-speed batch conversions (up to 50 files)',
        'Dedicated multi-threaded priority queue',
        'Dedicated API access tokens',
        'Team collaboration & shared workspace',
        '100% Ad-Free workspace & VIP support',
      ],
    },
  },
};

const getTodayKey = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `convertx_usage_${year}-${month}-${day}`;
};

export function getDailyConversionCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const key = getTodayKey();
    const val = localStorage.getItem(key);
    return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

export function incrementDailyConversionCount(amount: number = 1): number {
  if (typeof window === 'undefined') return 0;
  try {
    const key = getTodayKey();
    const current = getDailyConversionCount();
    const next = current + amount;
    localStorage.setItem(key, next.toString());
    window.dispatchEvent(new CustomEvent('convertx_usage_updated', { detail: { count: next } }));
    return next;
  } catch {
    return 0;
  }
}

export function getRemainingConversions(maxDaily?: number): number {
  const max =
    typeof maxDaily === 'number' && !isNaN(maxDaily) && maxDaily > 0
      ? maxDaily
      : DEFAULT_LIMITS.dailyConversions;
  const used = getDailyConversionCount();
  return Math.max(0, max - used);
}

export function isDailyLimitReached(maxDaily?: number): boolean {
  const max =
    typeof maxDaily === 'number' && !isNaN(maxDaily) && maxDaily > 0
      ? maxDaily
      : DEFAULT_LIMITS.dailyConversions;
  return getDailyConversionCount() >= max;
}

export async function fetchUsageData(): Promise<UsageData> {
  try {
    const res = await fetch('/api/usage');
    if (!res.ok) {
      return DEFAULT_USAGE;
    }
    const data = await safeParseJson(res);
    const raw = data?.usage || {};
    return {
      dailyConversions:
        typeof raw.dailyConversions === 'number' ? raw.dailyConversions : DEFAULT_USAGE.dailyConversions,
      dailyLimit:
        typeof raw.dailyLimit === 'number' ? raw.dailyLimit : DEFAULT_USAGE.dailyLimit,
      maxFileSizeMB:
        typeof raw.maxFileSizeMB === 'number' ? raw.maxFileSizeMB : DEFAULT_USAGE.maxFileSizeMB,
      plan: raw.plan === 'pro' ? 'pro' : 'free',
    };
  } catch {
    return DEFAULT_USAGE;
  }
}

export async function fetchAppConfig(): Promise<{ limits: AppLimits; monetization: MonetizationConfig }> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) {
      return { limits: DEFAULT_LIMITS, monetization: DEFAULT_MONETIZATION };
    }
    const data = await safeParseJson(res);
    const rawLimits = data?.limits || {};
    const safeLimits: AppLimits = {
      maxFileSizeMB:
        typeof rawLimits.maxFileSizeMB === 'number' && !isNaN(rawLimits.maxFileSizeMB)
          ? rawLimits.maxFileSizeMB
          : DEFAULT_LIMITS.maxFileSizeMB,
      maxFileSizeBytes:
        typeof rawLimits.maxFileSizeBytes === 'number' && !isNaN(rawLimits.maxFileSizeBytes)
          ? rawLimits.maxFileSizeBytes
          : DEFAULT_LIMITS.maxFileSizeBytes,
      dailyConversions:
        typeof rawLimits.dailyConversions === 'number' && !isNaN(rawLimits.dailyConversions)
          ? rawLimits.dailyConversions
          : DEFAULT_LIMITS.dailyConversions,
      maxPdfPages:
        typeof rawLimits.maxPdfPages === 'number' && !isNaN(rawLimits.maxPdfPages)
          ? rawLimits.maxPdfPages
          : DEFAULT_LIMITS.maxPdfPages,
    };
    return {
      limits: safeLimits,
      monetization: data?.monetization || DEFAULT_MONETIZATION,
    };
  } catch {
    return { limits: DEFAULT_LIMITS, monetization: DEFAULT_MONETIZATION };
  }
}
