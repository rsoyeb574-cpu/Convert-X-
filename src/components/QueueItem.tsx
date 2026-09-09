import React, { useState, useEffect } from 'react';
import { ConversionQueueItem, FormatCapability, UserPreferences } from '../types.js';
import {
  FileText,
  Image as ImageIcon,
  Box,
  FileCode,
  Music,
  Video,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Download,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Gauge,
  ArrowRight,
} from 'lucide-react';
import {
  formatFileSize,
  getCompressionRatio,
  calculateEstimatedSize,
  fetchEstimatedOutputSize,
} from '../utils/estimateSize.js';

export interface QueueItemProps {
  item: ConversionQueueItem;
  capabilities?: FormatCapability[];
  isBatchPaused?: boolean;
  userPrefs?: UserPreferences;
  onConvertQueueItem?: (id: string) => void;
  onRetryQueueItem?: (id: string) => void;
  onUpdateQueueItemFormat?: (id: string, format: string) => void;
  onRemoveQueueItem?: (id: string) => void;
  onFileDownloaded?: (jobId: string, queueItemId: string) => void;
  onConvertAgain?: (item: ConversionQueueItem) => void;
  as?: 'tr' | 'card';
}

export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  capabilities = [],
  isBatchPaused = false,
  userPrefs = {
    defaultTargetFormat: 'pdf',
    autoDownload: false,
    autoConvertOnUpload: false,
    autoDeleteAfterDownload: false,
    imageQuality: 85,
    preserveMetadata: true,
    theme: 'system',
    favoriteTools: [],
    recentTools: [],
  },
  onConvertQueueItem,
  onRetryQueueItem,
  onUpdateQueueItemFormat,
  onRemoveQueueItem,
  onFileDownloaded,
  onConvertAgain,
  as = 'tr',
}) => {
  // Pre-conversion estimated output size
  const [estimatedSize, setEstimatedSize] = useState<number>(() => {
    if (item.estimatedOutputSize && item.estimatedOutputSize > 0) return item.estimatedOutputSize;
    return calculateEstimatedSize(item.inputFormat, item.outputFormat, item.fileSize, item.options);
  });
  const [isFetchingEstimate, setIsFetchingEstimate] = useState(false);

  useEffect(() => {
    if (item.status === 'completed' && item.result?.outputSize) {
      return;
    }

    if (item.estimatedOutputSize && item.estimatedOutputSize > 0) {
      setEstimatedSize(item.estimatedOutputSize);
      return;
    }

    // Immediate client calculation
    const immediateEst = calculateEstimatedSize(
      item.inputFormat,
      item.outputFormat,
      item.fileSize,
      item.options
    );
    setEstimatedSize(immediateEst);

    // Server-side estimate fetch
    let isCancelled = false;
    setIsFetchingEstimate(true);
    fetchEstimatedOutputSize(item.inputFormat, item.outputFormat, item.fileSize, item.options)
      .then((serverEst) => {
        if (!isCancelled && serverEst > 0) {
          setEstimatedSize(serverEst);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsFetchingEstimate(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [item.inputFormat, item.outputFormat, item.fileSize, item.options, item.estimatedOutputSize, item.status, item.result]);

  const cap = capabilities.find(
    (c) =>
      c.extension === item.inputFormat.toLowerCase() ||
      (item.inputFormat.toLowerCase() === 'jpeg' && c.extension === 'jpg')
  );
  const supportedOutputs =
    item.uploadedFile?.supportedOutputs && item.uploadedFile.supportedOutputs.length > 0
      ? item.uploadedFile.supportedOutputs
      : cap?.supportedOutputs || ['png', 'jpg', 'pdf'];

  const getFormatIcon = (format: string) => {
    const f = format.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'tiff', 'avif'].includes(f)) {
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    }
    if (['obj', 'stl', 'fbx', 'ply', '3mf', 'off'].includes(f)) {
      return <Box className="w-4 h-4 text-purple-500" />;
    }
    if (['dxf', 'dwg', 'nc', 'dstv', 'gcode'].includes(f)) {
      return <Box className="w-4 h-4 text-amber-500" />;
    }
    if (['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'].includes(f)) {
      return <Music className="w-4 h-4 text-pink-500" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(f)) {
      return <Video className="w-4 h-4 text-indigo-500" />;
    }
    if (['csv', 'json', 'yaml', 'parquet', 'xml', 'tsv'].includes(f)) {
      return <FileCode className="w-4 h-4 text-cyan-500" />;
    }
    return <FileText className="w-4 h-4 text-slate-500" />;
  };

  const formatUploadTime = (createdAt?: string): string => {
    if (!createdAt) return 'Just now';
    try {
      const date = new Date(createdAt);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  // Post-conversion compression ratio
  const completedRatio =
    item.status === 'completed' && item.result?.outputSize && item.fileSize
      ? getCompressionRatio(item.fileSize, item.result.outputSize)
      : null;

  // Pre-conversion estimated ratio
  const estimatedRatio =
    item.status !== 'completed' && estimatedSize > 0 && item.fileSize
      ? getCompressionRatio(item.fileSize, estimatedSize)
      : null;

  // ==========================================
  // TABLE ROW RENDER (Default for Table views)
  // ==========================================
  if (as === 'tr') {
    return (
      <tr
        id={`queue-item-${item.id}`}
        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
      >
        {/* Filename & Format Icon */}
        <td className="py-3.5 px-3 max-w-[200px] sm:max-w-xs truncate">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
              {getFormatIcon(item.inputFormat)}
            </div>
            <div className="truncate">
              <span
                className="font-bold text-[#0F172A] dark:text-[#F8FAFC] block truncate"
                title={item.fileName}
              >
                {item.fileName}
              </span>
              {item.error && (
                <span
                  className="text-[11px] font-medium text-rose-500 block truncate mt-0.5"
                  title={item.error}
                >
                  {item.error}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Format (Input -> Output) */}
        <td className="py-3.5 px-3">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] font-mono uppercase font-semibold text-[11px]">
              .{item.inputFormat}
            </span>
            <span className="text-[#64748B] dark:text-[#94A3B8]">→</span>
            {item.status === 'pending' || item.status === 'failed' ? (
              <select
                value={item.outputFormat}
                onChange={(e) =>
                  onUpdateQueueItemFormat && onUpdateQueueItemFormat(item.id, e.target.value)
                }
                className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-bold text-xs focus:ring-2 focus:ring-[#2563EB] focus:outline-none cursor-pointer"
              >
                {supportedOutputs.map((out) => (
                  <option key={out} value={out}>
                    .{out.toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-mono uppercase font-bold text-[11px]">
                .{item.outputFormat}
              </span>
            )}
          </div>
        </td>

        {/* Size: Pre-Conversion Estimated Size OR Post-Conversion Compression Ratio */}
        <td className="py-3.5 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
          {item.status === 'completed' && completedRatio && item.result?.outputSize ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  {formatFileSize(item.result.outputSize)}
                </span>
                {/* Compression ratio badge */}
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black ${
                    completedRatio.isReduction
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                      : completedRatio.percent === 0
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                  }`}
                  title={`Original: ${formatFileSize(item.fileSize)} | ${completedRatio.multiplier}`}
                >
                  {completedRatio.isReduction ? (
                    <TrendingDown className="w-2.5 h-2.5" />
                  ) : completedRatio.percent === 0 ? (
                    <Minus className="w-2.5 h-2.5" />
                  ) : (
                    <TrendingUp className="w-2.5 h-2.5" />
                  )}
                  {completedRatio.ratioLabel}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                from {formatFileSize(item.fileSize)}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                {formatFileSize(item.fileSize)}
              </div>
              {/* Pre-conversion estimated output size */}
              {estimatedSize > 0 && (
                <div
                  className="flex items-center gap-1 text-[10px] text-[#2563EB] dark:text-blue-400 font-semibold"
                  title={`Estimated output size: ~${formatFileSize(estimatedSize)} (${estimatedRatio?.ratioLabel || ''})`}
                >
                  <Gauge className="w-2.5 h-2.5 shrink-0" />
                  <span>Est. ~{formatFileSize(estimatedSize)}</span>
                  {estimatedRatio && estimatedRatio.percent > 0 && (
                    <span className="text-[9px] px-1 rounded bg-blue-50 dark:bg-blue-950/70 border border-blue-200/50 dark:border-blue-800/50 font-bold">
                      {estimatedRatio.ratioLabel}
                    </span>
                  )}
                  {isFetchingEstimate && <RefreshCw className="w-2 h-2 animate-spin shrink-0 opacity-70" />}
                </div>
              )}
            </div>
          )}
        </td>

        {/* Status */}
        <td className="py-3.5 px-3 min-w-[140px]">
          {item.status === 'pending' && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                isBatchPaused
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isBatchPaused ? (
                <>
                  <Pause className="w-2.5 h-2.5 fill-current" />
                  <span>Paused</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Queued</span>
                </>
              )}
            </span>
          )}

          {item.status === 'uploading' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[130px]">
                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                  <span className="truncate">{item.statusText || 'Uploading...'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {Math.round(item.progress || 30)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress || 30}%` }}
                />
              </div>
            </div>
          )}

          {item.status === 'converting' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-[#2563EB] dark:text-blue-300 font-semibold truncate max-w-[130px]">
                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                  <span className="truncate">Processing...</span>
                </span>
                <span className="text-[10px] font-mono text-blue-500 dark:text-blue-400 font-bold">
                  {Math.round(item.progress || 40)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress || 40}%` }}
                />
              </div>
            </div>
          )}

          {item.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          )}

          {item.status === 'failed' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Failed
            </span>
          )}
        </td>

        {/* Upload Date / Time */}
        <td className="py-3.5 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
          <span
            title={item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
            className="text-[11px]"
          >
            {formatUploadTime(item.createdAt)}
          </span>
        </td>

        {/* Actions */}
        <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
          {item.status === 'pending' && onConvertQueueItem && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onConvertQueueItem(item.id);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-[11px] transition-colors shadow-sm cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Convert</span>
            </button>
          )}

          {item.status === 'failed' && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (onRetryQueueItem) {
                  onRetryQueueItem(item.id);
                } else if (onConvertQueueItem) {
                  onConvertQueueItem(item.id);
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}

          {item.status === 'completed' && (item.result?.jobId || item.uploadedFile?.jobId) && (
            <div className="inline-flex items-center gap-1.5">
              <a
                href={`/api/download/${item.result?.jobId || item.uploadedFile?.jobId}`}
                download
                onClick={() => {
                  if (userPrefs.autoDeleteAfterDownload) {
                    const jobId = item.result?.jobId || item.uploadedFile?.jobId;
                    if (onFileDownloaded && jobId) {
                      onFileDownloaded(jobId, item.id);
                    } else if (onRemoveQueueItem) {
                      onRemoveQueueItem(item.id);
                    }
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
              {onConvertAgain && (
                <button
                  type="button"
                  onClick={() => onConvertAgain(item)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] font-semibold text-[11px] transition-colors cursor-pointer"
                  title="Convert this file again with different format or settings"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Convert Again</span>
                </button>
              )}
            </div>
          )}

          {onRemoveQueueItem && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onRemoveQueueItem(item.id);
              }}
              className="p-1 rounded text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              title="Remove from queue"
            >
              ✕
            </button>
          )}
        </td>
      </tr>
    );
  }

  // ==========================================
  // CARD RENDER (For mobile or card view)
  // ==========================================
  return (
    <div
      id={`queue-card-${item.id}`}
      className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
            {getFormatIcon(item.inputFormat)}
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="font-bold text-xs text-[#0F172A] dark:text-[#F8FAFC] truncate" title={item.fileName}>
              {item.fileName}
            </h5>
            <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              <span>Original: {formatFileSize(item.fileSize)}</span>
              <span>•</span>
              <span className="uppercase font-mono font-bold">.{item.inputFormat} → .{item.outputFormat}</span>
            </div>
          </div>
        </div>

        {onRemoveQueueItem && (
          <button
            type="button"
            onClick={() => onRemoveQueueItem(item.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            title="Remove from queue"
          >
            ✕
          </button>
        )}
      </div>

      {/* Pre-Conversion Estimate or Post-Conversion Compression Ratio */}
      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {item.status === 'completed' && completedRatio && item.result?.outputSize ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">Output:</span>
              <span className="font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {formatFileSize(item.result.outputSize)}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black ${
                completedRatio.isReduction
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
              }`}
            >
              {completedRatio.isReduction ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span>{completedRatio.ratioLabel}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] text-[#2563EB] dark:text-blue-400 font-semibold">
              <Gauge className="w-3.5 h-3.5" />
              <span>Est. Output: ~{formatFileSize(estimatedSize)}</span>
            </div>
            {estimatedRatio && estimatedRatio.percent > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300">
                {estimatedRatio.ratioLabel}
              </span>
            )}
          </>
        )}
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] text-slate-400">{formatUploadTime(item.createdAt)}</span>
        <div className="flex items-center gap-1.5">
          {item.status === 'pending' && onConvertQueueItem && (
            <button
              onClick={() => onConvertQueueItem(item.id)}
              className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white font-bold text-xs flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Convert</span>
            </button>
          )}
          {item.status === 'completed' && (item.result?.jobId || item.uploadedFile?.jobId) && (
            <a
              href={`/api/download/${item.result?.jobId || item.uploadedFile?.jobId}`}
              download
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
