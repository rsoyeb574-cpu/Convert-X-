import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageView, PdfToTextPage, PdfToTextExtraction, PdfToTextSaveSettings } from '../types.js';
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
  LayoutGrid,
  CheckCircle2,
  Search,
  Replace,
  RotateCcw,
  RotateCw,
  Scissors,
  Clipboard,
  Plus,
  AlertCircle,
  HelpCircle,
  FileCode,
  FileDown,
  Info,
} from 'lucide-react';

interface PdfToTextStudioProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRecordHistory?: (item: any) => void;
  darkMode?: boolean;
}

const LOCAL_STORAGE_DRAFT_KEY = 'convertx_pdf_to_text_draft_v1';

export const PdfToTextStudio: React.FC<PdfToTextStudioProps> = ({
  onNavigate,
  showToast,
  onRecordHistory,
  darkMode = false,
}) => {
  // --- STATE ---
  const [extraction, setExtraction] = useState<PdfToTextExtraction | null>(null);
  const [pages, setPages] = useState<PdfToTextPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'thumbnails' | 'editor' | 'settings'>('editor');

  // OCR state
  const [ocrStatus, setOcrStatus] = useState<{ configured: boolean; providerName: string; description: string }>({
    configured: false,
    providerName: 'Checking...',
    description: '',
  });

  // Settings
  const [settings, setSettings] = useState<PdfToTextSaveSettings>({
    mode: 'extract_and_edit',
    pageSize: 'a4',
    orientation: 'portrait',
    margin: 'normal',
    fontFamily: 'sans',
    fontSize: 11,
    lineSpacing: '1.15',
    pageNumbers: 'bottom-center',
    headerText: '',
    textColor: '#111827',
  });

  // Editor Undo / Redo history
  const [history, setHistory] = useState<{ pages: PdfToTextPage[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [matchCount, setMatchCount] = useState<number>(0);

  // Saving / Downloading
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFormat, setSaveFormat] = useState<'pdf' | 'txt' | 'docx' | null>(null);

  // Draft recovery prompt
  const [hasStoredDraft, setHasStoredDraft] = useState<boolean>(false);
  const [storedDraftData, setStoredDraftData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Fetch OCR status on mount
  useEffect(() => {
    fetch('/api/pdf-to-text/ocr-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOcrStatus({
            configured: data.configured,
            providerName: data.providerName,
            description: data.description,
          });
        }
      })
      .catch((e) => console.warn('Could not fetch OCR status:', e));
  }, []);

  // Check for saved local draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.pages && parsed.pages.length > 0) {
          setHasStoredDraft(true);
          setStoredDraftData(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read saved draft:', e);
    }
  }, []);

  // Autosave to localStorage (debounced)
  useEffect(() => {
    if (!pages || pages.length === 0) return;

    const timer = setTimeout(() => {
      try {
        const draft = {
          fileName: extraction?.fileName || 'document.pdf',
          jobId: extraction?.jobId || '',
          pages: pages.map((p) => ({
            pageNumber: p.pageNumber,
            text: p.text,
            width: p.width,
            height: p.height,
          })),
          settings,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        // Safe fail
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pages, settings, extraction]);

  // Push state to undo/redo history
  const pushHistory = (newPages: PdfToTextPage[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ pages: JSON.parse(JSON.stringify(newPages)) });
    if (newHistory.length > 30) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setPages(JSON.parse(JSON.stringify(history[targetIndex].pages)));
      showToast('Undo', 'Reverted last change', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setPages(JSON.parse(JSON.stringify(history[targetIndex].pages)));
      showToast('Redo', 'Reapplied change', 'info');
    }
  };

  // Update page text
  const handlePageTextChange = (pageIndex: number, newText: string) => {
    const updated = [...pages];
    const words = newText.trim() ? newText.trim().split(/\s+/).length : 0;
    updated[pageIndex] = {
      ...updated[pageIndex],
      text: newText,
      characterCount: newText.length,
      wordCount: words,
    };
    setPages(updated);
    pushHistory(updated);
  };

  // Restore draft
  const handleRestoreDraft = () => {
    if (!storedDraftData) return;
    setPages(storedDraftData.pages);
    if (storedDraftData.settings) {
      setSettings(storedDraftData.settings);
    }
    setExtraction({
      jobId: storedDraftData.jobId || 'draft_restored',
      fileName: storedDraftData.fileName || 'restored_draft.pdf',
      originalFileSize: 0,
      totalPages: storedDraftData.pages.length,
      pdfType: 'text',
      detectedPageSize: 'A4 (Restored)',
      ocrConfigured: ocrStatus.configured,
      ocrEngineName: ocrStatus.providerName,
      pages: storedDraftData.pages,
    });
    setHasStoredDraft(false);
    showToast('Draft Restored', 'Your previous editing session has been recovered.', 'success');
  };

  const handleDismissDraft = () => {
    setHasStoredDraft(false);
    try {
      localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
    } catch {}
  };

  // Handle PDF file upload
  const handlePdfUpload = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Invalid File', 'Please select a valid PDF file (.pdf).', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum PDF size is 100MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Analyzing PDF structure & page geometry...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setTimeout(() => {
        setUploadProgressText('Extracting selectable text streams...');
      }, 700);

      setTimeout(() => {
        if (ocrStatus.configured) {
          setUploadProgressText('Analyzing pages for scanned OCR pass...');
        } else {
          setUploadProgressText('Reconstructing document paragraphs & layout...');
        }
      }, 1500);

      const response = await fetch('/api/pdf-to-text/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract text from PDF.');
      }

      setExtraction(data);
      setPages(data.pages);
      setActivePageIndex(0);

      // Initialize history
      setHistory([{ pages: JSON.parse(JSON.stringify(data.pages)) }]);
      setHistoryIndex(0);

      showToast(
        'PDF Loaded',
        `Extracted ${data.totalPages} page${data.totalPages > 1 ? 's' : ''} (${data.pdfType.toUpperCase()} PDF).`,
        'success'
      );
    } catch (err: any) {
      showToast('Extraction Error', err.message || 'Could not parse the PDF.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Load built-in sample PDF for instant testing
  const handleLoadSample = async () => {
    setIsUploading(true);
    setUploadProgressText('Loading sample vector PDF...');

    try {
      const sampleRes = await fetch('/api/sample/sample_pdf');
      const sampleData = await sampleRes.json();

      if (!sampleRes.ok || !sampleData.jobId) {
        throw new Error('Failed to load sample PDF.');
      }

      setUploadProgressText('Extracting sample text and formatting...');

      const extractRes = await fetch('/api/pdf-to-text/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: sampleData.jobId }),
      });

      const data = await extractRes.json();
      if (!extractRes.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract sample text.');
      }

      setExtraction(data);
      setPages(data.pages);
      setActivePageIndex(0);
      setHistory([{ pages: JSON.parse(JSON.stringify(data.pages)) }]);
      setHistoryIndex(0);

      showToast('Sample Loaded', 'Sample PDF successfully loaded and extracted.', 'success');
    } catch (err: any) {
      showToast('Sample Error', err.message || 'Could not load sample PDF.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Page operations
  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPage: PdfToTextPage = {
      pageNumber: newPageNum,
      text: '',
      width: 595,
      height: 842,
      isScanned: false,
      ocrApplied: false,
      characterCount: 0,
      wordCount: 0,
    };
    const updated = [...pages, newPage];
    setPages(updated);
    pushHistory(updated);
    setActivePageIndex(updated.length - 1);
    showToast('Page Added', `Added Page ${newPageNum}`, 'info');
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      showToast('Cannot Delete', 'Document must have at least one page.', 'warning');
      return;
    }
    const updated = pages
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, pageNumber: i + 1 }));
    setPages(updated);
    pushHistory(updated);
    setActivePageIndex(Math.min(activePageIndex, updated.length - 1));
    showToast('Page Deleted', `Removed page ${index + 1}`, 'info');
  };

  const handleClearPage = (index: number) => {
    handlePageTextChange(index, '');
    showToast('Page Cleared', `Cleared text for Page ${index + 1}`, 'info');
  };

  // Find and Replace logic
  useEffect(() => {
    if (!findQuery.trim()) {
      setMatchCount(0);
      return;
    }
    try {
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let count = 0;
      for (const p of pages) {
        const matches = (p.text || '').match(regex);
        if (matches) count += matches.length;
      }
      setMatchCount(count);
    } catch {
      setMatchCount(0);
    }
  }, [findQuery, pages]);

  const handleReplaceOne = () => {
    if (!findQuery) return;
    const activeText = pages[activePageIndex]?.text || '';
    const idx = activeText.toLowerCase().indexOf(findQuery.toLowerCase());
    if (idx !== -1) {
      const newText =
        activeText.substring(0, idx) + replaceQuery + activeText.substring(idx + findQuery.length);
      handlePageTextChange(activePageIndex, newText);
      showToast('Replaced', 'Replaced 1 match in current page', 'info');
    } else {
      showToast('No Match', 'No matches found on current page', 'warning');
    }
  };

  const handleReplaceAll = () => {
    if (!findQuery) return;
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let replacedTotal = 0;

    const updated = pages.map((p) => {
      const matches = (p.text || '').match(regex);
      if (matches) replacedTotal += matches.length;
      const newText = (p.text || '').replace(regex, replaceQuery);
      return {
        ...p,
        text: newText,
        characterCount: newText.length,
        wordCount: newText.trim() ? newText.trim().split(/\s+/).length : 0,
      };
    });

    setPages(updated);
    pushHistory(updated);
    showToast('Replace All', `Replaced ${replacedTotal} matches across all pages.`, 'success');
  };

  // Copy all document text
  const handleCopyAll = () => {
    const fullText = pages.map((p) => p.text).join('\n\n');
    navigator.clipboard.writeText(fullText);
    showToast('Copied', 'Full document text copied to clipboard.', 'success');
  };

  // Save / Export
  const handleSaveDocument = async (format: 'pdf' | 'txt' | 'docx') => {
    if (!pages || pages.length === 0) return;

    setIsSaving(true);
    setSaveFormat(format);

    try {
      const baseFilename = extraction?.fileName ? extraction.fileName.replace(/\.pdf$/i, '') : 'document';

      const response = await fetch('/api/pdf-to-text/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pages.map((p) => ({
            pageNumber: p.pageNumber,
            text: p.text,
            width: p.width,
            height: p.height,
          })),
          format,
          mode: settings.mode,
          jobId: extraction?.jobId,
          filename: baseFilename,
          options: settings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate document.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFilename}_${settings.mode === 'preserve_layout' ? 'preserved' : 'edited'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(
        'Saved Successfully',
        `Downloaded your document as ${format.toUpperCase()}`,
        'success'
      );

      if (onRecordHistory) {
        onRecordHistory({
          id: `save_${Date.now()}`,
          fileName: `${baseFilename}.${format}`,
          inputFormat: 'pdf',
          outputFormat: format,
          originalSize: extraction?.originalFileSize || 0,
          outputSize: blob.size,
          date: new Date().toISOString(),
          status: 'completed',
        });
      }
    } catch (err: any) {
      showToast('Export Error', err.message || 'PDF generation failed. Please try again.', 'error');
    } finally {
      setIsSaving(false);
      setSaveFormat(null);
    }
  };

  // Download original unchanged PDF
  const handleDownloadOriginal = () => {
    if (!extraction?.jobId) return;
    window.location.href = `/api/pdf-to-text/download-original/${extraction.jobId}`;
    showToast('Downloading', 'Downloading original PDF...', 'info');
  };

  // Aggregate metrics
  const totalWords = useMemo(
    () => pages.reduce((sum, p) => sum + (p.wordCount || 0), 0),
    [pages]
  );
  const totalChars = useMemo(
    () => pages.reduce((sum, p) => sum + (p.characterCount || 0), 0),
    [pages]
  );
  const estReadingMins = useMemo(
    () => Math.max(1, Math.ceil(totalWords / 200)),
    [totalWords]
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* 1. TOP HEADER & NAVIGATION BAR */}
      <header className={`border-b ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur sticky top-0 z-30 px-4 py-3.5`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('tools')}
              className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
              title="Back to all tools"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">PDF to Text</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600/10 text-blue-600 border border-blue-500/20">
                  Extract • Edit • Save
                </span>
                {extraction && (
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
                      extraction.pdfType === 'scanned'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : extraction.pdfType === 'mixed'
                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}
                  >
                    {extraction.pdfType.toUpperCase()} PDF
                  </span>
                )}
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Extract text from PDF, edit it and save your changes.
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {extraction ? (
              <>
                <button
                  onClick={handleCopyAll}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                  title="Copy full document text"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy All</span>
                </button>

                <button
                  onClick={handleDownloadOriginal}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm'
                  }`}
                  title="Download original unchanged PDF"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Original PDF</span>
                </button>

                <button
                  onClick={() => {
                    setExtraction(null);
                    setPages([]);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                    darkMode
                      ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Start over with new file"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New PDF</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                    ocrStatus.configured
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  }`}
                  title={ocrStatus.description}
                >
                  <Sparkles className="w-3 h-3" />
                  {ocrStatus.configured ? 'OCR Engine Ready' : 'Direct Text Mode'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DRAFT RESTORE BANNER */}
      {hasStoredDraft && (
        <div className="bg-blue-600 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Found an unsaved editing draft from a previous session. Would you like to restore it?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestoreDraft}
                className="px-3 py-1 rounded bg-white text-blue-700 font-semibold hover:bg-blue-50 transition"
              >
                Restore Draft
              </button>
              <button
                onClick={handleDismissDraft}
                className="px-3 py-1 rounded bg-blue-700/50 hover:bg-blue-700 text-white transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {!extraction ? (
          /* ========================================================================= */
          /* STAGE 1: PDF UPLOAD & DRAG/DROP ZONE */
          /* ========================================================================= */
          <div className="max-w-3xl mx-auto py-10">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handlePdfUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
                  : darkMode
                  ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  : 'border-slate-300 bg-white hover:border-blue-400 shadow-sm'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePdfUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                {isUploading ? (
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                ) : (
                  <FileText className="w-8 h-8" />
                )}
              </div>

              {isUploading ? (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Processing PDF...</h2>
                  <p className="text-sm text-blue-600 font-medium animate-pulse">{uploadProgressText}</p>
                  <div className="w-48 h-1.5 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-indeterminate" />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-2">Upload your PDF to Extract & Edit</h2>
                  <p className={`text-sm mb-6 max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Drag and drop your PDF here or choose from your device. Supports text-based PDFs and scanned documents via OCR.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Choose PDF
                    </button>

                    <button
                      onClick={handleLoadSample}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Try Sample PDF
                    </button>
                  </div>
                </>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Zero-Retention Privacy</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Type className="w-4 h-4 text-blue-500" />
                  <span>Multilingual Unicode</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Multi-Page Pagination</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STAGE 2: PROFESSIONAL 3-COLUMN DOCUMENT STUDIO */
          /* ========================================================================= */
          <div>
            {/* Mobile Tab Navigation */}
            <div className="flex md:hidden mb-4 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setMobileTab('thumbnails')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center ${
                  mobileTab === 'thumbnails'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Pages ({pages.length})
              </button>
              <button
                onClick={() => setMobileTab('editor')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center ${
                  mobileTab === 'editor'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setMobileTab('settings')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center ${
                  mobileTab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Export & Settings
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* --------------------------------------------------------------------- */}
              {/* LEFT COLUMN: PDF PAGE THUMBNAILS (3 COLS) */}
              {/* --------------------------------------------------------------------- */}
              <div
                className={`lg:col-span-3 space-y-4 ${
                  mobileTab === 'thumbnails' ? 'block' : 'hidden lg:block'
                }`}
              >
                <div
                  className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Document Pages
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold">
                      {pages.length} Pages
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {pages.map((p, idx) => (
                      <div
                        key={`thumb_${p.pageNumber}_${idx}`}
                        onClick={() => {
                          setActivePageIndex(idx);
                          textareaRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          activePageIndex === idx
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                            : darkMode
                            ? 'border-slate-800 hover:border-slate-700 bg-slate-950'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className="font-semibold">Page {p.pageNumber}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              p.isScanned
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                          >
                            {p.isScanned ? (p.ocrApplied ? 'OCR' : 'Scanned') : 'Text'}
                          </span>
                        </div>

                        {/* Thumbnail Image or Geometry Canvas preview */}
                        <div className="w-full aspect-[1/1.3] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center relative p-2 text-left">
                          {p.thumbnailUrl ? (
                            <img
                              src={p.thumbnailUrl}
                              alt={`Page ${p.pageNumber} thumbnail`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full text-[8px] text-slate-400 overflow-hidden leading-tight select-none">
                              {(p.text || '').slice(0, 150) || '(Blank Page)'}
                            </div>
                          )}
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{p.wordCount} words</span>
                          <span>{p.characterCount} chars</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={handleAddPage}
                      className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Page Break
                    </button>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------------------- */}
              {/* CENTER COLUMN: DOCUMENT EDITOR & TOOLBAR (6 COLS) */}
              {/* --------------------------------------------------------------------- */}
              <div
                className={`lg:col-span-6 space-y-4 ${
                  mobileTab === 'editor' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* STICKY EDITOR TOOLBAR */}
                <div
                  className={`p-2 rounded-xl border sticky top-16 z-20 backdrop-blur shadow-sm ${
                    darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    {/* Undo / Redo */}
                    <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
                      <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                        title="Undo (Ctrl+Z)"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                        title="Redo (Ctrl+Y)"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Find & Replace toggle */}
                    <button
                      onClick={() => setShowFindReplace(!showFindReplace)}
                      className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
                        showFindReplace
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title="Find & Replace (Ctrl+F)"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Find</span>
                    </button>

                    {/* Font Family selector */}
                    <select
                      value={settings.fontFamily}
                      onChange={(e) =>
                        setSettings({ ...settings, fontFamily: e.target.value as any })
                      }
                      className={`text-xs px-2 py-1 rounded border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      title="Font Family"
                    >
                      <option value="sans">Noto Sans</option>
                      <option value="serif">Noto Serif</option>
                      <option value="mono">Noto Monospace</option>
                    </select>

                    {/* Font Size */}
                    <select
                      value={settings.fontSize}
                      onChange={(e) =>
                        setSettings({ ...settings, fontSize: Number(e.target.value) })
                      }
                      className={`text-xs px-2 py-1 rounded border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      title="Font Size"
                    >
                      <option value={9}>9 pt</option>
                      <option value={10}>10 pt</option>
                      <option value={11}>11 pt</option>
                      <option value={12}>12 pt</option>
                      <option value={14}>14 pt</option>
                      <option value={16}>16 pt</option>
                    </select>

                    {/* Line Spacing */}
                    <select
                      value={settings.lineSpacing}
                      onChange={(e) =>
                        setSettings({ ...settings, lineSpacing: e.target.value as any })
                      }
                      className={`text-xs px-2 py-1 rounded border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      title="Line Spacing"
                    >
                      <option value="1.0">1.0 Single</option>
                      <option value="1.15">1.15 Normal</option>
                      <option value="1.5">1.5 Medium</option>
                      <option value="2.0">2.0 Double</option>
                    </select>
                  </div>

                  {/* EXPANDABLE FIND & REPLACE BAR */}
                  {showFindReplace && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[140px]">
                        <input
                          type="text"
                          value={findQuery}
                          onChange={(e) => setFindQuery(e.target.value)}
                          placeholder="Find text..."
                          className={`w-full text-xs pl-7 pr-12 py-1.5 rounded border ${
                            darkMode
                              ? 'bg-slate-950 border-slate-700 text-slate-200'
                              : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                        {findQuery && (
                          <span className="text-[10px] font-semibold text-slate-400 absolute right-2 top-2">
                            {matchCount} found
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-[140px]">
                        <input
                          type="text"
                          value={replaceQuery}
                          onChange={(e) => setReplaceQuery(e.target.value)}
                          placeholder="Replace with..."
                          className={`w-full text-xs px-2.5 py-1.5 rounded border ${
                            darkMode
                              ? 'bg-slate-950 border-slate-700 text-slate-200'
                              : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleReplaceOne}
                          disabled={!findQuery}
                          className="px-2.5 py-1 text-xs rounded font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                        >
                          Replace
                        </button>
                        <button
                          onClick={handleReplaceAll}
                          disabled={!findQuery}
                          className="px-2.5 py-1 text-xs rounded font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition"
                        >
                          Replace All
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* MULTI-PAGE DOCUMENT CANVAS */}
                <div className="space-y-6">
                  {pages.map((page, idx) => (
                    <div
                      key={`page_sheet_${page.pageNumber}_${idx}`}
                      className={`rounded-xl border shadow-sm transition-all ${
                        activePageIndex === idx
                          ? 'ring-2 ring-blue-500/50'
                          : ''
                      } ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                    >
                      {/* Page Header Bar */}
                      <div
                        className={`px-4 py-2.5 border-b flex items-center justify-between text-xs ${
                          darkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                            : 'bg-slate-50/80 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Page {page.pageNumber} of {pages.length}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • {page.width} × {page.height} pt
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleClearPage(idx)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition"
                            title="Clear page text"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {pages.length > 1 && (
                            <button
                              onClick={() => handleDeletePage(idx)}
                              className="p-1 hover:bg-red-500/10 rounded text-red-500 transition"
                              title="Delete page"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Multiline Editable Content Area */}
                      <div className="p-6">
                        <textarea
                          ref={(el) => (textareaRefs.current[idx] = el)}
                          value={page.text}
                          onChange={(e) => handlePageTextChange(idx, e.target.value)}
                          onFocus={() => setActivePageIndex(idx)}
                          rows={Math.max(12, Math.min(30, (page.text || '').split('\n').length + 3))}
                          placeholder={`Page ${page.pageNumber} content... Type or paste text here.`}
                          style={{
                            fontFamily:
                              settings.fontFamily === 'mono'
                                ? 'ui-monospace, monospace'
                                : settings.fontFamily === 'serif'
                                ? 'Georgia, serif'
                                : 'system-ui, sans-serif',
                            fontSize: `${settings.fontSize}pt`,
                            lineHeight: settings.lineSpacing,
                          }}
                          className={`w-full resize-y bg-transparent outline-none border-none p-0 leading-relaxed ${
                            darkMode ? 'text-slate-100' : 'text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Page Footer Counters */}
                      <div
                        className={`px-4 py-2 border-t flex items-center justify-between text-[11px] ${
                          darkMode
                            ? 'border-slate-800 text-slate-500'
                            : 'border-slate-100 text-slate-400'
                        }`}
                      >
                        <span>
                          {page.wordCount} words • {page.characterCount} characters
                        </span>
                        <span>Auto-paginated</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOTTOM METRICS BAR */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span>
                      Total Pages: <strong className="text-slate-700 dark:text-slate-200">{pages.length}</strong>
                    </span>
                    <span>
                      Words: <strong className="text-slate-700 dark:text-slate-200">{totalWords}</strong>
                    </span>
                    <span>
                      Characters: <strong className="text-slate-700 dark:text-slate-200">{totalChars}</strong>
                    </span>
                    <span>
                      Reading Time: <strong className="text-slate-700 dark:text-slate-200">~{estReadingMins} min</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Autosaved locally</span>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------------------- */}
              {/* RIGHT COLUMN: SETTINGS & EXPORT ACTIONS (3 COLS) */}
              {/* --------------------------------------------------------------------- */}
              <div
                className={`lg:col-span-3 space-y-4 ${
                  mobileTab === 'settings' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* Export & Download Card */}
                <div
                  className={`p-5 rounded-xl border space-y-4 ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      Save & Download
                    </h3>
                    <FileDown className="w-4 h-4 text-blue-500" />
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Export Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <button
                        onClick={() => setSettings({ ...settings, mode: 'extract_and_edit' })}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-md transition ${
                          settings.mode === 'extract_and_edit'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Extract & Edit
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, mode: 'preserve_layout' })}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-md transition ${
                          settings.mode === 'preserve_layout'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Preserve Layout
                      </button>
                    </div>
                    {settings.mode === 'preserve_layout' && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1 mt-1">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>Complex PDFs may not preserve every original design element perfectly.</span>
                      </p>
                    )}
                  </div>

                  {/* Sizing & Orientation */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Page Size</label>
                      <select
                        value={settings.pageSize}
                        onChange={(e) => setSettings({ ...settings, pageSize: e.target.value as any })}
                        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="a4">A4 (Standard)</option>
                        <option value="letter">US Letter</option>
                        <option value="a3">A3 (Large)</option>
                        <option value="original">Original Size</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Orientation</label>
                      <select
                        value={settings.orientation}
                        onChange={(e) => setSettings({ ...settings, orientation: e.target.value as any })}
                        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                        <option value="original">Auto Detect</option>
                      </select>
                    </div>
                  </div>

                  {/* Margins & Page Numbers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Margins</label>
                      <select
                        value={settings.margin as string}
                        onChange={(e) => setSettings({ ...settings, margin: e.target.value as any })}
                        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="small">Narrow (24pt)</option>
                        <option value="normal">Normal (36pt)</option>
                        <option value="large">Wide (54pt)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Page Numbers</label>
                      <select
                        value={settings.pageNumbers}
                        onChange={(e) => setSettings({ ...settings, pageNumbers: e.target.value as any })}
                        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="bottom-center">Bottom Center</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="top-right">Top Right</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Header Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Header Text (Optional)</label>
                    <input
                      type="text"
                      value={settings.headerText}
                      onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
                      placeholder="e.g. Confidential Report"
                      className={`w-full text-xs px-2.5 py-1.5 rounded-lg border ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* File Size Metric */}
                  {extraction && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Original PDF:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {(extraction.originalFileSize / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Detected Geometry:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {extraction.detectedPageSize}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* DOWNLOAD BUTTONS */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* 1. PDF Download */}
                    <button
                      onClick={() => handleSaveDocument('pdf')}
                      disabled={isSaving}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving && saveFormat === 'pdf' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Download PDF</span>
                    </button>

                    {/* 2. DOCX Download */}
                    <button
                      onClick={() => handleSaveDocument('docx')}
                      disabled={isSaving}
                      className={`w-full py-2 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                      }`}
                    >
                      {isSaving && saveFormat === 'docx' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileCode className="w-4 h-4 text-blue-500" />
                      )}
                      <span>Download DOCX</span>
                    </button>

                    {/* 3. TXT Download */}
                    <button
                      onClick={() => handleSaveDocument('txt')}
                      disabled={isSaving}
                      className={`w-full py-2 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm'
                      }`}
                    >
                      {isSaving && saveFormat === 'txt' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Download TXT</span>
                    </button>
                  </div>
                </div>

                {/* Privacy Guarantee Box */}
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-blue-50/50 border-blue-100 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Ephemeral Zero-Retention</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Your files are converted in memory and automatically removed. We never store or retain your documents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
