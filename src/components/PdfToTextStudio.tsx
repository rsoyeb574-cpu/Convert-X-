import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Search,
  RotateCcw,
  RotateCw,
  Scissors,
  Plus,
  AlertCircle,
  FileCode,
  FileDown,
  Info,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Maximize2,
  BookOpen,
} from 'lucide-react';

interface PdfToTextStudioProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRecordHistory?: (item: any) => void;
  darkMode?: boolean;
}

const LOCAL_STORAGE_DRAFT_KEY = 'convertx_pdf_to_text_draft_v2';

/**
 * Convert plain text (markdown or lines) into semantic HTML
 */
function textToHtml(text: string): string {
  if (!text || !text.trim()) return '<p><br></p>';
  const lines = text.split(/\r\n|\r|\n/);
  const htmlParts: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      htmlParts.push('<p><br></p>');
      continue;
    }
    const safe = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (trimmed.startsWith('# ')) {
      htmlParts.push(`<h1>${safe.slice(2)}</h1>`);
    } else if (trimmed.startsWith('## ')) {
      htmlParts.push(`<h2>${safe.slice(3)}</h2>`);
    } else if (trimmed.startsWith('### ')) {
      htmlParts.push(`<h3>${safe.slice(4)}</h3>`);
    } else if (/^[-*•]\s+/.test(trimmed)) {
      htmlParts.push(`<ul><li>${safe.replace(/^[-*•]\s+/, '')}</li></ul>`);
    } else if (/^\d+\.\s+/.test(trimmed)) {
      htmlParts.push(`<ol><li>${safe.replace(/^\d+\.\s+/, '')}</li></ol>`);
    } else {
      htmlParts.push(`<p>${safe}</p>`);
    }
  }
  return htmlParts.join('\n');
}

