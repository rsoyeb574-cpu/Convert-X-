import React, { useRef, useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { ConversionHistoryItem, ConversionQueueItem, FormatCapability, PageView, AppLimits, UserPreferences } from '../types.js';
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
  Archive,
  RotateCcw,
  Check,
  ShieldCheck,
  Cpu,
  Minimize2,
  Star,
  Flame,
  Settings,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Calendar,
  Search,
  Pause,
  Play,
  Square,
} from 'lucide-react';
import { ReferralWidget } from './ReferralWidget.js';
import { AdSlot } from './AdSlot.js';
import { toggleFavoriteTool, getStoredUserPreferences, saveUserPreferences } from '../utils/userStore.js';

interface DashboardHistoryProps {
  queue?: ConversionQueueItem[];
  history: ConversionHistoryItem[];
  capabilities?: FormatCapability[];
  usedToday?: number;
  limits?: AppLimits;
  isPro?: boolean;
  userPreferences?: UserPreferences;
  onPreferencesChange?: (prefs: UserPreferences) => void;
  onClearHistory: () => void;
  onRemoveItem: (id: string) => void;
  onConvertNew: () => void;
  onNavigate?: (view: PageView) => void;
  onOpenSeoRoute?: (slug: string) => void;
  onAddFiles?: (files: File[]) => void;
  onConvertAllPending?: () => void;
  onPauseBatch?: () => void;
  onResumeBatch?: () => void;
  onStopBatch?: () => void;
  isBatchPaused?: boolean;
  onConvertQueueItem?: (id: string) => void;
  onRetryQueueItem?: (id: string) => void;
  onUpdateQueueItemFormat?: (id: string, format: string) => void;
  onRemoveQueueItem?: (id: string) => void;
  onClearQueue?: () => void;
  onCombineToPdf?: () => Promise<void> | void;
  onConvertAgain?: (item: ConversionHistoryItem | ConversionQueueItem) => void;
  isConvertingAll?: boolean;
  isCombiningPdf?: boolean;
  isReturningUser?: boolean;
  onOpenAccountModal?: () => void;
  onFileDownloaded?: (jobId?: string, queueItemId?: string) => void;
}

