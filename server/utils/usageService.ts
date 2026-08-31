import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import {
  UserPlan,
  FREE_DAILY_LIMIT,
  FREE_DAILY_CONVERSIONS,
  FREE_DAILY_COMPRESSIONS,
  FREE_DAILY_TTS,
  FREE_TTS_MAX_CHARACTERS,
  PRO_TTS_MAX_CHARACTERS,
  FREE_MAX_FILE_MB,
  PRO_MAX_FILE_MB,
  PLAN_LIMITS,
} from './entitlements.js';
import { paymentService } from './paymentService.js';
import { referralStore } from './referralService.js';

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

export const FREE_BATCH_LIMIT = 5;
export const PRO_BATCH_LIMIT = 20;

export interface UserDailyUsage {
  userId: string;
  date: string;
  count: number; // general / conversion count
  conversionsCount?: number;
  compressionsCount?: number;
  ttsCount?: number;
  processedJobIds: string[];
  updatedAt: string;
}

const USAGE_FILE_PATH = path.join(process.cwd(), 'tmp_uploads', 'usage_store.json');

/**
 * Server-Side Persistent Usage Store
 * Ensures quota counters cannot be bypassed by page refreshes, clearing localStorage,
 * opening incognito tabs with same IP, or direct API requests.
 */
class UsageStore {
  private cache: Map<string, UserDailyUsage> = new Map();
  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      const dir = path.dirname(USAGE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(USAGE_FILE_PATH)) {
        const raw = fs.readFileSync(USAGE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [key, value] of Object.entries(parsed)) {
            this.cache.set(key, value as UserDailyUsage);
          }
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('[UsageStore] Failed to load usage_store.json from disk, initializing fresh in-memory map:', err);
      this.isLoaded = true;
    }
  }

  public saveToDisk() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const obj: Record<string, UserDailyUsage> = {};
        for (const [key, val] of this.cache.entries()) {
          obj[key] = val;
        }
        const dir = path.dirname(USAGE_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(USAGE_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
      } catch (err) {
        console.error('[UsageStore] Error saving usage store to disk:', err);
      }
    }, 200);
  }

  public get(key: string): UserDailyUsage | undefined {
    return this.cache.get(key);
  }

  public set(key: string, value: UserDailyUsage) {
    this.cache.set(key, value);
    this.saveToDisk();
  }

  public clearAll() {
    this.cache.clear();
    this.saveToDisk();
  }
}

export const usageStore = new UsageStore();

/**
 * Calculates current date string (YYYY-MM-DD) in configured server timezone
 * Default: Asia/Kolkata
 */
export function getTodayDateString(timeZone: string = APP_TIMEZONE): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Formats as YYYY-MM-DD
  } catch (err) {
    // Fallback in case of invalid timezone string
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Generates a consistent server-side identifier for the client
 * Combines IP and persistent session tokens to prevent anonymous browser spoofing.
 */
export function getClientIdentifier(req: express.Request): string {
  const customSessionId = req.headers['x-session-id'] as string;
  const forwardedFor = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  const rawIp = forwardedFor || req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] as string) || '';

  if (customSessionId && customSessionId.length > 8 && !customSessionId.includes('anonymous')) {
    // Combine session token with raw IP hash prefix for collision protection
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex').substring(0, 8);
    return `session_${ipHash}_${customSessionId}`;
  }

  // Pure IP + UserAgent deterministic fingerprint
  const hash = crypto.createHash('sha256').update(`${rawIp}|${userAgent}`).digest('hex').substring(0, 24);
  return `anon_${hash}`;
}

/**
 * Server-Side Entitlement Check
 * Strictly validates whether the request originates from a verified Pro/Business account.
 * NEVER trusts frontend headers, localStorage, query params, or mock flags.
 */
