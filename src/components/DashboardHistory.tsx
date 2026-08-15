import React, { useRef } from 'react';
import { ConversionHistoryItem, ConversionQueueItem, FormatCapability, PageView } from '../types.js';
import {
  Clock,
  Download,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Plus,
  Layers,
  FileCode,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ReferralWidget } from './ReferralWidget.js';
import { AdSlot } from './AdSlot.js';

interface DashboardHistoryProps {
  queue?: ConversionQueueItem[];
  history: ConversionHistoryItem[];
  capabilities?: FormatCapability[];
  onClearHistory: () => void;
  onRemoveItem: (id: string) => void;
  onConvertNew: () => void;
  onNavigate?: (view: PageView) => void;
  onAddFiles?: (files: File[]) => void;
  onConvertAllPending?: () => void;
  onConvertQueueItem?: (id: string) => void;
  onRetryQueueItem?: (id: string) => void;
  onUpdateQueueItemFormat?: (id: string, format: string) => void;
  onRemoveQueueItem?: (id: string) => void;
  onClearQueue?: () => void;
  onCombineToPdf?: () => Promise<void> | void;
  isConvertingAll?: boolean;
  isCombiningPdf?: boolean;
}

export const DashboardHistory: React.FC<DashboardHistoryProps> = ({
  queue = [],
  history,
  capabilities = [],
  onClearHistory,
  onRemoveItem,
  onConvertNew,
  onNavigate,
  onAddFiles,
  onConvertAllPending,
  onConvertQueueItem,
  onRetryQueueItem,
  onUpdateQueueItemFormat,
  onRemoveQueueItem,
  onClearQueue,
  onCombineToPdf,
  isConvertingAll = false,
  isCombiningPdf = false,
}) => {
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes?: number): string => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFormatIcon = (format: string) => {
    const ext = format.toLowerCase();
    if (ext === 'dxf') return <Layers className="w-4 h-4 text-amber-500" />;
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-emerald-500" />;
    if (ext === 'svg') return <Sparkles className="w-4 h-4 text-violet-500" />;
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  };

  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const convertingCount = queue.filter((item) => item.status === 'converting' || item.status === 'uploading').length;
  const completedCount = queue.filter((item) => item.status === 'completed').length;
  const failedCount = queue.filter((item) => item.status === 'failed').length;

  const handleAddFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAddFiles) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Hidden file input for adding more files to queue */}
      <input
        type="file"
        ref={addFileInputRef}
        onChange={handleAddFilesChange}
        className="hidden"
        accept=".docx,.xlsx,.txt,.html,.htm,.pptx,.odt,.rtf,.pdf,.psd,.ai,.dxf,.svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.tif,.avif,.eps,.dwg,.dwf,.cdr,.obj,.3ds,.stl"
        multiple
      />

      {/* SECTION 1: Active Conversion Queue */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2563EB]" />
                <span>Conversion Queue</span>
              </h3>
              {queue.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                  {queue.length} {queue.length === 1 ? 'file' : 'files'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Manage pending jobs, configure target formats per file, and execute batch conversions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Add More Files Button */}
            {onAddFiles && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  addFileInputRef.current?.click();
                }}
                id="queue-add-files-btn"
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold border border-[#E2E8F0] dark:border-[#1E293B] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Add Files</span>
              </button>
            )}

            {/* Convert All Pending Button */}
            {(pendingCount > 0 || failedCount > 0) && onConvertAllPending && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onConvertAllPending();
                }}
                disabled={isConvertingAll || convertingCount > 0 || isCombiningPdf}
                id="convert-all-pending-btn"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 disabled:opacity-60 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isConvertingAll || convertingCount > 0 ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Convert All ({pendingCount + failedCount})</span>
                  </>
                )}
              </button>
            )}

            {/* Combine / Merge into Single PDF Button (Goal 10) */}
            {queue.length >= 2 && onCombineToPdf && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onCombineToPdf();
                }}
                disabled={isCombiningPdf || isConvertingAll}
                id="combine-pdf-btn"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                title="Combine all uploaded files into a multi-page PDF document"
              >
                {isCombiningPdf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Merging into PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Combine into 1 PDF ({queue.length} files)</span>
                  </>
                )}
              </button>
            )}

            {/* Clear Queue Button */}
            {queue.length > 0 && onClearQueue && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onClearQueue();
                }}
                id="clear-queue-btn"
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold border border-[#E2E8F0] dark:border-[#1E293B] transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all queue items"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Queue</span>
              </button>
            )}
          </div>
        </div>

        {/* Queue Table / List */}
        {queue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold text-[10px]">
                  <th className="py-3 px-3">File</th>
                  <th className="py-3 px-3">Input</th>
                  <th className="py-3 px-3">Target Format</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Status / Progress</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
                {queue.map((item) => {
                  const cap = capabilities.find(
                    (c) => c.extension === item.inputFormat.toLowerCase() || (item.inputFormat.toLowerCase() === 'jpeg' && c.extension === 'jpg')
                  );
                  const supportedOutputs =
                    item.uploadedFile?.supportedOutputs && item.uploadedFile.supportedOutputs.length > 0
                      ? item.uploadedFile.supportedOutputs
                      : cap?.supportedOutputs || ['png', 'jpg'];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* File Name */}
                      <td className="py-3.5 px-3 max-w-[200px] sm:max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                            {getFormatIcon(item.inputFormat)}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] block truncate">
                              {item.fileName}
                            </span>
                            {item.error && (
                              <span className="text-[11px] font-medium text-rose-500 block truncate mt-0.5">
                                {item.error}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Input Format Badge */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] font-mono uppercase font-semibold text-[11px]">
                          .{item.inputFormat}
                        </span>
                      </td>

                      {/* Output Format Selector */}
                      <td className="py-3.5 px-3">
                        {item.status === 'pending' || item.status === 'failed' ? (
                          <select
                            value={item.outputFormat}
                            onChange={(e) =>
                              onUpdateQueueItemFormat && onUpdateQueueItemFormat(item.id, e.target.value)
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-bold text-xs focus:ring-2 focus:ring-[#2563EB] focus:outline-none cursor-pointer"
                          >
                            {supportedOutputs.map((out) => (
                              <option key={out} value={out}>
                                → .{out.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-mono uppercase font-bold text-[11px]">
                            .{item.outputFormat}
                          </span>
                        )}
                      </td>

                      {/* File Size */}
                      <td className="py-3.5 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        {item.result?.outputSize ? (
                          <span>{formatSize(item.result.outputSize)}</span>
                        ) : (
                          <span>{formatSize(item.fileSize)}</span>
                        )}
                      </td>

                      {/* Status / Progress Bar */}
                      <td className="py-3.5 px-3 min-w-[140px]">
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        )}

                        {item.status === 'uploading' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Uploading...
                            </span>
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
                            <span className="inline-flex items-center gap-1.5 text-[#2563EB] dark:text-blue-300 font-semibold text-[11px]">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Converting...
                            </span>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${item.progress || 60}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ready
                          </span>
                        )}

                        {item.status === 'failed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
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
                          <a
                            href={`/api/download/${item.result?.jobId || item.uploadedFile?.jobId}`}
                            download
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
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
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 space-y-3 bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl">
            <Layers className="w-10 h-10 text-[#64748B] dark:text-[#94A3B8] mx-auto opacity-70" />
            <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">No files currently in conversion queue</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
              Upload multiple images, PDFs, DXF blueprints or vector files to configure and batch convert them here.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => addFileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Files to Queue</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Completed Conversion History */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2563EB]" />
              <span>Recent Conversions History</span>
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Completed conversion logs and direct download links for your active session.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              id="clear-history-btn"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold border border-[#E2E8F0] dark:border-[#1E293B] transition-colors flex items-center gap-1.5 w-fit"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold text-[10px]">
                  <th className="py-3 px-3">File Name</th>
                  <th className="py-3 px-3">Input</th>
                  <th className="py-3 px-3">Output</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#0F172A] dark:text-[#F8FAFC] max-w-xs truncate">
                      {item.fileName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] font-mono uppercase font-semibold">
                        .{item.inputFormat}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-mono uppercase font-bold">
                        .{item.outputFormat}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8]">{formatSize(item.outputSize)}</td>
                    <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                      {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                      <a
                        href={`/api/download/${item.jobId}`}
                        download
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-[11px] transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 rounded text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Remove from log"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 space-y-2 bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl">
            <Clock className="w-8 h-8 text-[#64748B] dark:text-[#94A3B8] mx-auto opacity-70" />
            <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">No past conversion records in this session</p>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Completed downloads will be saved here for instant re-download.
            </p>
          </div>
        )}
      </div>

      {/* Referral System Architecture (Requirement 11) */}
      <ReferralWidget onUpgradeClick={() => onNavigate?.('pricing')} />

      {/* Non-intrusive AdSlot (Requirement 4) */}
      <AdSlot slotId="dashboard-bottom-slot" format="leaderboard" />
    </div>
  );
};