export const DashboardHistory: React.FC<DashboardHistoryProps> = ({
  queue = [],
  history = [],
  capabilities = [],
  usedToday = 0,
  limits,
  isPro = false,
  userPreferences,
  onPreferencesChange,
  onClearHistory,
  onRemoveItem,
  onConvertNew,
  onNavigate,
  onOpenSeoRoute,
  onAddFiles,
  onConvertAllPending,
  onPauseBatch,
  onResumeBatch,
  onStopBatch,
  isBatchPaused = false,
  onConvertQueueItem,
  onRetryQueueItem,
  onUpdateQueueItemFormat,
  onRemoveQueueItem,
  onClearQueue,
  onCombineToPdf,
  onConvertAgain,
  isConvertingAll = false,
  isCombiningPdf = false,
  isReturningUser = false,
  onOpenAccountModal,
  onFileDownloaded,
}) => {
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipStatusMessage, setZipStatusMessage] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [zipError, setZipError] = useState<string | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(() => userPreferences || getStoredUserPreferences());

  useEffect(() => {
    if (userPreferences) {
      setUserPrefs(userPreferences);
    }
  }, [userPreferences]);
  const [popularTools, setPopularTools] = useState<
    { slug: string; from: string; to: string; count: number; name: string }[]
  >([]);

  const [detailedUsage, setDetailedUsage] = useState<{
    conversions?: { used: number; limit: number | string; remaining: number | string };
    compressions?: { used: number; limit: number | string; remaining: number | string };
    tts?: { used: number; limit: number | string; remaining: number | string; maxCharacters: number };
    plan?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.usage) {
          setDetailedUsage(data.usage);
        }
      })
      .catch(() => {});
  }, [usedToday]);

  // Queue sorting state
  type QueueSortField = 'createdAt' | 'fileName' | 'fileSize' | 'status';
  type HistorySortField = 'date' | 'fileName' | 'size' | 'status';
  type SortDirection = 'asc' | 'desc';

  const [queueSortField, setQueueSortField] = useState<QueueSortField>('createdAt');
  const [queueSortDir, setQueueSortDir] = useState<SortDirection>('desc');
  const [queueSearchQuery, setQueueSearchQuery] = useState<string>('');

  // History sorting state
  const [historySortField, setHistorySortField] = useState<HistorySortField>('date');
  const [historySortDir, setHistorySortDir] = useState<SortDirection>('desc');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  const handleQueueSort = (field: QueueSortField) => {
    if (queueSortField === field) {
      setQueueSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setQueueSortField(field);
      setQueueSortDir(field === 'fileName' ? 'asc' : 'desc');
    }
  };

  const handleHistorySort = (field: HistorySortField) => {
    if (historySortField === field) {
      setHistorySortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setHistorySortField(field);
      setHistorySortDir(field === 'fileName' ? 'asc' : 'desc');
    }
  };

  const formatUploadTime = (isoString?: string): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '—';
      const now = Date.now();
      const diffSec = Math.floor((now - d.getTime()) / 1000);
      if (diffSec < 10) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const sortedAndFilteredQueue = useMemo(() => {
    let list = queue;
    if (queueSearchQuery.trim()) {
      const q = queueSearchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.fileName.toLowerCase().includes(q) ||
          item.inputFormat.toLowerCase().includes(q) ||
          item.outputFormat.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (queueSortField === 'fileName') {
        cmp = (a.fileName || '').localeCompare(b.fileName || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (queueSortField === 'fileSize') {
        const sizeA = a.result?.outputSize || a.fileSize || 0;
        const sizeB = b.result?.outputSize || b.fileSize || 0;
        cmp = sizeA - sizeB;
      } else if (queueSortField === 'createdAt') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = timeA - timeB;
      } else if (queueSortField === 'status') {
        const statusWeight: Record<string, number> = {
          uploading: 0,
          converting: 1,
          pending: 2,
          failed: 3,
          completed: 4,
        };
        cmp = (statusWeight[a.status] ?? 5) - (statusWeight[b.status] ?? 5);
      }
      return queueSortDir === 'asc' ? cmp : -cmp;
    });
  }, [queue, queueSortField, queueSortDir, queueSearchQuery]);

  const sortedAndFilteredHistory = useMemo(() => {
    let list = history;
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.fileName.toLowerCase().includes(q) ||
          item.inputFormat.toLowerCase().includes(q) ||
          item.outputFormat.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (historySortField === 'fileName') {
        cmp = (a.fileName || '').localeCompare(b.fileName || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (historySortField === 'size') {
        const sizeA = a.outputSize || a.fileSize || a.originalSize || 0;
        const sizeB = b.outputSize || b.fileSize || b.originalSize || 0;
        cmp = sizeA - sizeB;
      } else if (historySortField === 'date') {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        cmp = timeA - timeB;
      } else if (historySortField === 'status') {
        const statusWeight: Record<string, number> = {
          queued: 0,
          processing: 1,
          failed: 2,
          completed: 3,
        };
        cmp = (statusWeight[a.status] ?? 4) - (statusWeight[b.status] ?? 4);
      }
      return historySortDir === 'asc' ? cmp : -cmp;
    });
  }, [history, historySortField, historySortDir, historySearchQuery]);

  useEffect(() => {
    fetch('/api/metrics/popular-tools')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.tools)) {
          setPopularTools(data.tools);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleFavorite = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedFavs = toggleFavoriteTool(slug);
    setUserPrefs((prev) => ({ ...prev, favoriteTools: updatedFavs }));
  };

  const dailyLimit = limits?.dailyConversions ?? 5;
  const remainingConversions = isPro ? 'Unlimited' : Math.max(0, dailyLimit - usedToday);

  const formatSize = (bytes?: number): string => {
    if (!bytes || isNaN(bytes)) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFormatIcon = (format: string) => {
    const ext = (format || '').toLowerCase();
    if (ext === 'dxf' || ext === 'dwg') return <Layers className="w-4 h-4 text-amber-500" />;
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-emerald-500" />;
    if (ext === 'svg' || ext === 'ai' || ext === 'psd') return <Sparkles className="w-4 h-4 text-violet-500" />;
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  };

  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const convertingCount = queue.filter((item) => item.status === 'converting' || item.status === 'uploading').length;
  const completedQueueCount = queue.filter((item) => item.status === 'completed').length;
  const failedCount = queue.filter((item) => item.status === 'failed').length;
  const totalBatchItems = queue.length;

  const handleAddFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAddFiles) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // Drag and Drop state for Dashboard Queue Section
  const [isQueueDragOver, setIsQueueDragOver] = useState<boolean>(false);
  const queueDragCounterRef = useRef<number>(0);

  const handleQueueDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    queueDragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      e.dataTransfer.dropEffect = 'copy';
      setIsQueueDragOver(true);
    }
  };

  const handleQueueDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isQueueDragOver) {
      setIsQueueDragOver(true);
    }
  };

  const handleQueueDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    queueDragCounterRef.current -= 1;
    if (queueDragCounterRef.current <= 0) {
      queueDragCounterRef.current = 0;
      setIsQueueDragOver(false);
    }
  };

  const handleQueueDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    queueDragCounterRef.current = 0;
    setIsQueueDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onAddFiles) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Parallel Multi-File ZIP Download Engine
  const handleDownloadAllZip = async (targetItems?: (ConversionQueueItem | ConversionHistoryItem)[]) => {
    const completedItems = (targetItems || queue).filter(
      (q) => q.status === 'completed' && (q.result?.jobId || q.uploadedFile?.jobId)
    );

    if (completedItems.length === 0) return;

    setIsZipping(true);
    setZipError(null);
    setZipProgress(10);
    setZipStatusMessage(`Downloading ${completedItems.length} converted file${completedItems.length > 1 ? 's' : ''} in parallel...`);

    try {
      // 1. Trigger parallel HTTP fetch requests for all completed files
      const parallelFetchPromises = completedItems.map(async (item, index) => {
        const jobId = item.result?.jobId || item.uploadedFile?.jobId;
        const res = await fetch(`/api/download/${jobId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch converted file for "${item.fileName}"`);
        }
        const blob = await res.blob();
        
        // Calculate safe distinct output filename
        const rawName = item.fileName || `file_${index + 1}`;
        const dotIndex = rawName.lastIndexOf('.');
        const baseName = dotIndex > 0 ? rawName.substring(0, dotIndex) : rawName;
        const ext = item.outputFormat || 'png';
        const fileName = `${baseName}_converted.${ext}`;

        return { fileName, blob };
      });

      const downloadedFiles = await Promise.all(parallelFetchPromises);
      setZipProgress(60);
      setZipStatusMessage(`Compressing ${downloadedFiles.length} file${downloadedFiles.length > 1 ? 's' : ''} into ZIP archive...`);

      // 2. Package all parallel-downloaded files into a standard ZIP using JSZip
      const zip = new JSZip();
      downloadedFiles.forEach(({ fileName, blob }) => {
        zip.file(fileName, blob);
      });

      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          setZipProgress(60 + Math.round(metadata.percent * 0.35));
        }
      );

      // 3. Trigger immediate browser file download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const zipFilename = `convertx_batch_${timestamp}.zip`;

      const blobUrl = window.URL.createObjectURL(zipBlob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.setAttribute('download', zipFilename);
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
      window.URL.revokeObjectURL(blobUrl);

      setZipProgress(100);
      setZipStatusMessage('Archive ready & downloaded!');
      setTimeout(() => {
        setZipStatusMessage(null);
        setZipProgress(0);
      }, 3000);

      // Auto-delete after download cleanup if enabled
      if (userPrefs.autoDeleteAfterDownload) {
        completedItems.forEach((item) => {
          if (onRemoveQueueItem && 'progress' in item) {
            onRemoveQueueItem(item.id);
          }
        });
        if (onFileDownloaded) {
          onFileDownloaded();
        }
      }
    } catch (clientErr: any) {
      console.warn('Direct parallel client ZIP fallback to server endpoint:', clientErr);
      
      // Fallback: request server-side ZIP packaging via /api/download-zip
      try {
        const completedJobIds = completedItems.map((q) => q.result?.jobId || q.uploadedFile!.jobId);
        const response = await fetch('/api/download-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds: completedJobIds, zipName: 'convertx_batch_export.zip' }),
        });

        if (!response.ok) {
          throw new Error('Could not package files into ZIP. Some temporary files may have expired.');
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.setAttribute('download', 'convertx_batch_export.zip');
        document.body.appendChild(tempLink);
        tempLink.click();
        tempLink.remove();
        window.URL.revokeObjectURL(blobUrl);

        // Auto-delete after download cleanup if enabled
        if (userPrefs.autoDeleteAfterDownload) {
          completedItems.forEach((item) => {
            if (onRemoveQueueItem && 'progress' in item) {
              onRemoveQueueItem(item.id);
            }
          });
          if (onFileDownloaded) {
            onFileDownloaded();
          }
        }
      } catch (err: any) {
        setZipError(err.message || 'ZIP download failed. Please try downloading files individually.');
      }
    } finally {
      setIsZipping(false);
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

      {/* ==================================================
          1. PROFESSIONAL USER DASHBOARD STATS & QUICK ACTIONS
          ================================================== */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6 transition-colors">
        {/* Returning User Welcome Banner */}
        {isReturningUser && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                <strong>Welcome back!</strong> Your saved conversion preferences and favorite tools are ready.
              </span>
            </div>
            {onOpenAccountModal && (
              <button
                onClick={onOpenAccountModal}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/50 text-[#2563EB] dark:text-blue-400 font-bold text-[11px] hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                Preferences
              </button>
            )}
          </div>
        )}

        {/* Dashboard Title & Plan Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                Convert-X Dashboard
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
              Manage file conversions, monitor real-time quotas, and access recent downloads.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Account & Preferences Modal Trigger */}
            {onOpenAccountModal && (
              <button
                onClick={onOpenAccountModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Account & Preferences</span>
              </button>
            )}

            {/* Plan Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">Plan:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  isPro
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                }`}
              >
                {isPro ? 'PRO' : 'FREE'}
              </span>
            </div>
          </div>
        </div>

        {/* Quota & Usage Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Conversions Usage Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Conversions
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-[#2563EB] dark:text-blue-300">
                {isPro ? 'Unlimited' : '5 / day'}
              </span>
            </div>
            <div className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {isPro
                ? `${detailedUsage?.conversions?.used ?? usedToday} used`
                : `${detailedUsage?.conversions?.used ?? usedToday} / ${detailedUsage?.conversions?.limit ?? dailyLimit}`}
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isPro
                    ? 'bg-emerald-500 w-full'
                    : (detailedUsage?.conversions?.used ?? usedToday) >= Number(detailedUsage?.conversions?.limit ?? dailyLimit)
                    ? 'bg-rose-500'
                    : 'bg-[#2563EB]'
                }`}
                style={{
                  width: isPro
                    ? '100%'
                    : `${Math.min(
                        100,
                        ((detailedUsage?.conversions?.used ?? usedToday) /
                          Number(detailedUsage?.conversions?.limit ?? (dailyLimit || 1))) *
                          100
                      )}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
              {isPro ? 'Unlimited conversions active' : `${detailedUsage?.conversions?.remaining ?? remainingConversions} remaining today`}
            </p>
          </div>

          {/* Compression Usage Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Compression
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                {isPro ? 'Unlimited' : '5 / day'}
              </span>
            </div>
            <div className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {isPro
                ? `${detailedUsage?.compressions?.used ?? 0} jobs`
                : `${detailedUsage?.compressions?.used ?? 0} / ${detailedUsage?.compressions?.limit ?? 5}`}
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isPro
                    ? 'bg-emerald-500 w-full'
                    : (detailedUsage?.compressions?.used ?? 0) >= 5
                    ? 'bg-rose-500'
                    : 'bg-violet-600'
                }`}
                style={{
                  width: isPro
                    ? '100%'
                    : `${Math.min(100, ((detailedUsage?.compressions?.used ?? 0) / 5) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
              {isPro ? 'Unlimited compression active' : `${detailedUsage?.compressions?.remaining ?? 5} remaining today`}
            </p>
          </div>

          {/* Text-to-Voice Usage Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Text to Voice
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                {isPro ? 'Unlimited' : '3 / day'}
              </span>
            </div>
            <div className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {isPro
                ? `${detailedUsage?.tts?.used ?? 0} voices`
                : `${detailedUsage?.tts?.used ?? 0} / ${detailedUsage?.tts?.limit ?? 3}`}
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isPro
                    ? 'bg-emerald-500 w-full'
                    : (detailedUsage?.tts?.used ?? 0) >= 3
                    ? 'bg-rose-500'
                    : 'bg-emerald-600'
                }`}
                style={{
                  width: isPro ? '100%' : `${Math.min(100, ((detailedUsage?.tts?.used ?? 0) / 3) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
              {isPro ? 'Up to 50k chars/gen' : `${detailedUsage?.tts?.remaining ?? 3} remaining (5k chars/gen)`}
            </p>
          </div>

          {/* Plan & Upgrade CTA Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/50 space-y-2 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 uppercase tracking-wider block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> {isPro ? 'Pro Member' : 'Upgrade Plan'}
              </span>
              <div className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                {isPro ? 'Zero File Retaining' : 'Unlock Pro at ₹99/mo'}
              </div>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] leading-tight mt-0.5">
                {isPro
                  ? 'Priority queue, 100MB files, and no ads.'
                  : 'Get unlimited conversions, 100MB uploads, batch mode & no ads.'}
              </p>
            </div>
            {onNavigate && !isPro && (
              <button
                onClick={() => onNavigate('pricing')}
                className="w-full mt-1 py-1.5 px-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Upgrade to Pro</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Favorite & Recently Used Tools Section */}
        <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Favorite & Quick Tools</span>
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Click star to pin tools
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { slug: 'png-to-pdf', label: 'PNG to PDF' },
              { slug: 'jpg-to-png', label: 'JPG to PNG' },
              { slug: 'pdf-to-png', label: 'PDF to PNG' },
              { slug: 'png-to-jpg', label: 'PNG to JPG' },
              { slug: 'image-to-pdf', label: 'Image to PDF' },
              { slug: 'image-compressor', label: 'Compress Image' },
              { slug: 'pdf-compressor', label: 'Compress PDF' },
            ].map((tool) => {
              const isFav = userPrefs.favoriteTools.includes(tool.slug);
              return (
                <div
                  key={tool.slug}
                  onClick={() => {
                    if (onOpenSeoRoute) onOpenSeoRoute(tool.slug);
                    else if (onNavigate) onNavigate('converter');
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                    isFav
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:border-blue-400 hover:text-[#0F172A]'
                  }`}
                >
                  <span>{tool.label}</span>
                  <button
                    onClick={(e) => handleToggleFavorite(tool.slug, e)}
                    className="p-0.5 text-slate-400 hover:text-amber-500 cursor-pointer"
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star
                      className={`w-3 h-3 ${isFav ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Online Tools (Real Aggregate Telemetry) */}
        {popularTools.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Popular Conversion Tools</span>
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Real-time usage rankings
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {popularTools.slice(0, 4).map((tool) => (
                <button
                  key={tool.slug}
                  onClick={() => {
                    if (onOpenSeoRoute) onOpenSeoRoute(tool.slug);
                    else if (onNavigate) onNavigate('converter');
                  }}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] truncate">
                    {tool.name}
                  </span>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span className="font-mono uppercase">{tool.from} → {tool.to}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-[#2563EB]" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <span className="text-xs font-black text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider block">
            Quick Actions
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {/* 1. Upload Files */}
            <button
              type="button"
              onClick={() => {
                if (onConvertNew) onConvertNew();
                addFileInputRef.current?.click();
              }}
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all group flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <Plus className="w-5 h-5 text-[#2563EB] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB]">
                Upload Files
              </span>
            </button>

            {/* 2. Image to PDF */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSeoRoute) onOpenSeoRoute('png-to-pdf');
                else if (onNavigate) onNavigate('converter');
              }}
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all group flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <FileText className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB]">
                Image to PDF
              </span>
            </button>

            {/* 3. PDF to Image */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSeoRoute) onOpenSeoRoute('pdf-to-png');
                else if (onNavigate) onNavigate('converter');
              }}
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all group flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <ImageIcon className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB]">
                PDF to Image
              </span>
            </button>

            {/* 4. Image Converter */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSeoRoute) onOpenSeoRoute('png-to-jpg');
                else if (onNavigate) onNavigate('converter');
              }}
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all group flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <Sparkles className="w-5 h-5 text-violet-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB]">
                Image Converter
              </span>
            </button>

            {/* 5. Compress Image */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSeoRoute) onOpenSeoRoute('image-compressor');
                else if (onNavigate) onNavigate('converter');
              }}
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all group flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <Minimize2 className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB]">
                Compress Image
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================
          2. CONVERSION QUEUE & BATCH PROGRESS EXPERIENCE
          ================================================== */}
      <div
        onDragEnter={handleQueueDragEnter}
        onDragOver={handleQueueDragOver}
        onDragLeave={handleQueueDragLeave}
        onDrop={handleQueueDrop}
        aria-dropeffect="copy"
        className={`bg-white dark:bg-[#111827] border rounded-2xl p-6 shadow-xl space-y-6 transition-all duration-200 relative overflow-hidden ${
          isQueueDragOver
            ? 'border-[#2563EB] ring-4 ring-blue-500/20 bg-blue-50/70 dark:bg-blue-950/40 scale-[1.005]'
            : 'border-[#E2E8F0] dark:border-[#1E293B]'
        }`}
      >
        {isQueueDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 pointer-events-none border-2 border-dashed border-[#2563EB] rounded-2xl z-20 flex items-center justify-center">
            <div className="bg-white dark:bg-[#111827] px-6 py-3 rounded-xl border border-blue-200 dark:border-blue-800 shadow-xl flex items-center gap-3">
              <Plus className="w-5 h-5 text-[#2563EB] animate-bounce" />
              <span className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC]">
                Drop files here to add to conversion queue
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2563EB]" />
                <span>Conversion Queue</span>
              </h3>
              {isBatchPaused ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1.5 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <Pause className="w-3 h-3 fill-current" />
                  <span>Batch Paused ({pendingCount} waiting)</span>
                </span>
              ) : totalBatchItems > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                  {completedQueueCount} / {totalBatchItems} completed
                </span>
              ) : null}
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Manage pending jobs, configure target formats, and execute batch conversions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Auto-Convert on Upload Toggle Button */}
            <button
              type="button"
              id="quick-auto-convert-toggle-btn"
              onClick={() => {
                const nextVal = !userPrefs.autoConvertOnUpload;
                const updated = saveUserPreferences({ autoConvertOnUpload: nextVal });
                setUserPrefs(updated);
                if (onPreferencesChange) onPreferencesChange(updated);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                userPrefs.autoConvertOnUpload
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border-blue-300 dark:border-blue-800/80 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B]'
              }`}
              title="Toggle auto-convert on upload: automatically convert new files when added to the queue"
            >
              <Zap className={`w-3.5 h-3.5 ${userPrefs.autoConvertOnUpload ? 'text-[#2563EB] fill-current' : 'text-slate-400'}`} />
              <span>Auto-convert: {userPrefs.autoConvertOnUpload ? 'ON' : 'OFF'}</span>
            </button>

            {/* Quick Auto-Delete after Download Toggle Button */}
            <button
              type="button"
              id="quick-auto-delete-toggle-btn"
              onClick={() => {
                const nextVal = !userPrefs.autoDeleteAfterDownload;
                const updated = saveUserPreferences({ autoDeleteAfterDownload: nextVal });
                setUserPrefs(updated);
                if (onPreferencesChange) onPreferencesChange(updated);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                userPrefs.autoDeleteAfterDownload
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B]'
              }`}
              title="Toggle auto-delete after download: automatically clear files from queue & storage once downloaded"
            >
              <Trash2 className={`w-3.5 h-3.5 ${userPrefs.autoDeleteAfterDownload ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>Auto-delete: {userPrefs.autoDeleteAfterDownload ? 'ON' : 'OFF'}</span>
            </button>

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

            {/* Batch Conversion Controls: Convert All / Processing Status / Pause Batch / Resume Batch / Stop Batch */}
            {isConvertingAll ? (
              <div className="flex items-center gap-1.5">
                {isBatchPaused ? (
                  <>
                    {/* Resume Batch Button */}
                    <button
                      type="button"
                      id="resume-batch-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        onResumeBatch?.();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Resume the batch conversion worker loop"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume Batch</span>
                    </button>

                    {/* Stop Batch Button */}
                    {onStopBatch && (
                      <button
                        type="button"
                        id="stop-batch-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          onStopBatch();
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Stop batch conversion worker loop and keep remaining files pending"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Processing Batch Status Indicator */}
                    <div className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-extrabold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB] dark:text-blue-400" />
                      <span>Processing Batch{convertingCount > 0 ? ` (${convertingCount})` : ''}</span>
                    </div>

                    {/* Pause Batch Button */}
                    {onPauseBatch && (
                      <button
                        type="button"
                        id="pause-batch-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          onPauseBatch();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-extrabold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Temporarily pause the conversion worker loop to conserve CPU, memory, and network resources"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Batch</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* When not running batch, show Convert All if there are pending or failed items */
              (pendingCount > 0 || failedCount > 0) &&
              onConvertAllPending && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onConvertAllPending();
                  }}
                  disabled={convertingCount > 0 || isCombiningPdf}
                  id="convert-all-pending-btn"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 disabled:opacity-60 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Convert All ({pendingCount + failedCount})</span>
                </button>
              )
            )}

            {/* Real ZIP Download All Button (Download Center) */}
            {completedQueueCount >= 1 && (
              <button
                type="button"
                onClick={() => handleDownloadAllZip()}
                disabled={isZipping}
                id="download-all-btn"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
                title={`Trigger parallel download and package ${completedQueueCount} completed file(s) into a ZIP archive`}
              >
                {isZipping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Packaging {completedQueueCount} Files...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Download All ({completedQueueCount} ZIP)</span>
                  </>
                )}
              </button>
            )}

            {/* Combine / Merge into Single PDF Button */}
            {queue.length >= 2 && onCombineToPdf && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onCombineToPdf();
                }}
                disabled={isCombiningPdf || isConvertingAll}
                id="combine-pdf-btn"
                className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                title="Combine all uploaded files into a multi-page PDF document"
              >
                {isCombiningPdf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Merging into PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Combine to PDF</span>
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

        {/* Batch Paused Resource-Saver Alert Banner */}
        {isBatchPaused && (
          <div
            id="batch-paused-alert-banner"
            className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-xs"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <Pause className="w-4 h-4 fill-current" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>Batch Queue Conversion Paused</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    Resource Saver Active
                  </span>
                </div>
                <p className="text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs">
                  The conversion worker loop is temporarily halted to conserve CPU, memory, and bandwidth. In-flight jobs finish gracefully; {pendingCount} file(s) are on standby.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {onResumeBatch && (
                <button
                  type="button"
                  id="banner-resume-batch-btn"
                  onClick={onResumeBatch}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Resume Batch</span>
                </button>
              )}
              {onStopBatch && (
                <button
                  type="button"
                  id="banner-stop-batch-btn"
                  onClick={onStopBatch}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        )}

        {/* Real-time ZIP Packaging Progress & Status Alert */}
        {zipStatusMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                {isZipping ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{zipStatusMessage}</span>
              </div>
              <span>{zipProgress}%</span>
            </div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900/40 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 dark:bg-emerald-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${zipProgress}%` }}
              />
            </div>
          </div>
        )}

        {zipError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {zipError}
          </div>
        )}

        {/* Queue Table with Sorting Controls */}
        {queue.length > 0 ? (
          <div className="space-y-3">
            {/* Sorting & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
              {/* Left: Quick Sort Controls */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1 mr-1">
                  <SlidersHorizontal className="w-3 h-3 text-[#2563EB]" />
                  <span>Sort by:</span>
                </span>

                {/* Upload Date Sort Button */}
                <button
                  type="button"
                  onClick={() => handleQueueSort('createdAt')}
                  id="sort-queue-date-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    queueSortField === 'createdAt'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title={`Sort by Upload Date (${queueSortField === 'createdAt' && queueSortDir === 'desc' ? 'Newest first' : 'Oldest first'})`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Upload Date</span>
                  {queueSortField === 'createdAt' && (
                    queueSortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#2563EB]" /> : <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* File Name Sort Button */}
                <button
                  type="button"
                  onClick={() => handleQueueSort('fileName')}
                  id="sort-queue-name-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    queueSortField === 'fileName'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title={`Sort by File Name (${queueSortField === 'fileName' && queueSortDir === 'asc' ? 'A to Z' : 'Z to A'})`}
                >
                  <FileText className="w-3 h-3" />
                  <span>File Name</span>
                  {queueSortField === 'fileName' && (
                    queueSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* File Size Sort Button */}
                <button
                  type="button"
                  onClick={() => handleQueueSort('fileSize')}
                  id="sort-queue-size-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    queueSortField === 'fileSize'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title={`Sort by File Size (${queueSortField === 'fileSize' && queueSortDir === 'desc' ? 'Largest first' : 'Smallest first'})`}
                >
                  <span>Size</span>
                  {queueSortField === 'fileSize' && (
                    queueSortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#2563EB]" /> : <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* Status Sort Button */}
                <button
                  type="button"
                  onClick={() => handleQueueSort('status')}
                  id="sort-queue-status-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    queueSortField === 'status'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title="Sort by Status"
                >
                  <span>Status</span>
                  {queueSortField === 'status' && (
                    queueSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* Toggle Direction Button */}
                <button
                  type="button"
                  onClick={() => setQueueSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title={`Current order: ${queueSortDir === 'asc' ? 'Ascending' : 'Descending'}. Click to toggle.`}
                >
                  {queueSortDir === 'asc' ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                      <span className="text-[11px]">Asc</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                      <span className="text-[11px]">Desc</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: Search Filter Input */}
              {queue.length > 2 && (
                <div className="relative shrink-0 max-w-xs w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    placeholder="Filter queue files..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                  {queueSearchQuery && (
                    <button
                      onClick={() => setQueueSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Queue Table */}
            {sortedAndFilteredQueue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold text-[10px]">
                      {/* Sortable Filename Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleQueueSort('fileName')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by file name"
                        >
                          <span className={queueSortField === 'fileName' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Filename
                          </span>
                          {queueSortField === 'fileName' ? (
                            queueSortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Format Header */}
                      <th className="py-3 px-3">Format</th>

                      {/* Sortable Size Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleQueueSort('fileSize')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by file size"
                        >
                          <span className={queueSortField === 'fileSize' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Size
                          </span>
                          {queueSortField === 'fileSize' ? (
                            queueSortDir === 'desc' ? (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Sortable Status Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleQueueSort('status')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by status"
                        >
                          <span className={queueSortField === 'status' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Status
                          </span>
                          {queueSortField === 'status' ? (
                            queueSortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Sortable Upload Date / Time Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleQueueSort('createdAt')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by upload date"
                        >
                          <span className={queueSortField === 'createdAt' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Uploaded
                          </span>
                          {queueSortField === 'createdAt' ? (
                            queueSortDir === 'desc' ? (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Actions Header */}
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
                    {sortedAndFilteredQueue.map((item) => {
                      const cap = capabilities.find(
                        (c) => c.extension === item.inputFormat.toLowerCase() || (item.inputFormat.toLowerCase() === 'jpeg' && c.extension === 'jpg')
                      );
                      const supportedOutputs =
                        item.uploadedFile?.supportedOutputs && item.uploadedFile.supportedOutputs.length > 0
                          ? item.uploadedFile.supportedOutputs
                          : cap?.supportedOutputs || ['png', 'jpg', 'pdf'];
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Filename */}
                          <td className="py-3.5 px-3 max-w-[200px] sm:max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                                {getFormatIcon(item.inputFormat)}
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] block truncate" title={item.fileName}>
                                  {item.fileName}
                                </span>
                                {item.error && (
                                  <span className="text-[11px] font-medium text-rose-500 block truncate mt-0.5" title={item.error}>
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

                          {/* Size */}
                          <td className="py-3.5 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                            {item.result?.outputSize ? (
                              <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatSize(item.result.outputSize)}</span>
                            ) : (
                              <span>{formatSize(item.fileSize)}</span>
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
                                  <span className="text-[10px] font-mono text-slate-400">{Math.round(item.progress || 30)}%</span>
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
                                  <span className="text-[10px] font-mono text-blue-500 dark:text-blue-400 font-bold">{Math.round(item.progress || 40)}%</span>
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
                            <span title={item.createdAt ? new Date(item.createdAt).toLocaleString() : ''} className="text-[11px]">
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
                                      if (onFileDownloaded) {
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] font-semibold text-[11px] transition-colors"
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
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
                No files match filter &quot;{queueSearchQuery}&quot;.{' '}
                <button
                  onClick={() => setQueueSearchQuery('')}
                  className="text-[#2563EB] dark:text-blue-400 font-bold hover:underline ml-1"
                >
                  Clear filter
                </button>
              </div>
            )}
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
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Files to Queue</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================
          3. PERSISTENT CONVERSION HISTORY & EXPIRED FILE HANDLING
          ================================================== */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2563EB]" />
              <span>Conversion History</span>
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Persistent metadata log of past conversions. Expired file sessions retain conversion metadata.
            </p>
          </div>

          {history.length > 0 && (
            <div className="flex items-center gap-2">
              {history.some((h) => h.status === 'completed' && h.result?.jobId && !h.isExpired) && (
                <button
                  onClick={() => handleDownloadAllZip(history.filter((h) => !h.isExpired))}
                  disabled={isZipping}
                  id="download-all-history-btn"
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="Download all active history files in a single ZIP"
                >
                  <Archive className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download All (ZIP)</span>
                </button>
              )}
              <button
                onClick={onClearHistory}
                id="clear-history-btn"
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold border border-[#E2E8F0] dark:border-[#1E293B] transition-colors flex items-center gap-1.5 w-fit cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Clear History</span>
              </button>
            </div>
          )}
        </div>

        {history.length > 0 ? (
          <div className="space-y-3">
            {/* Sorting & Filter Toolbar for History */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
              {/* Left: Quick Sort Controls */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1 mr-1">
                  <SlidersHorizontal className="w-3 h-3 text-[#2563EB]" />
                  <span>Sort by:</span>
                </span>

                {/* Date Sort Button */}
                <button
                  type="button"
                  onClick={() => handleHistorySort('date')}
                  id="sort-history-date-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    historySortField === 'date'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title={`Sort by Date (${historySortField === 'date' && historySortDir === 'desc' ? 'Newest first' : 'Oldest first'})`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Date</span>
                  {historySortField === 'date' && (
                    historySortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#2563EB]" /> : <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* File Name Sort Button */}
                <button
                  type="button"
                  onClick={() => handleHistorySort('fileName')}
                  id="sort-history-name-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    historySortField === 'fileName'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title={`Sort by File Name (${historySortField === 'fileName' && historySortDir === 'asc' ? 'A to Z' : 'Z to A'})`}
                >
                  <FileText className="w-3 h-3" />
                  <span>File Name</span>
                  {historySortField === 'fileName' && (
                    historySortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* Size Sort Button */}
                <button
                  type="button"
                  onClick={() => handleHistorySort('size')}
                  id="sort-history-size-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    historySortField === 'size'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title={`Sort by Size (${historySortField === 'size' && historySortDir === 'desc' ? 'Largest first' : 'Smallest first'})`}
                >
                  <span>Size</span>
                  {historySortField === 'size' && (
                    historySortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#2563EB]" /> : <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* Status Sort Button */}
                <button
                  type="button"
                  onClick={() => handleHistorySort('status')}
                  id="sort-history-status-btn"
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    historySortField === 'status'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title="Sort by Status"
                >
                  <span>Status</span>
                  {historySortField === 'status' && (
                    historySortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#2563EB]" /> : <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                  )}
                </button>

                {/* Toggle Direction Button */}
                <button
                  type="button"
                  onClick={() => setHistorySortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title={`Current order: ${historySortDir === 'asc' ? 'Ascending' : 'Descending'}. Click to toggle.`}
                >
                  {historySortDir === 'asc' ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                      <span className="text-[11px]">Asc</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                      <span className="text-[11px]">Desc</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: Search Filter Input */}
              {history.length > 2 && (
                <div className="relative shrink-0 max-w-xs w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Filter history..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* History Table */}
            {sortedAndFilteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold text-[10px]">
                      {/* Sortable Filename Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleHistorySort('fileName')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by file name"
                        >
                          <span className={historySortField === 'fileName' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Filename
                          </span>
                          {historySortField === 'fileName' ? (
                            historySortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Format Header */}
                      <th className="py-3 px-3">Format</th>

                      {/* Sortable Size Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleHistorySort('size')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by size"
                        >
                          <span className={historySortField === 'size' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Size
                          </span>
                          {historySortField === 'size' ? (
                            historySortDir === 'desc' ? (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Sortable Status Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleHistorySort('status')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by status"
                        >
                          <span className={historySortField === 'status' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Status
                          </span>
                          {historySortField === 'status' ? (
                            historySortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Sortable Date / Time Header */}
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleHistorySort('date')}
                          className="flex items-center gap-1.5 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors group cursor-pointer focus:outline-none"
                          title="Click to sort by conversion date"
                        >
                          <span className={historySortField === 'date' ? 'text-[#2563EB] dark:text-blue-400 font-black' : ''}>
                            Time
                          </span>
                          {historySortField === 'date' ? (
                            historySortDir === 'desc' ? (
                              <ArrowDown className="w-3 h-3 text-[#2563EB]" />
                            ) : (
                              <ArrowUp className="w-3 h-3 text-[#2563EB]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>

                      {/* Actions Header */}
                      <th className="py-3 px-3 text-right">Download / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
                    {sortedAndFilteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Filename */}
                        <td className="py-3 px-3 font-bold text-[#0F172A] dark:text-[#F8FAFC] max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                              {getFormatIcon(item.inputFormat)}
                            </div>
                            <span className="truncate" title={item.fileName}>{item.fileName}</span>
                          </div>
                        </td>

                        {/* Format */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] font-mono uppercase font-semibold text-[10px]">
                              .{item.inputFormat}
                            </span>
                            <span className="text-[#64748B] dark:text-[#94A3B8]">→</span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-mono uppercase font-bold text-[10px]">
                              .{item.outputFormat}
                            </span>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                          {formatSize(item.outputSize || item.fileSize || item.originalSize)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-[10px] border border-slate-200 dark:border-slate-700">
                              File expired — convert again
                            </span>
                          ) : item.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                              <Check className="w-3 h-3" /> Completed
                            </span>
                          ) : item.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 font-semibold text-[10px]">
                              {item.status}
                            </span>
                          )}
                        </td>

                        {/* Time */}
                        <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                          {item.completionTime || (item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                          {/* Active Download */}
                          {!item.isExpired && item.status === 'completed' && item.jobId && (
                            <a
                              href={`/api/download/${item.jobId}`}
                              download
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-[11px] transition-colors shadow-xs"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          )}

                          {/* Convert Again (Always available) */}
                          {onConvertAgain && (
                            <button
                              type="button"
                              onClick={() => onConvertAgain(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Convert Again</span>
                            </button>
                          )}

                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 rounded text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                            title="Remove from history"
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
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
                No history records match filter &quot;{historySearchQuery}&quot;.{' '}
                <button
                  onClick={() => setHistorySearchQuery('')}
                  className="text-[#2563EB] dark:text-blue-400 font-bold hover:underline ml-1"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2 bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl">
            <Clock className="w-8 h-8 text-[#64748B] dark:text-[#94A3B8] mx-auto opacity-70" />
            <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">No conversion records yet</p>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Completed conversions are logged here with metadata and download links.
            </p>
          </div>
        )}
      </div>

      {/* Referral System */}
      <ReferralWidget onUpgradeClick={() => onNavigate?.('pricing')} onNavigate={onNavigate} />

      {/* AdSlot (Free tier only) */}
      {!isPro && <AdSlot slotId="dashboard-bottom-slot" format="leaderboard" />}
    </div>
  );
};