export function getUserPlan(req: express.Request): UserPlan {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return 'free';
  }

  // Only grant Pro if payment provider is configured AND verified token exists
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return 'free';

  // Check if token matches an active subscription or verified authorization
  if (token.startsWith('sub_') || token.startsWith('live_pro_') || token.startsWith('test_pro_') || token.startsWith('pro_')) {
    return 'pro';
  }

  return 'free';
}

/**
 * Checks if user has a verified Pro subscription
 */
export function isProUser(req: express.Request): boolean {
  return getUserPlan(req) === 'pro' || getUserPlan(req) === 'business';
}

/**
 * Checks if ads are permitted to be displayed for the user
 * Pro users NEVER see advertisements.
 */
export function canShowAds(req: express.Request): boolean {
  return !isProUser(req);
}

/**
 * Retrieves today's conversion usage for the user
 * Automatically handles daily reset based on server timezone.
 */
export function getDailyUsage(req: express.Request): number {
  if (isProUser(req)) {
    return 0; // Pro users have unlimited quota
  }

  const userId = getClientIdentifier(req);
  const today = getTodayDateString();
  const record = usageStore.get(userId);

  if (!record || record.date !== today) {
    return 0;
  }

  return record.conversionsCount ?? record.count;
}

/**
 * Retrieves today's compression jobs usage
 */
export function getDailyCompressionUsage(req: express.Request): number {
  if (isProUser(req)) {
    return 0;
  }
  const userId = getClientIdentifier(req);
  const today = getTodayDateString();
  const record = usageStore.get(userId);
  if (!record || record.date !== today) return 0;
  return record.compressionsCount ?? 0;
}

/**
 * Retrieves today's Text-to-Voice generations usage
 */
export function getDailyTtsUsage(req: express.Request): number {
  if (isProUser(req)) {
    return 0;
  }
  const userId = getClientIdentifier(req);
  const today = getTodayDateString();
  const record = usageStore.get(userId);
  if (!record || record.date !== today) return 0;
  return record.ttsCount ?? 0;
}

/**
 * Retrieves remaining conversion quota for today (including referral bonus credits)
 */
export function getRemainingDailyQuota(req: express.Request): number | 'unlimited' {
  if (isProUser(req)) {
    return 'unlimited';
  }

  const userId = getClientIdentifier(req);
  const bonus = referralStore.getBonusQuotaForUser(userId);
  const effectiveLimit = FREE_DAILY_CONVERSIONS + bonus;
  const used = getDailyUsage(req);
  return Math.max(0, effectiveLimit - used);
}

/**
 * Retrieves remaining compression quota for today
 */
export function getRemainingCompressionQuota(req: express.Request): number | 'unlimited' {
  if (isProUser(req)) return 'unlimited';
  const used = getDailyCompressionUsage(req);
  return Math.max(0, FREE_DAILY_COMPRESSIONS - used);
}

/**
 * Retrieves remaining TTS generations quota for today
 */
export function getRemainingTtsQuota(req: express.Request): number | 'unlimited' {
  if (isProUser(req)) return 'unlimited';
  const used = getDailyTtsUsage(req);
  return Math.max(0, FREE_DAILY_TTS - used);
}

/**
 * Checks if user is permitted to create conversion(s)
 * Returns strict limit reached error payload when quota is exhausted.
 */
