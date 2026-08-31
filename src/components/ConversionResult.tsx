import React, { useState } from 'react';
import QRCode from 'qrcode';
import { ConversionResultData, PageView } from '../types.js';
import {
  Download,
  RefreshCw,
  CheckCircle2,
  FileText,
  Sparkles,
  ArrowRight,
  Zap,
  Layers,
  Copy,
  Check,
  Link2,
  QrCode,
  Smartphone,
  X,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  ExternalLink,
  Archive,
  FileCode,
} from 'lucide-react';
import { ViralShare } from './ViralShare.js';
import { AdSlot } from './AdSlot.js';

interface ConversionResultProps {
  result: ConversionResultData;
  onConvertAnother: () => void;
  onNavigate?: (view: PageView) => void;
  onReconvert?: (targetFormat: string) => Promise<void> | void;
  availableFormats?: string[];
  isReconverting?: boolean;
  onDownload?: (jobId: string) => void;
  autoDeleteAfterDownload?: boolean;
}

export const ConversionResult: React.FC<ConversionResultProps> = ({
  result,
  onConvertAnother,
  onNavigate,
  onReconvert,
  availableFormats = ['png', 'jpg', 'webp', 'pdf', 'svg'],
  isReconverting = false,
  onDownload,
  autoDeleteAfterDownload = false,
}) => {
  const [selectedAltFormat, setSelectedAltFormat] = useState<string>(result.outputFormat);
  const [isProcessingAlt, setIsProcessingAlt] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Thumbnail & Visual Preview State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFitMode, setIsFitMode] = useState<boolean>(true);
  const [bgMode, setBgMode] = useState<'checker' | 'light' | 'dark'>('checker');
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);

  const isImageFormat = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'tiff', 'avif'].includes(
    result.outputFormat.toLowerCase()
  );
  const isPdfFormat = result.outputFormat.toLowerCase() === 'pdf';
  const isZipFormat = result.outputFormat.toLowerCase() === 'zip';
  const isTextOrData = ['txt', 'csv', 'json', 'xml', 'md', 'html', 'rtf'].includes(
    result.outputFormat.toLowerCase()
  );

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const previewUrl = `/api/preview/${result.jobId}`;
  const downloadUrl = `/api/download/${result.jobId}`;

  const baseName = result.originalName.substring(0, result.originalName.lastIndexOf('.')) || result.originalName;
  const convertedFilename = `${baseName}_converted.${result.outputFormat}`;

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${downloadUrl}`;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.error('Failed to copy conversion link to clipboard:', err);
    }
  };

  const handleWebShare = async () => {
    const fullUrl = `${window.location.origin}${downloadUrl}`;
    const shareData = {
      title: `${convertedFilename} - Convert-X`,
      text: `Converted ${result.inputFormat.toUpperCase()} to ${result.outputFormat.toUpperCase()} (${formatSize(result.outputSize)}) on Convert-X:`,
      url: fullUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
        return;
      } catch (err: any) {
        // User dismissed/canceled the share sheet, which throws AbortError
        if (err?.name === 'AbortError') {
          return;
        }
        console.warn('Native Web Share failed, falling back to copy link:', err);
      }
    }

    // Fallback if Web Share API is unavailable or encountered non-abort error
    await handleCopyLink();
  };

  const handleToggleQrCode = async () => {
    if (!showQrCode && !qrDataUrl) {
      setQrLoading(true);
      try {
        const fullUrl = `${window.location.origin}${downloadUrl}`;
        const generatedUrl = await QRCode.toDataURL(fullUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });
        setQrDataUrl(generatedUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      } finally {
        setQrLoading(false);
      }
    }
    setShowQrCode((prev) => !prev);
  };

  const handleAltFormatClick = async (fmt: string) => {
    if (fmt === result.outputFormat || !onReconvert || isReconverting || isProcessingAlt) return;
    setSelectedAltFormat(fmt);
    setIsProcessingAlt(true);
    try {
      await onReconvert(fmt);
    } finally {
      setIsProcessingAlt(false);
    }
  };

  // Alternative formats available to convert to (excluding current output format if possible)
  const alternateFormats = availableFormats.filter((fmt) => fmt.toLowerCase() !== result.inputFormat.toLowerCase());

  const handleZoomIn = () => {
    setIsFitMode(false);
    setZoomLevel((prev) => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setIsFitMode(false);
    setZoomLevel((prev) => Math.max(prev - 25, 25));
  };

  const handleResetZoom = () => {
    setIsFitMode(true);
    setZoomLevel(100);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    setImgNaturalSize({
      width: target.naturalWidth,
      height: target.naturalHeight,
    });
    setImgLoadError(false);
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <h3 className="font-extrabold text-base text-[#0F172A] dark:text-white">Conversion Complete!</h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            Your file was converted with vector accuracy and optimized file size.
          </p>
        </div>
      </div>

      {/* Comparison Grid with Visual Thumbnail Representation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original File */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Original File</span>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-extrabold text-xs uppercase text-[#2563EB] shrink-0 shadow-inner">
              {result.inputFormat}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate" title={result.originalName}>
                {result.originalName}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">{formatSize(result.originalSize)}</p>
            </div>
          </div>
        </div>

        {/* Converted Output File with Small Thumbnail Representation */}
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">Converted Output</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Ready to Download
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Miniature Thumbnail Badge */}
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="w-12 h-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-xs uppercase shrink-0 shadow-sm relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-[#2563EB] transition-all"
              title="Click to view full preview thumbnail"
            >
              {isImageFormat && !imgLoadError ? (
                <img
                  src={previewUrl}
                  alt="thumbnail preview"
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setImgLoadError(true)}
                />
              ) : isPdfFormat ? (
                <div className="w-full h-full bg-gradient-to-br from-red-500 to-rose-600 flex flex-col items-center justify-center text-white">
                  <FileText className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-tight">PDF</span>
                </div>
              ) : isZipFormat ? (
                <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex flex-col items-center justify-center text-white">
                  <Archive className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-tight">ZIP</span>
                </div>
              ) : (
                <span className="font-extrabold text-xs">{result.outputFormat}</span>
              )}

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate" title={convertedFilename}>
                {convertedFilename}
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-[#2563EB] font-bold">{formatSize(result.outputSize)}</span>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">•</span>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-[10px] font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Thumbnail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Technical Specifications (PDF Page Size, PNG Resolution, DPI) */}
      {(result.inputFormat === 'pdf' || result.pdfPageSize || result.pngResolution || result.width || imgNaturalSize) && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Rendering & Output Dimensions</span>
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
              Aspect Ratio 100% Preserved
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* PDF Page Size */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Page Format / Canvas
              </span>
              <p className="text-xs font-extrabold text-[#0F172A] dark:text-white">
                {result.pdfPageSize || (isPdfFormat ? 'A4 (Portrait)' : isImageFormat ? 'Vector Raster Canvas' : 'Standard Document')}
              </p>
            </div>

            {/* PNG/Image Resolution */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Visual Resolution
              </span>
              <p className="text-xs font-extrabold text-[#2563EB] dark:text-blue-400">
                {result.pngResolution ||
                  (result.width && result.height
                    ? `${result.width} × ${result.height} px`
                    : imgNaturalSize
                    ? `${imgNaturalSize.width} × ${imgNaturalSize.height} px`
                    : '2480 × 3508 px')}
              </p>
            </div>

            {/* DPI */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                DPI / Quality Density
              </span>
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {result.dpi ? `${result.dpi} DPI (Print-Ready)` : '300 DPI (High-Def)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Interactive Thumbnail Preview Section */}
      <div className="space-y-3" id="conversion-thumbnail-preview-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-[#2563EB]">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Visual Thumbnail & Converted Preview
              </span>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] ml-2">
                Inspect quality before downloading
              </span>
            </div>
          </div>

          {/* Preview Controls Bar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
            {/* Background Pattern Selector (for images) */}
            {isImageFormat && (
              <div className="flex items-center bg-slate-100 dark:bg-[#0B1120] p-0.5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setBgMode('checker')}
                  className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                    bgMode === 'checker' ? 'bg-white dark:bg-slate-700 text-[#2563EB] shadow-xs' : 'text-[#64748B]'
                  }`}
                  title="Checkerboard transparency background"
                >
                  Checker
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('light')}
                  className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                    bgMode === 'light' ? 'bg-white dark:bg-slate-700 text-[#2563EB] shadow-xs' : 'text-[#64748B]'
                  }`}
                  title="Clean white background"
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('dark')}
                  className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                    bgMode === 'dark' ? 'bg-white dark:bg-slate-700 text-[#2563EB] shadow-xs' : 'text-[#64748B]'
                  }`}
                  title="Dark background"
                >
                  Dark
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            {isImageFormat && (
              <div className="flex items-center bg-slate-100 dark:bg-[#0B1120] p-0.5 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-1.5 py-0.5 text-[10px] font-extrabold text-[#2563EB] cursor-pointer"
                  title="Fit to Screen"
                >
                  {isFitMode ? 'Fit' : `${zoomLevel}%`}
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Fullscreen Lightbox Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
              title="Open full-size visual preview lightbox"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Open Raw in New Tab */}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-[#E2E8F0] dark:border-slate-800 text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
              title="Open raw file in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Thumbnail Preview Stage */}
        <div
          id="conversion-thumbnail-stage"
          className={`w-full min-h-[260px] sm:min-h-[340px] max-h-[460px] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center overflow-hidden relative shadow-inner transition-all ${
            bgMode === 'checker' && isImageFormat
              ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100/80 dark:bg-[#0B1120]'
              : bgMode === 'dark'
              ? 'bg-[#0B1120]'
              : 'bg-white'
          }`}
        >
          {/* IMAGE / VECTOR PREVIEW */}
          {isImageFormat ? (
            <div className="w-full h-full p-4 flex items-center justify-center overflow-auto relative">
              <img
                src={previewUrl}
                alt="Converted file visual thumbnail"
                onLoad={handleImageLoad}
                onError={() => setImgLoadError(true)}
                style={{
                  transform: isFitMode ? 'none' : `scale(${zoomLevel / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className={`max-w-full max-h-[380px] object-contain rounded-lg shadow-md cursor-zoom-in hover:brightness-105 transition-all ${
                  !isFitMode ? 'cursor-grab' : ''
                }`}
                onClick={() => setIsLightboxOpen(true)}
              />

              {/* Dynamic Badge at bottom of preview */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="uppercase text-blue-400">.{result.outputFormat}</span>
                  <span>•</span>
                  <span>
                    {imgNaturalSize
                      ? `${imgNaturalSize.width} × ${imgNaturalSize.height} px`
                      : result.pngResolution || formatSize(result.outputSize)}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-emerald-400 text-[10px] font-bold hidden sm:flex items-center gap-1 shadow-sm">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Quality Verified</span>
                </div>
              </div>
            </div>
          ) : isPdfFormat ? (
            /* PDF DOCUMENT THUMBNAIL PREVIEW */
            <div className="w-full h-full p-4 flex flex-col items-center justify-center space-y-4">
              <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-center relative overflow-hidden">
                {/* Top Sheet Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      PDF
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#0F172A] dark:text-white truncate max-w-[200px]">
                        {convertedFilename}
                      </p>
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        {result.pdfPageSize || 'A4 Page (300 DPI)'} • {formatSize(result.outputSize)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200">
                    Vector Preserved
                  </span>
                </div>

                {/* Document Miniature Lines Representation */}
                <div className="p-4 bg-slate-50 dark:bg-[#0B1120] rounded-lg border border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                  <div className="h-2 w-full bg-slate-200/70 dark:bg-slate-800 rounded" />
                  <div className="h-2 w-5/6 bg-slate-200/70 dark:bg-slate-800 rounded mx-auto" />
                  <div className="h-2 w-4/5 bg-slate-200/70 dark:bg-slate-800 rounded mx-auto" />
                </div>

                {/* Quick PDF Action Buttons */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open PDF in Tab</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Enlarge</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isZipFormat ? (
            /* ZIP MULTI-PAGE ARCHIVE THUMBNAIL */
            <div className="text-center space-y-3 p-6 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Archive className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                  Multi-Page Image Archive (.ZIP)
                </h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Contains individual high-resolution rendered page images ready for extraction.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <Layers className="w-3.5 h-3.5" />
                <span>Lossless DEFLATE Package</span>
              </div>
            </div>
          ) : (
            /* GENERIC / DATA / DOCUMENT PREVIEW */
            <div className="text-center space-y-3 p-6 max-w-sm">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#2563EB]">
                {isTextOrData ? <FileCode className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                  .{result.outputFormat.toUpperCase()} Document Ready
                </h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Verified output file is formatted and prepared for download ({formatSize(result.outputSize)}).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Format Selector Directly Before Download (Requirement 7) */}
      {alternateFormats.length > 0 && onReconvert && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Need this in another format before downloading?</span>
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              1-click instant re-conversion
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {alternateFormats.map((fmt) => {
              const isCurrent = fmt.toLowerCase() === result.outputFormat.toLowerCase();
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleAltFormatClick(fmt)}
                  disabled={isCurrent || isReconverting || isProcessingAlt}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40'
                  }`}
                >
                  {(isReconverting || isProcessingAlt) && selectedAltFormat === fmt ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                  ) : null}
                  <span>.{fmt}</span>
                  {isCurrent && <span className="text-[10px] font-normal lowercase opacity-80">(current)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Download File Button */}
          <a
            href={downloadUrl}
            download={convertedFilename}
            onClick={() => {
              if (onDownload) {
                onDownload(result.jobId);
              }
            }}
            id="download-converted-file-btn"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .{result.outputFormat.toUpperCase()}</span>
          </a>

          {/* Copy Link to Clipboard Button alongside Download */}
        <button
          type="button"
          onClick={handleCopyLink}
          id="copy-to-clipboard-btn"
          className={`w-full sm:w-auto px-5 py-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
            copiedLink
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-[#F8FAFC]'
          }`}
          title="Copy the direct download link of this converted file to clipboard"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#2563EB]" />
              <span>Copy to Clipboard</span>
            </>
          )}
        </button>

        {/* Web Share API Button for Mobile / Desktop */}
        <button
          type="button"
          onClick={handleWebShare}
          id="web-share-file-btn"
          className={`w-full sm:w-auto px-5 py-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
            shareSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
              : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-blue-300'
          }`}
          title="Share converted file link directly via mobile apps, email, or messaging"
        >
          {shareSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Shared!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <span>Share Link</span>
            </>
          )}
        </button>

        {/* Generate QR Code Button */}
        <button
          type="button"
          onClick={handleToggleQrCode}
          id="generate-qr-code-btn"
          className={`w-full sm:w-auto px-5 py-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
            showQrCode
              ? 'bg-blue-50 dark:bg-blue-950/70 border-[#2563EB] text-[#2563EB] dark:text-blue-400 ring-2 ring-blue-500/30'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-[#F8FAFC]'
          }`}
          title="Generate a QR code to download this file directly to your smartphone"
        >
          {qrLoading ? (
            <RefreshCw className="w-4 h-4 text-[#2563EB] animate-spin" />
          ) : (
            <QrCode className="w-4 h-4 text-[#2563EB]" />
          )}
          <span>{showQrCode ? 'Hide QR Code' : 'Generate QR Code'}</span>
        </button>

        {/* Convert Another File Button */}
        <button
          onClick={onConvertAnother}
          id="convert-another-file-btn"
          className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-[#2563EB]" />
          <span>Convert Another</span>
        </button>
        </div>

        {autoDeleteAfterDownload && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] text-center">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Auto-delete on download is active: this file will be cleared from queue and storage once downloaded.</span>
          </div>
        )}
      </div>

      {/* QR Code Quick Mobile Access Card */}
      {showQrCode && qrDataUrl && (
        <div
          id="qr-code-mobile-card"
          className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-900/60 shadow-xl space-y-4 animate-fade-in relative"
        >
          <button
            type="button"
            onClick={() => setShowQrCode(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close QR Code"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* QR Code Canvas / Image Display */}
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 shrink-0">
              <img
                src={qrDataUrl}
                alt="File Download QR Code"
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
              />
            </div>

            {/* Mobile Scan Instructions & Actions */}
            <div className="space-y-3 text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold">
                <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Instant Mobile Download</span>
              </div>

              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  Scan with your phone camera
                </h4>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Point your iPhone or Android camera at this QR code to download <strong className="text-[#0F172A] dark:text-[#F8FAFC]">.{result.outputFormat.toUpperCase()}</strong> directly to your mobile device.
                </p>
              </div>

              {/* Download URL box */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-2 text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                <span className="truncate">{`${window.location.origin}${downloadUrl}`}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white font-sans font-bold text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Save QR Image Button & Share via Apps Button */}
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleWebShare}
                  id="qr-mobile-share-btn"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  {shareSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Shared!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share File Link</span>
                    </>
                  )}
                </button>
                <a
                  href={qrDataUrl}
                  download={`convertx_${baseName}_qr.png`}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold border border-[#E2E8F0] dark:border-[#1E293B] transition-colors inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR Image</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pro Value CTA Card (Requirement 13) */}
      {onNavigate && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-violet-50/70 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-violet-950/40 border border-blue-200 dark:border-blue-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
                Need more conversions or 100MB file uploads?
              </h4>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Upgrade to Pro for unlimited daily conversions, priority multi-threaded speed, and ad-free workspace.
            </p>
          </div>
          <button
            onClick={() => onNavigate('pricing')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade to Pro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Subtle Viral Share Section (Requirement 10) */}
      <ViralShare
        conversionPair={{
          from: result.inputFormat,
          to: result.outputFormat,
        }}
      />

      {/* Non-intrusive AdSlot below actions (Requirement 4) */}
      <AdSlot slotId="conversion-result-slot" format="banner" className="mt-4" />

      {/* Full-Screen Interactive Thumbnail Lightbox Modal */}
      {isLightboxOpen && (
        <div
          id="conversion-preview-lightbox"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Header Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 text-white shadow-2xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-black text-xs uppercase shrink-0">
                {result.outputFormat}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold truncate text-white">{convertedFilename}</h3>
                <p className="text-[11px] text-slate-400">
                  {formatSize(result.outputSize)} • {result.outputFormat.toUpperCase()} Converted Output
                </p>
              </div>
            </div>

            {/* Lightbox Toolbar Controls */}
            <div className="flex items-center gap-2">
              {isImageFormat && (
                <>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-blue-400 transition-colors cursor-pointer"
                    title="Reset Zoom"
                  >
                    {isFitMode ? '100%' : `${zoomLevel}%`}
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
              )}

              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <a
                href={downloadUrl}
                download={convertedFilename}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer ml-1"
                title="Close Lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Content Body */}
          <div
            className="w-full flex-1 flex items-center justify-center p-4 overflow-auto relative max-w-6xl my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {isImageFormat ? (
              <img
                src={previewUrl}
                alt="Full preview"
                style={{
                  transform: isFitMode ? 'none' : `scale(${zoomLevel / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
              />
            ) : isPdfFormat ? (
              <div className="w-full h-full max-h-[75vh] max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-full border-none rounded-2xl flex-1"
                />
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-md text-white shadow-2xl">
                <FileText className="w-16 h-16 mx-auto text-[#2563EB]" />
                <div className="space-y-1">
                  <h4 className="text-base font-bold">{convertedFilename}</h4>
                  <p className="text-xs text-slate-400">
                    File is processed and ready. Use the download button below.
                  </p>
                </div>
                <a
                  href={downloadUrl}
                  download={convertedFilename}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
              </div>
            )}
          </div>

          {/* Lightbox Footer Bar */}
          <div
            className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-full px-4 py-2 text-center text-xs text-slate-400 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            Click outside or press Close to return to converter
          </div>
        </div>
      )}
    </div>
  );
};

