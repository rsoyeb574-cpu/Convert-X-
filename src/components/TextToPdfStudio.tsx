import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageView, TextToPdfSettings } from '../types.js';
import {
  FileText,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Layers,
  Sparkles,
  Sliders,
  Type,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Upload,
  ArrowRight,
  ShieldCheck,
  Printer,
  Settings2,
} from 'lucide-react';

interface TextToPdfStudioProps {
  onNavigate: (view: PageView) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onRecordHistory?: (item: any) => void;
  darkMode?: boolean;
}

const TEMPLATES: Record<string, { label: string; text: string; settings?: Partial<TextToPdfSettings> }> = {
  formalLetter: {
    label: 'Formal Business Letter',
    text: `ACME CORPORATION
123 Innovation Way, Suite 400
Tech City, CA 94016
contact@acmecorp.example.com | (555) 019-2834

October 24, 2026

Dear Mr. Anderson,

Subject: Notice of Annual Strategy Review and Partnership Confirmation

We are pleased to provide you with the formal confirmation of our extended partnership for the upcoming fiscal year 2027. Over the past twelve months, our collaborative initiatives have achieved extraordinary milestones, delivering over 140% of the projected efficiency targets.

Key Deliverables and Commitments:
1. Full platform integration and seamless data exchange architecture.
2. Enterprise-grade security compliance with zero-retention data protocols.
3. Dedicated 24/7 priority support and quarterly engineering reviews.

Please review the attached terms and sign where indicated. Should you require any clarifications or adjustments prior to our scheduled kickoff on November 15, please do not hesitate to contact our executive liaison.

We look forward to another year of shared innovation and prosperous growth.

Sincerely,

Sarah Jenkins
Chief Executive Officer
Acme Corporation`,
    settings: {
      pageSize: 'a4',
      fontFamily: 'times',
      fontSize: 12,
      lineSpacing: '1.15',
      alignment: 'left',
      margin: 'normal',
      pageNumbers: 'bottom-center',
    },
  },
  meetingNotes: {
    label: 'Executive Meeting Notes',
    text: `EXECUTIVE LEADERSHIP TEAM - WEEKLY STRATEGY MEETING
Date: October 24, 2026
Attendees: Sarah Jenkins (CEO), David Chen (CTO), Elena Rostova (CFO), Marcus Vance (VP Product)
Location: Main Boardroom / Hybrid Video Conference

AGENDA & TOPICS DISCUSSED:

1. Q3 Financial Performance & Revenue Projections
- Elena presented final Q3 results: ARR grew by 28% quarter-over-quarter.
- Enterprise tier subscriptions increased significantly following the launch of the new multi-core conversion engine.
- Operational infrastructure costs remained 12% below budget due to resource optimization.

2. Product Engineering Roadmap (Q4 2026)
- David highlighted the completion of the 100% server-side vector PDF pipeline with sub-second response times.
- Zero client-side canvas degradation ensures print-ready 300/600 DPI fidelity across all devices.
- Planned rollout for CAD vector parsing modules is scheduled for mid-November.

3. Action Items & Owners:
• Marcus Vance: Finalize user onboarding walkthroughs by Friday, Nov 3.
• David Chen: Complete performance load testing across distributed container clusters.
• Elena Rostova: Distribute quarterly investor briefing packet.

Next meeting scheduled for Monday, November 2, 2026 at 09:00 AM PST.`,
    settings: {
      pageSize: 'a4',
      fontFamily: 'helvetica',
      fontSize: 11,
      lineSpacing: '1.15',
      alignment: 'left',
      margin: 'normal',
      pageNumbers: 'bottom-right',
    },
  },
  invoiceQuote: {
    label: 'Invoice / Estimate Summary',
    text: `INVOICE / STATEMENT OF WORK

Invoice Number: INV-2026-8894
Date of Issue: October 24, 2026
Payment Due: November 24, 2026 (Net 30)

Billed To:
Global Horizon Enterprises Inc.
742 Evergreen Boulevard
New York, NY 10001
Attn: Accounts Payable (finance@globalhorizon.example)

DESCRIPTION OF SERVICES & DELIVERABLES:

1. Enterprise File Conversion Architecture Setup
   - Distributed high-throughput converter workers
   - Security hardening with encrypted session isolation
   - Subtotal: $4,500.00

2. Custom Document Engine Integration & Custom Styling
   - High-fidelity typography rendering engine
   - Multi-page pagination and print-ready export
   - Subtotal: $2,800.00

3. Deployment, Testing, and SLA Verification
   - Performance benchmarks under 10,000 concurrent jobs
   - Subtotal: $1,700.00

TOTAL AMOUNT DUE: $9,000.00 USD

Payment Instructions:
Please remit payment via wire transfer or ACH.
Bank: Silicon Premier Bank | Routing: 121000358 | Account: 9876543210

Thank you for your business!`,
    settings: {
      pageSize: 'letter',
      fontFamily: 'courier',
      fontSize: 11,
      lineSpacing: '1.15',
      alignment: 'left',
      margin: 'normal',
      pageNumbers: 'bottom-center',
    },
  },
};

