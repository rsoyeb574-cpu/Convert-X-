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
  Maximize2,
  ZoomIn,
  ZoomOut,
  Columns,
  Image as ImageIcon,
  FileScan,
  BadgeCheck,
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

  // Layout View Modes: 'split' (side-by-side original + editor), 'editor' (focus text), 'original' (focus visual)
  const [studioLayout, setStudioLayout] = useState<'split' | 'editor' | 'original'>('split');
  const [mobileTab, setMobileTab] = useState<'original' | 'editor' | 'thumbnails' | 'settings'>('original');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // Preview zoom level for side-by-side panel
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  // Lightbox Zoom Modal (Full Page View)
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxZoom, setLightboxZoom] = useState<number>(100);
  const [lightboxPageNum, setLightboxPageNum] = useState<number>(1);

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

  // Sample document menu dropdown
  const [showSampleMenu, setShowSampleMenu] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageEditableRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Active page shortcut
  const activePage = pages[activePageIndex] || pages[0];

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

  // Synchronize DOM innerHTML when active pages change via external action
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

  // History push (Safe draft saving - lightweight metadata only, NEVER base64 images)
  const pushHistory = (newPages: PdfToTextPage[]) => {
    const clone = JSON.parse(JSON.stringify(newPages));
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push({ pages: clone });
    if (newHist.length > 30) newHist.shift();
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);

    // Save lightweight draft
    try {
      const cleanDraftPages = clone.map((p: PdfToTextPage) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        html: p.html,
        width: p.width,
        height: p.height,
        isScanned: p.isScanned,
        ocrApplied: p.ocrApplied,
        contentType: p.contentType,
        thumbnailUrl: p.thumbnailUrl,
        pageImageUrl: p.pageImageUrl,
        characterCount: p.characterCount,
        wordCount: p.wordCount,
      }));

      localStorage.setItem(
        LOCAL_STORAGE_DRAFT_KEY,
        JSON.stringify({
          pages: cleanDraftPages,
          extraction: extraction
            ? {
                jobId: extraction.jobId,
                fileName: extraction.fileName,
                totalPages: extraction.totalPages,
                pdfType: extraction.pdfType,
                detectedPageSize: extraction.detectedPageSize,
              }
            : null,
          settings,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Ignore quota errors
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

    if (file.size > 50 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum supported PDF size is 50MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Rendering original pages & analyzing visual content...');

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

      const processedPages: PdfToTextPage[] = (data.pages || []).map((p: any) => ({
        ...p,
        html: p.html || textToHtml(p.text || ''),
        pageImageUrl: p.pageImageUrl || `/api/pdf-to-text/page-image/${data.jobId}/${p.pageNumber}`,
        thumbnailUrl: p.thumbnailUrl || `/api/pdf-to-text/thumbnail/${data.jobId}/${p.pageNumber}`,
      }));

      setExtraction(data);
      setPages(processedPages);
      setActivePageIndex(0);
      setHistory([{ pages: JSON.parse(JSON.stringify(processedPages)) }]);
      setHistoryIndex(0);

      // Automatically default to Split View for scanned/mixed documents so original page is immediately visible
      if (data.pdfType === 'scanned' || data.pdfType === 'mixed' || processedPages.some((p) => p.isScanned)) {
        setStudioLayout('split');
        setMobileTab('original');
      } else {
        setStudioLayout('split');
      }

      showToast(
        'Document Loaded',
        `Rendered ${data.totalPages} page${data.totalPages > 1 ? 's' : ''} (${data.pdfType.toUpperCase()} PDF). Visual preview ready!`,
        'success'
      );

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

  // Load built-in sample document
  const handleLoadSample = async (sampleKey: string = 'sample_pdf') => {
    setIsUploading(true);
    setShowSampleMenu(false);
    setUploadProgressText(
      sampleKey === 'sample_scanned_id_card'
        ? 'Loading Aadhaar-style scanned ID card PDF...'
        : 'Loading vector sample PDF...'
    );

    try {
      const sampleRes = await fetch(`/api/sample/${sampleKey}`);
      const sampleData = await sampleRes.json();

      if (!sampleRes.ok || !sampleData.jobId) {
        throw new Error('Failed to load sample document.');
      }

      setUploadProgressText('Rendering high-fidelity pages & extracting text...');

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
        pageImageUrl: p.pageImageUrl || `/api/pdf-to-text/page-image/${data.jobId}/${p.pageNumber}`,
        thumbnailUrl: p.thumbnailUrl || `/api/pdf-to-text/thumbnail/${data.jobId}/${p.pageNumber}`,
      }));

      setExtraction(data);
      setPages(processedPages);
      setActivePageIndex(0);
      setHistory([{ pages: JSON.parse(JSON.stringify(processedPages)) }]);
      setHistoryIndex(0);

      // Default to Split View
      setStudioLayout('split');
      if (data.pdfType === 'scanned') {
        setMobileTab('original');
      }

      showToast(
        'Sample Loaded',
        sampleKey === 'sample_scanned_id_card'
          ? 'Loaded Scanned ID Card PDF with full visual card preservation.'
          : 'Sample vector document loaded.',
        'success'
      );

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
      contentType: 'text',
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

  // Open Full-Page Lightbox Modal
  const openLightbox = (pageNum: number) => {
    setLightboxPageNum(pageNum);
    setLightboxZoom(100);
    setIsLightboxOpen(true);
  };

  // Close Lightbox Modal
  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  // Keyboard shortcut to close lightbox on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        closeLightbox();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLightboxOpen]);

  // Direct Page Image Download
  const handleDownloadPageImage = (pageNum: number, format: 'png' | 'jpg') => {
    if (!extraction?.jobId) {
      showToast('Download Error', 'Job ID is missing.', 'error');
      return;
    }
    const downloadUrl = `/api/pdf-to-text/download-page-image/${extraction.jobId}/${pageNum}?format=${format}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${extraction.fileName.replace(/\.pdf$/i, '')}_page_${pageNum}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloading Image', `Downloading Page ${pageNum} as ${format.toUpperCase()}`, 'info');
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
    const activeP = pages[activePageIndex];
    if (!activeP) return;

    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (regex.test(activeP.text)) {
      const newText = activeP.text.replace(regex, replaceQuery);
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
    showToast(
      'Replace All',
      `Replaced ${replacedCount} occurrence${replacedCount === 1 ? '' : 's'} across the document.`,
      'success'
    );
  };

  // Copy all document text
  const handleCopyAll = () => {
    const fullText = pages.map((p) => p.text).join('\n\n');
    navigator.clipboard.writeText(fullText);
    showToast('Copied', 'Full document text copied to clipboard.', 'success');
  };

  // Copy active page text
  const handleCopyPageText = () => {
    if (!activePage) return;
    navigator.clipboard.writeText(activePage.text || '');
    showToast('Copied', `Page ${activePage.pageNumber} text copied.`, 'success');
  };

  // Save / Export
  const handleSaveDocument = async (format: 'pdf' | 'txt' | 'docx') => {
    if (!pages || pages.length === 0) return;

    setIsSaving(true);
    setSaveFormat(format);

    try {
      const baseFilename = extraction?.fileName ? extraction.fileName.replace(/\.pdf$/i, '') : 'document';
      let blob: Blob;
      let downloadFilename = `${baseFilename}_${settings.mode === 'preserve_layout' ? 'preserved' : 'edited'}.${format}`;

      try {
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
          throw new Error(errorData.error || 'Server document generation failed.');
        }

        blob = await response.blob();
      } catch (networkErr: any) {
        // Resilient Fallback for TXT
        if (format === 'txt') {
          const textContent = pages
            .map((p) => (pages.length > 1 ? `--- Page ${p.pageNumber} ---\n\n${p.text || ''}` : p.text || ''))
            .join('\n\n\n');
          blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
          downloadFilename = `${baseFilename}.txt`;
        } else {
          throw networkErr;
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch {}
      }, 1500);

      showToast(
        'Document Downloaded',
        `Saved ${downloadFilename} (${format.toUpperCase()}).`,
        'success'
      );
    } catch (err: any) {
      showToast('Export Error', err.message || 'Failed to export document.', 'error');
    } finally {
      setIsSaving(false);
      setSaveFormat(null);
    }
  };

  // Metrics
  const totalWords = useMemo(() => {
    return pages.reduce((acc, p) => acc + (p.wordCount || 0), 0);
  }, [pages]);

  const totalChars = useMemo(() => {
    return pages.reduce((acc, p) => acc + (p.characterCount || 0), 0);
  }, [pages]);

  const estReadingMins = useMemo(() => {
    return Math.max(1, Math.round(totalWords / 200));
  }, [totalWords]);

  const hasScannedPages = useMemo(() => {
    return pages.some((p) => p.isScanned);
  }, [pages]);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* --------------------------------------------------------------------- */}
      {/* LIGHTBOX MODAL: FULL-PAGE ORIGINAL PDF VIEW WITH ADVANCED ZOOM */}
      {/* --------------------------------------------------------------------- */}
      {isLightboxOpen && extraction && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-fadeIn">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <FileScan className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base">
                    Original Page {lightboxPageNum} of {pages.length}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      pages[lightboxPageNum - 1]?.isScanned
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : pages[lightboxPageNum - 1]?.contentType === 'mixed'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {pages[lightboxPageNum - 1]?.isScanned
                      ? 'Scanned Page'
                      : pages[lightboxPageNum - 1]?.contentType === 'mixed'
                      ? 'Mixed Content'
                      : 'Text Layer'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {pages[lightboxPageNum - 1]?.width} × {pages[lightboxPageNum - 1]?.height} pt • Complete Original Visual Fidelity
                </p>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setLightboxZoom(Math.max(50, lightboxZoom - 25))}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs px-2 font-mono font-medium">{lightboxZoom}%</span>
                <button
                  onClick={() => setLightboxZoom(Math.min(300, lightboxZoom + 25))}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLightboxZoom(100)}
                  className="text-xs px-2 py-1 ml-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  Reset
                </button>
              </div>

              {/* Direct Downloads */}
              <button
                onClick={() => handleDownloadPageImage(lightboxPageNum, 'png')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
              <button
                onClick={() => handleDownloadPageImage(lightboxPageNum, 'jpg')}
                className="hidden sm:flex px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold items-center gap-1.5 transition border border-slate-700"
              >
                <span>JPG</span>
              </button>

              {/* Page navigation */}
              {pages.length > 1 && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    disabled={lightboxPageNum <= 1}
                    onClick={() => setLightboxPageNum((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={lightboxPageNum >= pages.length}
                    onClick={() => setLightboxPageNum((prev) => Math.min(pages.length, prev + 1))}
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Close */}
              <button
                onClick={closeLightbox}
                className="p-2 ml-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Image Body with smooth pan & contain */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8">
            <div
              style={{
                transform: `scale(${lightboxZoom / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="max-w-full max-h-full flex items-center justify-center"
            >
              <img
                src={
                  pages[lightboxPageNum - 1]?.pageImageUrl ||
                  pages[lightboxPageNum - 1]?.thumbnailUrl ||
                  `/api/pdf-to-text/page-image/${extraction.jobId}/${lightboxPageNum}`
                }
                alt={`Original PDF Page ${lightboxPageNum}`}
                className="max-h-[84vh] w-auto max-w-full object-contain rounded shadow-2xl border border-slate-800 bg-white"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Modal Footer Note */}
          <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-400 flex items-center justify-between">
            <span>Preserves exact dimensions, card layout, photos, logos, stamps, signatures, and barcodes.</span>
            <span className="hidden sm:inline">Press Esc or click Close to return to editor</span>
          </div>
        </div>
      )}

      {/* TOP NAVBAR / HEADER */}
      <header
        className={`border-b sticky top-0 z-30 backdrop-blur-md transition-colors ${
          darkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 text-blue-600 font-black text-lg tracking-tight hover:opacity-90 transition"
            >
              <FileScan className="w-6 h-6 text-blue-600" />
              <span>Convert-X</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                PDF to Text Studio
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Visual & OCR Engine
              </span>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {extraction && (
              <>
                {/* STUDIO LAYOUT SWITCHER */}
                <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setStudioLayout('split')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                      studioLayout === 'split'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Side-by-side original page + text editor"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Split View</span>
                  </button>
                  <button
                    onClick={() => setStudioLayout('original')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                      studioLayout === 'original'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Full original visual page preview"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Original Page</span>
                  </button>
                  <button
                    onClick={() => setStudioLayout('editor')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                      studioLayout === 'editor'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Full text editor focus"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>Editor Only</span>
                  </button>
                </div>

                {/* Upload another PDF */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New PDF</span>
                </button>
              </>
            )}

            <button
              onClick={() => onNavigate('tools')}
              className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                darkMode
                  ? 'border-slate-800 hover:border-slate-700 text-slate-300'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              All Tools
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* RESTORE DRAFT BANNER */}
        {hasStoredDraft && !extraction && (
          <div className="mb-6 p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Unsaved Document Draft Found
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Recover your previous PDF-to-Text session ({storedDraftData?.pages?.length || 0} pages).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleRestoreDraft}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
              >
                Restore Session
              </button>
              <button
                onClick={handleDismissDraft}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 1: UPLOAD / DRAG-AND-DROP HERO (When no PDF is loaded yet) */}
        {/* ========================================================================= */}
        {!extraction ? (
          <div className="max-w-3xl mx-auto py-8 sm:py-12">
            <div className="text-center space-y-3 mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                PDF to Text & Document Studio
              </h1>
              <p className={`text-base max-w-xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Converts both <strong className="text-blue-600 dark:text-blue-400">Normal Vector PDFs</strong> and{' '}
                <strong className="text-blue-600 dark:text-blue-400">Scanned / ID Card PDFs</strong>. Preserves complete original
                pages visually while providing high-accuracy extracted text.
              </p>
            </div>

            {/* DROPZONE */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handlePdfUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed text-center transition-all relative ${
                dragActive
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
                  : darkMode
                  ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  : 'border-slate-300 bg-white hover:border-slate-400 shadow-sm'
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
                  <h2 className="text-xl font-bold mb-2">Upload your PDF Document</h2>
                  <p className={`text-sm mb-6 max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Drag and drop your PDF here or choose from your computer. Works with text documents, Aadhaar cards, ID cards, certificates, and multi-page PDFs.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Choose PDF File
                    </button>

                    {/* SAMPLE DOCUMENT MENU */}
                    <div className="relative w-full sm:w-auto">
                      <button
                        onClick={() => setShowSampleMenu(!showSampleMenu)}
                        className={`w-full sm:w-auto px-5 py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
                          darkMode
                            ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Try Sample PDF</span>
                      </button>

                      {showSampleMenu && (
                        <div
                          className={`absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 rounded-2xl border shadow-xl z-20 p-2 space-y-1 text-left ${
                            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Select Sample Case
                          </div>
                          <button
                            onClick={() => handleLoadSample('sample_pdf')}
                            className={`w-full p-2.5 rounded-xl text-left transition flex items-start gap-2.5 ${
                              darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                            }`}
                          >
                            <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Engineering Spec Sheet (Text PDF)
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Multi-element vector PDF with headings & text layer
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleLoadSample('sample_scanned_id_card')}
                            className={`w-full p-2.5 rounded-xl text-left transition flex items-start gap-2.5 ${
                              darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                            }`}
                          >
                            <FileScan className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Scanned ID Card / Aadhaar Style (Image PDF)
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Scanned card with photo, stamps, Hindi/English & QR code
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>100% Visual Page Preservation</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-500" />
                  <span>Word DOCX & Rich Text</span>
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
          /* STAGE 2: PROFESSIONAL DUAL-PANE DOCUMENT STUDIO WORKSPACE */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* DOCUMENT TYPE & STATUS BANNER */}
            <div
              className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                extraction.pdfType === 'scanned'
                  ? darkMode
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : extraction.pdfType === 'mixed'
                  ? darkMode
                    ? 'bg-purple-950/20 border-purple-800/40 text-purple-200'
                    : 'bg-purple-50/80 border-purple-200 text-purple-900'
                  : darkMode
                  ? 'bg-blue-950/20 border-blue-800/40 text-blue-200'
                  : 'bg-blue-50/80 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    extraction.pdfType === 'scanned'
                      ? 'bg-amber-500/20 text-amber-600'
                      : extraction.pdfType === 'mixed'
                      ? 'bg-purple-500/20 text-purple-600'
                      : 'bg-blue-500/20 text-blue-600'
                  }`}
                >
                  <FileScan className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base">
                      DOCUMENT TYPE:{' '}
                      {extraction.pdfType === 'scanned'
                        ? 'Scanned / Image PDF'
                        : extraction.pdfType === 'mixed'
                        ? 'Mixed PDF (Text + Images)'
                        : 'Text PDF (Direct Layer)'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-white/50 dark:bg-black/30">
                      {extraction.fileName} • {extraction.totalPages} Page{extraction.totalPages > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 mt-0.5">
                    {extraction.pdfType === 'scanned'
                      ? 'Scanned pages detected. Complete original pages are preserved visually on the left, with OCR text ready for editing on the right.'
                      : extraction.pdfType === 'mixed'
                      ? 'Mixed content detected. Original layout with photos/diagrams preserved, alongside editable text layer.'
                      : 'Text layer detected. Crisp original visual layout available alongside rich text editor.'}
                  </p>
                </div>
              </div>

              {/* View Layout buttons on banner */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => openLightbox(activePage ? activePage.pageNumber : 1)}
                  className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800 hover:bg-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen Preview</span>
                </button>
              </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="flex lg:hidden border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setMobileTab('original')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center flex items-center justify-center gap-1 ${
                  mobileTab === 'original'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Original Page</span>
              </button>
              <button
                onClick={() => setMobileTab('editor')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center flex items-center justify-center gap-1 ${
                  mobileTab === 'editor'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Extracted Text</span>
              </button>
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
                onClick={() => setMobileTab('settings')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center ${
                  mobileTab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Export
              </button>
            </div>

            {/* MAIN 3-PANEL WORKSPACE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* --------------------------------------------------------------------- */}
              {/* COLUMN 1: PAGE THUMBNAILS (2.5 COLS) */}
              {/* --------------------------------------------------------------------- */}
              <div
                className={`lg:col-span-2 xl:col-span-2 space-y-3 ${
                  mobileTab === 'thumbnails' ? 'block' : 'hidden lg:block'
                }`}
              >
                <div
                  className={`p-3.5 rounded-2xl border ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pages ({pages.length})
                    </span>
                  </div>

                  {/* THUMBNAIL LIST */}
                  <div className="space-y-2.5 max-h-[72vh] overflow-y-auto pr-1">
                    {pages.map((p, idx) => (
                      <div
                        key={`thumb_${p.pageNumber}_${idx}`}
                        onClick={() => {
                          setActivePageIndex(idx);
                          // Sync editable DOM
                          setTimeout(() => {
                            const el = pageEditableRefs.current[idx];
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                          }, 50);
                        }}
                        className={`p-2 rounded-xl border cursor-pointer transition-all ${
                          activePageIndex === idx
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
                            : darkMode
                            ? 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className="font-bold">Page {p.pageNumber}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              p.isScanned
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : p.contentType === 'mixed'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {p.isScanned ? (p.ocrApplied ? 'OCR' : 'Scan') : p.contentType === 'mixed' ? 'Mixed' : 'Text'}
                          </span>
                        </div>

                        {/* Page Visual Preview */}
                        <div className="w-full aspect-[1/1.3] bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center relative p-1 shadow-2xs">
                          {p.thumbnailUrl || p.pageImageUrl ? (
                            <img
                              src={p.thumbnailUrl || p.pageImageUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full text-[8px] text-slate-400 overflow-hidden leading-tight select-none p-1">
                              {(p.text || '').slice(0, 120) || '(Blank Page)'}
                            </div>
                          )}
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{p.wordCount} words</span>
                          <span>{p.characterCount} ch</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={handleAddPage}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Page
                    </button>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------------------- */}
              {/* COLUMN 2 & 3: MAIN DUAL-PANE STUDIO AREA */}
              {/* --------------------------------------------------------------------- */}
              <div
                className={`lg:col-span-10 xl:col-span-10 grid grid-cols-1 ${
                  studioLayout === 'split' ? 'xl:grid-cols-12' : 'grid-cols-1'
                } gap-5`}
              >
                {/* ------------------------------------------------------------------- */}
                {/* PANEL A: ORIGINAL PDF PAGE PREVIEW (Complete Visual Preservation) */}
                {/* ------------------------------------------------------------------- */}
                <div
                  className={`${
                    studioLayout === 'split'
                      ? 'xl:col-span-6'
                      : studioLayout === 'original'
                      ? 'block'
                      : 'hidden'
                  } ${mobileTab === 'original' ? 'block' : 'hidden lg:block'}`}
                >
                  <div
                    className={`rounded-2xl border shadow-sm flex flex-col ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Panel A Top Bar */}
                    <div
                      className={`p-3.5 border-b rounded-t-2xl flex flex-wrap items-center justify-between gap-2 text-xs ${
                        darkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          Original Page {activePage.pageNumber}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            activePage.isScanned
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : activePage.contentType === 'mixed'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {activePage.isScanned
                            ? 'Scanned Page'
                            : activePage.contentType === 'mixed'
                            ? 'Mixed Content'
                            : 'Text Layer'}
                        </span>
                      </div>

                      {/* Top Bar Actions for Page Image */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 transition"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-mono text-slate-500 min-w-[36px] text-center">
                          {previewZoom}%
                        </span>
                        <button
                          onClick={() => setPreviewZoom(Math.min(250, previewZoom + 25))}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 transition"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openLightbox(activePage.pageNumber)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-blue-600 dark:text-blue-400 transition ml-1"
                          title="View Full Page in Lightbox"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* COMPLETE ORIGINAL PAGE IMAGE CONTAINER */}
                    <div
                      className="p-4 sm:p-6 min-h-[580px] flex items-center justify-center relative overflow-hidden bg-slate-100/70 dark:bg-slate-950/70"
                      onClick={() => openLightbox(activePage.pageNumber)}
                      title="Click to view full-page original with zoom"
                    >
                      <div
                        style={{
                          transform: `scale(${previewZoom / 100})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.15s ease-out',
                        }}
                        className="w-full flex items-center justify-center cursor-zoom-in"
                      >
                        {activePage.pageImageUrl || activePage.thumbnailUrl ? (
                          <img
                            src={
                              activePage.pageImageUrl ||
                              activePage.thumbnailUrl ||
                              `/api/pdf-to-text/page-image/${extraction.jobId}/${activePage.pageNumber}`
                            }
                            alt={`Original PDF Page ${activePage.pageNumber}`}
                            className="w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800 bg-white"
                            style={{ objectFit: 'contain' }}
                          />
                        ) : (
                          <div className="p-8 text-center text-slate-400">
                            <FileScan className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">Original page image preview is loading...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Panel A Footer: Metadata & Download Controls */}
                    <div
                      className={`p-3.5 border-t rounded-b-2xl flex flex-wrap items-center justify-between gap-2 text-xs ${
                        darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-emerald-500" />
                        <span>
                          {activePage.width} × {activePage.height} pt • Complete Original Page
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPageImage(activePage.pageNumber, 'png');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 transition shadow-2xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Page PNG</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPageImage(activePage.pageNumber, 'jpg');
                          }}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition ${
                            darkMode
                              ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          JPG
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------------------- */}
                {/* PANEL B: EXTRACTED & OCR TEXT EDITOR */}
                {/* ------------------------------------------------------------------- */}
                <div
                  className={`${
                    studioLayout === 'split'
                      ? 'xl:col-span-6'
                      : studioLayout === 'editor'
                      ? 'block'
                      : 'hidden'
                  } ${mobileTab === 'editor' ? 'block' : 'hidden lg:block'} space-y-4`}
                >
                  {/* WORD PROCESSOR TOOLBAR */}
                  <div
                    className={`p-2 rounded-2xl border sticky top-16 z-20 backdrop-blur-md shadow-xs ${
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

                      {/* Headings / Paragraph */}
                      <select
                        onChange={(e) => {
                          const tag = e.target.value;
                          executeFormatting('formatBlock', tag);
                        }}
                        defaultValue="<p>"
                        className={`text-xs px-2 py-1 rounded-lg border ${
                          darkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Text Style"
                      >
                        <option value="<p>">Normal</option>
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
                        className={`text-xs px-2 py-1 rounded-lg border hidden sm:block ${
                          darkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Font Family"
                      >
                        <option value="sans">Calibri</option>
                        <option value="serif">Times</option>
                        <option value="mono">Courier</option>
                      </select>

                      {/* Formatting Buttons (Bold, Italic, Underline) */}
                      <div className="flex items-center gap-0.5 border-l border-r border-slate-200 dark:border-slate-800 px-1.5">
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => executeFormatting('bold')}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition"
                          title="Bold (Ctrl+B)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => executeFormatting('italic')}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 italic transition"
                          title="Italic (Ctrl+I)"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => executeFormatting('underline')}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 underline transition"
                          title="Underline (Ctrl+U)"
                        >
                          <Underline className="w-3.5 h-3.5" />
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
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                          showFindReplace
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                        title="Find & Replace (Ctrl+F)"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Find</span>
                      </button>

                      {/* Copy Page Text */}
                      <button
                        onClick={handleCopyPageText}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1 transition ml-auto"
                        title="Copy Page Text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy Text</span>
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
                            className={`w-full text-xs pl-7 pr-12 py-1.5 rounded-lg border ${
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
                            className={`w-full text-xs px-2.5 py-1.5 rounded-lg border ${
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
                            className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                          >
                            Replace
                          </button>
                          <button
                            onClick={handleReplaceAll}
                            disabled={!findQuery}
                            className="px-2.5 py-1 text-xs rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition"
                          >
                            Replace All
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTIVE PAGE RICH TEXT EDITABLE SHEET */}
                  <div
                    className={`rounded-2xl border shadow-sm transition-all ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Page Sheet Top Bar */}
                    <div
                      className={`px-5 py-3 border-b flex items-center justify-between text-xs rounded-t-2xl ${
                        darkMode
                          ? 'bg-slate-950/70 border-slate-800 text-slate-400'
                          : 'bg-slate-50/90 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Extracted & OCR Text • Page {activePage.pageNumber}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            activePage.isScanned
                              ? activePage.ocrApplied
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                          }`}
                        >
                          {activePage.isScanned
                            ? activePage.ocrApplied
                              ? '✓ OCR Generated'
                              : '⚠️ OCR Unavailable'
                            : '✓ Text Layer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleClearPage(activePageIndex)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition"
                          title="Clear page text"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {pages.length > 1 && (
                          <button
                            onClick={() => handleDeletePage(activePageIndex)}
                            className="p-1 hover:bg-red-500/10 rounded-lg text-red-500 transition"
                            title="Delete page"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CONTENTEDITABLE RICH TEXT AREA */}
                    <div
                      className="p-6 sm:p-10 min-h-[580px] cursor-text"
                      onClick={() => {
                        pageEditableRefs.current[activePageIndex]?.focus();
                      }}
                      style={{
                        paddingTop:
                          settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                        paddingBottom:
                          settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                        paddingLeft:
                          settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                        paddingRight:
                          settings.margin === 'small' ? '1.5rem' : settings.margin === 'large' ? '3.5rem' : '2.5rem',
                      }}
                    >
                      <div
                        ref={(el) => {
                          pageEditableRefs.current[activePageIndex] = el;
                        }}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onInput={() => handleContentInput(activePageIndex)}
                        onBlur={() => handleContentBlur(activePageIndex)}
                        onKeyDown={(e) => handleKeyDown(e, activePageIndex)}
                        onPaste={(e) => handlePaste(e, activePageIndex)}
                        data-placeholder={`Page ${activePage.pageNumber} content... Type, edit, or paste your text here.`}
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
                        className="document-editor-page prose dark:prose-invert max-w-none text-left focus:outline-none"
                      />
                    </div>

                    {/* Page Footer Counters */}
                    <div
                      className={`px-5 py-2.5 border-t flex items-center justify-between text-[11px] rounded-b-2xl ${
                        darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      <span>
                        {activePage.wordCount} words • {activePage.characterCount} characters
                      </span>
                      <span>
                        {settings.pageNumbers !== 'none'
                          ? `Page ${activePage.pageNumber} of ${pages.length}`
                          : 'Auto-paginated'}
                      </span>
                    </div>
                  </div>

                  {/* BOTTOM EXPORT & SETTINGS STRIP */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs">
                        <span className="font-bold block">Save & Export Document</span>
                        <span className="text-slate-500">
                          {settings.mode === 'preserve_layout' ? 'Preserve original visual layout' : 'Export edited text document'}
                        </span>
                      </div>

                      {/* Mode toggle */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => setSettings({ ...settings, mode: 'extract_and_edit' })}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition ${
                            settings.mode === 'extract_and_edit'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                              : 'text-slate-500'
                          }`}
                        >
                          Extract & Edit
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, mode: 'preserve_layout' })}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition ${
                            settings.mode === 'preserve_layout'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                              : 'text-slate-500'
                          }`}
                        >
                          Preserve Layout
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveDocument('docx')}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSaving && saveFormat === 'docx' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileCode className="w-3.5 h-3.5" />
                        )}
                        <span>Download DOCX</span>
                      </button>

                      <button
                        onClick={() => handleSaveDocument('pdf')}
                        disabled={isSaving}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 ${
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
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleSaveDocument('txt')}
                        disabled={isSaving}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 ${
                          darkMode
                            ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm'
                        }`}
                      >
                        <span>TXT</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
