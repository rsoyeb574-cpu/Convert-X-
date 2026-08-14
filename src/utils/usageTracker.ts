import { AppLimits, MonetizationConfig } from '../types.js';

export const DEFAULT_LIMITS: AppLimits = {
  maxFileSizeMB: 25,
  maxFileSizeBytes: 25 * 1024 * 1024,
  dailyConversions: 10,
  maxPdfPages: 10,
};

export const DEFAULT_MONETIZATION: MonetizationConfig = {
  paymentConfigured: false,
  paymentMessage: 'Pro payments are coming soon.',
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
      dailyConversions: 10,
      maxPdfPages: 10,
    },
    pro: {
      id: 'pro',
      name: 'Pro Plan',
      amount: 199,
      currency: 'INR',
      formattedPrice: '₹199',
      period: 'per month',
      maxFileSizeMB: 100,
      dailyConversions: 'Unlimited',
      maxPdfPages: 'Unlimited',
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

export function getRemainingConversions(maxDaily: number = DEFAULT_LIMITS.dailyConversions): number {
  const used = getDailyConversionCount();
  return Math.max(0, maxDaily - used);
}

export function isDailyLimitReached(maxDaily: number = DEFAULT_LIMITS.dailyConversions): boolean {
  return getDailyConversionCount() >= maxDaily;
}

export async function fetchAppConfig(): Promise<{ limits: AppLimits; monetization: MonetizationConfig }> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) {
      return { limits: DEFAULT_LIMITS, monetization: DEFAULT_MONETIZATION };
    }
    const data = await res.json();
    return {
      limits: data.limits || DEFAULT_LIMITS,
      monetization: data.monetization || DEFAULT_MONETIZATION,
    };
  } catch {
    return { limits: DEFAULT_LIMITS, monetization: DEFAULT_MONETIZATION };
  }
}
