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
}

export const ConversionResult: React.FC<ConversionResultProps> = ({
  result,
  onConvertAnother,
  onNavigate,
  onReconvert,
  availableFormats = ['png', 'jpg', 'webp', 'pdf', 'svg'],
  isReconverting = false,
}) => {
  const [selectedAltFormat, setSelectedAltFormat] = useState<string>(result.outputFormat);
  const [isProcessingAlt, setIsProcessingAlt] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

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

      {/* Conversion Technical Specifications (PDF Page Size, PNG Resolution, DPI) */}
      {(result.inputFormat === 'pdf' || result.pdfPageSize || result.pngResolution || result.width) && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Direct Rendering Specifications</span>
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
              Aspect Ratio 100% Preserved
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* PDF Page Size */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                PDF Page Size
              </span>
              <p className="text-xs font-extrabold text-[#0F172A] dark:text-white">
                {result.pdfPageSize || 'A4 (Portrait)'}
              </p>
            </div>

            {/* PNG Resolution */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                PNG Resolution
              </span>
              <p className="text-xs font-extrabold text-[#2563EB] dark:text-blue-400">
                {result.pngResolution || (result.width && result.height ? `${result.width} × ${result.height} px` : '2480 × 3508 px')}
              </p>
            </div>

            {/* DPI */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                DPI
              </span>
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {result.dpi ? `${result.dpi} DPI` : '300 DPI'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Converted Image/Vector Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">Output File Preview</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleQrCode}
              className="text-[11px] font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              title="Generate QR code for mobile phone scanning"
            >
              <QrCode className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{showQrCode ? 'Hide QR Code' : 'Mobile QR'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-[11px] font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              title="Copy download link to clipboard"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
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
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href={downloadUrl}
          download={convertedFilename}
          id="download-converted-file-btn"
          className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Download .{result.outputFormat.toUpperCase()}</span>
        </a>

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

        {/* Copy Link to Clipboard Button */}
        <button
          type="button"
          onClick={handleCopyLink}
          id="copy-result-link-btn"
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
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 text-[#2563EB]" />
              <span>Copy Link</span>
            </>
          )}
        </button>

        <button
          onClick={onConvertAnother}
          id="convert-another-file-btn"
          className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-[#2563EB]" />
          <span>Convert Another</span>
        </button>
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

              {/* Save QR Image Button */}
              <div className="pt-1 flex flex-wrap items-center gap-2">
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
    </div>
  );
};

