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
  dailyCompressionLimit: number | 'unlimited';
  dailyTtsLimit: number | 'unlimited';
  maxTtsCharacters: number;
  maxPdfPages: number | 'unlimited';
  allowApiAccess: boolean;
}

export function parseEnvNumber(val: string | undefined, fallback: number): number {
  if (!val || typeof val !== 'string') return fallback;
  const parsed = parseInt(val.trim(), 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const FREE_DAILY_LIMIT = 5;
export const FREE_DAILY_CONVERSIONS = 5;
export const FREE_DAILY_COMPRESSIONS = 5;
export const FREE_DAILY_TTS = 3;
export const FREE_TTS_MAX_CHARACTERS = 5000;
export const PRO_TTS_MAX_CHARACTERS = 50000;

export const FREE_MAX_FILE_MB = 25;
export const PRO_MAX_FILE_MB = 100;
export const BUSINESS_MAX_FILE_MB = 250;
export const FREE_BATCH_LIMIT = 5;
export const PRO_BATCH_LIMIT = 20;
export const BUSINESS_BATCH_LIMIT = 50;

export const PLAN_LIMITS: Record<UserPlan, TierLimits> = {
  free: {
    maxFileSizeMB: FREE_MAX_FILE_MB,
    maxFileSizeBytes: FREE_MAX_FILE_MB * 1024 * 1024,
    maxBatchSize: FREE_BATCH_LIMIT,
    allowPriorityQueue: false,
    allowAdRemoval: false,
    dailyConversionLimit: FREE_DAILY_CONVERSIONS,
    dailyCompressionLimit: FREE_DAILY_COMPRESSIONS,
    dailyTtsLimit: FREE_DAILY_TTS,
    maxTtsCharacters: FREE_TTS_MAX_CHARACTERS,
    maxPdfPages: 10,
    allowApiAccess: false,
  },
  pro: {
    maxFileSizeMB: PRO_MAX_FILE_MB,
    maxFileSizeBytes: PRO_MAX_FILE_MB * 1024 * 1024,
    maxBatchSize: PRO_BATCH_LIMIT,
    allowPriorityQueue: true,
    allowAdRemoval: true,
    dailyConversionLimit: 'unlimited',
    dailyCompressionLimit: 'unlimited',
    dailyTtsLimit: 'unlimited',
    maxTtsCharacters: PRO_TTS_MAX_CHARACTERS,
    maxPdfPages: 'unlimited',
    allowApiAccess: false,
  },
  business: {
    maxFileSizeMB: BUSINESS_MAX_FILE_MB,
    maxFileSizeBytes: BUSINESS_MAX_FILE_MB * 1024 * 1024,
    maxBatchSize: BUSINESS_BATCH_LIMIT,
    allowPriorityQueue: true,
    allowAdRemoval: true,
    dailyConversionLimit: 'unlimited',
    dailyCompressionLimit: 'unlimited',
    dailyTtsLimit: 'unlimited',
    maxTtsCharacters: PRO_TTS_MAX_CHARACTERS,
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
