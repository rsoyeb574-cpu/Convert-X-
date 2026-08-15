import fs from 'fs';
import { DurableJob, QueueStats } from './types.js';
import { JobStorage, jobStorage } from './jobStorage.js';
import { registry } from '../converters/registry.js';
import { generateTempFilePath } from '../utils/fileSecurity.js';
import { metricsTracker } from '../utils/metricsTracker.js';

export class JobQueue {
  private storage: JobStorage;
  private queue: string[] = []; // List of job IDs waiting to be processed
  private activeWorkers: number = 0;
  private maxConcurrency: number = 2;
  private isProcessing: boolean = false;
  private totalProcessed: number = 0;

  constructor(storage: JobStorage = jobStorage) {
    this.storage = storage;
    const envConcurrency = parseInt(process.env.MAX_CONCURRENT_CONVERSIONS || process.env.CONVERSION_CONCURRENCY || '2', 10);
    this.maxConcurrency = isNaN(envConcurrency) || envConcurrency < 1 ? 2 : Math.min(envConcurrency, 8);
    console.log(`[JobQueue] Initialized with max worker concurrency: ${this.maxConcurrency}`);
  }

  public setConcurrency(concurrency: number): void {
    if (concurrency >= 1 && concurrency <= 10) {
      this.maxConcurrency = concurrency;
      this.pumpWorkers();
    }
  }

  public getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  public getActiveWorkers(): number {
    return this.activeWorkers;
  }

  /**
   * Enqueue a job for conversion.
   */
  public enqueue(jobId: string, outputFormat?: string, options?: any): DurableJob {
    const job = this.storage.getJob(jobId);
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    if (!job.inputPath || !fs.existsSync(job.inputPath)) {
      this.storage.updateJob(jobId, {
        status: 'failed',
        errorCode: 'INPUT_FILE_NOT_FOUND',
        errorMessage: 'Source file expired or was not found on server. Please re-upload.',
      });
      throw new Error('Source file not found on server.');
    }

    const updates: Partial<DurableJob> = {
      status: 'queued',
      queuedAt: new Date().toISOString(),
      progress: 5,
      progressStage: 'Waiting in queue...',
      errorMessage: null,
      errorCode: null,
    };

    if (outputFormat) {
      updates.outputFormat = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
    }
    if (options) {
      updates.options = { ...job.options, ...options };
    }

    const updatedJob = this.storage.updateJob(jobId, updates)!;

    // Avoid duplicate queuing
    if (!this.queue.includes(jobId)) {
      if (updatedJob.isPro) {
        // Pro users get priority in queue
        this.queue.unshift(jobId);
      } else {
        this.queue.push(jobId);
      }
    }

    console.log(`[JobQueue] Job ${jobId} enqueued for .${updatedJob.inputFormat} → .${updatedJob.outputFormat}. Queue length: ${this.queue.length}`);
    this.pumpWorkers();
    return updatedJob;
  }

