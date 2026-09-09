import React, { useState, useEffect } from 'react';
import { UploadedFile, ConversionResultData } from '../types.js';
import {
  FileText,
  Image as ImageIcon,
  Box,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Gauge,
  ArrowRight,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { formatFileSize, getCompressionRatio, calculateEstimatedSize, fetchEstimatedOutputSize } from '../utils/estimateSize.js';

interface FileCardProps {
  file: UploadedFile;
  onReset: () => void;
  outputFormat?: string;
  estimatedOutputSize?: number;
  result?: ConversionResultData | null;
  rawFile?: File | null;
  objectUrl?: string | null;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onReset,
  outputFormat,
  estimatedOutputSize: propEstimatedSize,
  result,
  rawFile,
  objectUrl: propObjectUrl,
}) => {
  const [estimatedSize, setEstimatedSize] = useState<number>(() => {
    if (propEstimatedSize && propEstimatedSize > 0) return propEstimatedSize;
    if (file.estimatedOutputSize && file.estimatedOutputSize > 0) return file.estimatedOutputSize;
    const targetFmt = outputFormat || file.supportedOutputs?.[0] || 'pdf';
    return calculateEstimatedSize(file.detectedFormat, targetFmt, file.fileSize);
  });

  const [isFetchingEstimate, setIsFetchingEstimate] = useState(false);

  // Manage object URL if a File/Blob is provided via rawFile or file.rawFile/file.file
  const [generatedObjectUrl, setGeneratedObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    // If an object URL is explicitly passed, don't generate another
    if (propObjectUrl || file.objectUrl) {
      return;
    }

    const sourceFile = rawFile || file.rawFile || file.file;
    if (sourceFile && typeof window !== 'undefined' && window.URL && sourceFile instanceof Blob) {
      const url = URL.createObjectURL(sourceFile);
      setGeneratedObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [rawFile, file.rawFile, file.file, propObjectUrl, file.objectUrl]);

  const effectiveObjectUrl = propObjectUrl || file.objectUrl || generatedObjectUrl;

  const detectedLower = (file.detectedFormat || '').toLowerCase();
  const fileNameLower = (file.fileName || '').toLowerCase();
  const mimeTypeLower = (file.mimeType || '').toLowerCase();

  const isPdf =
    detectedLower === 'pdf' ||
    fileNameLower.endsWith('.pdf') ||
    mimeTypeLower === 'application/pdf';

  const isImage =
    ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'avif', 'tiff', 'tif', 'heic', 'dxf'].includes(
      detectedLower
    ) ||
    file.category === 'images' ||
    mimeTypeLower.startsWith('image/');

  const isPreConversion = !result;

  // Sync estimate whenever outputFormat or file changes
  useEffect(() => {
    if (result && result.outputSize) {
      // Conversion already completed, no need to estimate
      return;
    }

    if (propEstimatedSize && propEstimatedSize > 0) {
      setEstimatedSize(propEstimatedSize);
      return;
    }

    const targetFmt = outputFormat || file.supportedOutputs?.[0] || 'pdf';
    // Immediate optimistic client estimate
    const immediateEst = calculateEstimatedSize(file.detectedFormat, targetFmt, file.fileSize);
    setEstimatedSize(immediateEst);

    // Then ask server for exact capability-informed estimate
    let isCancelled = false;
    setIsFetchingEstimate(true);
    fetchEstimatedOutputSize(file.detectedFormat, targetFmt, file.fileSize)
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
  }, [file.detectedFormat, file.fileSize, outputFormat, propEstimatedSize, result]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'images':
        return <ImageIcon className="w-6 h-6 text-[#2563EB]" />;
      case 'vector':
      case 'cad':
        return <Box className="w-6 h-6 text-[#7C3AED]" />;
      default:
        return <FileText className="w-6 h-6 text-emerald-500" />;
    }
  };

  const previewUrl = `/api/preview/${file.jobId}`;
  const targetFormat = (outputFormat || file.supportedOutputs?.[0] || 'pdf').toUpperCase();

  // Post-conversion compression ratio
  const completedRatio =
    result && result.outputSize && file.fileSize
      ? getCompressionRatio(file.fileSize, result.outputSize)
      : null;

  // Pre-conversion estimated ratio
  const estimatedRatio =
    !result && estimatedSize > 0 && file.fileSize
      ? getCompressionRatio(file.fileSize, estimatedSize)
      : null;

  return (
    <div
      id="file-card-container"
      className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors"
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        {/* File Preview Thumbnail & Details */}
        <div className="flex items-start sm:items-center gap-4 w-full lg:w-auto flex-1 min-w-0">
          {/* Thumbnail preview or icon */}
          <div
            id="file-card-preview-container"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center shrink-0 overflow-hidden relative group"
          >
            {isPreConversion && isPdf ? (
              /* Document icon for PDFs using the file's object URL */
              effectiveObjectUrl ? (
                <a
                  href={effectiveObjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View PDF document in new tab"
                  id="file-card-pdf-thumbnail-link"
                  className="w-full h-full flex flex-col items-center justify-center bg-rose-50/90 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 transition-all rounded-xl relative group/pdf cursor-pointer p-1"
                  aria-label={`View PDF document ${file.fileName}`}
                >
                  <div className="relative flex flex-col items-center justify-center">
                    <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600 dark:text-rose-400 transition-transform group-hover/pdf:scale-110 drop-shadow-xs" />
                    <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs leading-none">
                      PDF
                    </span>
                  </div>
                  <span
                    className="absolute top-1 right-1 opacity-0 group-hover/pdf:opacity-100 transition-opacity bg-rose-700/90 text-white rounded p-0.5 shadow-xs"
                    title="Open PDF preview in new tab"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </a>
              ) : (
                <div
                  id="file-card-pdf-thumbnail-static"
                  title="PDF Document"
                  className="w-full h-full flex flex-col items-center justify-center bg-rose-50/90 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 rounded-xl relative p-1"
                >
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600 dark:text-rose-400" />
                  <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs leading-none">
                    PDF
                  </span>
                </div>
              )
            ) : isImage ? (
              /* Thumbnail preview for images using the file's object URL */
              effectiveObjectUrl ? (
                <a
                  href={effectiveObjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View full image in new tab"
                  id="file-card-image-thumbnail-link"
                  className="w-full h-full flex items-center justify-center cursor-zoom-in relative group/img"
                >
                  <img
                    src={effectiveObjectUrl}
                    alt={file.fileName}
                    className="w-full h-full object-contain p-1 rounded-xl transition-transform duration-200 group-hover/img:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== previewUrl) {
                        target.src = previewUrl;
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />
                  <span
                    className="absolute bottom-1 right-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/70 text-white rounded p-0.5 pointer-events-none"
                    title="View image preview"
                  >
                    <Eye className="w-2.5 h-2.5" />
                  </span>
                </a>
              ) : (
                <img
                  src={previewUrl}
                  alt={file.fileName}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )
            ) : (
              getCategoryIcon(file.category)
            )}
          </div>

          {/* Details */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-xs sm:max-w-md">
                {file.fileName}
              </h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                {file.detectedFormat.toUpperCase()}
              </span>

              {/* Document action for PDFs using the file's object URL */}
              {isPreConversion && isPdf && effectiveObjectUrl && (
                <a
                  href={effectiveObjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="file-card-pdf-action-link"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 transition-colors shadow-2xs"
                  title="Open PDF document in browser"
                >
                  <FileText className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Preview PDF</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              )}

              {/* Thumbnail preview action for images using the file's object URL */}
              {isPreConversion && isImage && effectiveObjectUrl && (
                <a
                  href={effectiveObjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="file-card-img-action-link"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition-colors shadow-2xs"
                  title="Open full image in browser"
                >
                  <Eye className="w-3 h-3 text-[#2563EB] dark:text-blue-400" />
                  <span>Preview Image</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] flex-wrap">
              <span>
                Original: <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{formatFileSize(file.fileSize)}</strong>
              </span>
              <span>•</span>
              <span className="capitalize">Category: {file.category}</span>
            </div>

            {/* Support status badge */}
            {file.status === 'supported' ? (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Active Conversion Engine Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{file.requiresEngine || 'Engine Extension Required'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Pre-Conversion Estimate OR Post-Conversion Compression Ratio Indicator */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
          {/* POST-CONVERSION COMPRESSION RATIO BADGE */}
          {result && completedRatio ? (
            <div
              id="file-card-compression-ratio"
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  <span>Converted Size</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatFileSize(result.outputSize)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({formatFileSize(file.fileSize)}
                    <ArrowRight className="w-2.5 h-2.5 inline mx-0.5" />
                    {formatFileSize(result.outputSize)})
                  </span>
                </div>
              </div>

              {/* Ratio badge */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm ${
                  completedRatio.isReduction
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                    : completedRatio.percent === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    : 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                }`}
                title={`Savings: ${completedRatio.formattedDiff} (${completedRatio.multiplier})`}
              >
                {completedRatio.isReduction ? (
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                ) : completedRatio.percent === 0 ? (
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span>{completedRatio.ratioLabel}</span>
              </div>
            </div>
          ) : estimatedRatio && estimatedSize > 0 ? (
            /* PRE-CONVERSION ESTIMATED OUTPUT SIZE BADGE */
            <div
              id="file-card-estimated-size"
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  <Gauge className="w-3 h-3 text-[#2563EB]" />
                  <span>Est. Output (.{targetFormat})</span>
                  {isFetchingEstimate && <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#2563EB]" />}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  <span>~{formatFileSize(estimatedSize)}</span>
                </div>
              </div>

              {/* Estimated reduction indicator */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
                  estimatedRatio.isReduction
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                }`}
                title={`Projected ${estimatedRatio.ratioLabel} compared to input`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{estimatedRatio.ratioLabel}</span>
              </div>
            </div>
          ) : null}

          {/* Change file action */}
          <button
            onClick={onReset}
            id="file-card-change-btn"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Change File</span>
          </button>
        </div>
      </div>
    </div>
  );
};

