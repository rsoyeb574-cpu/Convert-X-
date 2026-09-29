import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PdfToTextPage, PdfVisualOverlayObject, PdfVisualTextBlock } from '../types.js';
import {
  MousePointer,
  Type,
  Square,
  Sparkles,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Check,
  X,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  Layers,
  ShieldCheck,
  Eye,
  RefreshCw,
  Palette,
  Plus,
  CornerDownLeft,
} from 'lucide-react';

interface PdfVisualEditorCanvasProps {
  page: PdfToTextPage;
  jobId: string;
  objects: PdfVisualOverlayObject[];
  onChangeObjects: (objects: PdfVisualOverlayObject[]) => void;
  onSavePdf: () => void;
  isSaving?: boolean;
  darkMode?: boolean;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type ToolMode = 'select' | 'text' | 'cover' | 'correct';

const PRESET_TEXT_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark Slate', hex: '#1e293b' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Blue', hex: '#2563eb' },
];

const PRESET_COVER_COLORS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Paper Cream', hex: '#fdfbf7' },
  { name: 'Light Gray', hex: '#f3f4f6' },
  { name: 'Document Slate', hex: '#f8fafc' },
  { name: 'Warm Parchment', hex: '#fefce8' },
];

export const PdfVisualEditorCanvas: React.FC<PdfVisualEditorCanvasProps> = ({
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextVal, setEditingTextVal] = useState<string>('');
  const [zoom, setZoom] = useState<number>(100);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<PdfVisualOverlayObject[][]>([]);
  const [redoStack, setRedoStack] = useState<PdfVisualOverlayObject[][]>([]);

  // Dragging / Resizing state
  const [dragAction, setDragAction] = useState<
    | { type: 'move'; id: string; startMouseX: number; startMouseY: number; origX: number; origY: number }
    | { type: 'resize'; id: string; handle: string; startMouseX: number; startMouseY: number; origX: number; origY: number; origW: number; origH: number }
    | { type: 'create_cover'; startPdfX: number; startPdfY: number; currentPdfX: number; currentPdfY: number }
    | null
  >(null);

  // Direct Text Correction Modal
  const [correctionModal, setCorrectionModal] = useState<{
    isOpen: boolean;
    oldText: string;
    newText: string;
    targetBlock?: PdfVisualTextBlock | PdfVisualOverlayObject;
    coverColor: string;
    textColor: string;
    fontSize: number;
    fontFamily: 'sans' | 'serif' | 'mono';
    fontWeight: 'normal' | 'bold';
  }>({
    isOpen: false,
    oldText: '',
    newText: '',
    coverColor: '#ffffff',
    textColor: '#000000',
    fontSize: 12,
    fontFamily: 'sans',
    fontWeight: 'normal',
  });

  // Selected object helper
  const selectedObject = useMemo(() => {
    return objects.find((o) => o.id === selectedId) || null;
  }, [objects, selectedId]);

  // Containers
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [renderedDims, setRenderedDims] = useState<{ width: number; height: number }>({
    width: page.width || 595,
    height: page.height || 842,
  });

  // Push new state to undo stack
  const updateObjectsWithHistory = useCallback(
    (newObjs: PdfVisualOverlayObject[]) => {
      setUndoStack((prev) => [...prev, objects]);
      setRedoStack([]); // Clear redo
      onChangeObjects(newObjs);
    },
    [objects, onChangeObjects]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, objects]);
    onChangeObjects(previous);
  }, [undoStack, objects, onChangeObjects]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, objects]);
    onChangeObjects(next);
  }, [redoStack, objects, onChangeObjects]);

  // Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingTextId) {
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
        setSelectedId(null);
        setEditingTextId(null);
        setCorrectionModal((prev) => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingTextId, handleUndo, handleRedo]);

  // Measure rendered image dimensions to maintain exact coordinate mapping
  useEffect(() => {
    const updateSize = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setRenderedDims({ width: rect.width, height: rect.height });
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [zoom, page.pageNumber]);

  // Coordinate conversion: Screen pixels <-> PDF Points
  const scaleX = renderedDims.width / (page.width || 595.28);
  const scaleY = renderedDims.height / (page.height || 841.89);

  const getPdfCoords = (e: React.MouseEvent): { x: number; y: number } => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    return {
      x: Math.round(clickX / scaleX),
      y: Math.round(clickY / scaleY),
    };
  };

  // Add new Text Box at position
  const handleAddTextAt = (pdfX: number, pdfY: number) => {
    const newObj: PdfVisualOverlayObject = {
      id: `text_${Date.now()}`,
      pageNumber: page.pageNumber,
      type: 'text',
      x: Math.max(0, Math.min(page.width - 120, pdfX)),
      y: Math.max(0, Math.min(page.height - 24, pdfY)),
      width: 140,
      height: 26,
      text: 'Sample Text',
      fontSize: 13,
      fontFamily: 'sans',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      color: '#000000',
    };

    updateObjectsWithHistory([...objects, newObj]);
    setSelectedId(newObj.id);
    setEditingTextId(newObj.id);
    setEditingTextVal(newObj.text || '');
    setActiveTool('select');
  };

  // Add new Cover Box at position
  const handleAddCoverBoxAt = (pdfX: number, pdfY: number, width = 120, height = 24) => {
    const newObj: PdfVisualOverlayObject = {
      id: `cover_${Date.now()}`,
      pageNumber: page.pageNumber,
      type: 'cover',
      x: Math.max(0, Math.min(page.width - width, pdfX)),
      y: Math.max(0, Math.min(page.height - height, pdfY)),
      width,
      height,
      backgroundColor: '#ffffff',
      opacity: 1.0,
    };

    updateObjectsWithHistory([...objects, newObj]);
    setSelectedId(newObj.id);
    setActiveTool('select');
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicked on an overlay directly, let the overlay handler handle it
    if ((e.target as HTMLElement).closest('.overlay-item')) {
      return;
    }

    const { x, y } = getPdfCoords(e);

    if (activeTool === 'text') {
      handleAddTextAt(x, y);
    } else if (activeTool === 'cover') {
      // Start drawing cover box
      setDragAction({
        type: 'create_cover',
        startPdfX: x,
        startPdfY: y,
        currentPdfX: x,
        currentPdfY: y,
      });
    } else {
      // Clicked on empty canvas in select mode -> deselect
      setSelectedId(null);
      setEditingTextId(null);
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragAction) return;

    if (dragAction.type === 'move') {
      const deltaX = (e.clientX - dragAction.startMouseX) / scaleX;
      const deltaY = (e.clientY - dragAction.startMouseY) / scaleY;

      const newX = Math.round(Math.max(0, Math.min(page.width - 20, dragAction.origX + deltaX)));
      const newY = Math.round(Math.max(0, Math.min(page.height - 10, dragAction.origY + deltaY)));

      onChangeObjects(
        objects.map((o) => (o.id === dragAction.id ? { ...o, x: newX, y: newY } : o))
      );
    } else if (dragAction.type === 'resize') {
      const deltaX = (e.clientX - dragAction.startMouseX) / scaleX;
      const deltaY = (e.clientY - dragAction.startMouseY) / scaleY;

      let newW = dragAction.origW;
      let newH = dragAction.origH;
      let newX = dragAction.origX;
      let newY = dragAction.origY;

      if (dragAction.handle === 'se') {
        newW = Math.max(20, Math.round(dragAction.origW + deltaX));
        newH = Math.max(12, Math.round(dragAction.origH + deltaY));
      } else if (dragAction.handle === 'sw') {
        const potentialW = dragAction.origW - deltaX;
        if (potentialW >= 20) {
          newW = Math.round(potentialW);
          newX = Math.round(dragAction.origX + deltaX);
        }
        newH = Math.max(12, Math.round(dragAction.origH + deltaY));
      } else if (dragAction.handle === 'e') {
        newW = Math.max(20, Math.round(dragAction.origW + deltaX));
      } else if (dragAction.handle === 's') {
        newH = Math.max(12, Math.round(dragAction.origH + deltaY));
      }

      onChangeObjects(
        objects.map((o) => (o.id === dragAction.id ? { ...o, x: newX, y: newY, width: newW, height: newH } : o))
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

      if (w >= 5 && h >= 5) {
        handleAddCoverBoxAt(minX, minY, w, h);
      } else {
        // Simple click -> default cover box
        handleAddCoverBoxAt(dragAction.startPdfX, dragAction.startPdfY, 120, 24);
      }
    } else if (dragAction.type === 'move' || dragAction.type === 'resize') {
      // Record in history
      setUndoStack((prev) => [...prev, objects]);
      setRedoStack([]);
    }

    setDragAction(null);
  };

  // Delete Selected Object
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    updateObjectsWithHistory(objects.filter((o) => o.id !== selectedId));
    setSelectedId(null);
    setEditingTextId(null);
    if (showToast) {
      showToast('Object Deleted', 'Removed selected element from page.', 'info');
    }
  };

  // Update properties on selected object
  const updateSelectedObject = (updates: Partial<PdfVisualOverlayObject>) => {
    if (!selectedId) return;
    updateObjectsWithHistory(
      objects.map((o) => (o.id === selectedId ? { ...o, ...updates } : o))
    );
  };

  // Commit inline text editing
  const handleFinishInlineEdit = () => {
    if (!editingTextId) return;
    updateObjectsWithHistory(
      objects.map((o) => (o.id === editingTextId ? { ...o, text: editingTextVal } : o))
    );
    setEditingTextId(null);
  };

  // Open Direct Text Correction for a detected text block or object
  const openDirectCorrection = (block: PdfVisualTextBlock | PdfVisualOverlayObject) => {
    const textVal = 'text' in block && block.text ? block.text : '';
    setCorrectionModal({
      isOpen: true,
      oldText: textVal,
      newText: textVal,
      targetBlock: block,
      coverColor: '#ffffff',
      textColor: '#000000',
      fontSize: block.fontSize || 12,
      fontFamily: 'sans',
      fontWeight: 'normal',
    });
  };

  // Apply Direct Text Correction
  const handleApplyCorrection = () => {
    if (!correctionModal.targetBlock) return;
    const block = correctionModal.targetBlock;

    // Create a correction object that cleanly masks the old text and places replacement text
    const newCorrection: PdfVisualOverlayObject = {
      id: `corr_${Date.now()}`,
      pageNumber: page.pageNumber,
      type: 'correction',
      x: block.x - 2,
      y: block.y - 1,
      width: block.width + 4,
      height: block.height + 2,
      text: correctionModal.newText,
      originalText: correctionModal.oldText,
      fontSize: correctionModal.fontSize,
      fontFamily: correctionModal.fontFamily,
      fontWeight: correctionModal.fontWeight,
      color: correctionModal.textColor,
      backgroundColor: correctionModal.coverColor,
      opacity: 1.0,
    };

    updateObjectsWithHistory([...objects, newCorrection]);
    setSelectedId(newCorrection.id);
    setCorrectionModal((prev) => ({ ...prev, isOpen: false }));

    if (showToast) {
      showToast(
        'Correction Applied',
        `Replaced "${correctionModal.oldText.slice(0, 20)}..." with "${correctionModal.newText.slice(0, 20)}..." directly on PDF.`,
        'success'
      );
    }
  };

  // High-Resolution Composite Page Image Download (PNG / JPG)
  const handleDownloadEditedPageImage = (format: 'png' | 'jpg') => {
    if (!imageRef.current) return;

    try {
      const offscreen = document.createElement('canvas');
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        offscreen.width = img.naturalWidth || renderedDims.width * 2;
        offscreen.height = img.naturalHeight || renderedDims.height * 2;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        // Draw original background image
        ctx.drawImage(img, 0, 0, offscreen.width, offscreen.height);

        // Scale factors to render overlays at canvas resolution
        const exportScaleX = offscreen.width / (page.width || 595.28);
        const exportScaleY = offscreen.height / (page.height || 841.89);

        // 1. Draw Cover Rectangles
        for (const obj of objects) {
          if (obj.type === 'cover' || obj.type === 'correction') {
            ctx.fillStyle = obj.backgroundColor || '#ffffff';
            ctx.globalAlpha = typeof obj.opacity === 'number' ? obj.opacity : 1.0;
            ctx.fillRect(
              obj.x * exportScaleX,
              obj.y * exportScaleY,
              obj.width * exportScaleX,
              obj.height * exportScaleY
            );
            ctx.globalAlpha = 1.0;
          }
        }

        // 2. Draw Text Overlays
        for (const obj of objects) {
          if ((obj.type === 'text' || obj.type === 'correction') && obj.text && obj.text.trim()) {
            const fontSizePx = (obj.fontSize || 12) * exportScaleX;
            const weight = obj.fontWeight === 'bold' ? 'bold ' : '';
            const style = obj.fontStyle === 'italic' ? 'italic ' : '';
            const fontFam =
              obj.fontFamily === 'serif'
                ? 'Times New Roman, serif'
                : obj.fontFamily === 'mono'
                ? 'Courier New, monospace'
                : 'Inter, system-ui, sans-serif';

            ctx.font = `${style}${weight}${fontSizePx}px ${fontFam}`;
            ctx.fillStyle = obj.color || '#000000';
            ctx.textBaseline = 'top';
            ctx.textAlign = (obj.textAlign as CanvasTextAlign) || 'left';

            const drawX =
              obj.textAlign === 'center'
                ? (obj.x + obj.width / 2) * exportScaleX
                : obj.textAlign === 'right'
                ? (obj.x + obj.width) * exportScaleX
                : obj.x * exportScaleX;

            ctx.fillText(obj.text, drawX, obj.y * exportScaleY);
          }
        }

        // Trigger Download
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        offscreen.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `page_${page.pageNumber}_edited.${format}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }, 1000);

            if (showToast) {
              showToast('Page Downloaded', `Saved page ${page.pageNumber} as ${format.toUpperCase()}.`, 'success');
            }
          },
          mimeType,
          0.95
        );
      };

      img.src =
        page.pageImageUrl ||
        page.thumbnailUrl ||
        `/api/pdf-to-text/page-image/${jobId}/${page.pageNumber}`;
    } catch (err: any) {
      console.error('Image export failed:', err);
      if (showToast) {
        showToast('Export Error', 'Could not export page image.', 'error');
      }
    }
  };

  return (
    <div
      className={`rounded-2xl border flex flex-col shadow-sm select-none ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* ------------------------------------------------------------------- */}
      {/* 1. VISUAL EDITOR TOOLBAR */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs rounded-t-2xl sticky top-16 z-30 backdrop-blur-md ${
          darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/90 border-slate-200'
        }`}
      >
        {/* Tool Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTool('select')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Select & Move Objects"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>

          <button
            onClick={() => setActiveTool('text')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Add New Text (Click anywhere on page)"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add Text</span>
          </button>

          <button
            onClick={() => setActiveTool('cover')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs ${
              activeTool === 'cover'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Cover / Whiteout (Drag a box to cover old text or stamps)"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Cover Box</span>
          </button>

          <button
            onClick={() => {
              if (selectedObject) {
                openDirectCorrection(selectedObject);
              } else if (page.textBlocks && page.textBlocks.length > 0) {
                openDirectCorrection(page.textBlocks[0]);
              } else {
                if (showToast) {
                  showToast('Direct Correction', 'Click any text on the page to correct it.', 'info');
                }
              }
            }}
            className="px-2.5 py-1.5 rounded-lg font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 flex items-center gap-1.5 transition text-xs"
            title="Direct Text Correction (Old -> New with auto-cover)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Correction</span>
          </button>
        </div>

        {/* Selected Object Styling Bar (Active when text or cover selected) */}
        {selectedObject && (
          <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            {(selectedObject.type === 'text' || selectedObject.type === 'correction') && (
              <>
                {/* Font Size controls */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Size:</span>
                  <button
                    onClick={() =>
                      updateSelectedObject({ fontSize: Math.max(7, (selectedObject.fontSize || 12) - 1) })
                    }
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs w-6 text-center text-slate-700 dark:text-slate-200">
                    {selectedObject.fontSize || 12}
                  </span>
                  <button
                    onClick={() =>
                      updateSelectedObject({ fontSize: Math.min(72, (selectedObject.fontSize || 12) + 1) })
                    }
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Bold / Italic */}
                <button
                  onClick={() =>
                    updateSelectedObject({
                      fontWeight: selectedObject.fontWeight === 'bold' ? 'normal' : 'bold',
                    })
                  }
                  className={`p-1 rounded ${
                    selectedObject.fontWeight === 'bold'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Toggle Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() =>
                    updateSelectedObject({
                      fontStyle: selectedObject.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  className={`p-1 rounded ${
                    selectedObject.fontStyle === 'italic'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Toggle Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Text Color Presets */}
                <div className="flex items-center gap-1">
                  {PRESET_TEXT_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => updateSelectedObject({ color: c.hex })}
                      className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 transition transform hover:scale-125"
                      style={{ backgroundColor: c.hex }}
                      title={`Text Color: ${c.name}`}
                    />
                  ))}
                </div>
              </>
            )}

            {(selectedObject.type === 'cover' || selectedObject.type === 'correction') && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Cover:</span>
                  {PRESET_COVER_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => updateSelectedObject({ backgroundColor: c.hex })}
                      className="w-4 h-4 rounded-full border border-slate-400 dark:border-slate-500 transition transform hover:scale-125 shadow-2xs"
                      style={{ backgroundColor: c.hex }}
                      title={`Cover Background: ${c.name}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedObject.backgroundColor || '#ffffff'}
                    onChange={(e) => updateSelectedObject({ backgroundColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    title="Custom Cover Color"
                  />
                </div>
              </>
            )}

            {/* Delete button */}
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={handleDeleteSelected}
              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded transition"
              title="Delete Selected Object (Del / Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Undo / Redo / Zoom & Save Actions */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={`p-1.5 rounded-lg border transition ${
              undoStack.length > 0
                ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                : 'text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded-lg border transition ${
              redoStack.length > 0
                ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                : 'text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Zoom */}
          <button
            onClick={() => setZoom(Math.max(50, zoom - 20))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-500 min-w-[34px] text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(250, zoom + 20))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Download Edited Page Image Dropdown */}
          <button
            onClick={() => handleDownloadEditedPageImage('png')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
              darkMode
                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
            title="Download this page image with all visual edits as PNG"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Page PNG</span>
          </button>

          {/* Main Save & Download Edited PDF Button */}
          <button
            onClick={onSavePdf}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Save Edited PDF</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. CASE BANNER & TRANSPARENCY NOTICE */}
      {/* ------------------------------------------------------------------- */}
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
              ? 'Non-destructive editing active. Old text is neatly covered with matched background patches, and new vector text is rendered cleanly at exact coordinates.'
              : page.contentType === 'mixed'
              ? 'Preserving all embedded photos, stamps, logos, and vector artwork while overlaying your text corrections.'
              : 'Real text layer detected. Click any detected text box below to correct it, or add new text and cover patches.'}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span>{page.width} × {page.height} pt</span>
          <span>•</span>
          <span>{objects.length} edit{objects.length === 1 ? '' : 's'} on page</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. VISUAL CANVAS WORKSPACE */}
      {/* ------------------------------------------------------------------- */}
      <div
        ref={canvasContainerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className={`p-4 sm:p-8 min-h-[640px] flex items-center justify-center relative overflow-auto ${
          darkMode ? 'bg-slate-950' : 'bg-slate-100/70'
        }`}
        style={{
          cursor:
            activeTool === 'text'
              ? 'text'
              : activeTool === 'cover'
              ? 'crosshair'
              : dragAction?.type === 'move'
              ? 'grabbing'
              : 'default',
        }}
      >
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: dragAction ? 'none' : 'transform 0.15s ease-out',
            width: renderedDims.width || 600,
            height: renderedDims.height || 850,
          }}
          className="relative rounded-lg shadow-xl bg-white border border-slate-200 dark:border-slate-800"
        >
          {/* Base Page Image Rendered at Full DPI */}
          <img
            ref={imageRef}
            src={
              page.pageImageUrl ||
              page.thumbnailUrl ||
              `/api/pdf-to-text/page-image/${jobId}/${page.pageNumber}`
            }
            alt={`Page ${page.pageNumber}`}
            className="w-full h-auto object-contain block pointer-events-none select-none rounded-lg"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.clientWidth > 0 && img.clientHeight > 0) {
                setRenderedDims({ width: img.clientWidth, height: img.clientHeight });
              }
            }}
          />

          {/* DETECTED TEXT BLOCKS LAYER (Clickable interactive regions) */}
          {activeTool === 'select' &&
            page.textBlocks &&
            page.textBlocks.map((block) => (
              <div
                key={block.id}
                onClick={(e) => {
                  e.stopPropagation();
                  openDirectCorrection(block);
                }}
                className="absolute border border-dashed border-blue-400/30 hover:border-blue-600 hover:bg-blue-500/10 cursor-pointer transition rounded group z-10"
                style={{
                  left: `${block.x * scaleX}px`,
                  top: `${block.y * scaleY}px`,
                  width: `${block.width * scaleX}px`,
                  height: `${block.height * scaleY}px`,
                }}
                title={`Click to correct: "${block.text}"`}
              >
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-0 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                  Edit: {block.text.slice(0, 24)}...
                </span>
              </div>
            ))}

          {/* ACTIVE OBJECTS OVERLAY LAYER */}
          {objects.map((obj) => {
            const isSelected = obj.id === selectedId;
            const isEditing = obj.id === editingTextId;

            return (
              <div
                key={obj.id}
                className={`overlay-item absolute transition-shadow ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-20' : 'z-10'
                }`}
                style={{
                  left: `${obj.x * scaleX}px`,
                  top: `${obj.y * scaleY}px`,
                  width: `${obj.width * scaleX}px`,
                  height: `${obj.height * scaleY}px`,
                  backgroundColor:
                    obj.type === 'cover' || obj.type === 'correction'
                      ? obj.backgroundColor || '#ffffff'
                      : 'transparent',
                  opacity: typeof obj.opacity === 'number' ? obj.opacity : 1.0,
                  cursor: isSelected ? 'grab' : 'pointer',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(obj.id);
                  if (activeTool === 'select') {
                    setDragAction({
                      type: 'move',
                      id: obj.id,
                      startMouseX: e.clientX,
                      startMouseY: e.clientY,
                      origX: obj.x,
                      origY: obj.y,
                    });
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (obj.type === 'text' || obj.type === 'correction') {
                    setEditingTextId(obj.id);
                    setEditingTextVal(obj.text || '');
                  }
                }}
              >
                {/* Content Rendering */}
                {obj.type === 'cover' ? (
                  <div className="w-full h-full border border-dashed border-slate-400/40" />
                ) : isEditing ? (
                  <textarea
                    autoFocus
                    value={editingTextVal}
                    onChange={(e) => setEditingTextVal(e.target.value)}
                    onBlur={handleFinishInlineEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFinishInlineEdit();
                      }
                    }}
                    className="w-full h-full p-0 m-0 border-0 outline-none resize-none bg-transparent"
                    style={{
                      fontSize: `${(obj.fontSize || 12) * scaleX}px`,
                      fontWeight: obj.fontWeight || 'normal',
                      fontStyle: obj.fontStyle || 'normal',
                      color: obj.color || '#000000',
                      fontFamily:
                        obj.fontFamily === 'serif'
                          ? 'Times New Roman, serif'
                          : obj.fontFamily === 'mono'
                          ? 'Courier New, monospace'
                          : 'Inter, system-ui, sans-serif',
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center overflow-hidden whitespace-pre-wrap select-none"
                    style={{
                      fontSize: `${(obj.fontSize || 12) * scaleX}px`,
                      fontWeight: obj.fontWeight || 'normal',
                      fontStyle: obj.fontStyle || 'normal',
                      color: obj.color || '#000000',
                      textAlign: obj.textAlign || 'left',
                      fontFamily:
                        obj.fontFamily === 'serif'
                          ? 'Times New Roman, serif'
                          : obj.fontFamily === 'mono'
                          ? 'Courier New, monospace'
                          : 'Inter, system-ui, sans-serif',
                    }}
                  >
                    {obj.text}
                  </div>
                )}

                {/* Resize Handles (When selected) */}
                {isSelected && (
                  <>
                    {/* Bottom-Right Handle */}
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-se-resize z-30"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragAction({
                          type: 'resize',
                          id: obj.id,
                          handle: 'se',
                          startMouseX: e.clientX,
                          startMouseY: e.clientY,
                          origX: obj.x,
                          origY: obj.y,
                          origW: obj.width,
                          origH: obj.height,
                        });
                      }}
                    />
                    {/* Right Handle */}
                    <div
                      className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 border border-white rounded-sm cursor-e-resize z-30"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragAction({
                          type: 'resize',
                          id: obj.id,
                          handle: 'e',
                          startMouseX: e.clientX,
                          startMouseY: e.clientY,
                          origX: obj.x,
                          origY: obj.y,
                          origW: obj.width,
                          origH: obj.height,
                        });
                      }}
                    />
                    {/* Bottom Handle */}
                    <div
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-600 border border-white rounded-sm cursor-s-resize z-30"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragAction({
                          type: 'resize',
                          id: obj.id,
                          handle: 's',
                          startMouseX: e.clientX,
                          startMouseY: e.clientY,
                          origX: obj.x,
                          origY: obj.y,
                          origW: obj.width,
                          origH: obj.height,
                        });
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* DRAWING COVER BOX PREVIEW */}
          {dragAction?.type === 'create_cover' && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-30"
              style={{
                left: `${Math.min(dragAction.startPdfX, dragAction.currentPdfX) * scaleX}px`,
                top: `${Math.min(dragAction.startPdfY, dragAction.currentPdfY) * scaleY}px`,
                width: `${Math.abs(dragAction.currentPdfX - dragAction.startPdfX) * scaleX}px`,
                height: `${Math.abs(dragAction.currentPdfY - dragAction.startPdfY) * scaleY}px`,
              }}
            />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. DIRECT TEXT CORRECTION MODAL */}
      {/* ------------------------------------------------------------------- */}
      {correctionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
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
              Non-destructive precision replacement: the old text will be neatly covered with a matched background patch, and the corrected text will be placed in the exact same position.
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
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0"
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
                      className={`w-20 p-1.5 rounded-lg border text-xs font-mono text-center outline-none ${
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