  /**
   * Pump worker loop to start workers up to max concurrency.
   */
  private pumpWorkers(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.activeWorkers < this.maxConcurrency && this.queue.length > 0) {
        const nextJobId = this.queue.shift();
        if (nextJobId) {
          this.activeWorkers++;
          this.processJob(nextJobId).finally(() => {
            this.activeWorkers--;
            this.pumpWorkers();
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single job in worker execution.
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.storage.getJob(jobId);
    if (!job) {
      console.warn(`[JobQueue] Job ${jobId} not found in storage during worker pick-up`);
      return;
    }

    // Verify input file existence
    if (!job.inputPath || !fs.existsSync(job.inputPath)) {
      this.storage.updateJob(jobId, {
        status: 'failed',
        errorCode: 'INPUT_MISSING',
        errorMessage: 'Source file missing or expired from server temporary storage.',
        progress: 0,
        progressStage: 'Failed: File missing',
      });
      metricsTracker.recordFailure();
      return;
    }

    const inFmt = job.inputFormat;
    const outFmt = job.outputFormat;

    if (!outFmt) {
      this.storage.updateJob(jobId, {
        status: 'failed',
        errorCode: 'NO_OUTPUT_FORMAT',
        errorMessage: 'No target output format specified for conversion.',
        progress: 0,
        progressStage: 'Failed: Invalid format',
      });
      metricsTracker.recordFailure();
      return;
    }

    // Check capability and engine
    const capabilities = registry.getCapabilities();
    const cap = capabilities.find((c) => c.extension === inFmt);
    if (cap && cap.status !== 'supported') {
      const err = `Format .${inFmt.toUpperCase()} requires the ${cap.requiresEngine || 'Dedicated Commercial Engine'}. This engine is currently disconnected.`;
      this.storage.updateJob(jobId, {
        status: 'failed',
        errorCode: 'ENGINE_DISCONNECTED',
        errorMessage: err,
        progress: 0,
        progressStage: 'Failed: Engine disconnected',
      });
      metricsTracker.recordFailure();
      return;
    }

    const engine = registry.findEngineFor(inFmt, outFmt);
    if (!engine) {
      const err = `No active conversion engine available for .${inFmt} → .${outFmt}`;
      this.storage.updateJob(jobId, {
        status: 'failed',
        errorCode: 'UNSUPPORTED_CONVERSION_PAIR',
        errorMessage: err,
        progress: 0,
        progressStage: 'Failed: Unsupported pair',
      });
      metricsTracker.recordFailure();
      return;
    }

    const startTime = Date.now();
    metricsTracker.recordConversion(inFmt, outFmt, job.isPro);

    // Update to processing state
    this.storage.updateJob(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      progress: 20,
      progressStage: 'Validating input file...',
      errorMessage: null,
      errorCode: null,
    });

    try {
      // 1. Read input buffer
      const inputBuffer = fs.readFileSync(job.inputPath);

      // 2. Validate input
      this.storage.updateJob(jobId, {
        progress: 40,
        progressStage: 'Validating format structure...',
      });

      const validation = await engine.validate(inputBuffer, inFmt);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Input file validation failed.');
      }

      // 3. Convert
      this.storage.updateJob(jobId, {
        progress: 60,
        progressStage: `Rendering .${inFmt.toUpperCase()} to .${outFmt.toUpperCase()}...`,
      });

      const convertResult = await engine.convert({
        inputBuffer,
        inputFormat: inFmt,
        outputFormat: outFmt,
        fileName: job.originalName,
        options: job.options || {},
      });

      // 4. Output verification
      if (!convertResult.buffer || convertResult.buffer.length === 0) {
        throw new Error('Conversion generated an empty output file.');
      }

      const finalExt = (convertResult.outputExtension || outFmt).toLowerCase();
      const mimeType = convertResult.mimeType || this.getMimeType(finalExt);

      this.storage.updateJob(jobId, {
        progress: 85,
        progressStage: 'Writing output and verifying integrity...',
      });

      const { filePath: outputPath } = generateTempFilePath(finalExt);
      fs.writeFileSync(outputPath, convertResult.buffer);

      if (!fs.existsSync(outputPath)) {
        throw new Error('Failed to write converted output file to disk.');
      }

      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        try { fs.unlinkSync(outputPath); } catch {}
        throw new Error('Converted output file is 0 bytes.');
      }

      // Verify header magic bytes
      const headerCheck = this.verifyOutputMagicBytes(convertResult.buffer, finalExt);
      if (!headerCheck.valid) {
        try { fs.unlinkSync(outputPath); } catch {}
        throw new Error(`Converted output file integrity check failed (${headerCheck.reason}).`);
      }

      // Success!
      const durationMs = Date.now() - startTime;
      this.storage.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        progressStage: 'Conversion complete',
        completedAt: new Date().toISOString(),
        outputPath,
        outputFormat: finalExt,
        outputMimeType: mimeType,
        outputSize: stats.size,
        errorMessage: null,
        errorCode: null,
      });

