import React, { useState, useRef } from 'react';
import { Upload, FileUp, Sparkles, CheckCircle2, FileCode, FileText, Image as ImageIcon, ShieldCheck } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected?: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  onSampleSelected: (sampleKey: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelected,
  onFilesSelected,
  onSampleSelected,
  isLoading,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    if (onFilesSelected) {
      onFilesSelected(fileArray);
    } else if (onFileSelected && fileArray[0]) {
      onFileSelected(fileArray[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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

  const samples = [
    { key: 'sample-dxf', label: 'CAD Architecture (.DXF)', icon: <FileCode className="w-4 h-4 text-[#2563EB]" />, tag: 'CAD Blueprint' },
    { key: 'sample-svg', label: 'Vector Logo (.SVG)', icon: <Sparkles className="w-4 h-4 text-[#7C3AED]" />, tag: 'Vector Design' },
    { key: 'sample-png', label: 'Transparent Badge (.PNG)', icon: <ImageIcon className="w-4 h-4 text-cyan-500" />, tag: 'Raster Image' },
    { key: 'sample-pdf', label: 'CAD Spec Sheet (.PDF)', icon: <FileText className="w-4 h-4 text-emerald-500" />, tag: 'PDF Document' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Main Upload Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="upload-drop-zone"
        className={`relative group rounded-[20px] p-8 sm:p-12 text-center border-2 border-dashed cursor-pointer transition-all duration-300 shadow-lg ${
          isDragOver
            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#2563EB] scale-[1.01] shadow-2xl shadow-blue-500/10'
            : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#2563EB] hover:-translate-y-1 hover:shadow-2xl'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          id="hidden-file-input"
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.svg,.dxf"
          multiple
        />

        <div className="flex flex-col items-center space-y-4">
          {/* Upload Icon Circle */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-blue-950/60 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-[#2563EB]" />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              Drag & Drop your files here, or <span className="text-[#2563EB] hover:underline">Browse</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">
              Single or multi-file batch upload (DXF CAD, PNG, JPG, WEBP, PDF, and SVG up to 50MB)
            </p>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            id="browse-files-btn"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 pointer-events-none"
          >
            <FileUp className="w-4 h-4" />
            <span>Select Files from Device</span>
          </button>

          {/* Security badge */}
          <div className="flex items-center gap-2 pt-2 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted transmission • Files auto-deleted after conversion</span>
          </div>
        </div>
      </div>

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
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] text-left transition-all flex items-center gap-2 group"
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
