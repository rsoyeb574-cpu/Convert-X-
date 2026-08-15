import fs from 'fs';
import { jobStorage } from './jobStorage.js';
import { jobQueue } from './jobQueue.js';

export function runCrashRecovery(): void {
  console.log('[CrashRecovery] Inspecting persisted conversion jobs for crash recovery...');

  const allJobs = jobStorage.getAllJobs();
  let recoveredCount = 0;
  let expiredCount = 0;

  for (const job of allJobs) {
    // 1. Recover in-flight jobs that were processing or queued during server restart
    if (job.status === 'processing' || job.status === 'queued') {
      if (job.inputPath && fs.existsSync(job.inputPath)) {
        console.log(`[CrashRecovery] Re-queuing interrupted job ${job.id} (${job.originalName}).`);
        jobStorage.updateJob(job.id, {
          status: 'queued',
          progress: 5,
          progressStage: 'Restored from server restart. Waiting in queue...',
          startedAt: null,
        });
        jobQueue.enqueue(job.id);
        recoveredCount++;
      } else {
        console.log(`[CrashRecovery] Input file missing for in-flight job ${job.id}. Marking as expired.`);
        jobStorage.updateJob(job.id, {
          status: 'expired',
          errorCode: 'EXPIRED_ON_RESTART',
          errorMessage: 'Conversion session expired during server restart. Please re-upload your file.',
          progress: 0,
          progressStage: 'Session expired',
        });
        expiredCount++;
      }
    } else if (job.status === 'completed') {
      // 2. Verify completed files still exist on disk
      if (job.outputPath && !fs.existsSync(job.outputPath)) {
        jobStorage.updateJob(job.id, {
          status: 'expired',
          errorCode: 'OUTPUT_EXPIRED',
          errorMessage: 'Converted file expired from server temporary storage.',
          progress: 0,
          progressStage: 'File expired',
        });
        expiredCount++;
      }
    }
  }

  console.log(`[CrashRecovery] Recovery completed. ${recoveredCount} jobs re-queued, ${expiredCount} marked expired.`);

  // Run initial cleanup of files older than 60 minutes
  jobStorage.cleanupStaleJobs(60);

  // Schedule periodic cleanup every 15 minutes
  setInterval(() => {
    try {
      jobStorage.cleanupStaleJobs(60);
    } catch (err) {
      console.error('[CrashRecovery] Scheduled cleanup error:', err);
    }
  }, 15 * 60 * 1000);
}
