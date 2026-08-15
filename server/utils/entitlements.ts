/**
 * Server-Side Entitlement & Quota Verification Engine
 * Enforces real tier boundaries (Free, Pro, Business) without relying solely on client JavaScript.
 */

export type UserPlan = 'free' | 'pro' | 'business';

export interface TierLimits {
  maxFileSizeMB: number;
  maxFileSizeBytes: number;
  maxBatchSize: number;
  allowPriorityQueue: boolean;
  allowAdRemoval: boolean;
  dailyConversionLimit: number | 'unlimited';
  maxPdfPages: number | 'unlimited';
  allowApiAccess: boolean;
}

export function parseEnvNumber(val: string | undefined, fallback: number): number {
  if (!val || typeof val !== 'string') return fallback;
  const parsed = parseInt(val.trim(), 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const FREE_DAILY_LIMIT = parseEnvNumber(
  process.env.FREE_DAILY_LIMIT || process.env.FREE_DAILY_CONVERSIONS,
  5
);

export const FREE_MAX_FILE_MB = parseEnvNumber(
  process.env.FREE_MAX_FILE_MB || process.env.FREE_MAX_FILE_SIZE_MB,
  25
);

export const PRO_MAX_FILE_MB = parseEnvNumber(process.env.PRO_MAX_FILE_MB, 100);
export const BUSINESS_MAX_FILE_MB = parseEnvNumber(process.env.BUSINESS_MAX_FILE_MB, 250);

export const PLAN_LIMITS: Record<UserPlan, TierLimits> = {
  free: {
    maxFileSizeMB: FREE_MAX_FILE_MB,
    maxFileSizeBytes: FREE_MAX_FILE_MB * 1024 * 1024,
    maxBatchSize: 3,
    allowPriorityQueue: false,
    allowAdRemoval: false,
    dailyConversionLimit: FREE_DAILY_LIMIT,
    maxPdfPages: 10,
    allowApiAccess: false,
  },
  pro: {
    maxFileSizeMB: PRO_MAX_FILE_MB,
    maxFileSizeBytes: PRO_MAX_FILE_MB * 1024 * 1024,
    maxBatchSize: 20,
    allowPriorityQueue: true,
    allowAdRemoval: true,
    dailyConversionLimit: 'unlimited',
    maxPdfPages: 'unlimited',
    allowApiAccess: false,
  },
  business: {
    maxFileSizeMB: BUSINESS_MAX_FILE_MB,
    maxFileSizeBytes: BUSINESS_MAX_FILE_MB * 1024 * 1024,
    maxBatchSize: 50,
    allowPriorityQueue: true,
    allowAdRemoval: true,
    dailyConversionLimit: 'unlimited',
    maxPdfPages: 'unlimited',
    allowApiAccess: true,
  },
};

/**
 * Validates whether a file size is permitted for the given tier
 */
export function canUploadFileSize(sizeInBytes: number, plan: UserPlan = 'free'): { allowed: boolean; maxAllowedMB: number } {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const maxBytes = limits.maxFileSizeBytes;
  return {
    allowed: sizeInBytes <= maxBytes,
    maxAllowedMB: limits.maxFileSizeMB,
  };
}

/**
 * Validates batch conversion size
 */
export function canUseBatchSize(batchCount: number, plan: UserPlan = 'free'): { allowed: boolean; maxBatch: number } {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return {
    allowed: batchCount <= limits.maxBatchSize,
    maxBatch: limits.maxBatchSize,
  };
}

/**
 * Checks if ads should be displayed
 */
export function shouldDisplayAds(plan: UserPlan = 'free'): boolean {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return !limits.allowAdRemoval;
}

/**
 * Checks if priority processing queue is granted
 */
export function hasPriorityProcessing(plan: UserPlan = 'free'): boolean {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return limits.allowPriorityQueue;
}
