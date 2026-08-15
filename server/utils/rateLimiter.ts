import { Request, Response, NextFunction } from 'express';
import { jobStorage } from '../queue/jobStorage.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipBuckets: Map<string, RateLimitRecord> = new Map();

// Periodic cleanup of stale rate limit buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipBuckets.entries()) {
    if (now > record.resetAt) {
      ipBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  actionName: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const key = `${options.actionName}:${ip}`;
    const now = Date.now();

    let record = ipBuckets.get(key);
    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      ipBuckets.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > options.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: `Rate limit exceeded for ${options.actionName}. Please wait ${retryAfterSec}s before retrying.`,
      });
    }

    next();
  };
}

export function checkQueueLimit(maxQueued: number = 20) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sessionId = (req.headers['x-session-id'] as string) || req.ip || 'anonymous';
    const activeCount = jobStorage.countActiveBySession(sessionId);

    if (activeCount >= maxQueued) {
      return res.status(400).json({
        success: false,
        code: 'QUEUE_LIMIT_REACHED',
        error: `Maximum active conversion queue limit reached (${activeCount}/${maxQueued}). Please wait for current files to finish converting.`,
      });
    }

    next();
  };
}
