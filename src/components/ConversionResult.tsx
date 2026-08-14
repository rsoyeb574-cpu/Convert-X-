import React from 'react';
import { ConversionResultData, PageView } from '../types.js';
import { Download, RefreshCw, CheckCircle2, FileText, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { ViralShare } from './ViralShare.js';
import { AdSlot } from './AdSlot.js';

interface ConversionResultProps {
  result: ConversionResultData;
  onConvertAnother: () => void;
  onNavigate?: (view: PageView) => void;
}

export const ConversionResult: React.FC<ConversionResultProps> = ({
  result,
  onConvertAnother,
  onNavigate,
}) => {
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

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original File */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Original File</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-extrabold text-xs uppercase text-[#2563EB] shrink-0">
              {result.inputFormat}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">{result.originalName}</p>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{formatSize(result.originalSize)}</p>
            </div>
          </div>
        </div>

        {/* Converted Output File */}
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">Converted Output</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
              {result.outputFormat}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">{convertedFilename}</p>
              <p className="text-[11px] text-[#2563EB] font-semibold">{formatSize(result.outputSize)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Converted Image/Vector Preview */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">Output File Preview</span>
        <div className="w-full h-64 sm:h-80 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] p-2 flex items-center justify-center overflow-hidden relative">
          {['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(result.outputFormat) ? (
            <img
              src={previewUrl}
              alt="Converted file preview"
              className="max-w-full max-h-full object-contain rounded"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : result.outputFormat === 'zip' ? (
            <div className="text-center space-y-2 text-[#64748B] dark:text-[#94A3B8]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#2563EB]">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-xs font-bold text-[#0F172A] dark:text-white">Multi-Page Image Archive (.ZIP)</p>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Contains individual high-resolution rendered pages</p>
            </div>
          ) : (
            <div className="text-center space-y-2 text-[#64748B] dark:text-[#94A3B8]">
              <FileText className="w-12 h-12 mx-auto text-[#2563EB]" />
              <p className="text-xs">Converted document ready for download</p>
            </div>
          )}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <a
          href={downloadUrl}
          download={convertedFilename}
          id="download-converted-file-btn"
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Download Converted File</span>
        </a>

        <button
          onClick={onConvertAnother}
          id="convert-another-file-btn"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-[#2563EB]" />
          <span>Convert Another File</span>
        </button>
      </div>

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
    </div>
  );
};