/**
 * Convert semantic HTML back to clean plain text
 */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');

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
  const pageEditableRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch OCR status on mount
  useEffect(() => {
    fetch('/api/pdf-to-text/ocr-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOcrStatus({
            configured: data.configured,
            providerName: data.providerName || 'Local Engine',
            description: data.description || '',
          });
        }
      })
      .catch((err) => {
        console.warn('Could not check OCR status:', err);
      });

    // Check for saved local draft
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          setHasStoredDraft(true);
          setStoredDraftData(parsed);
        }
      }
    } catch {
      // Ignore local storage parse errors
    }
  }, []);

  // Synchronize DOM innerHTML when active pages change via external action (undo/redo/replace/page add)
  const syncDomFromPages = useCallback((pagesList: PdfToTextPage[]) => {
    pagesList.forEach((p, idx) => {
      const el = pageEditableRefs.current[idx];
      if (el) {
        const expectedHtml = p.html || textToHtml(p.text);
        if (el.innerHTML !== expectedHtml) {
          el.innerHTML = expectedHtml;
        }
      }
    });
  }, []);

  // History push
  const pushHistory = (newPages: PdfToTextPage[]) => {
    const clone = JSON.parse(JSON.stringify(newPages));
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push({ pages: clone });
    if (newHist.length > 30) newHist.shift();
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);

    // Save draft
    try {
      localStorage.setItem(
        LOCAL_STORAGE_DRAFT_KEY,
        JSON.stringify({
          pages: clone,
          extraction,
          settings,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Ignore storage quota
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const target = history[newIdx].pages;
      setHistoryIndex(newIdx);
      setPages(target);
      syncDomFromPages(target);
      showToast('Undo', 'Reverted previous edit.', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      const target = history[newIdx].pages;
      setHistoryIndex(newIdx);
      setPages(target);
      syncDomFromPages(target);
      showToast('Redo', 'Reapplied edit.', 'info');
    }
  };

  // Content change handler from contentEditable
  const handleContentInput = (pageIndex: number) => {
    const el = pageEditableRefs.current[pageIndex];
    if (!el) return;

    const currentHtml = el.innerHTML;
    const plainText = htmlToPlainText(currentHtml);
    const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

    setPages((prev) => {
      const updated = [...prev];
      if (updated[pageIndex]) {
        updated[pageIndex] = {
          ...updated[pageIndex],
          html: currentHtml,
          text: plainText,
          characterCount: plainText.length,
          wordCount: words,
        };
      }
      return updated;
    });
  };

  // Content blur pushes to history stack
  const handleContentBlur = (pageIndex: number) => {
    const el = pageEditableRefs.current[pageIndex];
    if (!el) return;
    const currentHtml = el.innerHTML;
    const plainText = htmlToPlainText(currentHtml);
    const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

    const updated = pages.map((p, i) =>
      i === pageIndex
        ? {
            ...p,
            html: currentHtml,
            text: plainText,
            characterCount: plainText.length,
            wordCount: words,
          }
        : p
    );
    pushHistory(updated);
  };

  // Rich-text formatting command execution
  const executeFormatting = (command: string, value: string | undefined = undefined) => {
    const el = pageEditableRefs.current[activePageIndex];
    if (el) {
      el.focus();
    }
    document.execCommand(command, false, value);
    handleContentInput(activePageIndex);
  };

  // Key shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, pageIndex: number) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        executeFormatting('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        executeFormatting('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        executeFormatting('underline');
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      }
    }
  };

  // Clean text paste
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>, pageIndex: number) => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, plain);
    handleContentInput(pageIndex);
  };

  // PDF File Upload
  const handlePdfUpload = async (file: File) => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Invalid File', 'Please upload a valid PDF document (.pdf).', 'error');
      return;
    }

    // Size limit check (50MB)
    if (file.size > 50 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum supported PDF size is 50MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Parsing PDF pages & extracting structured text...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/pdf-to-text/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract text from PDF.');
      }

      // Ensure pages have html
      const processedPages: PdfToTextPage[] = (data.pages || []).map((p: any) => ({
        ...p,
        html: p.html || textToHtml(p.text || ''),
      }));

      setExtraction(data);
      setPages(processedPages);
      setActivePageIndex(0);
      setHistory([{ pages: JSON.parse(JSON.stringify(processedPages)) }]);
      setHistoryIndex(0);

      // Save initial draft
      try {
        localStorage.setItem(
          LOCAL_STORAGE_DRAFT_KEY,
          JSON.stringify({
            pages: processedPages,
            extraction: data,
            settings,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch {
        // Ignore
      }

      showToast(
        'Text Extracted',
        `Successfully extracted ${data.totalPages} page${data.totalPages > 1 ? 's' : ''}. Document is ready for editing!`,
        'success'
      );

      // Populate DOM elements after render
      setTimeout(() => {
        syncDomFromPages(processedPages);
      }, 50);
    } catch (err: any) {
      showToast('Extraction Error', err.message || 'Could not parse the PDF.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Load built-in sample PDF
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

      const processedPages: PdfToTextPage[] = (data.pages || []).map((p: any) => ({
        ...p,
        html: p.html || textToHtml(p.text || ''),
      }));

      setExtraction(data);
      setPages(processedPages);
      setActivePageIndex(0);
      setHistory([{ pages: JSON.parse(JSON.stringify(processedPages)) }]);
      setHistoryIndex(0);

      showToast('Sample Loaded', 'Sample PDF loaded into the editor.', 'success');

      setTimeout(() => {
        syncDomFromPages(processedPages);
      }, 50);
    } catch (err: any) {
      showToast('Sample Error', err.message || 'Could not load sample PDF.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Restore stored draft
  const handleRestoreDraft = () => {
    if (!storedDraftData) return;
    setExtraction(storedDraftData.extraction || null);
    setPages(storedDraftData.pages || []);
    if (storedDraftData.settings) setSettings(storedDraftData.settings);
    setActivePageIndex(0);
    setHistory([{ pages: JSON.parse(JSON.stringify(storedDraftData.pages || [])) }]);
    setHistoryIndex(0);
    setHasStoredDraft(false);

    showToast('Draft Restored', 'Recovered your previous editing session.', 'success');

    setTimeout(() => {
      syncDomFromPages(storedDraftData.pages || []);
    }, 50);
  };

  const handleDismissDraft = () => {
    setHasStoredDraft(false);
    localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
  };

  // Page operations
  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPage: PdfToTextPage = {
      pageNumber: newPageNum,
      text: '',
      html: '<p><br></p>',
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

    setTimeout(() => {
      syncDomFromPages(updated);
    }, 50);
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

    setTimeout(() => {
      syncDomFromPages(updated);
    }, 50);
  };

  const handleClearPage = (index: number) => {
    const updated = pages.map((p, i) =>
      i === index
        ? {
            ...p,
            html: '<p><br></p>',
            text: '',
            characterCount: 0,
            wordCount: 0,
          }
        : p
    );
    setPages(updated);
    pushHistory(updated);
    syncDomFromPages(updated);
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
    const activePage = pages[activePageIndex];
    if (!activePage) return;

    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (regex.test(activePage.text)) {
      const newText = activePage.text.replace(regex, replaceQuery);
      const newHtml = textToHtml(newText);

      const updated = pages.map((p, i) =>
        i === activePageIndex
          ? {
              ...p,
              text: newText,
              html: newHtml,
              characterCount: newText.length,
              wordCount: newText.trim() ? newText.trim().split(/\s+/).length : 0,
            }
          : p
      );
      setPages(updated);
      pushHistory(updated);
      syncDomFromPages(updated);
      showToast('Replaced', 'Replaced 1 occurrence on current page.', 'info');
    } else {
      showToast('No Match', 'No matches found on the active page.', 'warning');
    }
  };

  const handleReplaceAll = () => {
    if (!findQuery) return;
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let replacedCount = 0;

    const updated = pages.map((p) => {
      const matches = (p.text || '').match(regex);
      if (matches) replacedCount += matches.length;
      const newText = (p.text || '').replace(regex, replaceQuery);
      const newHtml = textToHtml(newText);
      return {
        ...p,
        text: newText,
        html: newHtml,
        characterCount: newText.length,
        wordCount: newText.trim() ? newText.trim().split(/\s+/).length : 0,
      };
    });

    setPages(updated);
    pushHistory(updated);
    syncDomFromPages(updated);
    showToast('Replace All', `Replaced ${replacedCount} occurrence${replacedCount === 1 ? '' : 's'} across the document.`, 'success');
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
            html: p.html,
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

      const formatLabel = format === 'docx' ? 'Microsoft Word (.docx)' : format.toUpperCase();
      showToast(
        'Saved Successfully',
        `Downloaded your editable document as ${formatLabel}`,
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
      showToast('Export Error', err.message || 'File export failed. Please try again.', 'error');
    } finally {
      setIsSaving(false);
      setSaveFormat(null);
    }
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
  const estReadingMins = Math.max(1, Math.ceil(totalWords / 200));

  const hasScannedPages = pages.some((p) => p.isScanned);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* --------------------------------------------------------------------- */}
      {/* TOP APPLICATION HEADER */}
      {/* --------------------------------------------------------------------- */}
      <header
        className={`border-b sticky top-0 z-30 backdrop-blur ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('tools')}
              className={`p-2 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 ${
                darkMode
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Tools Directory</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  PDF to Text Document Studio
                </span>
                {extraction && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    Edit Extracted Text
                  </span>
                )}
              </div>
              {extraction && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                  {extraction.fileName} • {extraction.totalPages} {extraction.totalPages === 1 ? 'page' : 'pages'} • {extraction.pdfType.toUpperCase()}
                </p>
              )}
            </div>
          </div>

          {/* TOP RIGHT ACTION BAR */}
          <div className="flex items-center gap-2">
            {extraction ? (
              <>
                <button
                  onClick={() => handleSaveDocument('docx')}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Export valid, fully editable Microsoft Word .docx"
                >
                  {isSaving && saveFormat === 'docx' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Download</span> DOCX
                </button>

                <button
                  onClick={() => handleSaveDocument('pdf')}
                  disabled={isSaving}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                  title="Download edited document as PDF"
                >
                  {isSaving && saveFormat === 'pdf' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden md:inline">Download</span> PDF
                </button>

                <button
                  onClick={() => handleSaveDocument('txt')}
                  disabled={isSaving}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition hidden sm:flex items-center gap-1.5 disabled:opacity-50 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                  title="Download plain UTF-8 text"
                >
                  TXT
                </button>

                <button
                  onClick={() => {
                    setExtraction(null);
                    setPages([]);
                    localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
                  title="Upload another document"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  OCR: <strong className={ocrStatus.configured ? 'text-emerald-500' : 'text-amber-500'}>{ocrStatus.configured ? 'Active' : 'Unconfigured'}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* RESTORE DRAFT BANNER */}
      {/* --------------------------------------------------------------------- */}
      {hasStoredDraft && !extraction && (
        <div className="bg-blue-600 text-white px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>You have an autosaved PDF editing session from earlier. Would you like to restore it?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestoreDraft}
                className="px-2.5 py-1 rounded bg-white text-blue-700 font-bold hover:bg-blue-50 transition"
              >
                Restore Session
              </button>
              <button
                onClick={handleDismissDraft}
                className="px-2.5 py-1 rounded bg-blue-700 text-white hover:bg-blue-800 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!extraction ? (
          /* ========================================================================= */
          /* STAGE 1: PDF UPLOAD DROPZONE */
          /* ========================================================================= */
          <div className="max-w-3xl mx-auto py-8">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3 border border-blue-500/20">
                <FileText className="w-3.5 h-3.5" />
                Convert-X PDF to Text Document Editor
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                Extract & Edit PDF Documents
              </h1>
              <p className={`text-base max-w-xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Upload any PDF to extract text page-by-page. Edit with a full rich-text word processor, format headings and lists, and export valid Microsoft Word DOCX, PDF, or UTF-8 TXT files.
              </p>
            </div>

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
                  <h2 className="text-lg font-semibold">Processing PDF Document...</h2>
                  <p className="text-sm text-blue-600 font-medium animate-pulse">{uploadProgressText}</p>
                  <div className="w-48 h-1.5 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-indeterminate" />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-2">Upload your PDF to Open the Document Editor</h2>
                  <p className={`text-sm mb-6 max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Drag and drop your PDF here or choose from your computer. Supports multi-page PDFs, Unicode Hindi & Urdu, and scanned pages.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Choose PDF File
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
                      Try Sample Document
                    </button>
                  </div>
                </>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-500" />
                  <span>Real Microsoft Word DOCX</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Type className="w-4 h-4 text-purple-500" />
                  <span>Rich Formatting & Styling</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Zero-Retention Privacy</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STAGE 2: PROFESSIONAL 3-COLUMN DOCUMENT STUDIO WORKSPACE */
          /* ========================================================================= */
          <div>
            {/* SCANNED PDF NOTICE BANNER */}
            {hasScannedPages && !ocrStatus.configured && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-800 dark:text-amber-300 mb-6">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-sm">Scanned Pages Detected</p>
                  <p>This PDF appears to contain scanned/image-based pages. Text extraction may require OCR.</p>
                  <p className="text-[11px] opacity-85">
                    PDF layout is preserved where possible. Complex layouts may shift slightly during export.
                  </p>
                </div>
              </div>
            )}

            {/* Mobile Tab Navigation */}
            <div className="flex lg:hidden mb-4 border-b border-slate-200 dark:border-slate-800">
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
                Document Editor
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
              {/* LEFT COLUMN: PAGE NAVIGATION & THUMBNAILS (3 COLS) */}
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
                      Pages ({pages.length})
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewMode(viewMode === 'all' ? 'single' : 'all')}
                        className={`text-[11px] px-2 py-0.5 rounded font-medium border transition ${
                          viewMode === 'single'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                        title="Toggle single page vs continuous scrolling"
                      >
                        {viewMode === 'single' ? 'Single Page' : 'All Pages'}
                      </button>
                    </div>
                  </div>

                  {/* THUMBNAIL LIST */}
                  <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                    {pages.map((p, idx) => (
                      <div
                        key={`thumb_${p.pageNumber}_${idx}`}
                        onClick={() => {
                          setActivePageIndex(idx);
                          const el = pageEditableRefs.current[idx];
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            el.focus();
                          }
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          activePageIndex === idx
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                            : darkMode
                            ? 'border-slate-800 hover:border-slate-700 bg-slate-950'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="font-bold">Page {p.pageNumber}</span>
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

                        {/* Page Preview */}
                        <div className="w-full aspect-[1/1.3] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center relative p-2 text-left shadow-2xs">
                          {p.thumbnailUrl ? (
                            <img
                              src={p.thumbnailUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full text-[8px] text-slate-400 overflow-hidden leading-tight select-none">
                              {(p.text || '').slice(0, 160) || '(Blank Page)'}
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
                      Add New Page
                    </button>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------------------- */}
              {/* CENTER COLUMN: WORD PROCESSOR EDITOR & TOOLBAR (6 COLS) */}
              {/* --------------------------------------------------------------------- */}
              <div
                className={`lg:col-span-6 space-y-4 ${
                  mobileTab === 'editor' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* STICKY RIBBON TOOLBAR */}
                <div
                  className={`p-2 rounded-xl border sticky top-16 z-20 backdrop-blur shadow-sm ${
                    darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Undo / Redo */}
                    <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                        title="Undo (Ctrl+Z)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                        title="Redo (Ctrl+Y)"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Block Style dropdown (Heading 1, 2, Paragraph) */}
                    <select
                      onChange={(e) => {
                        const tag = e.target.value;
                        executeFormatting('formatBlock', tag);
                      }}
                      defaultValue="<p>"
                      className={`text-xs px-2 py-1 rounded border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      title="Text Style"
                    >
                      <option value="<p>">Normal Text</option>
                      <option value="<h1>">Heading 1</option>
                      <option value="<h2>">Heading 2</option>
                      <option value="<h3>">Heading 3</option>
                    </select>

                    {/* Font Family selector */}
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => {
                        const fam = e.target.value as any;
                        setSettings({ ...settings, fontFamily: fam });
                        const fontName = fam === 'serif' ? 'Georgia' : fam === 'mono' ? 'Courier New' : 'Calibri';
                        executeFormatting('fontName', fontName);
                      }}
                      className={`text-xs px-2 py-1 rounded border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      title="Font Family"
                    >
                      <option value="sans">Sans (Calibri)</option>
                      <option value="serif">Serif (Times / Georgia)</option>
                      <option value="mono">Monospace (Courier)</option>
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
                      <option value={18}>18 pt</option>
                      <option value={24}>24 pt</option>
                    </select>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

                    {/* Bold, Italic, Underline */}
                    <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('bold')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold"
                        title="Bold (Ctrl+B)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('italic')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition italic"
                        title="Italic (Ctrl+I)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('underline')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition underline"
                        title="Underline (Ctrl+U)"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Alignment */}
                    <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('justifyLeft')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Align Left"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('justifyCenter')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Align Center"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('justifyRight')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Align Right"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('justifyFull')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Justify"
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Lists */}
                    <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('insertUnorderedList')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Bullet List"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeFormatting('insertOrderedList')}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
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

                    {/* Select All */}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeFormatting('selectAll')}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs hidden sm:flex items-center gap-1"
                      title="Select All"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Select All</span>
                    </button>
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

                {/* SINGLE PAGE NAVIGATION BAR (If viewMode is single) */}
                {viewMode === 'single' && (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <button
                      onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
                      disabled={activePageIndex === 0}
                      className="px-2.5 py-1 rounded border disabled:opacity-40 flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev Page
                    </button>

                    <div className="font-semibold">
                      Page {activePageIndex + 1} of {pages.length}
                    </div>

                    <button
                      onClick={() => setActivePageIndex(Math.min(pages.length - 1, activePageIndex + 1))}
                      disabled={activePageIndex === pages.length - 1}
                      className="px-2.5 py-1 rounded border disabled:opacity-40 flex items-center gap-1 font-medium"
                    >
                      Next Page <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* PHYSICAL DOCUMENT CANVAS SHEETS */}
                <div className="space-y-8">
                  {pages
                    .filter((_, idx) => (viewMode === 'single' ? idx === activePageIndex : true))
                    .map((page, displayedIdx) => {
                      const actualIdx = viewMode === 'single' ? activePageIndex : displayedIdx;
                      return (
                        <div
                          key={`page_sheet_${page.pageNumber}_${actualIdx}`}
                          className={`rounded-xl border shadow-md transition-all ${
                            activePageIndex === actualIdx
                              ? 'ring-2 ring-blue-500/40'
                              : ''
                          } ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                        >
                          {/* Page Sheet Top Bar */}
                          <div
                            className={`px-5 py-2.5 border-b flex items-center justify-between text-xs rounded-t-xl ${
                              darkMode
                                ? 'bg-slate-950/70 border-slate-800 text-slate-400'
                                : 'bg-slate-50/90 border-slate-200 text-slate-600'
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
                                onClick={() => handleClearPage(actualIdx)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition"
                                title="Clear page text"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {pages.length > 1 && (
                                <button
                                  onClick={() => handleDeletePage(actualIdx)}
                                  className="p-1 hover:bg-red-500/10 rounded text-red-500 transition"
                                  title="Delete page"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* RICH TEXT EDITABLE PAGE AREA */}
                          <div
                            className="p-8 sm:p-12 min-h-[580px] cursor-text"
                            onClick={() => {
                              setActivePageIndex(actualIdx);
                              pageEditableRefs.current[actualIdx]?.focus();
                            }}
                            style={{
                              paddingTop: settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                              paddingBottom: settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                              paddingLeft: settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                              paddingRight: settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                            }}
                          >
                            <div
                              ref={(el) => {
                                pageEditableRefs.current[actualIdx] = el;
                              }}
                              contentEditable={true}
                              suppressContentEditableWarning={true}
                              onFocus={() => setActivePageIndex(actualIdx)}
                              onInput={() => handleContentInput(actualIdx)}
                              onBlur={() => handleContentBlur(actualIdx)}
                              onKeyDown={(e) => handleKeyDown(e, actualIdx)}
                              onPaste={(e) => handlePaste(e, actualIdx)}
                              data-placeholder={`Page ${page.pageNumber} content... Type, edit, or paste your text here.`}
                              style={{
                                fontFamily:
                                  settings.fontFamily === 'mono'
                                    ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                                    : settings.fontFamily === 'serif'
                                    ? 'Georgia, Cambria, "Times New Roman", Times, serif'
                                    : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: `${settings.fontSize}pt`,
                                lineHeight: settings.lineSpacing,
                              }}
                              className="document-editor-page prose dark:prose-invert max-w-none text-left"
                            />
                          </div>

                          {/* Page Footer Counters */}
                          <div
                            className={`px-5 py-2 border-t flex items-center justify-between text-[11px] rounded-b-xl ${
                              darkMode
                                ? 'border-slate-800 text-slate-500'
                                : 'border-slate-100 text-slate-400'
                            }`}
                          >
                            <span>
                              {page.wordCount} words • {page.characterCount} characters
                            </span>
                            <span>
                              {settings.pageNumbers !== 'none' ? `Page ${page.pageNumber}` : 'Auto-paginated'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Save & Download
                    </h3>
                    <FileDown className="w-4 h-4 text-blue-500" />
                  </div>

                  {/* PRIMARY ACTION: DOWNLOAD DOCX */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSaveDocument('docx')}
                      disabled={isSaving}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 group"
                    >
                      {isSaving && saveFormat === 'docx' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileCode className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      )}
                      <span>Download DOCX</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                      Standard Microsoft Word document (.docx) • 100% editable
                    </p>
                  </div>

                  {/* SECONDARY ACTIONS: PDF & TXT */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleSaveDocument('pdf')}
                      disabled={isSaving}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                      }`}
                    >
                      {isSaving && saveFormat === 'pdf' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download PDF</span>
                    </button>

                    <button
                      onClick={() => handleSaveDocument('txt')}
                      disabled={isSaving}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm'
                      }`}
                    >
                      {isSaving && saveFormat === 'txt' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Download TXT</span>
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                        <span>PDF layout is preserved where possible. Complex layouts may shift slightly during export.</span>
                      </p>
                    )}
                  </div>

                  {/* Sizing & Orientation */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
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

                  {/* Clipboard Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleCopyAll}
                      className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Entire Document Text
                    </button>
                  </div>
                </div>

                {/* Privacy Guarantee Card */}
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-blue-50/50 border-blue-100 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero-Retention Privacy</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Your documents are processed ephemerally in memory. No user files are permanently stored on our servers.
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