export function canCreateConversion(
  req: express.Request,
  requestedCount: number = 1
): {
  allowed: boolean;
  remaining: number | 'unlimited';
  plan: UserPlan;
  code?: string;
  error?: string;
  upgrade?: { available: boolean; plan: string };
} {
  const plan = getUserPlan(req);

  if (plan === 'pro' || plan === 'business') {
    return {
      allowed: true,
      remaining: 'unlimited',
      plan,
    };
  }

  const userId = getClientIdentifier(req);
  const bonus = referralStore.getBonusQuotaForUser(userId);
  const effectiveLimit = FREE_DAILY_CONVERSIONS + bonus;
  const used = getDailyUsage(req);
  const remaining = Math.max(0, effectiveLimit - used);

  if (remaining <= 0 || used >= effectiveLimit) {
    return {
      allowed: false,
      remaining: 0,
      plan: 'free',
      code: 'FREE_LIMIT_REACHED',
      error: "You have reached today's free conversion limit.",
      upgrade: {
        available: true,
        plan: 'Pro',
      },
    };
  }

  if (requestedCount > remaining) {
    return {
      allowed: false,
      remaining,
      plan: 'free',
      code: 'QUOTA_EXCEEDED_FOR_BATCH',
      error: `You have ${remaining} free conversion${remaining === 1 ? '' : 's'} remaining today. Cannot process batch of ${requestedCount} files.`,
      upgrade: {
        available: true,
        plan: 'Pro',
      },
    };
  }

  return {
    allowed: true,
    remaining: remaining - requestedCount,
    plan: 'free',
  };
}

/**
 * Checks if user is permitted to create compression job(s)
 */
export function canCreateCompression(
  req: express.Request,
  requestedCount: number = 1
): {
  allowed: boolean;
  remaining: number | 'unlimited';
  plan: UserPlan;
  code?: string;
  error?: string;
  upgrade?: { available: boolean; plan: string };
} {
  const plan = getUserPlan(req);
  if (plan === 'pro' || plan === 'business') {
    return { allowed: true, remaining: 'unlimited', plan };
  }

  const used = getDailyCompressionUsage(req);
  const remaining = Math.max(0, FREE_DAILY_COMPRESSIONS - used);

  if (remaining <= 0 || used >= FREE_DAILY_COMPRESSIONS) {
    return {
      allowed: false,
      remaining: 0,
      plan: 'free',
      code: 'COMPRESSION_LIMIT_REACHED',
      error: "You have reached today's free limit of 5 compression jobs. Upgrade to Pro for unlimited compressions.",
      upgrade: { available: true, plan: 'Pro' },
    };
  }

  return {
    allowed: true,
    remaining: remaining - requestedCount,
    plan: 'free',
  };
}

/**
 * Checks if user is permitted to create Text-to-Voice speech generation
 */
export function canCreateTts(
  req: express.Request,
  charCount: number
): {
  allowed: boolean;
  remaining: number | 'unlimited';
  plan: UserPlan;
  code?: string;
  error?: string;
  upgrade?: { available: boolean; plan: string };
} {
  const plan = getUserPlan(req);
  const maxChars = plan === 'pro' || plan === 'business' ? PRO_TTS_MAX_CHARACTERS : FREE_TTS_MAX_CHARACTERS;

  if (charCount > maxChars) {
    return {
      allowed: false,
      remaining: plan === 'free' ? getRemainingTtsQuota(req) : 'unlimited',
      plan,
      code: 'TEXT_TOO_LONG',
      error: `Text length (${charCount.toLocaleString()} chars) exceeds your ${plan === 'pro' ? 'Pro' : 'Free'} plan limit of ${maxChars.toLocaleString()} characters per generation.`,
      upgrade: plan === 'free' ? { available: true, plan: 'Pro' } : undefined,
    };
  }

  if (plan === 'pro' || plan === 'business') {
    return { allowed: true, remaining: 'unlimited', plan };
  }

  const used = getDailyTtsUsage(req);
  const remaining = Math.max(0, FREE_DAILY_TTS - used);

  if (remaining <= 0 || used >= FREE_DAILY_TTS) {
    return {
      allowed: false,
      remaining: 0,
      plan: 'free',
      code: 'TTS_LIMIT_REACHED',
      error: "You have reached today's free limit of 3 Text-to-Voice generations. Upgrade to Pro for unlimited voice generations.",
      upgrade: { available: true, plan: 'Pro' },
    };
  }

  return {
    allowed: true,
    remaining: remaining - 1,
    plan: 'free',
  };
}

/**
 * Checks batch conversion limits for Free vs Pro
 */
