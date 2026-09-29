/**
 * PdfVisualEditor.tsx
 * The complete, professional Visual PDF Document Editor.
 * Renders the real PDF page canvas and makes EVERY detected text line individually editable.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  PdfToTextPage,
  PdfVisualOverlayObject,
  PdfTextLine,
} from '../../types.js';
import { PdfEditorToolbar, ToolMode } from './PdfEditorToolbar.js';
import { PdfPageCanvas } from './PdfPageCanvas.js';
import { initializePageTextLines } from './pdfTextDetector.js';
import { calculateFitPageZoom, clamp } from './pdfCoordinateUtils.js';
import { convertTextLinesToOverlayObjects, downloadPageCompositeImage } from './pdfEditorExport.js';
import {
  ShieldCheck,
  Sparkles,
  X,
  Check,
} from 'lucide-react';

interface PdfVisualEditorProps {
  page: PdfToTextPage;
  jobId: string;
  objects: PdfVisualOverlayObject[];
  onChangeObjects: (objects: PdfVisualOverlayObject[]) => void;
  onSavePdf: () => void;
  isSaving?: boolean;
  darkMode?: boolean;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface EditorHistorySnapshot {
  lines: PdfTextLine[];
  overlays: PdfVisualOverlayObject[];
}

const PRESET_COVER_COLORS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Paper Cream', hex: '#fdfbf7' },
  { name: 'Light Gray', hex: '#f3f4f6' },
  { name: 'Warm Parchment', hex: '#fefce8' },
  { name: 'Document Slate', hex: '#f8fafc' },
];

export const PdfVisualEditor: React.FC<PdfVisualEditorProps> = ({
  page,
  jobId,
  objects,
  onChangeObjects,
  onSavePdf,
  isSaving = false,
  darkMode = false,
  showToast,
}) => {
  // --- STATE ---
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [zoom, setZoom] = useState<number>(100);

  // Text Lines for this page (every line in the PDF is an independent object)
  const [lines, setLines] = useState<PdfTextLine[]>(() => initializePageTextLines(page));

  // Selection states
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [editingOverlayVal, setEditingOverlayVal] = useState<string>('');

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<EditorHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorHistorySnapshot[]>([]);

  // Dragging / Resizing state
  const [dragAction, setDragAction] = useState<
    | { type: 'move_line'; id: string; startMouseX: number; startMouseY: number; origX: number; origY: number }
    | { type: 'resize_line'; id: string; handle: string; startMouseX: number; startMouseY: number; origX: number; origY: number; origW: number; origH: number }
    | { type: 'move_overlay'; id: string; startMouseX: number; startMouseY: number; origX: number; origY: number }
    | { type: 'resize_overlay'; id: string; handle: string; startMouseX: number; startMouseY: number; origX: number; origY: number; origW: number; origH: number }
    | { type: 'create_cover'; startPdfX: number; startPdfY: number; currentPdfX: number; currentPdfY: number }
    | null
  >(null);

  // Direct Text Correction Modal state
  const [correctionModal, setCorrectionModal] = useState<{
    isOpen: boolean;
    oldText: string;
    newText: string;
    targetLine: PdfTextLine | null;
    targetOverlay: PdfVisualOverlayObject | null;
    coverColor: string;
    textColor: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
  }>({
    isOpen: false,
    oldText: '',
    newText: '',
    targetLine: null,
    targetOverlay: null,
    coverColor: '#ffffff',
    textColor: '#000000',
    fontSize: 12,
    fontWeight: 'normal',
  });

  // Track rendered pixel dimensions of the page canvas
  const [renderedDims, setRenderedDims] = useState<{ width: number; height: number }>({
    width: page.width || 595.28,
    height: page.height || 841.89,
  });

  // Initialize or re-sync lines when page changes
  useEffect(() => {
    setLines(initializePageTextLines(page));
    setSelectedLineId(null);
    setEditingLineId(null);
    setSelectedOverlayId(null);
    setEditingOverlayId(null);
  }, [page.pageNumber, page.text, page.textBlocks]);

  // Selected item getters
  const selectedLine = useMemo(() => {
    return lines.find((l) => l.id === selectedLineId) || null;
  }, [lines, selectedLineId]);

  const selectedOverlay = useMemo(() => {
    return objects.find((o) => o.id === selectedOverlayId) || null;
  }, [objects, selectedOverlayId]);

  // Push history snapshot
  const commitSnapshot = useCallback(
    (newLines: PdfTextLine[], newOverlays: PdfVisualOverlayObject[]) => {
      setUndoStack((prev) => [...prev, { lines, overlays: objects }]);
      setRedoStack([]);
      setLines(newLines);

      // Convert any modified or deleted text lines to overlays so backend receives complete edits
      const lineOverlays = convertTextLinesToOverlayObjects(newLines, page.pageNumber);
      // Combine user manual overlays + line-derived overlays
      const merged = [
        ...newOverlays.filter((o) => !o.id.startsWith('cover_mod_') && !o.id.startsWith('text_mod_') && !o.id.startsWith('cover_del_')),
        ...lineOverlays,
      ];
      onChangeObjects(merged);
    },
    [lines, objects, page.pageNumber, onChangeObjects]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, { lines, overlays: objects }]);
    setLines(previous.lines);
    onChangeObjects(previous.overlays);
  }, [undoStack, lines, objects, onChangeObjects]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, { lines, overlays: objects }]);
    setLines(next.lines);
    onChangeObjects(next.overlays);
  }, [redoStack, lines, objects, onChangeObjects]);

  // Coordinate scales
  const pageWidth = page.width || 595.28;
  const pageHeight = page.height || 841.89;
  const scaleX = renderedDims.width > 0 ? renderedDims.width / pageWidth : 1;
  const scaleY = renderedDims.height > 0 ? renderedDims.height / pageHeight : 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedLineId || selectedOverlayId)) {
        e.preventDefault();
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setSelectedLineId(null);
        setEditingLineId(null);
        setSelectedOverlayId(null);
        setEditingOverlayId(null);
        setCorrectionModal((prev) => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLineId, selectedOverlayId, handleUndo, handleRedo]);

  // Convert mouse event to PDF coordinates
  const getPdfCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const container = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - container.left;
    const clickY = e.clientY - container.top;
    return {
      x: clamp(Math.round(clickX / scaleX), 0, Math.round(pageWidth)),
      y: clamp(Math.round(clickY / scaleY), 0, Math.round(pageHeight)),
    };
  };

  // Add new Text Box at position
  const handleAddTextAt = (pdfX: number, pdfY: number) => {
    const newObj: PdfVisualOverlayObject = {
      id: `text_${Date.now()}`,
      pageNumber: page.pageNumber,
      type: 'text',
      x: Math.max(0, Math.min(pageWidth - 120, pdfX)),
      y: Math.max(0, Math.min(pageHeight - 24, pdfY)),
      width: 140,
      height: 26,
      text: 'New Text',
      fontSize: 13,
      fontFamily: 'sans',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      color: '#000000',
    };

    commitSnapshot(lines, [...objects, newObj]);
    setSelectedOverlayId(newObj.id);
    setSelectedLineId(null);
    setEditingOverlayId(newObj.id);
    setEditingOverlayVal('New Text');
    setActiveTool('select');
  };

  // Add new Cover Box at position
  const handleAddCoverBoxAt = (pdfX: number, pdfY: number, width = 120, height = 24) => {
    const newObj: PdfVisualOverlayObject = {
      id: `cover_${Date.now()}`,
      pageNumber: page.pageNumber,
      type: 'cover',
      x: Math.max(0, Math.min(pageWidth - width, pdfX)),
      y: Math.max(0, Math.min(pageHeight - height, pdfY)),
      width: Math.max(16, width),
      height: Math.max(12, height),
      backgroundColor: '#ffffff',
      opacity: 1.0,
    };

    commitSnapshot(lines, [...objects, newObj]);
    setSelectedOverlayId(newObj.id);
    setSelectedLineId(null);
    setActiveTool('select');
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pdf-text-line') || (e.target as HTMLElement).closest('.overlay-item')) {
      return;
    }

    const { x, y } = getPdfCoords(e);

    if (activeTool === 'text') {
      handleAddTextAt(x, y);
    } else if (activeTool === 'cover') {
      setDragAction({
        type: 'create_cover',
        startPdfX: x,
        startPdfY: y,
        currentPdfX: x,
        currentPdfY: y,
      });
    } else {
      setSelectedLineId(null);
      setEditingLineId(null);
      setSelectedOverlayId(null);
      setEditingOverlayId(null);
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragAction) return;

    if (dragAction.type === 'move_line') {
      const deltaX = (e.clientX - dragAction.startMouseX) / scaleX;
      const deltaY = (e.clientY - dragAction.startMouseY) / scaleY;

      const newX = Math.round(Math.max(0, Math.min(pageWidth - 20, dragAction.origX + deltaX)));
      const newY = Math.round(Math.max(0, Math.min(pageHeight - 10, dragAction.origY + deltaY)));

      setLines((prev) =>
        prev.map((l) => (l.id === dragAction.id ? { ...l, x: newX, y: newY, isModified: true } : l))
      );
    } else if (dragAction.type === 'resize_line') {
      const deltaX = (e.clientX - dragAction.startMouseX) / scaleX;
      const deltaY = (e.clientY - dragAction.startMouseY) / scaleY;

      setLines((prev) =>
        prev.map((l) => {
          if (l.id !== dragAction.id) return l;
          let newW = Math.max(20, Math.round(dragAction.origW + deltaX));
          let newH = Math.max(12, Math.round(dragAction.origH + deltaY));
          return { ...l, width: newW, height: newH, isModified: true };
        })
      );
    } else if (dragAction.type === 'move_overlay') {
      const deltaX = (e.clientX - dragAction.startMouseX) / scaleX;
      const deltaY = (e.clientY - dragAction.startMouseY) / scaleY;

      const newX = Math.round(Math.max(0, Math.min(pageWidth - 20, dragAction.origX + deltaX)));
      const newY = Math.round(Math.max(0, Math.min(pageHeight - 10, dragAction.origY + deltaY)));

      onChangeObjects(
        objects.map((o) => (o.id === dragAction.id ? { ...o, x: newX, y: newY } : o))
      );
    } else if (dragAction.type === 'resize_overlay') {
      const deltaX = (e.clientX - dragAction.startMouseX) / scaleX;
      const deltaY = (e.clientY - dragAction.startMouseY) / scaleY;

      onChangeObjects(
        objects.map((o) => {
          if (o.id !== dragAction.id) return o;
          let newW = Math.max(16, Math.round(dragAction.origW + deltaX));
          let newH = Math.max(12, Math.round(dragAction.origH + deltaY));
          return { ...o, width: newW, height: newH };
        })
      );
    } else if (dragAction.type === 'create_cover') {
      const { x, y } = getPdfCoords(e);
      setDragAction({ ...dragAction, currentPdfX: x, currentPdfY: y });
    }
  };

  // Canvas Mouse Up
  const handleCanvasMouseUp = () => {
    if (!dragAction) return;

    if (dragAction.type === 'create_cover') {
      const minX = Math.min(dragAction.startPdfX, dragAction.currentPdfX);
      const minY = Math.min(dragAction.startPdfY, dragAction.currentPdfY);
      const w = Math.abs(dragAction.currentPdfX - dragAction.startPdfX);
      const h = Math.abs(dragAction.currentPdfY - dragAction.startPdfY);

      if (w >= 6 && h >= 6) {
        handleAddCoverBoxAt(minX, minY, w, h);
      } else {
        handleAddCoverBoxAt(dragAction.startPdfX, dragAction.startPdfY, 120, 24);
      }
    } else if (
      dragAction.type === 'move_line' ||
      dragAction.type === 'resize_line' ||
      dragAction.type === 'move_overlay' ||
      dragAction.type === 'resize_overlay'
    ) {
      commitSnapshot(lines, objects);
    }

    setDragAction(null);
  };

  // Delete / Erase Selected
  const handleDeleteSelected = () => {
    if (selectedLineId) {
      const nextLines = lines.map((l) =>
        l.id === selectedLineId ? { ...l, isDeleted: true, isModified: true } : l
      );
      commitSnapshot(nextLines, objects);
      setSelectedLineId(null);
      if (showToast) {
        showToast('Line Erased', 'Covered original text line on PDF.', 'info');
      }
    } else if (selectedOverlayId) {
      const nextOverlays = objects.filter((o) => o.id !== selectedOverlayId);
      commitSnapshot(lines, nextOverlays);
      setSelectedOverlayId(null);
      if (showToast) {
        showToast('Element Removed', 'Deleted selected overlay object.', 'info');
      }
    }
  };

  // Commit inline line edit
  const handleCommitEditLine = (id: string, newText: string) => {
    const nextLines = lines.map((l) =>
      l.id === id
        ? {
            ...l,
            currentText: newText,
            isModified: newText !== l.originalText || l.isModified,
          }
        : l
    );
    commitSnapshot(nextLines, objects);
    setEditingLineId(null);
  };

  // Commit inline overlay edit
  const handleFinishInlineEditOverlay = () => {
    if (!editingOverlayId) return;
    const nextOverlays = objects.map((o) =>
      o.id === editingOverlayId ? { ...o, text: editingOverlayVal } : o
    );
    commitSnapshot(lines, nextOverlays);
    setEditingOverlayId(null);
  };

  // Open Direct Text Correction Dialog
  const handleOpenDirectCorrection = (line?: PdfTextLine) => {
    const target = line || selectedLine;
    if (target) {
      setCorrectionModal({
        isOpen: true,
        oldText: target.originalText || target.currentText,
        newText: target.currentText,
        targetLine: target,
        targetOverlay: null,
        coverColor: target.coverColor || '#ffffff',
        textColor: target.color || '#000000',
        fontSize: target.fontSize || 12,
        fontWeight: target.fontWeight || 'normal',
      });
    } else if (selectedOverlay && selectedOverlay.type === 'text') {
      setCorrectionModal({
        isOpen: true,
        oldText: selectedOverlay.text || '',
        newText: selectedOverlay.text || '',
        targetLine: null,
        targetOverlay: selectedOverlay,
        coverColor: '#ffffff',
        textColor: selectedOverlay.color || '#000000',
        fontSize: selectedOverlay.fontSize || 12,
        fontWeight: selectedOverlay.fontWeight || 'normal',
      });
    } else if (lines.length > 0) {
      const firstLine = lines.find((l) => !l.isDeleted) || lines[0];
      setCorrectionModal({
        isOpen: true,
        oldText: firstLine.originalText || firstLine.currentText,
        newText: firstLine.currentText,
        targetLine: firstLine,
        targetOverlay: null,
        coverColor: firstLine.coverColor || '#ffffff',
        textColor: firstLine.color || '#000000',
        fontSize: firstLine.fontSize || 12,
        fontWeight: firstLine.fontWeight || 'normal',
      });
    } else {
      if (showToast) {
        showToast('Direct Correction', 'Click any text on the page to correct it.', 'info');
      }
    }
  };

  // Apply Direct Text Correction
  const handleApplyCorrection = () => {
    if (correctionModal.targetLine) {
      const targetId = correctionModal.targetLine.id;
      const nextLines = lines.map((l) => {
        if (l.id !== targetId) return l;
        return {
          ...l,
          currentText: correctionModal.newText,
          isModified: true,
          coverColor: correctionModal.coverColor,
          color: correctionModal.textColor,
          fontSize: correctionModal.fontSize,
          fontWeight: correctionModal.fontWeight,
        };
      });

      commitSnapshot(nextLines, objects);
      setSelectedLineId(targetId);
      setCorrectionModal((prev) => ({ ...prev, isOpen: false }));

      if (showToast) {
        showToast(
          'Text Corrected',
          `Replaced "${correctionModal.oldText.slice(0, 20)}..." with "${correctionModal.newText.slice(0, 20)}..."`,
          'success'
        );
      }
    } else if (correctionModal.targetOverlay) {
      const targetId = correctionModal.targetOverlay.id;
      const nextOverlays = objects.map((o) => {
        if (o.id !== targetId) return o;
        return {
          ...o,
          text: correctionModal.newText,
          color: correctionModal.textColor,
          fontSize: correctionModal.fontSize,
          fontWeight: correctionModal.fontWeight,
        };
      });

      commitSnapshot(lines, nextOverlays);
      setSelectedOverlayId(targetId);
      setCorrectionModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Fit page zoom
  const handleFitPage = () => {
    const optimalZoom = calculateFitPageZoom(window.innerWidth * 0.65, window.innerHeight * 0.75, pageWidth, pageHeight);
    setZoom(optimalZoom);
  };

  // Download page composite image
  const handleDownloadPageImage = async (format: 'png' | 'jpg') => {
    try {
      const allObjects = [
        ...objects,
        ...convertTextLinesToOverlayObjects(lines, page.pageNumber),
      ];
      await downloadPageCompositeImage(page, jobId, allObjects, format);
      if (showToast) {
        showToast('Page Downloaded', `Saved page ${page.pageNumber} as ${format.toUpperCase()}.`, 'success');
      }
    } catch (err: any) {
      console.error('Composite page image download error:', err);
      if (showToast) {
        showToast('Export Error', 'Could not export page image.', 'error');
      }
    }
  };

  const modifiedCount = lines.filter((l) => l.isModified).length;
  const overlayCount = objects.length;

  return (
    <div
      className={`rounded-2xl border flex flex-col shadow-sm select-none ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* 1. EDITOR TOOLBAR */}
      <PdfEditorToolbar
        activeTool={activeTool}
        onChangeTool={(tool) => {
          setActiveTool(tool);
          if (tool === 'edit' && selectedLineId) {
            setEditingLineId(selectedLineId);
          }
        }}
        selectedLine={selectedLine}
        selectedOverlay={selectedOverlay}
        onUpdateSelectedLine={(updates) => {
          if (!selectedLineId) return;
          const nextLines = lines.map((l) => (l.id === selectedLineId ? { ...l, ...updates } : l));
          commitSnapshot(nextLines, objects);
        }}
        onUpdateSelectedOverlay={(updates) => {
          if (!selectedOverlayId) return;
          const nextOverlays = objects.map((o) => (o.id === selectedOverlayId ? { ...o, ...updates } : o));
          commitSnapshot(lines, nextOverlays);
        }}
        onDeleteSelected={handleDeleteSelected}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        zoom={zoom}
        onZoomIn={() => setZoom(Math.min(250, zoom + 20))}
        onZoomOut={() => setZoom(Math.max(50, zoom - 20))}
        onFitPage={handleFitPage}
        onSavePdf={onSavePdf}
        onDownloadPageImage={handleDownloadPageImage}
        onOpenDirectCorrection={() => handleOpenDirectCorrection()}
        isSaving={isSaving}
        darkMode={darkMode}
      />

      {/* 2. CASE TRANSPARENCY NOTICE BANNER */}
      <div
        className={`px-4 py-2 border-b text-xs flex items-center justify-between gap-3 ${
          page.isScanned
            ? darkMode
              ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
            : page.contentType === 'mixed'
            ? darkMode
              ? 'bg-purple-950/20 border-purple-900/40 text-purple-300'
              : 'bg-purple-50/80 border-purple-200 text-purple-900'
            : darkMode
            ? 'bg-blue-950/20 border-blue-900/40 text-blue-300'
            : 'bg-blue-50/80 border-blue-200 text-blue-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-blue-500" />
          <span className="font-semibold">
            {page.isScanned
              ? 'Scanned / ID Document (Case B):'
              : page.contentType === 'mixed'
              ? 'Mixed Document (Case C):'
              : 'Direct Vector Text PDF (Case A):'}
          </span>
          <span className="opacity-90">
            {page.isScanned
              ? 'Every line is detected as an editable overlay. Edited lines neatly cover old scanned pixels with matched background patches, drawing crisp replacement text at exact coordinates.'
              : page.contentType === 'mixed'
              ? 'Preserving all embedded photos, stamps, logos, and vector artwork while overlaying your text corrections.'
              : 'Real text layer detected. Click any visible line directly on the PDF to edit it inline or replace it.'}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span>{Math.round(pageWidth)} × {Math.round(pageHeight)} pt</span>
          <span>•</span>
          <span>{lines.length} lines detected</span>
          <span>•</span>
          <span>{modifiedCount + overlayCount} change{modifiedCount + overlayCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* 3. VISUAL PAGE CANVAS WORKSPACE */}
      <PdfPageCanvas
        page={page}
        jobId={jobId}
        zoom={zoom}
        activeTool={activeTool}
        lines={lines}
        overlays={objects}
        selectedLineId={selectedLineId}
        editingLineId={editingLineId}
        selectedOverlayId={selectedOverlayId}
        editingOverlayId={editingOverlayId}
        dragAction={dragAction}
        renderedDims={renderedDims}
        onUpdateRenderedDims={setRenderedDims}
        onCanvasMouseDown={handleCanvasMouseDown}
        onCanvasMouseMove={handleCanvasMouseMove}
        onCanvasMouseUp={handleCanvasMouseUp}
        onSelectLine={(id) => {
          setSelectedLineId(id);
          setSelectedOverlayId(null);
          if (activeTool === 'edit') {
            setEditingLineId(id);
          }
        }}
        onStartEditLine={(id) => {
          setSelectedLineId(id);
          setEditingLineId(id);
        }}
        onCommitEditLine={handleCommitEditLine}
        onCancelEditLine={() => setEditingLineId(null)}
        onDeleteLine={(id) => {
          const nextLines = lines.map((l) => (l.id === id ? { ...l, isDeleted: true, isModified: true } : l));
          commitSnapshot(nextLines, objects);
        }}
        onStartMoveLine={(e, line) => {
          setDragAction({
            type: 'move_line',
            id: line.id,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            origX: line.x,
            origY: line.y,
          });
        }}
        onStartResizeLine={(e, line, handle) => {
          setDragAction({
            type: 'resize_line',
            id: line.id,
            handle,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            origX: line.x,
            origY: line.y,
            origW: line.width,
            origH: line.height,
          });
        }}
        onOpenDirectCorrection={handleOpenDirectCorrection}
        onSelectOverlay={(id) => {
          setSelectedOverlayId(id);
          setSelectedLineId(null);
        }}
        onStartMoveOverlay={(e, obj) => {
          setDragAction({
            type: 'move_overlay',
            id: obj.id,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            origX: obj.x,
            origY: obj.y,
          });
        }}
        onStartResizeOverlay={(e, obj, handle) => {
          setDragAction({
            type: 'resize_overlay',
            id: obj.id,
            handle,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            origX: obj.x,
            origY: obj.y,
            origW: obj.width,
            origH: obj.height,
          });
        }}
        onDoubleClickOverlay={(obj) => {
          if (obj.type === 'text') {
            setEditingOverlayId(obj.id);
            setEditingOverlayVal(obj.text || '');
          }
        }}
        editingOverlayVal={editingOverlayVal}
        onChangeEditingOverlayVal={setEditingOverlayVal}
        onFinishInlineEditOverlay={handleFinishInlineEditOverlay}
        darkMode={darkMode}
      />

      {/* 4. DIRECT TEXT CORRECTION MODAL */}
      {correctionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">Direct Text Correction on PDF</h3>
              </div>
              <button
                onClick={() => setCorrectionModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Precision visual replacement: original text is cleanly covered with a matched background patch, and new text is rendered at the exact position.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Original / Old Text:
                </label>
                <div
                  className={`p-2.5 rounded-xl border text-xs font-mono select-all ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {correctionModal.oldText || '(Empty / Scanned Region)'}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                  Corrected / New Text:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={correctionModal.newText}
                  onChange={(e) => setCorrectionModal({ ...correctionModal, newText: e.target.value })}
                  placeholder="Enter replacement text..."
                  className={`w-full p-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCorrection();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Cover Background:</label>
                  <div className="flex items-center gap-1.5">
                    {PRESET_COVER_COLORS.slice(0, 4).map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setCorrectionModal({ ...correctionModal, coverColor: c.hex })}
                        className={`w-5 h-5 rounded-full border transition transform hover:scale-110 ${
                          correctionModal.coverColor === c.hex ? 'ring-2 ring-blue-500' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={correctionModal.coverColor}
                      onChange={(e) => setCorrectionModal({ ...correctionModal, coverColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Font Size (pt):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={6}
                      max={48}
                      value={correctionModal.fontSize}
                      onChange={(e) =>
                        setCorrectionModal({
                          ...correctionModal,
                          fontSize: Math.max(6, Math.min(48, Number(e.target.value) || 12)),
                        })
                      }
                      className={`w-16 p-1.5 rounded-lg border text-xs font-mono text-center outline-none ${
                        darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                    <button
                      onClick={() =>
                        setCorrectionModal({
                          ...correctionModal,
                          fontWeight: correctionModal.fontWeight === 'bold' ? 'normal' : 'bold',
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${
                        correctionModal.fontWeight === 'bold'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      B
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t dark:border-slate-800">
              <button
                onClick={() => setCorrectionModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCorrection}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Apply Correction</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
