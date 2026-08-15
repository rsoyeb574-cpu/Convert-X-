import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DurableJob, CreateJobParams, JobStatus } from './types.js';

export interface JobStorage {
  getJob(id: string): DurableJob | undefined;
  createJob(params: CreateJobParams): DurableJob;
  updateJob(id: string, updates: Partial<DurableJob>): DurableJob | undefined;
  deleteJob(id: string): boolean;
  getAllJobs(): DurableJob[];
  getJobsBySession(sessionId: string): DurableJob[];
  countActiveBySession(sessionId: string): number;
  cleanupStaleJobs(retentionMinutes?: number): number;
}

const STORAGE_DIR = path.join(process.cwd(), 'tmp_uploads');
const STORAGE_FILE = path.join(STORAGE_DIR, 'jobs_metadata.json');

export class FileJobStorage implements JobStorage {
  private jobs: Map<string, DurableJob> = new Map();
  private isSaving: boolean = false;
  private savePending: boolean = false;

  constructor() {
    this.ensureStorageDir();
    this.loadFromDisk();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const list: DurableJob[] = JSON.parse(raw);
        for (const job of list) {
          if (job && job.id) {
            this.jobs.set(job.id, job);
          }
        }
        console.log(`[JobStorage] Loaded ${this.jobs.size} persisted jobs from disk.`);
      }
    } catch (err) {
      console.warn('[JobStorage] Failed to read persisted jobs metadata:', err);
    }
  }

  private triggerSave(): void {
    if (this.isSaving) {
      this.savePending = true;
      return;
    }

    this.isSaving = true;
    this.savePending = false;

    // Use queueMicrotask/setImmediate to write asynchronously without blocking event loop
    setImmediate(() => {
      try {
        this.ensureStorageDir();
        // Keep most recent 500 jobs to avoid unbounded memory/disk growth
        const jobList = Array.from(this.jobs.values()).slice(-500);
        const data = JSON.stringify(jobList, null, 2);

        // Atomic write: write to temp file then atomic rename
        const tempPath = path.join(STORAGE_DIR, `.jobs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.tmp`);
        fs.writeFileSync(tempPath, data, 'utf-8');
        fs.renameSync(tempPath, STORAGE_FILE);
      } catch (err) {
        console.error('[JobStorage] Error saving jobs to disk:', err);
      } finally {
        this.isSaving = false;
        if (this.savePending) {
          this.triggerSave();
        }
      }
    });
  }

  public getJob(id: string): DurableJob | undefined {
    return this.jobs.get(id);
  }

  public createJob(params: CreateJobParams): DurableJob {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const job: DurableJob = {
      id,
      sessionId: params.sessionId || 'anonymous',
      originalName: params.originalName,
      inputPath: params.inputPath,
      outputPath: null,
      inputFormat: params.inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : params.inputFormat.toLowerCase(),
      outputFormat: '',
      fileSize: params.fileSize,
      outputSize: null,
      outputMimeType: null,
      status: 'queued',
      progress: null,
      progressStage: 'Job created',
      createdAt: now,
      queuedAt: null,
      startedAt: null,
      completedAt: null,
      errorCode: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      options: params.options || {},
      isPro: Boolean(params.isPro),
    };

    this.jobs.set(id, job);
    this.triggerSave();
    return job;
  }

  public updateJob(id: string, updates: Partial<DurableJob>): DurableJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    Object.assign(job, updates);
    this.jobs.set(id, job);
    this.triggerSave();
    return job;
  }

  public deleteJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job) {
      if (job.inputPath && fs.existsSync(job.inputPath)) {
        try { fs.unlinkSync(job.inputPath); } catch {}
      }
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        try { fs.unlinkSync(job.outputPath); } catch {}
      }
      this.jobs.delete(id);
      this.triggerSave();
      return true;
    }
    return false;
  }

  public getAllJobs(): DurableJob[] {
    return Array.from(this.jobs.values());
  }

  public getJobsBySession(sessionId: string): DurableJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.sessionId === sessionId);
  }

  public countActiveBySession(sessionId: string): number {
    return Array.from(this.jobs.values()).filter(
      (j) => j.sessionId === sessionId && (j.status === 'queued' || j.status === 'processing')
    ).length;
  }

  public cleanupStaleJobs(retentionMinutes: number = 60): number {
    const now = Date.now();
    const thresholdMs = retentionMinutes * 60 * 1000;
    let cleaned = 0;

    for (const [id, job] of this.jobs.entries()) {
      const createdTime = new Date(job.createdAt).getTime();
      const ageMs = now - createdTime;

      if (ageMs > thresholdMs) {
        if (job.inputPath && fs.existsSync(job.inputPath)) {
          try { fs.unlinkSync(job.inputPath); } catch {}
        }
        if (job.outputPath && fs.existsSync(job.outputPath)) {
          try { fs.unlinkSync(job.outputPath); } catch {}
        }
        this.jobs.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.triggerSave();
      console.log(`[JobStorage] Cleaned up ${cleaned} stale jobs older than ${retentionMinutes} minutes.`);
    }

    return cleaned;
  }
}

export const jobStorage = new FileJobStorage();
