import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import { getClientIdentifier, getTodayDateString } from './usageService.js';

export interface ReferralRecord {
  referralCode: string;
  referrerId: string;
  referredUsers: {
    userId: string;
    referredAt: string;
    qualified: boolean;
    qualifiedAt?: string;
  }[];
  totalBonusEarned: number;
  monthlyBonusEarned: number;
  bonusMonth: string; // YYYY-MM
  createdAt: string;
  updatedAt: string;
}

const REFERRALS_FILE_PATH = path.join(process.cwd(), 'tmp_uploads', 'referrals_store.json');
export const MAX_MONTHLY_REFERRAL_BONUS = 5;

/**
 * Server-Side Referral Store & Anti-Abuse Engine
 */
class ReferralStore {
  private cache: Map<string, ReferralRecord> = new Map(); // referralCode -> record
  private userToCodeMap: Map<string, string> = new Map(); // userId -> referralCode
  private referredByMap: Map<string, string> = new Map(); // referredUserId -> referralCode
  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      const dir = path.dirname(REFERRALS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(REFERRALS_FILE_PATH)) {
        const raw = fs.readFileSync(REFERRALS_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [code, record] of Object.entries(parsed)) {
            const rec = record as ReferralRecord;
            this.cache.set(code, rec);
            this.userToCodeMap.set(rec.referrerId, code);
            rec.referredUsers.forEach((u) => {
              this.referredByMap.set(u.userId, code);
            });
          }
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('[ReferralStore] Initializing fresh in-memory referral store:', err);
      this.isLoaded = true;
    }
  }

  private saveToDisk() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const obj: Record<string, ReferralRecord> = {};
        for (const [key, val] of this.cache.entries()) {
          obj[key] = val;
        }
        const dir = path.dirname(REFERRALS_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(REFERRALS_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
      } catch (err) {
        console.error('[ReferralStore] Error saving referrals to disk:', err);
      }
    }, 200);
  }

  /**
   * Generates a deterministic, unique referral code for a user
   */
  public getOrCreateReferralCode(userId: string): string {
    const existing = this.userToCodeMap.get(userId);
    if (existing && this.cache.has(existing)) {
      return existing;
    }

    // Generate short, clean code: CONVERTX-XXXXXX
    const hash = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 6).toUpperCase();
    const code = `CONVERTX-${hash}`;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const newRecord: ReferralRecord = {
      referralCode: code,
      referrerId: userId,
      referredUsers: [],
      totalBonusEarned: 0,
      monthlyBonusEarned: 0,
      bonusMonth: currentMonth,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.cache.set(code, newRecord);
    this.userToCodeMap.set(userId, code);
    this.saveToDisk();

    return code;
  }

  /**
   * Retrieves referral statistics for a user
   */
  public getReferralStats(userId: string): {
    referralCode: string;
    totalReferred: number;
    qualifiedReferrals: number;
    monthlyBonusEarned: number;
    maxMonthlyBonus: number;
    bonusConversionsAvailable: number;
  } {
    const code = this.getOrCreateReferralCode(userId);
    const record = this.cache.get(code);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (record && record.bonusMonth !== currentMonth) {
      record.bonusMonth = currentMonth;
      record.monthlyBonusEarned = 0;
      this.saveToDisk();
    }

    const totalReferred = record?.referredUsers.length || 0;
    const qualifiedReferrals = record?.referredUsers.filter((u) => u.qualified).length || 0;
    const monthlyBonusEarned = record?.monthlyBonusEarned || 0;

    return {
      referralCode: code,
      totalReferred,
      qualifiedReferrals,
      monthlyBonusEarned,
      maxMonthlyBonus: MAX_MONTHLY_REFERRAL_BONUS,
      bonusConversionsAvailable: Math.min(MAX_MONTHLY_REFERRAL_BONUS, monthlyBonusEarned),
    };
  }

  /**
   * Tracks an incoming referral click or session registration
   * Anti-abuse: Rejects self-referrals and duplicate attachments
   */
  public registerReferral(
    referredUserId: string,
    rawReferralCode: string
  ): { success: boolean; code?: string; error?: string } {
    if (!rawReferralCode || typeof rawReferralCode !== 'string') {
      return { success: false, code: 'INVALID_CODE', error: 'Referral code is required.' };
    }

    const cleanCode = rawReferralCode.trim().toUpperCase();
    const record = this.cache.get(cleanCode);

    if (!record) {
      return { success: false, code: 'CODE_NOT_FOUND', error: 'Referral code does not exist.' };
    }

    // Anti-Abuse 1: Reject Self-Referral
    if (record.referrerId === referredUserId) {
      return {
        success: false,
        code: 'SELF_REFERRAL_REJECTED',
        error: 'Self-referrals are not permitted.',
      };
    }

    // Anti-Abuse 2: Check if already referred by someone
    if (this.referredByMap.has(referredUserId)) {
      return {
        success: true,
        code: 'ALREADY_REGISTERED',
        error: 'User already attributed to a referrer.',
      };
    }

    // Check if user is already in this referrer's list
    const alreadyInList = record.referredUsers.some((u) => u.userId === referredUserId);
    if (!alreadyInList) {
      record.referredUsers.push({
        userId: referredUserId,
        referredAt: new Date().toISOString(),
        qualified: false,
      });
      record.updatedAt = new Date().toISOString();
      this.referredByMap.set(referredUserId, cleanCode);
      this.saveToDisk();
    }

    return { success: true, code: 'REGISTERED' };
  }

  /**
   * Validates qualifying action: when referred user completes a legitimate conversion
   * Awards +1 bonus conversion to referrer (capped at MAX_MONTHLY_REFERRAL_BONUS).
   */
  public qualifyReferralAction(referredUserId: string): { awarded: boolean; referrerId?: string } {
    const code = this.referredByMap.get(referredUserId);
    if (!code) return { awarded: false };

    const record = this.cache.get(code);
    if (!record) return { awarded: false };

    const targetUser = record.referredUsers.find((u) => u.userId === referredUserId);
    if (!targetUser || targetUser.qualified) {
      return { awarded: false }; // Already qualified or not found
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (record.bonusMonth !== currentMonth) {
      record.bonusMonth = currentMonth;
      record.monthlyBonusEarned = 0;
    }

    targetUser.qualified = true;
    targetUser.qualifiedAt = now.toISOString();

    if (record.monthlyBonusEarned < MAX_MONTHLY_REFERRAL_BONUS) {
      record.monthlyBonusEarned += 1;
      record.totalBonusEarned += 1;
      record.updatedAt = now.toISOString();
      this.saveToDisk();
      return { awarded: true, referrerId: record.referrerId };
    }

    this.saveToDisk();
    return { awarded: false, referrerId: record.referrerId };
  }

  /**
   * Retrieves the current bonus conversions for a given user identifier
   */
  public getBonusQuotaForUser(userId: string): number {
    const code = this.userToCodeMap.get(userId);
    if (!code) return 0;
    const record = this.cache.get(code);
    if (!record) return 0;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (record.bonusMonth !== currentMonth) {
      return 0;
    }

    return Math.min(MAX_MONTHLY_REFERRAL_BONUS, record.monthlyBonusEarned);
  }
}

export const referralStore = new ReferralStore();