export const TextToPdfStudio: React.FC<TextToPdfStudioProps> = ({
  onNavigate,
  showToast,
  onRecordHistory,
  darkMode = true,
}) => {
  const [text, setText] = useState<string>(() => TEMPLATES.formalLetter.text);
  const [pageSize, setPageSize] = useState<'a4' | 'a3' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<'small' | 'normal' | 'large' | 'custom'>('normal');
  const [customMarginVal, setCustomMarginVal] = useState<number>(36);
  const [fontFamily, setFontFamily] = useState<'helvetica' | 'times' | 'courier'>('helvetica');
  const [fontSize, setFontSize] = useState<number>(12);
  const [bold, setBold] = useState<boolean>(false);
  const [italic, setItalic] = useState<boolean>(false);
  const [underline, setUnderline] = useState<boolean>(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [lineSpacing, setLineSpacing] = useState<'single' | '1.15' | '1.5' | 'double'>('1.15');
  const [pageNumbers, setPageNumbers] = useState<'none' | 'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [documentTitle, setDocumentTitle] = useState<string>('My Document');
  const [filename, setFilename] = useState<string>('document.pdf');
  const [headerText, setHeaderText] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('#111827');

  // UI View States
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'settings'>('editor');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(1);
  const [showRealPdfModal, setShowRealPdfModal] = useState<boolean>(false);
  const [realPdfUrl, setRealPdfUrl] = useState<string | null>(null);
  const [isLoadingRealPdf, setIsLoadingRealPdf] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics
  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const charCount = useMemo(() => text.length, [text]);
  const lineCount = useMemo(() => (text ? text.split(/\n/).length : 0), [text]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (realPdfUrl) {
        URL.revokeObjectURL(realPdfUrl);
      }
    };
  }, [realPdfUrl]);

  // Estimated Page Dimensions & Layout calculation for Live Preview
  const pageAspect = useMemo(() => {
    let w = 595.28;
    let h = 841.89;
    if (pageSize === 'a3') {
      w = 841.89;
      h = 1190.55;
    } else if (pageSize === 'letter') {
      w = 612;
      h = 792;
    } else if (pageSize === 'legal') {
      w = 612;
      h = 1008;
    }
    return orientation === 'landscape' ? h / w : w / h;
  }, [pageSize, orientation]);

  // Margin in pixels/points for preview
  const marginPt = useMemo(() => {
    if (margin === 'small') return 20;
    if (margin === 'large') return 54;
    if (margin === 'custom') return customMarginVal;
    return 36;
  }, [margin, customMarginVal]);

  // Estimate page split for live interactive preview
  const previewPages = useMemo(() => {
    const paragraphs = text.split(/\n/);
    // Estimated characters/lines per page based on font size, margin, and page size
    const baseHeight = orientation === 'landscape' ? 595 : (pageSize === 'a3' ? 1190 : (pageSize === 'legal' ? 1008 : 841));
    const availableHeight = baseHeight - marginPt * 2 - 40; // minus margins & headers
    const spacingMultiplier = lineSpacing === 'double' ? 2.3 : (lineSpacing === '1.5' ? 1.75 : (lineSpacing === '1.15' ? 1.35 : 1.15));
    const effectiveLineHeight = fontSize * spacingMultiplier;
    const maxLinesPerPage = Math.max(8, Math.floor(availableHeight / effectiveLineHeight));

    const pages: string[][] = [[]];
    let currentLines = 0;

    for (const para of paragraphs) {
      // Estimate line wrap count for this paragraph
      const charsPerLine = Math.max(25, Math.floor((pageSize === 'a3' ? 90 : 70) * (12 / fontSize) * (orientation === 'landscape' ? 1.4 : 1.0)));
      const paraLines = Math.max(1, Math.ceil((para.length || 1) / charsPerLine));

      if (currentLines + paraLines > maxLinesPerPage && pages[pages.length - 1].length > 0) {
        pages.push([para]);
        currentLines = paraLines;
      } else {
        pages[pages.length - 1].push(para);
        currentLines += paraLines;
      }
    }

    return pages.length > 0 ? pages : [[]];
  }, [text, fontSize, lineSpacing, marginPt, pageSize, orientation]);

  // Handle template selection
  const handleSelectTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (tpl) {
      setText(tpl.text);
      if (tpl.settings) {
        if (tpl.settings.pageSize) setPageSize(tpl.settings.pageSize);
        if (tpl.settings.fontFamily) setFontFamily(tpl.settings.fontFamily);
        if (tpl.settings.fontSize) setFontSize(tpl.settings.fontSize);
        if (tpl.settings.lineSpacing) setLineSpacing(tpl.settings.lineSpacing as any);
        if (tpl.settings.alignment) setAlignment(tpl.settings.alignment);
        if (tpl.settings.margin) setMargin(tpl.settings.margin);
        if (tpl.settings.pageNumbers) setPageNumbers(tpl.settings.pageNumbers);
      }
      showToast('Template Loaded', `Loaded "${tpl.label}"`, 'info');
    }
  };

  // Handle text file upload / drag-and-drop
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File Too Large', 'Text file must be under 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        setText(content);
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setDocumentTitle(baseName);
        setFilename(`${baseName}.pdf`);
        showToast('File Loaded', `Imported ${file.name}`, 'success');
      }
    };
    reader.onerror = () => {
      showToast('Error', 'Failed to read text file.', 'error');
    };
    reader.readAsText(file);
  };

  // Copy text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Copied', 'Text copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Error', 'Failed to copy to clipboard.', 'error');
    }
  };

  // Clear all text
  const handleClear = () => {
    if (text.length > 50 && !window.confirm('Clear all editor text and start a new document?')) {
      return;
    }
    setText('');
    setDocumentTitle('Untitled Document');
    showToast('Cleared', 'Editor cleared.', 'info');
  };

  // Generate & Download Real Server-Side PDF
  const handleConvertToPdf = async () => {
    if (!text.trim()) {
      showToast('Empty Document', 'Please enter or paste some text before converting.', 'error');
      return;
    }

    setIsConverting(true);

    try {
      const payload = {
        text,
        pageSize,
        orientation,
        margin: margin === 'custom' ? customMarginVal : margin,
        fontFamily,
        fontSize,
        bold,
        italic,
        underline,
        alignment,
        lineSpacing,
        pageNumbers,
        title: documentTitle,
        filename,
        headerText: headerText.trim() || undefined,
        textColor,
      };

      const res = await fetch('/api/convert/text-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/pdf',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

      const pageCountHeader = res.headers.get('X-Page-Count') || previewPages.length.toString();
      const jobIdHeader = res.headers.get('X-Job-Id') || `job_${Date.now()}`;

      showToast(
        'PDF Generated Successfully',
        `Downloaded ${filename} (${(blob.size / 1024).toFixed(1)} KB, ${pageCountHeader} page(s))`,
        'success'
      );

      if (onRecordHistory) {
        onRecordHistory({
          id: `hist-${Date.now()}`,
          fileName: filename,
          inputFormat: 'text',
          outputFormat: 'pdf',
          originalSize: Buffer.byteLength(text, 'utf-8'),
          outputSize: blob.size,
          date: new Date().toISOString(),
          status: 'completed',
          jobId: jobIdHeader,
        });
      }
    } catch (err: any) {
      console.error('Convert to PDF failed:', err);
      showToast('Conversion Failed', err.message || 'Could not generate PDF. Please check server logs.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  // Preview Real Server-Side PDF in High Fidelity Modal
  const handlePreviewRealPdf = async () => {
    if (!text.trim()) {
      showToast('Empty Document', 'Please enter text to preview.', 'error');
      return;
    }

    setIsLoadingRealPdf(true);
    setShowRealPdfModal(true);

    try {
      const payload = {
        text,
        pageSize,
        orientation,
        margin: margin === 'custom' ? customMarginVal : margin,
        fontFamily,
        fontSize,
        bold,
        italic,
        underline,
        alignment,
        lineSpacing,
        pageNumbers,
        title: documentTitle,
        filename,
        headerText: headerText.trim() || undefined,
        textColor,
      };

      const res = await fetch('/api/convert/text-to-pdf?preview=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/pdf',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to generate real PDF preview.');
      }

      const blob = await res.blob();
      if (realPdfUrl) URL.revokeObjectURL(realPdfUrl);
      const url = URL.createObjectURL(blob);
      setRealPdfUrl(url);
    } catch (err: any) {
      showToast('Preview Error', err.message, 'error');
      setShowRealPdfModal(false);
    } finally {
      setIsLoadingRealPdf(false);
    }
  };

  // Font family CSS mapping for live typography preview
  const previewFontFamilyClass = useMemo(() => {
    if (fontFamily === 'times') return 'font-serif';
    if (fontFamily === 'courier') return 'font-mono';
    return 'font-sans';
  }, [fontFamily]);

  const previewLineHeightClass = useMemo(() => {
    if (lineSpacing === 'double') return 'leading-loose';
    if (lineSpacing === '1.5') return 'leading-relaxed';
    if (lineSpacing === '1.15') return 'leading-normal';
    return 'leading-tight';
  }, [lineSpacing]);

  return (
    <div className="max-w-7xl mx-auto space-y-6" id="text-to-pdf-studio-root">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('home')}
              className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Convert-X</span>
            </button>
            <span className="text-xs text-[#CBD5E1] dark:text-slate-700">/</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>Text to PDF Studio</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            Text to PDF Converter
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Type or paste text, customize typographic layout, preview pages in real-time, and download print-ready vector PDF.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handlePreviewRealPdf}
            disabled={!text.trim()}
            className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB] dark:hover:border-blue-500 font-semibold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Render real PDF on server and view in interactive viewer"
            id="text-pdf-preview-btn"
          >
            <Eye className="w-4 h-4 text-[#2563EB]" />
            <span>Preview Real PDF</span>
          </button>

          <button
            onClick={handleConvertToPdf}
            disabled={isConverting || !text.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            id="text-pdf-convert-btn"
          >
            {isConverting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Convert to PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: 2-Column Grid on Desktop, Tabbed on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / MAIN COLUMN: Editor & Formatting Toolbar (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Formatting Toolbar */}
          <div className="bg-white dark:bg-[#111827] p-4 rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-3">
            {/* Top Toolbar Row: Presets, Import, Copy, Clear */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Preset:</span>
                <select
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  defaultValue="formalLetter"
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="formalLetter">Formal Letter</option>
                  <option value="meetingNotes">Meeting Notes</option>
                  <option value="invoiceQuote">Invoice / Quote</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.text"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Upload a .txt or .md file"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import .txt</span>
                </button>
                <button
                  onClick={handleCopyText}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Copy text to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Clear document text"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Middle Toolbar Row: Typography (Font Family, Size, Weight, Alignment, Spacing) */}
            <div className="flex items-center flex-wrap gap-2 pt-1">
              {/* Font Family */}
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                title="Font Family"
              >
                <option value="helvetica">Helvetica (Sans-Serif)</option>
                <option value="times">Times Roman (Serif)</option>
                <option value="courier">Courier (Monospace)</option>
              </select>

              {/* Font Size */}
              <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden">
                <button
                  onClick={() => setFontSize((prev) => Math.max(6, prev - 1))}
                  className="px-2 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer font-bold"
                  title="Decrease font size"
                >
                  -
                </button>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="px-1.5 py-1.5 bg-transparent text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none cursor-pointer"
                  title="Font Size"
                >
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 32].map((s) => (
                    <option key={s} value={s}>
                      {s} pt
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setFontSize((prev) => Math.min(72, prev + 1))}
                  className="px-2 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer font-bold"
                  title="Increase font size"
                >
                  +
                </button>
              </div>

              {/* Styles: Bold, Italic, Underline */}
              <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] p-0.5">
                <button
                  onClick={() => setBold(!bold)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    bold ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                  title="Bold (B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setItalic(!italic)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    italic ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                  title="Italic (I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setUnderline(!underline)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    underline ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                  title="Underline (U)"
                >
                  <UnderlineIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] p-0.5">
                <button
                  onClick={() => setAlignment('left')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    alignment === 'left' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAlignment('center')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    alignment === 'center' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAlignment('right')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    alignment === 'right' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAlignment('justify')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    alignment === 'justify' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                  title="Justify"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Line Spacing */}
              <select
                value={lineSpacing}
                onChange={(e) => setLineSpacing(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                title="Line Spacing"
              >
                <option value="single">Single (1.0x)</option>
                <option value="1.15">1.15x (Standard)</option>
                <option value="1.5">1.5x (Relaxed)</option>
                <option value="double">Double (2.0x)</option>
              </select>

              {/* Text Color */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B]">
                <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">Color</span>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  title="Document text color"
                />
              </div>
            </div>
          </div>

          {/* Large Text Editor Canvas */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Document Editor</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>{charCount.toLocaleString()} chars</span>
                <span>•</span>
                <span>{wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>{lineCount.toLocaleString()} lines</span>
              </div>

              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Auto-formatting active</span>
              </div>
            </div>

            <textarea
              id="text-to-pdf-main-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or start typing your document text here..."
              rows={18}
              className={`w-full p-6 bg-transparent text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none resize-y min-h-[380px] max-h-[700px] text-sm leading-relaxed ${
                fontFamily === 'courier' ? 'font-mono' : fontFamily === 'times' ? 'font-serif' : 'font-sans'
              }`}
              style={{
                textAlign: alignment,
                fontWeight: bold ? 'bold' : 'normal',
                fontStyle: italic ? 'italic' : 'normal',
                textDecoration: underline ? 'underline' : 'none',
              }}
            />
          </div>

          {/* Quick Preset Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                onClick={() => handleSelectTemplate(key)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-blue-500 text-left transition-all group cursor-pointer"
              >
                <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors flex items-center justify-between">
                  <span>{tpl.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-1 mt-1">
                  Load ready-made structure & styling
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Settings & Live Document Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Document Settings Panel */}
          <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#2563EB]" />
                <span>Document & Page Settings</span>
              </h2>
              <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/40">
                Vector 300 DPI
              </span>
            </div>

            {/* Page Size & Orientation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="a3">A3 (297 × 420 mm)</option>
                  <option value="letter">US Letter (8.5 × 11 in)</option>
                  <option value="legal">US Legal (8.5 × 14 in)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Orientation</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      orientation === 'portrait' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      orientation === 'landscape' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>

            {/* Margins & Page Numbers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Margins</label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="small">Small (0.28 in / 20 pt)</option>
                  <option value="normal">Normal (0.5 in / 36 pt)</option>
                  <option value="large">Large (0.75 in / 54 pt)</option>
                  <option value="custom">Custom Margin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Page Numbers</label>
                <select
                  value={pageNumbers}
                  onChange={(e) => setPageNumbers(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="none">No Page Numbers</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>
            </div>

            {margin === 'custom' && (
              <div className="space-y-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  <span>Custom Margin Width</span>
                  <span>{customMarginVal} pt ({(customMarginVal / 72).toFixed(2)} in)</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="96"
                  value={customMarginVal}
                  onChange={(e) => setCustomMarginVal(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
              </div>
            )}

            {/* Document Filename & Optional Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Filename</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="document.pdf"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Header Text (Optional)</label>
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g. Confidential Report"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Live Interactive Document Preview Card */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs overflow-hidden flex flex-col">
            {/* Preview Toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Live Layout Preview</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">
                  {previewPages.length} Page(s)
                </span>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPreviewPage <= 1}
                  onClick={() => setCurrentPreviewPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {Math.min(currentPreviewPage, previewPages.length)} / {previewPages.length}
                </span>
                <button
                  disabled={currentPreviewPage >= previewPages.length}
                  onClick={() => setCurrentPreviewPage((p) => Math.min(previewPages.length, p + 1))}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview Stage Container with realistic shadow and page margins */}
            <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 flex items-center justify-center overflow-auto min-h-[380px]">
              <div
                className="bg-white text-slate-900 shadow-xl rounded-sm transition-all relative flex flex-col justify-between"
                style={{
                  width: orientation === 'landscape' ? '100%' : '82%',
                  aspectRatio: `${pageAspect}`,
                  padding: `${Math.max(16, marginPt * 0.55)}px`,
                  color: textColor,
                }}
              >
                {/* Header preview */}
                {headerText ? (
                  <div className="text-[9px] text-slate-400 border-b border-slate-200 pb-1 mb-2 font-sans tracking-wide">
                    {headerText}
                  </div>
                ) : null}

                {/* Page Content */}
                <div
                  className={`flex-1 overflow-hidden space-y-2 ${previewFontFamilyClass} ${previewLineHeightClass}`}
                  style={{
                    fontSize: `${Math.max(8, fontSize * 0.75)}px`,
                    textAlign: alignment,
                    fontWeight: bold ? 'bold' : 'normal',
                    fontStyle: italic ? 'italic' : 'normal',
                    textDecoration: underline ? 'underline' : 'none',
                  }}
                >
                  {(previewPages[Math.min(currentPreviewPage - 1, previewPages.length - 1)] || []).map(
                    (para, idx) => (
                      <p key={idx} className="whitespace-pre-wrap">
                        {para || <br />}
                      </p>
                    )
                  )}
                </div>

                {/* Footer / Page Number Preview */}
                {pageNumbers !== 'none' && (
                  <div
                    className={`text-[9px] text-slate-400 pt-2 font-sans flex ${
                      pageNumbers === 'bottom-center'
                        ? 'justify-center'
                        : pageNumbers === 'bottom-right'
                        ? 'justify-end'
                        : 'justify-end'
                    }`}
                  >
                    <span>
                      Page {Math.min(currentPreviewPage, previewPages.length)} of {previewPages.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Conversion CTA in Preview Card */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Ready to download <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{filename}</span>
              </div>
              <button
                onClick={handleConvertToPdf}
                disabled={isConverting || !text.trim()}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isConverting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real Server PDF Modal Viewer */}
      {showRealPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] w-full max-w-5xl h-[85vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Real PDF Server Render Preview
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Generated by pdf-lib vector engine ({pageSize.toUpperCase()} • {orientation})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConvertToPdf}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setShowRealPdfModal(false)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF Stream */}
            <div className="flex-1 bg-slate-900 p-2 flex items-center justify-center overflow-hidden">
              {isLoadingRealPdf ? (
                <div className="flex flex-col items-center gap-3 text-white">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#2563EB]" />
                  <span className="text-sm font-semibold">Generating real PDF from server...</span>
                </div>
              ) : realPdfUrl ? (
                <iframe
                  src={realPdfUrl}
                  title="PDF Preview"
                  className="w-full h-full rounded-xl border border-slate-800 bg-white"
                />
              ) : (
                <div className="text-slate-400 text-sm">Failed to load preview.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
