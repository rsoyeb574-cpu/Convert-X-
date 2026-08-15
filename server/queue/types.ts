import { ConversionOptions } from '../converters/types.js';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export interface DurableJob {
  id: string;
  sessionId: string;
  originalName: string;
  inputPath: string;
  outputPath: string | null;
  inputFormat: string;
  outputFormat: string;
  fileSize: number;
  outputSize: number | null;
  outputMimeType: string | null;
  status: JobStatus;
  progress: number | null;
  progressStage: string;
  createdAt: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  options: ConversionOptions;
  isPro: boolean;
}

export interface CreateJobParams {
  originalName: string;
  inputFormat: string;
  inputPath: string;
  fileSize: number;
  sessionId?: string;
  options?: ConversionOptions;
  isPro?: boolean;
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  expired: number;
  activeWorkers: number;
  maxConcurrency: number;
  totalProcessed: number;
}
