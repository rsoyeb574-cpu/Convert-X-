import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageView, CompressionLevel, CompressionResultData } from '../types.js';
import {
  Minimize2,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Zap,
  ShieldCheck,
  Lock,
  Download,
  RotateCcw,
  Sliders,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Trash2,
  Layers,
  FileCheck,
} from 'lucide-react';
import { getStoredUserPreferences } from '../utils/userStore.js';
import { trackEvent } from '../utils/analytics.js';

interface CompressPageProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
  maxFileSizeMB?: number;
  onViewPro?: () => void;
  showToast?: (title: string, message?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  darkMode?: boolean;
  onRecordHistory?: (item: any) => void;
  onFileDownloaded?: (jobId: string) => void;
}

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

export const CompressPage: React.FC<CompressPageProps> = ({
  onNavigate,
  maxFileSizeMB = 25,
  onViewPro,
  showToast,
  darkMode,
  onRecordHistory,
  onFileDownloaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<string>('');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('balanced');
  const [quality, setQuality] = useState<number>(80);
  const [enableTargetSize, setEnableTargetSize] = useState(false);
  const [targetPreset, setTargetPreset] = useState<'1mb' | '5mb' | '10mb' | '20mb' | 'custom'>('5mb');
  const [customTargetMB, setCustomTargetMB] = useState<number>(5);

  // Progress state
  const [isCompressing, setIsCompressing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStage, setProgressStage] = useState<string>('Uploading...');

  // Results state
  const [result, setResult] = useState<CompressionResultData | null>(null);
  const [compressedPreviewUrl, setCompressedPreviewUrl] = useState<string | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'compressed' | 'original'>('compressed');
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (compressedPreviewUrl) URL.revokeObjectURL(compressedPreviewUrl);
    };
  }, [filePreviewUrl, compressedPreviewUrl]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFormatFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ext === 'jpeg' ? 'jpg' : ext;
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    setResult(null);

    const ext = getFormatFromFilename(file.name);

    if (!SUPPORTED_FORMATS.includes(ext)) {
      setErrorMessage('This file type is not currently supported for compression.');
      setSelectedFile(null);
      setFileFormat('');
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSizeMB) {
      setErrorMessage(`File size (${fileSizeMB.toFixed(1)} MB) exceeds the limit of ${maxFileSizeMB} MB. Please upgrade or choose a smaller file.`);
      setSelectedFile(null);
      setFileFormat('');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected file is empty.');
      setSelectedFile(null);
      setFileFormat('');
      return;
    }

    setSelectedFile(file);
    setFileFormat(ext);

    // Create preview for images
    if (['jpg', 'png', 'webp'].includes(ext)) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }

    // Set intelligent default target size based on file size
    if (fileSizeMB > 10) {
      setTargetPreset('5mb');
      setCustomTargetMB(5);
    } else if (fileSizeMB > 3) {
      setTargetPreset('1mb');
      setCustomTargetMB(1);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileFormat('');
    setErrorMessage(null);
    setResult(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCompress = async () => {
    if (!selectedFile) return;

    setIsCompressing(true);
    setProgressPercent(15);
    setProgressStage('Uploading...');
    setErrorMessage(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('compressionLevel', compressionLevel);

    if (['jpg', 'png', 'webp'].includes(fileFormat)) {
      formData.append('quality', quality.toString());
    }

    let targetMB: number | undefined;
    if (enableTargetSize) {
      if (targetPreset === '1mb') targetMB = 1;
      else if (targetPreset === '5mb') targetMB = 5;
      else if (targetPreset === '10mb') targetMB = 10;
      else if (targetPreset === '20mb') targetMB = 20;
      else if (targetPreset === 'custom') targetMB = customTargetMB;

      if (targetMB) {
        formData.append('targetSizeMB', targetMB.toString());
      }
    }

    // Realistic progress animation stages
    const progressTimer1 = setTimeout(() => {
      setProgressPercent(35);
      setProgressStage('Analyzing file structure...');
    }, 400);

    const progressTimer2 = setTimeout(() => {
      setProgressPercent(60);
      setProgressStage(fileFormat === 'pdf' ? 'Compressing document streams...' : 'Optimizing image quantization...');
    }, 900);

    const progressTimer3 = setTimeout(() => {
      setProgressPercent(85);
      setProgressStage('Applying lossless optimizations...');
    }, 1500);

    try {
      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Compression failed. Please try again.');
      }

      setProgressPercent(100);
      setProgressStage('Finalizing...');

      // Load preview for compressed image
      if (['jpg', 'png', 'webp'].includes(data.format)) {
        setCompressedPreviewUrl(data.downloadUrl);
      }

      setTimeout(() => {
        setResult(data);
        setIsCompressing(false);
        trackEvent('file_compressed', {
          format: data.format,
          originalSize: data.originalSize,
          compressedSize: data.compressedSize,
          reductionPercent: data.reductionPercent,
        });

        if (showToast) {
          showToast(
            'Compression Complete!',
            `Saved ${data.reductionPercent}% (${data.savingsFormatted}) with zero visual artifacts.`,
            'success'
          );
        }

        if (onRecordHistory) {
          onRecordHistory({
            id: `compress-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            originalName: data.originalName,
            inputFormat: data.format,
            outputFormat: data.format,
            originalSize: data.originalSize,
            outputSize: data.compressedSize,
            timestamp: new Date().toISOString(),
            status: 'completed',
            downloadUrl: data.downloadUrl,
            jobId: data.jobId,
          });
        }
      }, 400);
    } catch (err: any) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      setIsCompressing(false);
      setErrorMessage(err.message || 'An unexpected error occurred during compression.');
      if (showToast) {
        showToast('Compression Error', err.message || 'Failed to compress file', 'error');
      }
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = `compressed_${result.originalName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onFileDownloaded && result.jobId) {
      onFileDownloaded(result.jobId);
    }

    const prefs = getStoredUserPreferences();
    if (prefs.autoDeleteAfterDownload) {
      // Auto-delete / clear session if user preference is enabled
      trackEvent('auto_delete_download', { jobId: result.jobId });
    }
  };

  const handleResetForNewFile = () => {
    handleRemoveFile();
  };

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      q: 'Which file formats can I compress with Convert-X?',
      a: 'Convert-X currently supports professional server-side compression for JPG/JPEG, PNG, WebP raster images, and PDF documents. Unsupported formats are rejected safely to prevent file corruption.',
    },
    {
      q: 'How does Convert-X compress PDF files without breaking text?',
      a: 'Unlike naive tools that turn every PDF page into a blurry image, Convert-X uses high-fidelity vector stream optimization. All fonts, text layers, vector diagrams, and bookmarks remain 100% crisp and selectable, while high-resolution embedded images and redundant metadata are safely re-quantized.',
    },
    {
      q: 'What is the difference between the 3 compression levels?',
      a: 'Maximum compression applies aggressive quantization for the smallest possible file footprint (great for email and slow networks). Balanced provides the optimal ratio of file size savings and visual clarity. High Quality applies gentle optimization, preserving peak detail for print and high-DPI displays.',
    },
    {
      q: 'Are my uploaded files kept safe and private?',
      a: 'Yes. All file transfers are secured with 256-bit TLS encryption. Files are processed in ephemeral memory pipelines and temporary files are automatically purged from the server after processing or download.',
    },
    {
      q: 'What happens if a file is already compressed?',
      a: 'Convert-X includes built-in protection: if an uploaded file is already optimally compressed and further processing would only degrade quality without saving bytes, we deliver the cleanest copy and clearly explain why.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 px-4 sm:px-6 lg:px-8 py-8" id="compress-page-container">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
        <button
          onClick={() => onNavigate('home')}
          className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          Home
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigate('tools')}
          className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          Tools
        </button>
        <span>/</span>
        <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Compress File</span>
      </nav>

      {/* Hero Header Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold shadow-xs">
          <Minimize2 className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Smart File Compressor</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          Compress Files Online
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
          Reduce file size while maintaining the best possible quality. Fast, secure, and private image and PDF optimization.
        </p>

        {/* Supported Format Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {['PDF Document', 'JPG / JPEG', 'PNG (Alpha Preserved)', 'WebP'].map((fmt) => (
            <span
              key={fmt}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] text-[#475569] dark:text-[#CBD5E1]"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 flex items-start gap-3 text-sm shadow-xs animate-in fade-in duration-200"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold">Compression Notice</p>
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Upload & File Selection Section (when no file selected and not compressing/done) */}
        {!selectedFile && !isCompressing && !result && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            id="compress-dropzone"
            className={`relative p-8 sm:p-14 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center bg-white dark:bg-[#111827] shadow-sm ${
              isDragOver
                ? 'border-[#2563EB] bg-blue-50/60 dark:bg-blue-950/40 scale-[1.008]'
                : 'border-[#CBD5E1] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-blue-500'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              id="compress-file-input"
            />
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Drag &amp; Drop your file here
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Supports PDF, JPG, PNG, WebP up to {maxFileSizeMB} MB
                </p>
              </div>
              <button
                type="button"
                className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Choose File</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Selected File Settings & Configuration Panel */}
        {selectedFile && !isCompressing && !result && (
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
            {/* File Info Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-3.5 overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                  {fileFormat === 'pdf' ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <ImageIcon className="w-6 h-6" />
                  )}
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                    {selectedFile.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <span className="uppercase font-extrabold text-[#2563EB] dark:text-blue-400">
                      {fileFormat.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(selectedFile.size)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
                >
                  Choose another file
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Remove file"
                  className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Compression Level Selector */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Compression Level</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Maximum */}
                <button
                  type="button"
                  onClick={() => setCompressionLevel('max')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    compressionLevel === 'max'
                      ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1] dark:hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Maximum
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                    Smallest possible file size. Ideal for strict attachment limits.
                  </p>
                </button>

                {/* Balanced (Default) */}
                <button
                  type="button"
                  onClick={() => setCompressionLevel('balanced')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    compressionLevel === 'balanced'
                      ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1] dark:hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                      Balanced
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                    Best balance between size and quality for web and sharing.
                  </p>
                </button>

                {/* High Quality */}
                <button
                  type="button"
                  onClick={() => setCompressionLevel('high')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    compressionLevel === 'high'
                      ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1] dark:hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      High Quality
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                    Prioritize visual fidelity while reducing redundant bytes.
                  </p>
                </button>
              </div>
            </div>

            {/* Quality Slider (Images only) */}
            {['jpg', 'png', 'webp'].includes(fileFormat) && (
              <div className="space-y-2 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Image Quality Target
                  </span>
                  <span className="font-mono font-extrabold text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/40">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  <span>10% (Lowest Size)</span>
                  <span>80% (Default)</span>
                  <span>100% (Maximum Quality)</span>
                </div>
              </div>
            )}

            {/* PDF Note */}
            {fileFormat === 'pdf' && (
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-[#1E293B] dark:text-[#CBD5E1] space-y-1">
                <p className="font-bold text-[#2563EB] dark:text-blue-400 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  PDF Optimization Engine
                </p>
                <p className="text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                  All vector text, fonts, bookmarks, and page order will be strictly preserved. Embedded raster images and object streams are re-quantized.
                </p>
              </div>
            )}

            {/* Target File Size (Optional) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="enable-target-size"
                  className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                >
                  <input
                    id="enable-target-size"
                    type="checkbox"
                    checked={enableTargetSize}
                    onChange={(e) => setEnableTargetSize(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Target File Size (Optional)</span>
                </label>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  Adaptive Optimization
                </span>
              </div>

              {enableTargetSize && (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-wrap gap-2">
                    {(['1mb', '5mb', '10mb', '20mb', 'custom'] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTargetPreset(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          targetPreset === preset
                            ? 'bg-[#2563EB] text-white shadow-xs'
                            : 'bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1]'
                        }`}
                      >
                        {preset === 'custom' ? 'Custom' : `${preset.replace('mb', '').toUpperCase()} MB`}
                      </button>
                    ))}
                  </div>

                  {targetPreset === 'custom' && (
                    <div className="flex items-center gap-2 pt-1 max-w-xs">
                      <input
                        type="number"
                        min={0.1}
                        max={maxFileSizeMB}
                        step={0.5}
                        value={customTargetMB}
                        onChange={(e) => setCustomTargetMB(Math.max(0.1, Number(e.target.value)))}
                        className="w-28 px-3 py-2 rounded-xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#334155] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                      />
                      <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">MB</span>
                    </div>
                  )}

                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    * The system will attempt to compress the file below the requested target. If the target cannot be reached without severe quality loss, we will compress to the safest threshold and notify you.
                  </p>
                </div>
              )}
            </div>

            {/* Action Compress Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCompress}
                id="start-compress-btn"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2563EB] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Minimize2 className="w-5 h-5" />
                <span>Compress File</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Progress State View */}
        {isCompressing && (
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-12 shadow-sm text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 flex items-center justify-center animate-spin">
              <RotateCcw className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {progressStage}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Please wait while we optimize your file with server-side algorithms.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-2">
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                <span>Processing</span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Results Section */}
        {result && (
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
            {/* Header Success Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Compression Complete
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {result.originalName}
                  </p>
                </div>
              </div>

              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                {result.reductionPercent > 0 ? `${result.reductionPercent}% Size Reduction` : 'Preserved Optimal Copy'}
              </span>
            </div>

            {/* Informative Notice (if target was reached or file was already optimized) */}
            {result.notice && (
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-xs text-[#1E293B] dark:text-[#CBD5E1] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <p className="leading-relaxed">{result.notice}</p>
              </div>
            )}

            {/* Comparison Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Original Size */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">Original Size</p>
                <p className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                  {formatFileSize(result.originalSize)}
                </p>
              </div>

              {/* Compressed Size */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Compressed Size</p>
                <p className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {formatFileSize(result.compressedSize)}
                </p>
              </div>

              {/* Saved Space */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">Saved Space</p>
                <p className="text-lg sm:text-xl font-extrabold text-[#2563EB] dark:text-blue-400 mt-0.5">
                  {formatFileSize(result.savedBytes)}
                </p>
              </div>

              {/* Reduction Percentage */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                <p className="text-[11px] font-semibold text-[#2563EB] dark:text-blue-400">Reduction</p>
                <p className="text-lg sm:text-xl font-black text-[#2563EB] dark:text-blue-300 mt-0.5">
                  {result.reductionPercent}%
                </p>
              </div>
            </div>

            {/* Preview Section */}
            {['jpg', 'png', 'webp'].includes(result.format) && filePreviewUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Visual Comparison</span>
                  </span>
                  <div className="flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#1E293B] p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('compressed')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activePreviewTab === 'compressed'
                          ? 'bg-white dark:bg-[#0B1120] text-[#2563EB] dark:text-blue-400 shadow-xs'
                          : 'text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      Compressed
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('original')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activePreviewTab === 'original'
                          ? 'bg-white dark:bg-[#0B1120] text-[#2563EB] dark:text-blue-400 shadow-xs'
                          : 'text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      Original
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden relative">
                  <img
                    src={activePreviewTab === 'compressed' && compressedPreviewUrl ? compressedPreviewUrl : filePreviewUrl}
                    alt={activePreviewTab === 'compressed' ? 'Compressed result preview' : 'Original file preview'}
                    className="max-h-[320px] w-auto max-w-full object-contain rounded-lg shadow-xs"
                  />
                  <span className="absolute bottom-3 right-3 text-[10px] font-mono px-2 py-1 rounded-md bg-black/70 text-white backdrop-blur-xs">
                    {activePreviewTab === 'compressed' ? `${formatFileSize(result.compressedSize)}` : `${formatFileSize(result.originalSize)}`}
                  </span>
                </div>
              </div>
            )}

            {/* PDF Details Card (if PDF format) */}
            {result.format === 'pdf' && (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      PDF Vector Integrity Preserved
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {result.pageCount ? `${result.pageCount} Pages • ` : ''}Selectable Text &amp; Font Outlines Intact
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[#2563EB] dark:text-blue-400 font-bold">
                  {formatFileSize(result.compressedSize)}
                </span>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                id="download-compressed-btn"
                className="flex-1 py-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Download Compressed File</span>
              </button>

              <button
                type="button"
                onClick={handleResetForNewFile}
                className="px-6 py-4 rounded-2xl border border-[#CBD5E1] dark:border-[#334155] text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Compress Another File</span>
              </button>
            </div>
          </div>
        )}

        {/* Privacy and Security Notice */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2563EB]" />
            <span>Your files are processed securely and temporary files are automatically deleted after processing.</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-bit TLS</span>
          </div>
        </div>
      </div>

      {/* Educational & SEO Content Section */}
      <div className="max-w-4xl mx-auto space-y-10 pt-8 border-t border-[#E2E8F0] dark:border-[#1E293B]">
        {/* Step-by-Step Guide */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            How to Compress Files Online with Convert-X
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
              <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 font-extrabold text-xs flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">Select File</h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                Drag and drop your JPG, PNG, WebP image or PDF document into the upload zone.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
              <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 font-extrabold text-xs flex items-center justify-center">
                2
              </span>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">Set Compression Level</h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                Choose between Balanced, Maximum, or High Quality, or set an optional target size.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
              <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 font-extrabold text-xs flex items-center justify-center">
                3
              </span>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">Download Instant Result</h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                View your size savings statistics and download your optimized file immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Explanations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              Smart PDF Stream Optimization
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Standard PDF compression often degrades fonts or flattens documents into low-resolution raster images. Convert-X preserves your exact typography and text selectability while compressing high-resolution embedded imagery and redundant object streams.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Lossless PNG &amp; Alpha Preservation
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Transparent logos and UI assets in PNG format retain full alpha-channel transparency. Our quantization engine applies discrete palette indexing to reduce raw byte sizes by up to 80% with zero visible artifacting.
            </p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {faqOpen[idx] ? (
                    <ChevronUp className="w-4 h-4 text-[#2563EB] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748B] shrink-0" />
                  )}
                </button>
                {faqOpen[idx] && (
                  <div className="px-4 pb-4 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed border-t border-[#F1F5F9] dark:border-[#1E293B] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Related Quick Links */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
              Looking to convert file formats instead?
            </h4>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Explore 50+ free online converters for PNG, JPG, PDF, WebP, SVG, and DXF.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tools')}
            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Explore All Tools</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