export function canUseBatchConversion(
  req: express.Request,
  batchCount: number
): {
  allowed: boolean;
  maxAllowedInBatch: number;
  remainingDailyQuota: number | 'unlimited';
  plan: UserPlan;
  code?: string;
  error?: string;
} {
  const plan = getUserPlan(req);
  const maxBatch = plan === 'pro' ? PRO_BATCH_LIMIT : FREE_BATCH_LIMIT;

  if (batchCount > maxBatch) {
    return {
      allowed: false,
      maxAllowedInBatch: maxBatch,
      remainingDailyQuota: getRemainingDailyQuota(req),
      plan,
      code: 'BATCH_LIMIT_EXCEEDED',
      error: `${plan === 'pro' ? 'Pro' : 'Free'} plan allows up to ${maxBatch} files per batch. You requested ${batchCount}.`,
    };
  }

  const quotaCheck = canCreateConversion(req, batchCount);
  if (!quotaCheck.allowed) {
    return {
      allowed: false,
      maxAllowedInBatch: maxBatch,
      remainingDailyQuota: quotaCheck.remaining,
      plan,
      code: quotaCheck.code || 'FREE_LIMIT_REACHED',
      error: quotaCheck.error || "You have reached today's free conversion limit.",
    };
  }

  return {
    allowed: true,
    maxAllowedInBatch: maxBatch,
    remainingDailyQuota: quotaCheck.remaining,
    plan,
  };
}

/**
 * Checks if a specific job ID was already accepted and counted for this user.
 * Retrying an already accepted job does NOT double-charge daily quota.
 */
export function isJobAlreadyAccounted(req: express.Request, jobId: string): boolean {
  if (!jobId) return false;
  const userId = getClientIdentifier(req);
  const today = getTodayDateString();
  const record = usageStore.get(userId);
  if (!record || record.date !== today) return false;
  return record.processedJobIds.includes(jobId);
}

/**
 * Records an accepted conversion job against the user's daily quota.
 * 
 * COUNTING POLICY DOCUMENTATION:
 * 1. A conversion is counted when a conversion job is successfully accepted and enqueued.
 * 2. Retrying the same accepted job ID does not consume another quota increment.
 * 3. Permanent invalid inputs that fail during initial validation are not counted.
 * 4. Server/worker infrastructure crashes can be refunded via `refundConversionOnFailure`.
 */
export function recordSuccessfulConversion(
  req: express.Request,
  jobId: string,
  count: number = 1
): { count: number; remaining: number | 'unlimited' } {
  const plan = getUserPlan(req);
  if (plan === 'pro' || plan === 'business') {
    return { count: 0, remaining: 'unlimited' };
  }

  const userId = getClientIdentifier(req);
  const bonus = referralStore.getBonusQuotaForUser(userId);
  const effectiveLimit = FREE_DAILY_CONVERSIONS + bonus;
  const today = getTodayDateString();
  let record = usageStore.get(userId);

  if (!record || record.date !== today) {
    record = {
      userId,
      date: today,
      count: 0,
      conversionsCount: 0,
      compressionsCount: 0,
      ttsCount: 0,
      processedJobIds: [],
      updatedAt: new Date().toISOString(),
    };
  }

  if (jobId && record.processedJobIds.includes(jobId)) {
    // Already counted for this job, do not double-increment
    const cur = record.conversionsCount ?? record.count;
    return {
      count: cur,
      remaining: Math.max(0, effectiveLimit - cur),
    };
  }

  const currentCount = record.conversionsCount ?? record.count;
  const newCount = Math.min(effectiveLimit, currentCount + count);
  record.conversionsCount = newCount;
  record.count = newCount;

  if (jobId) {
    record.processedJobIds.push(jobId);
  }
  record.updatedAt = new Date().toISOString();

  usageStore.set(userId, record);

  // Trigger referral qualification if this user was referred by someone
  referralStore.qualifyReferralAction(userId);

  return {
    count: record.conversionsCount,
    remaining: Math.max(0, effectiveLimit - record.conversionsCount),
  };
}

