import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Pause,
  Play,
  Square,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders,
  Download,
  FileJson,
  Copy,
  Check,
} from 'lucide-react';
import { ConversionQueueItem } from '../types.js';

export interface BatchQueueSummaryWidgetProps {
  queue: ConversionQueueItem[];
  isConvertingAll?: boolean;
  isBatchPaused?: boolean;
  onConvertAllPending?: () => void;
  onPauseBatch?: () => void;
  onResumeBatch?: () => void;
  onStopBatch?: () => void;
  onClearQueue?: () => void;
  onBulkUpdateQueueFormat?: (format: string) => void;
  availableBulkFormats?: string[];
  activeBulkFormat?: string;
  className?: string;
  compact?: boolean;
}

export const BatchQueueSummaryWidget: React.FC<BatchQueueSummaryWidgetProps> = ({
  queue = [],
  isConvertingAll = false,
  isBatchPaused = false,
  onConvertAllPending,
  onPauseBatch,
  onResumeBatch,
  onStopBatch,
  onClearQueue,
  onBulkUpdateQueueFormat,
  availableBulkFormats = [],
  activeBulkFormat = '',
  className = '',
  compact = false,
}) => {
  const [showStackPreview, setShowStackPreview] = useState<boolean>(true);
  const [showFormatSelector, setShowFormatSelector] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const formatSelectorRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (formatSelectorRef.current && !formatSelectorRef.current.contains(event.target as Node)) {
        setShowFormatSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Timing & Conversion Speed Tracking per Job
  const batchStartTimeRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const jobStartTimesRef = useRef<Map<string, number>>(new Map());
  const [completedJobDurations, setCompletedJobDurations] = useState<{ id: string; durationSec: number }[]>([]);

  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const convertingItems = queue.filter(
    (item) => item.status === 'converting' || item.status === 'uploading'
  );
  const convertingCount = convertingItems.length;
  const completedCount = queue.filter((item) => item.status === 'completed').length;
  const failedCount = queue.filter((item) => item.status === 'failed').length;
  const totalItems = queue.length;
  const remainingFiles = pendingCount + convertingCount;

  const isBatchActive = isConvertingAll || convertingCount > 0;
  const isComplete = totalItems > 0 && remainingFiles === 0 && completedCount > 0;

  // Track conversion start and finish per individual job to measure real conversion durations
  useEffect(() => {
    const now = Date.now();
    const newDurations: { id: string; durationSec: number }[] = [];

    queue.forEach((item) => {
      // Record start time when entering converting/uploading
      if (
        (item.status === 'converting' || item.status === 'uploading') &&
        !jobStartTimesRef.current.has(item.id)
      ) {
        jobStartTimesRef.current.set(item.id, now);
      }

      // Record duration when completing
      if (item.status === 'completed' && jobStartTimesRef.current.has(item.id)) {
        const startTime = jobStartTimesRef.current.get(item.id)!;
        const durationSec = Math.max(0.3, Math.min(120, (now - startTime) / 1000));
        newDurations.push({ id: item.id, durationSec });
        jobStartTimesRef.current.delete(item.id);
      }
    });

    if (newDurations.length > 0) {
      setCompletedJobDurations((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const filtered = newDurations.filter((d) => !existingIds.has(d.id));
        return filtered.length > 0 ? [...prev, ...filtered] : prev;
      });
    }
  }, [queue]);

  // Track batch execution start and elapsed time
  useEffect(() => {
    let interval: any = null;
    if (isBatchActive && !isBatchPaused) {
      if (!batchStartTimeRef.current) {
        batchStartTimeRef.current = Date.now();
      }
      interval = setInterval(() => {
        if (batchStartTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - batchStartTimeRef.current) / 1000));
        }
      }, 1000);
    } else if (!isBatchActive) {
      batchStartTimeRef.current = null;
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBatchActive, isBatchPaused]);

  // Global Cumulative Progress calculation (0 to 100)
  const cumulativeProgress = useMemo(() => {
    if (totalItems === 0) return 0;
    const totalPossible = totalItems * 100;
    const currentPoints = queue.reduce((acc, item) => {
      if (item.status === 'completed' || item.status === 'failed') {
        return acc + 100;
      }
      if (item.status === 'converting' || item.status === 'uploading') {
        const p = typeof item.progress === 'number' && !isNaN(item.progress) ? item.progress : 0;
        return acc + Math.min(100, Math.max(0, p));
      }
      return acc;
    }, 0);
    return Math.min(100, Math.max(0, Math.round((currentPoints / totalPossible) * 100)));
  }, [queue, totalItems]);

  // Average Conversion Speed calculation based on completed jobs
  const { avgConversionSpeed, completedJobsCount, isSpeedMeasuredFromCompleted } = useMemo(() => {
    // 1. Measured individual job durations from completed jobs
    if (completedJobDurations.length > 0) {
      const sum = completedJobDurations.reduce((acc, d) => acc + d.durationSec, 0);
      const avg = sum / completedJobDurations.length;
      return {
        avgConversionSpeed: Math.max(0.4, Number(avg.toFixed(2))),
        completedJobsCount: completedJobDurations.length,
        isSpeedMeasuredFromCompleted: true,
      };
    }

    // 2. Batch-level empirical throughput if batch ran and jobs completed
    if (completedCount > 0 && batchStartTimeRef.current && elapsedSeconds > 0) {
      const rate = elapsedSeconds / completedCount;
      if (rate >= 0.3 && rate <= 45) {
        return {
          avgConversionSpeed: Math.max(0.4, Number(rate.toFixed(2))),
          completedJobsCount: completedCount,
          isSpeedMeasuredFromCompleted: true,
        };
      }
    }

    // 3. Fallback default baseline speed before completed jobs are measured
    return {
      avgConversionSpeed: 2.2,
      completedJobsCount: 0,
      isSpeedMeasuredFromCompleted: false,
    };
  }, [completedJobDurations, completedCount, elapsedSeconds]);

  // Estimated Time to Completion (ETC / ETA) dynamically calculated based on average conversion speed of completed jobs
  const { estimatedSeconds, formattedEta, throughputText, etcBasisText } = useMemo(() => {
    if (totalItems === 0 || remainingFiles === 0) {
      return {
        estimatedSeconds: 0,
        formattedEta: 'Complete',
        throughputText: 'Finished',
        etcBasisText: 'All jobs completed',
      };
    }

    // Factor in in-flight partial completion: sum of (1 - progress%)
    const inFlightRemainingUnits = convertingItems.reduce((acc, item) => {
      const p = typeof item.progress === 'number' && !isNaN(item.progress) ? Math.min(100, Math.max(0, item.progress)) : 0;
      return acc + (1 - p / 100);
    }, 0);

    const totalRemainingUnits = inFlightRemainingUnits + pendingCount;
    // Concurrency factor: parallel execution with up to 2 concurrent worker slots
    const concurrency = convertingCount > 1 ? 2 : (pendingCount > 0 ? 1.5 : 1);
    const rawSeconds = (totalRemainingUnits * avgConversionSpeed) / concurrency;
    const sec = Math.max(1, Math.round(rawSeconds));

    let etaStr = '';
    if (isBatchPaused) {
      etaStr = 'Paused';
    } else if (!isBatchActive) {
      etaStr = sec < 60 ? `~${sec}s est. duration` : `~${Math.floor(sec / 60)}m ${sec % 60}s est. duration`;
    } else if (sec <= 2) {
      etaStr = 'Finishing up...';
    } else if (sec < 60) {
      etaStr = `~${sec}s remaining`;
    } else {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      etaStr = `~${m}m ${s > 0 ? `${s}s ` : ''}remaining`;
    }

    const basis = isSpeedMeasuredFromCompleted
      ? `Based on avg. conversion speed of ${avgConversionSpeed.toFixed(1)}s/job (${completedJobsCount} completed)`
      : `Based on initial ${avgConversionSpeed.toFixed(1)}s/job speed (calibrating as jobs complete)`;

    const throughput = isBatchActive && !isBatchPaused
      ? convertingCount > 1
        ? `Dual worker parallel execution (~${avgConversionSpeed.toFixed(1)}s/job)`
        : `Active pipeline (~${avgConversionSpeed.toFixed(1)}s/job)`
      : isBatchPaused
      ? 'Worker suspended'
      : 'Standby';

    return {
      estimatedSeconds: sec,
      formattedEta: etaStr,
      throughputText: throughput,
      etcBasisText: basis,
    };
  }, [
    totalItems,
    remainingFiles,
    convertingItems,
    pendingCount,
    convertingCount,
    avgConversionSpeed,
    completedJobsCount,
    isSpeedMeasuredFromCompleted,
    isBatchActive,
    isBatchPaused,
  ]);

  // Top 5 items in the job stack for visual stack representation
  const stackItems = useMemo(() => {
    // Priority: converting first, then pending, then recent completed/failed
    const converting = queue.filter((q) => q.status === 'converting' || q.status === 'uploading');
    const pending = queue.filter((q) => q.status === 'pending');
    const finished = queue.filter((q) => q.status === 'completed' || q.status === 'failed');

    const ordered = [...converting, ...pending, ...finished];
    return ordered.slice(0, 5);
  }, [queue]);

  // Byte size formatter for clean human readable report outputs
  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Structured JSON export payload generator
  const generateJsonSummary = (): string => {
    const now = new Date();
    const summaryPayload = {
      generator: 'Convert-X Universal File Engine',
      exportedAt: now.toISOString(),
      batchStats: {
        totalFiles: totalItems,
        remainingFiles: remainingFiles,
        completedFiles: completedCount,
        failedFiles: failedCount,
        convertingFiles: convertingCount,
        pendingFiles: pendingCount,
        cumulativeProgressPercent: cumulativeProgress,
        completionRate: `${Math.round((completedCount / (totalItems || 1)) * 100)}%`,
        estimatedTimeToCompletion: formattedEta,
        averageConversionSpeedSeconds: Number(avgConversionSpeed.toFixed(2)),
        averageConversionSpeedFormatted: `${avgConversionSpeed.toFixed(1)}s/job`,
        completedJobsSampledForEtc: completedJobsCount,
        etcCalculationBasis: etcBasisText,
        activeElapsedSeconds: elapsedSeconds,
        overallStatus: isComplete
          ? 'completed'
          : isBatchPaused
          ? 'paused'
          : isBatchActive
          ? 'in-progress'
          : 'idle',
      },
      files: queue.map((item, index) => ({
        index: index + 1,
        id: item.id,
        fileName: item.fileName,
        inputFormat: item.inputFormat?.toLowerCase(),
        outputFormat: item.outputFormat?.toLowerCase(),
        fileSizeBytes: item.fileSize,
        fileSizeFormatted: formatBytes(item.fileSize),
        finalStatus: item.status,
        progressPercent: item.progress ?? 0,
        statusMessage: item.statusText || item.status,
        errorMessage: item.error || null,
        diagnostics: item.whyCantConvert
          ? {
              reason: item.whyCantConvert.reason,
              alternativeWorkflow: item.whyCantConvert.alternativeWorkflow,
              guidance: item.whyCantConvert.nextStepGuidance,
            }
          : null,
        createdAt: item.createdAt,
      })),
    };
    return JSON.stringify(summaryPayload, null, 2);
  };

  // Human-readable formatted text (.txt) report generator
  const generateTextSummary = (): string => {
    const now = new Date();
    const divider = '='.repeat(64);
    const subDivider = '-'.repeat(64);

    let text = `${divider}\n`;
    text += `CONVERT-X UNIVERSAL BATCH QUEUE SUMMARY REPORT\n`;
    text += `Exported: ${now.toLocaleString()} (${now.toISOString()})\n`;
    text += `${divider}\n\n`;

    text += `[BATCH EXECUTION SUMMARY]\n`;
    text += `• Total Files in Queue:       ${totalItems}\n`;
    text += `• Files Remaining:            ${remainingFiles}\n`;
    text += `• Completed Successfully:     ${completedCount} (${Math.round((completedCount / (totalItems || 1)) * 100)}%)\n`;
    text += `• Failed / Issues:            ${failedCount}\n`;
    text += `• In-Flight / Converting:     ${convertingCount}\n`;
    text += `• Queued / Pending:           ${pendingCount}\n`;
    text += `• Cumulative Stack Progress:  ${cumulativeProgress}%\n`;
    text += `• Estimated Time Left (ETC):  ${formattedEta}\n`;
    text += `• Avg Conversion Speed:       ${avgConversionSpeed.toFixed(1)}s / job (${isSpeedMeasuredFromCompleted ? `based on ${completedJobsCount} completed jobs` : 'initial estimate'})\n`;
    text += `• Active Session Elapsed:     ${elapsedSeconds}s\n`;
    text += `• Overall Status:             ${isComplete ? 'ALL COMPLETED' : isBatchPaused ? 'PAUSED' : isBatchActive ? 'RUNNING' : 'STANDBY'}\n\n`;

    text += `${divider}\n`;
    text += `[FILE DETAILS & FINAL CONVERSION STATUSES]\n`;
    text += `${divider}\n\n`;

    queue.forEach((item, idx) => {
      const num = String(idx + 1).padStart(2, ' ');
      const statusTag = `[${item.status.toUpperCase()}]`.padEnd(14, ' ');
      text += `${num}. ${statusTag} ${item.fileName}\n`;
      text += `    • Conversion:   .${item.inputFormat?.toUpperCase()} -> .${item.outputFormat?.toUpperCase()}\n`;
      text += `    • Final Status: ${item.status} (${item.progress ?? 0}%)\n`;
      text += `    • File Size:    ${formatBytes(item.fileSize)}\n`;
      if (item.statusText && item.statusText !== item.status) {
        text += `    • Stage Note:   ${item.statusText}\n`;
      }
      if (item.error) {
        text += `    • Error Detail: ${item.error}\n`;
      }
      if (item.whyCantConvert?.reason) {
        text += `    • Diagnostic:   ${item.whyCantConvert.reason}\n`;
      }
      text += `\n`;
    });

    text += `${subDivider}\n`;
    text += `Report generated by Convert-X Universal File Problem Solver\n`;
    text += `${divider}\n`;
    return text;
  };

  // Universal client-side file downloader
  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportJson = () => {
    const content = generateJsonSummary();
    const dateTag = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `convertx-batch-summary-${dateTag}.json`;
    downloadBlob(content, filename, 'application/json;charset=utf-8');
    setShowExportMenu(false);
    setExportToast('JSON summary exported successfully');
    setTimeout(() => setExportToast(null), 3500);
  };

  const handleExportText = () => {
    const content = generateTextSummary();
    const dateTag = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `convertx-batch-summary-${dateTag}.txt`;
    downloadBlob(content, filename, 'text/plain;charset=utf-8');
    setShowExportMenu(false);
    setExportToast('Text summary report exported successfully');
    setTimeout(() => setExportToast(null), 3500);
  };

  const handleCopySummary = async () => {
    try {
      const content = generateTextSummary();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setExportToast('Summary copied to clipboard');
        setTimeout(() => setExportToast(null), 3500);
      }
    } catch (err) {
      console.error('Failed to copy summary to clipboard', err);
    }
    setShowExportMenu(false);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <motion.div
      id="global-batch-progress-bar"
      data-testid="global-batch-progress-bar"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        isBatchPaused
          ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 shadow-sm'
          : isBatchActive
          ? 'bg-blue-50/80 dark:bg-[#0d1629] border-blue-200 dark:border-blue-900/60 shadow-md shadow-blue-500/5'
          : isComplete
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 shadow-sm'
          : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 shadow-sm'
      } ${className}`}
    >
      {/* Top Ambient Glow / Status Indicator bar */}
      <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
        <motion.div
          id="global-batch-progress-fill"
          className={`h-full transition-all duration-300 ${
            isBatchPaused
              ? 'bg-amber-500'
              : isComplete
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600'
          }`}
          style={{ width: `${cumulativeProgress}%` }}
        />
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Header Row: Stack Title, Status Badges & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            {/* Status Icon Indicator */}
            <div
              className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                isBatchPaused
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                  : isBatchActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : isComplete
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isBatchPaused ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : isBatchActive ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : isComplete ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Batch Queue Job Stack</span>
                </h3>

                {/* Pulsing Status Pill */}
                {isBatchActive && !isBatchPaused && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                    Running
                  </span>
                )}
                {isBatchPaused && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                    <Pause className="w-3 h-3 fill-current" /> Paused
                  </span>
                )}
                {isComplete && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> All Done
                  </span>
                )}

                {/* Export notification toast pill */}
                <AnimatePresence>
                  {exportToast && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs"
                    >
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {exportToast}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBatchPaused
                  ? 'Batch conversion suspended. Existing in-flight files finish safely.'
                  : isBatchActive
                  ? `${convertingCount} active in-flight · ETC: ${formattedEta} (${isSpeedMeasuredFromCompleted ? `avg ${avgConversionSpeed.toFixed(1)}s/job` : throughputText})`
                  : isComplete
                  ? `Successfully converted ${completedCount} file(s) across the stack.`
                  : `${remainingFiles} file(s) waiting in job stack · Ready to process`}
              </p>
            </div>
          </div>

          {/* Action Controls & Big Metric Display */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center">
            {/* Batch Control Buttons */}
            {isBatchActive && (
              <div className="flex items-center gap-1.5">
                {isBatchPaused ? (
                  onResumeBatch && (
                    <button
                      type="button"
                      onClick={onResumeBatch}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Resume batch conversion"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                  )
                ) : (
                  onPauseBatch && (
                    <button
                      type="button"
                      onClick={onPauseBatch}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Pause batch execution"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </button>
                  )
                )}

                {onStopBatch && (
                  <button
                    type="button"
                    onClick={onStopBatch}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                    title="Stop batch conversion"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                )}
              </div>
            )}

            {!isBatchActive && pendingCount > 0 && onConvertAllPending && (
              <button
                type="button"
                onClick={() => onConvertAllPending()}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Start Batch ({pendingCount})</span>
              </button>
            )}

            {/* Export Summary Button & Dropdown Menu */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                id="btn-export-batch-queue-summary"
                data-testid="btn-export-batch-queue-summary"
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Export text or JSON summary of current batch queue"
                aria-expanded={showExportMenu}
                aria-haspopup="true"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Export Summary</span>
                <span className="sm:hidden">Export</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                    showExportMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Export Options Dropdown Menu */}
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 z-40 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl min-w-[240px] space-y-1 backdrop-blur-md"
                  >
                    <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Batch Queue Summary Export
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {totalItems} file{totalItems !== 1 ? 's' : ''} with final statuses & metadata
                      </span>
                    </div>

                    <button
                      type="button"
                      id="btn-export-summary-txt"
                      data-testid="btn-export-summary-txt"
                      onClick={handleExportText}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-100/80 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200/80">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">Export as Text (.txt)</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            Human-readable report summary
                          </div>
                        </div>
                      </div>
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                    </button>

                    <button
                      type="button"
                      id="btn-export-summary-json"
                      data-testid="btn-export-summary-json"
                      onClick={handleExportJson}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200/80">
                          <FileJson className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">Export as JSON (.json)</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            Full machine-readable dataset
                          </div>
                        </div>
                      </div>
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
                    </button>

                    <button
                      type="button"
                      id="btn-copy-summary-clipboard"
                      data-testid="btn-copy-summary-clipboard"
                      onClick={handleCopySummary}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-100/80 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-200/80">
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {copied ? 'Copied to Clipboard!' : 'Copy Summary'}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            Copy formatted report to clipboard
                          </div>
                        </div>
                      </div>
                      {copied && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Total Percentage Score */}
            <div className="text-right pl-2 border-l border-slate-200 dark:border-slate-800">
              <span
                id="global-batch-progress-percentage"
                className={`text-xl sm:text-2xl font-black font-mono leading-none block ${
                  isBatchPaused
                    ? 'text-amber-600 dark:text-amber-400'
                    : isBatchActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : isComplete
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {cumulativeProgress}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mt-0.5">
                Total Progress
              </span>
            </div>
          </div>
        </div>

        {/* Animated Progress Track */}
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-valuenow={cumulativeProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Cumulative batch conversion progress"
            className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-3 sm:h-3.5 overflow-hidden p-0.5 shadow-inner"
          >
            <motion.div
              className={`h-full rounded-full relative overflow-hidden ${
                isBatchPaused
                  ? 'bg-amber-500'
                  : isComplete
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${cumulativeProgress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Shimmer animation during active conversion */}
              {isBatchActive && !isBatchPaused && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
              )}
            </motion.div>
          </div>
        </div>

        {/* Summary Metric Cards: Files Remaining, Estimated Time, Completed Count */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* 1. Files Remaining */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-500" />
              Files Remaining
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                {remainingFiles}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                of {totalItems} total
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              {convertingCount > 0 ? (
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {convertingCount} in-flight
                </span>
              ) : (
                <span>{pendingCount} queued</span>
              )}
            </div>
          </div>

          {/* 2. Estimated Time to Completion (ETC) */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              Est. Time Left (ETC)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                id="batch-etc-value"
                data-testid="batch-etc-value"
                className={`text-base sm:text-lg font-black font-mono ${
                  isComplete
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isBatchActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {formattedEta}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={etcBasisText}>
              {isComplete ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Queue finished</span>
              ) : isBatchPaused ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Batch paused</span>
              ) : isSpeedMeasuredFromCompleted ? (
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  Avg {avgConversionSpeed.toFixed(1)}s/job ({completedJobsCount} done)
                </span>
              ) : isBatchActive ? (
                <span>Calibrating from completed jobs...</span>
              ) : (
                <span>Est. ~{avgConversionSpeed.toFixed(1)}s/job baseline</span>
              )}
            </div>
          </div>

          {/* 3. Completed Files */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Completed
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {completedCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({Math.round((completedCount / (totalItems || 1)) * 100)}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {failedCount > 0 ? (
                <span className="text-rose-500 font-bold">{failedCount} failed</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% health</span>
              )}
            </div>
          </div>

          {/* 4. Processing Speed / Stack Status based on completed jobs */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-violet-500" />
              Avg Conversion Speed
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                id="batch-avg-speed-value"
                data-testid="batch-avg-speed-value"
                className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white"
              >
                {isSpeedMeasuredFromCompleted
                  ? `${avgConversionSpeed.toFixed(1)}s`
                  : isBatchActive
                  ? `~${avgConversionSpeed.toFixed(1)}s`
                  : 'Ready'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/job avg</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {isSpeedMeasuredFromCompleted ? (
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Avg of {completedJobsCount} completed job{completedJobsCount !== 1 ? 's' : ''}
                </span>
              ) : isBatchActive ? (
                <span>Measuring completed jobs...</span>
              ) : (
                <span>Parallel workers ready</span>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Stack Visualizer (Mini preview of current items) */}
        {!compact && stackItems.length > 0 && (
          <div className="pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setShowStackPreview((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>Job Stack Hierarchy ({totalItems} files)</span>
                {showStackPreview ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Quick Bulk Format Action trigger */}
              {onBulkUpdateQueueFormat && availableBulkFormats.length > 0 && (
                <div className="relative" ref={formatSelectorRef}>
                  <button
                    type="button"
                    onClick={() => setShowFormatSelector((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Change output format for all pending items"
                  >
                    <Sliders className="w-3 h-3 text-blue-500" />
                    <span>
                      Bulk Format: {activeBulkFormat ? `.${activeBulkFormat.toUpperCase()}` : 'Select'}
                    </span>
                  </button>

                  {/* Dropdown menu */}
                  {showFormatSelector && (
                    <div className="absolute right-0 top-full mt-1 z-30 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl min-w-[160px] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block">
                        Apply to Pending
                      </span>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {availableBulkFormats.map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => {
                              onBulkUpdateQueueFormat(fmt);
                              setShowFormatSelector(false);
                            }}
                            className={`w-full text-left px-2.5 py-1 rounded-lg text-xs font-bold uppercase flex items-center justify-between transition-colors cursor-pointer ${
                              activeBulkFormat.toLowerCase() === fmt.toLowerCase()
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>.{fmt}</span>
                            {activeBulkFormat.toLowerCase() === fmt.toLowerCase() && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stack Preview Cards */}
            <AnimatePresence>
              {showStackPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar"
                >
                  {stackItems.map((item, index) => {
                    const isItemConverting =
                      item.status === 'converting' || item.status === 'uploading';
                    const isItemCompleted = item.status === 'completed';
                    const isItemFailed = item.status === 'failed';

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`p-2 rounded-xl border text-xs min-w-[170px] max-w-[200px] shrink-0 transition-all ${
                          isItemConverting
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 shadow-xs'
                            : isItemCompleted
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                            : isItemFailed
                            ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono text-slate-400">
                            #{index + 1}
                          </span>
                          {isItemConverting ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              {item.progress || 0}%
                            </span>
                          ) : isItemCompleted ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : isItemFailed ? (
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">Queued</span>
                          )}
                        </div>

                        <div className="font-bold text-[11px] text-slate-900 dark:text-white truncate" title={item.fileName}>
                          {item.fileName}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                          <span className="uppercase font-bold">.{item.inputFormat}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                          <span className="uppercase font-bold text-blue-600 dark:text-blue-400">
                            .{item.outputFormat}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}

                  {totalItems > stackItems.length && (
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs min-w-[90px] shrink-0 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-sm">+{totalItems - stackItems.length}</span>
                      <span className="text-[10px]">more in queue</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};