      this.totalProcessed++;
      metricsTracker.recordSuccess();
      console.log(`[JobQueue] Job ${jobId} completed successfully in ${durationMs}ms. Output: ${stats.size} bytes`);
    } catch (err: any) {
      const errMsg = err.message || 'Conversion failed due to an internal processing error.';
      console.error(`[JobQueue] Job ${jobId} failed:`, errMsg);

      const isTransient = this.isTransientError(err);

      if (isTransient && job.retryCount < job.maxRetries) {
        const nextRetry = job.retryCount + 1;
        const delayMs = Math.pow(2, job.retryCount) * 1000; // 1s, 2s, 4s

        console.log(`[JobQueue] Job ${jobId} encountered transient error (${errMsg}). Scheduling retry #${nextRetry} in ${delayMs}ms.`);

        this.storage.updateJob(jobId, {
          status: 'queued',
          retryCount: nextRetry,
          progress: 10,
          progressStage: `Transient issue detected. Retrying in ${delayMs / 1000}s (attempt ${nextRetry}/${job.maxRetries})...`,
          errorMessage: `Retrying: ${errMsg}`,
        });

        setTimeout(() => {
          if (!this.queue.includes(jobId)) {
            this.queue.push(jobId);
            this.pumpWorkers();
          }
        }, delayMs);
      } else {
        // Permanent failure
        this.storage.updateJob(jobId, {
          status: 'failed',
          errorCode: 'CONVERSION_FAILED',
          errorMessage: errMsg,
          progress: 0,
          progressStage: 'Conversion failed',
          completedAt: new Date().toISOString(),
        });

        metricsTracker.recordFailure();
      }
    }
  }

  private isTransientError(err: any): boolean {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    const code = (err.code || '').toLowerCase();

    // Transient errors: I/O lock, temp timeout, busy socket
    if (
      code === 'ebusy' ||
      code === 'eagain' ||
      code === 'etimedout' ||
      code === 'econnpending' ||
      msg.includes('timeout') ||
      msg.includes('temporary') ||
      msg.includes('busy') ||
      msg.includes('rate limit') ||
      msg.includes('resource temporarily unavailable')
    ) {
      return true;
    }
    return false;
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      pdf: 'application/pdf',
      svg: 'image/svg+xml',
      zip: 'application/zip',
      dxf: 'image/vnd.dxf',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  private verifyOutputMagicBytes(buffer: Buffer, format: string): { valid: boolean; reason?: string } {
    if (!buffer || buffer.length === 0) {
      return { valid: false, reason: 'Empty buffer' };
    }

    const fmt = format.toLowerCase();
    if (fmt === 'png') {
      if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
        return { valid: false, reason: 'Invalid PNG header' };
      }
    } else if (fmt === 'jpg' || fmt === 'jpeg') {
      if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        return { valid: false, reason: 'Invalid JPEG header' };
      }
    } else if (fmt === 'webp') {
      if (
        buffer.length < 12 ||
        buffer[0] !== 0x52 ||
        buffer[1] !== 0x49 ||
        buffer[2] !== 0x46 ||
        buffer[3] !== 0x46 ||
        buffer[8] !== 0x57 ||
        buffer[9] !== 0x45 ||
        buffer[10] !== 0x42 ||
        buffer[11] !== 0x50
      ) {
        return { valid: false, reason: 'Invalid WebP header' };
      }
    } else if (fmt === 'pdf') {
      const head = buffer.subarray(0, 1024).toString('binary');
      if (!head.includes('%PDF-')) {
        return { valid: false, reason: 'Missing %PDF- header signature' };
      }
    } else if (fmt === 'zip') {
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        return { valid: false, reason: 'Invalid ZIP header signature' };
      }
    } else if (fmt === 'svg') {
      const head = buffer.subarray(0, 1024).toString('utf-8').toLowerCase();
      if (!head.includes('<svg')) {
        return { valid: false, reason: 'Missing <svg tag' };
      }
    }

    return { valid: true };
  }

  public getStats(): QueueStats {
    const all = this.storage.getAllJobs();
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let expired = 0;

    for (const job of all) {
      if (job.status === 'queued') queued++;
      else if (job.status === 'processing') processing++;
      else if (job.status === 'completed') completed++;
      else if (job.status === 'failed') failed++;
      else if (job.status === 'expired') expired++;
    }

    return {
      queued,
      processing,
      completed,
      failed,
      expired,
      activeWorkers: this.activeWorkers,
      maxConcurrency: this.maxConcurrency,
      totalProcessed: this.totalProcessed,
    };
  }
}

export const jobQueue = new JobQueue();
