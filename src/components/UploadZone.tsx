import React, { useState, useRef } from 'react';
import { Upload, FileUp, Sparkles, CheckCircle2, FileCode, FileText, Image as ImageIcon, ShieldCheck, FileCheck } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected?: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  onSampleSelected: (sampleKey: string) => void;
  isLoading?: boolean;
  error?: string | null;
  maxFileSizeMB?: number;
  isDailyLimitReached?: boolean;
  onViewPro?: () => void;
  selectedFilesCount?: number;
  uploadProgress?: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelected,
  onFilesSelected,
  onSampleSelected,
  isLoading,
  error,
  maxFileSizeMB = 25,
  isDailyLimitReached = false,
  onViewPro,
  selectedFilesCount = 0,
  uploadProgress = 0,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  const maxBytes = maxFileSizeMB * 1024 * 1024;

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setSizeWarning(null);

    const fileArray = Array.from(files);
    
    // Check if any file exceeds maxFileSizeMB
    const oversized = fileArray.find((f) => f.size > maxBytes);
    if (oversized) {
      const sizeMB = (oversized.size / (1024 * 1024)).toFixed(1);
      setSizeWarning(
        `"${oversized.name}" (${sizeMB}MB) exceeds the Free plan maximum file size of ${maxFileSizeMB}MB. Upgrade to Pro for 100MB conversions.`
      );
      return;
    }

    if (onFilesSelected) {
      onFilesSelected(fileArray);
    } else if (onFileSelected && fileArray[0]) {
      onFileSelected(fileArray[0]);
    }
  };

  // HTML5 Drag-and-Drop Event Handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input value so re-selecting same file triggers event
      e.target.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const samples = [
    { key: 'sample-docx', label: 'Word Document (.DOCX)', icon: <FileText className="w-4 h-4 text-blue-600" />, tag: 'Executive Report' },
    { key: 'sample-xlsx', label: 'Excel Spreadsheet (.XLSX)', icon: <FileText className="w-4 h-4 text-emerald-600" />, tag: 'Ledger Table' },
    { key: 'sample-txt', label: 'Plain Text (.TXT)', icon: <FileText className="w-4 h-4 text-slate-500" />, tag: 'Typography Page' },
    { key: 'sample-psd', label: 'Photoshop Design (.PSD)', icon: <Sparkles className="w-4 h-4 text-[#2563EB]" />, tag: 'Layered PSD' },
    { key: 'sample-ai', label: 'Illustrator Artwork (.AI)', icon: <Sparkles className="w-4 h-4 text-amber-500" />, tag: 'Vector AI' },
    { key: 'sample-dxf', label: 'CAD Architecture (.DXF)', icon: <FileCode className="w-4 h-4 text-[#2563EB]" />, tag: 'CAD Blueprint' },
    { key: 'sample-svg', label: 'Vector Logo (.SVG)', icon: <Sparkles className="w-4 h-4 text-[#7C3AED]" />, tag: 'Vector Design' },
    { key: 'sample-pdf', label: 'CAD Spec Sheet (.PDF)', icon: <FileText className="w-4 h-4 text-emerald-500" />, tag: 'PDF Document' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Main Upload Card */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files dropzone. Drop files here or press Enter to browse files"
        aria-dropeffect="copy"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        id="upload-drop-zone"
        className={`relative group rounded-[20px] p-8 sm:p-12 text-center border-2 border-dashed cursor-pointer transition-all duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 overflow-hidden ${
          isDragOver
            ? 'bg-blue-100/90 dark:bg-blue-950/70 border-[#2563EB] scale-[1.02] ring-4 ring-blue-500/20 shadow-2xl shadow-blue-500/20'
            : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#2563EB] hover:-translate-y-1 hover:shadow-2xl'
        }`}
      >
        {/* Drop active pulse border backdrop */}
        {isDragOver && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/15 to-violet-500/10 dark:from-blue-500/20 dark:via-indigo-500/25 dark:to-violet-500/20 pointer-events-none animate-pulse" />
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          id="hidden-file-input"
          className="hidden"
          accept=".docx,.xlsx,.txt,.html,.htm,.pptx,.odt,.rtf,.pdf,.psd,.ai,.dxf,.svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.tif,.avif,.eps,.dwg,.dwf,.cdr,.obj,.3ds,.stl"
          multiple
        />

        <div className="flex flex-col items-center space-y-4">
          {/* Upload Icon Circle */}
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
            isDragOver
              ? 'bg-[#2563EB] text-white border-[#2563EB] scale-110 shadow-lg shadow-blue-500/30 rotate-2'
              : 'bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-blue-950/60 border-blue-100 dark:border-blue-900/40 text-[#2563EB] group-hover:scale-110 group-hover:rotate-3'
          }`}>
            <Upload className={`w-8 h-8 sm:w-10 sm:h-10 ${isDragOver ? 'text-white animate-bounce' : 'text-[#2563EB]'}`} />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {isDragOver ? (
                <span className="text-[#2563EB] dark:text-blue-400 font-black tracking-wide">
                  Release to drop files here
                </span>
              ) : (
                'Drop your files here'
              )}
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">
              {isDragOver ? (
                <span className="text-blue-700 dark:text-blue-300 font-semibold">
                  Desktop files will be staged immediately
                </span>
              ) : (
                <>
                  or <span className="text-[#2563EB] hover:underline font-bold">Browse Files</span> from your device
                </>
              )}
            </p>
          </div>

          {/* Staged / Selected Files Counter Badge */}
          {selectedFilesCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 text-[#2563EB] dark:text-blue-300 font-bold text-xs shadow-xs animate-fade-in">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              <span>Selected: {selectedFilesCount} {selectedFilesCount === 1 ? 'file' : 'files'}</span>
            </div>
          )}

          {/* Real Upload Progress Bar */}
          {isLoading && (
            <div className="w-full max-w-xs space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress || 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, Math.min(100, uploadProgress || 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button with Keyboard Shortcut Badge */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              id="browse-files-btn"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 pointer-events-none"
            >
              <FileUp className="w-4 h-4" />
              <span>Select Files</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30 tracking-tight">
                Ctrl+O
              </kbd>
            </button>
          </div>

          {/* Required Trust & Retention Privacy Message */}
          <div className="flex items-center gap-2 pt-2 text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] max-w-md text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Your files are processed temporarily and automatically removed according to our retention policy.</span>
          </div>
        </div>
      </div>

      {/* Size Warning Banner */}
      {sizeWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <span>{sizeWarning}</span>
          {onViewPro && (
            <button
              onClick={onViewPro}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm"
            >
              View Pro (100MB)
            </button>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs font-semibold text-left">
          {error}
        </div>
      )}

      {/* Quick Try Samples Bar */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] text-center">
          Or try converting a sample design file instantly:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {samples.map((s) => (
            <button
              key={s.key}
              id={`sample-btn-${s.key}`}
              onClick={() => onSampleSelected(s.key)}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all flex items-center gap-2 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <div className="p-1.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                {s.icon}
              </div>
              <div className="truncate">
                <span className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] truncate">
                  {s.label}
                </span>
                <span className="block text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  {s.tag}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