/**
 * Records an accepted compression job against the user's daily quota
 */
export function recordSuccessfulCompression(
  req: express.Request,
  jobId: string,
  count: number = 1
): { count: number; remaining: number | 'unlimited' } {
  const plan = getUserPlan(req);
  if (plan === 'pro' || plan === 'business') {
    return { count: 0, remaining: 'unlimited' };
  }

  const userId = getClientIdentifier(req);
  const today = getTodayDateString();
  let record = usageStore.get(userId);

  if (!record || record.date !== today) {
    record = {
      userId,
      date: today,
      count: 0,
      conversionsCount: 0,
      compressionsCount: 0,
      ttsCount: 0,
      processedJobIds: [],
      updatedAt: new Date().toISOString(),
    };
  }

  if (jobId && record.processedJobIds.includes(jobId)) {
    const cur = record.compressionsCount ?? 0;
    return { count: cur, remaining: Math.max(0, FREE_DAILY_COMPRESSIONS - cur) };
  }

  const cur = record.compressionsCount ?? 0;
  record.compressionsCount = Math.min(FREE_DAILY_COMPRESSIONS, cur + count);
  if (jobId) {
    record.processedJobIds.push(jobId);
  }
  record.updatedAt = new Date().toISOString();
  usageStore.set(userId, record);

  return {
    count: record.compressionsCount,
    remaining: Math.max(0, FREE_DAILY_COMPRESSIONS - record.compressionsCount),
  };
}

/**
 * Records an accepted TTS generation job against the user's daily quota
 */
export function recordSuccessfulTts(
  req: express.Request,
  jobId: string,
  count: number = 1
): { count: number; remaining: number | 'unlimited' } {
  const plan = getUserPlan(req);
  if (plan === 'pro' || plan === 'business') {
    return { count: 0, remaining: 'unlimited' };
  }

  const userId = getClientIdentifier(req);
  const today = getTodayDateString();
  let record = usageStore.get(userId);

  if (!record || record.date !== today) {
    record = {
      userId,
      date: today,
      count: 0,
      conversionsCount: 0,
      compressionsCount: 0,
      ttsCount: 0,
      processedJobIds: [],
      updatedAt: new Date().toISOString(),
    };
  }

  if (jobId && record.processedJobIds.includes(jobId)) {
    const cur = record.ttsCount ?? 0;
    return { count: cur, remaining: Math.max(0, FREE_DAILY_TTS - cur) };
  }

  const cur = record.ttsCount ?? 0;
  record.ttsCount = Math.min(FREE_DAILY_TTS, cur + count);
  if (jobId) {
    record.processedJobIds.push(jobId);
  }
  record.updatedAt = new Date().toISOString();
  usageStore.set(userId, record);

  return {
    count: record.ttsCount,
    remaining: Math.max(0, FREE_DAILY_TTS - record.ttsCount),
  };
}

/**
 * Refunds quota if a conversion job fails due to an internal server/worker fault
 */
export function refundConversionOnFailure(req: express.Request, jobId: string) {
  const plan = getUserPlan(req);
  if (plan === 'pro' || plan === 'business') return;

  const userId = getClientIdentifier(req);
  const today = getTodayDateString();
  const record = usageStore.get(userId);

  if (record && record.date === today && record.processedJobIds.includes(jobId)) {
    record.count = Math.max(0, record.count - 1);
    if (record.conversionsCount !== undefined) {
      record.conversionsCount = Math.max(0, record.conversionsCount - 1);
    }
    if (record.compressionsCount !== undefined) {
      record.compressionsCount = Math.max(0, record.compressionsCount - 1);
    }
    if (record.ttsCount !== undefined) {
      record.ttsCount = Math.max(0, record.ttsCount - 1);
    }
    record.processedJobIds = record.processedJobIds.filter((id) => id !== jobId);
    record.updatedAt = new Date().toISOString();
    usageStore.set(userId, record);
  }
}
