import React from 'react';
import { UploadedFile } from '../types.js';
import { FileText, Image as ImageIcon, Box, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface FileCardProps {
  file: UploadedFile;
  onReset: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onReset }) => {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* File Preview Thumbnail & Details */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Thumbnail preview or icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center shrink-0 overflow-hidden relative group">
            {['png', 'jpg', 'jpeg', 'webp', 'svg', 'dxf'].includes(file.detectedFormat) ? (
              <img
                src={previewUrl}
                alt={file.fileName}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              getCategoryIcon(file.category)
            )}
          </div>

          {/* Details */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-xs sm:max-w-md">
                {file.fileName}
              </h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                {file.detectedFormat.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span>Size: <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{formatSize(file.fileSize)}</strong></span>
              <span>•</span>
              <span className="capitalize">Category: {file.category}</span>
            </div>

            {/* Support status badge */}
            {file.status === 'supported' ? (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Conversion Engine Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{file.requiresEngine || 'Engine Extension Required'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Change file action */}
        <button
          onClick={onReset}
          id="file-card-change-btn"
          className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B] transition-colors flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Change File</span>
        </button>
      </div>
    </div>
  );
};
