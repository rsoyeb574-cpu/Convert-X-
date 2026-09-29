/**
 * PdfEditorToolbar.tsx
 * Top professional toolbar for the Visual PDF Editor.
 * Includes Select, Text, Edit, Add Text, Cover, Delete, Undo, Redo, Zoom In, Zoom Out, Fit Page, Save PDF, Download.
 */

import React from 'react';
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
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { PdfTextLine, PdfVisualOverlayObject } from '../../types.js';

export type ToolMode = 'select' | 'text' | 'edit' | 'cover';

interface PdfEditorToolbarProps {
  activeTool: ToolMode;
  onChangeTool: (tool: ToolMode) => void;
  selectedLine: PdfTextLine | null;
  selectedOverlay: PdfVisualOverlayObject | null;
  onUpdateSelectedLine: (updates: Partial<PdfTextLine>) => void;
  onUpdateSelectedOverlay: (updates: Partial<PdfVisualOverlayObject>) => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitPage: () => void;
  onSavePdf: () => void;
  onDownloadPageImage: (format: 'png' | 'jpg') => void;
  onOpenDirectCorrection: () => void;
  isSaving: boolean;
  darkMode: boolean;
}

const PRESET_TEXT_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Slate', hex: '#1e293b' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Blue', hex: '#2563eb' },
];

const PRESET_COVER_COLORS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Paper Cream', hex: '#fdfbf7' },
  { name: 'Light Gray', hex: '#f3f4f6' },
  { name: 'Warm Parchment', hex: '#fefce8' },
];

export const PdfEditorToolbar: React.FC<PdfEditorToolbarProps> = ({
  activeTool,
  onChangeTool,
  selectedLine,
  selectedOverlay,
  onUpdateSelectedLine,
  onUpdateSelectedOverlay,
  onDeleteSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitPage,
  onSavePdf,
  onDownloadPageImage,
  onOpenDirectCorrection,
  isSaving,
  darkMode,
}) => {
  const hasSelection = Boolean(selectedLine || selectedOverlay);

  // Active properties from either line or overlay
  const currentFontSize = selectedLine?.fontSize || selectedOverlay?.fontSize || 12;
  const currentFontWeight = selectedLine?.fontWeight || selectedOverlay?.fontWeight || 'normal';
  const currentFontStyle = selectedLine?.fontStyle || selectedOverlay?.fontStyle || 'normal';
  const currentTextAlign = selectedLine?.textAlign || selectedOverlay?.textAlign || 'left';
  const currentTextColor = selectedLine?.color || selectedOverlay?.color || '#000000';
  const currentCoverColor =
    selectedLine?.coverColor || selectedOverlay?.backgroundColor || '#ffffff';

  const isCoverActive =
    activeTool === 'cover' ||
    (selectedOverlay && selectedOverlay.type === 'cover') ||
    Boolean(selectedLine?.isDeleted);

  const handleUpdateFontSize = (newSize: number) => {
    const clamped = Math.max(6, Math.min(72, newSize));
    if (selectedLine) {
      onUpdateSelectedLine({ fontSize: clamped });
    } else if (selectedOverlay) {
      onUpdateSelectedOverlay({ fontSize: clamped });
    }
  };

  const handleToggleBold = () => {
    const nextWeight = currentFontWeight === 'bold' ? 'normal' : 'bold';
    if (selectedLine) onUpdateSelectedLine({ fontWeight: nextWeight });
    if (selectedOverlay) onUpdateSelectedOverlay({ fontWeight: nextWeight });
  };

  const handleToggleItalic = () => {
    const nextStyle = currentFontStyle === 'italic' ? 'normal' : 'italic';
    if (selectedLine) onUpdateSelectedLine({ fontStyle: nextStyle });
    if (selectedOverlay) onUpdateSelectedOverlay({ fontStyle: nextStyle });
  };

  const handleUpdateAlign = (align: 'left' | 'center' | 'right') => {
    if (selectedLine) onUpdateSelectedLine({ textAlign: align });
    if (selectedOverlay) onUpdateSelectedOverlay({ textAlign: align });
  };

  const handleUpdateTextColor = (color: string) => {
    if (selectedLine) onUpdateSelectedLine({ color, isModified: true });
    if (selectedOverlay) onUpdateSelectedOverlay({ color });
  };

  const handleUpdateCoverColor = (bg: string) => {
    if (selectedLine) onUpdateSelectedLine({ coverColor: bg, isModified: true });
    if (selectedOverlay) onUpdateSelectedOverlay({ backgroundColor: bg });
  };

  return (
    <div
      className={`p-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 text-xs rounded-t-2xl sticky top-16 z-30 backdrop-blur-md ${
        darkMode ? 'bg-slate-950/85 border-slate-800' : 'bg-slate-50/95 border-slate-200'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. PRIMARY TOOLS GROUP: Select, Text, Edit, Add Text, Cover, Delete */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl">
        {/* Select */}
        <button
          onClick={() => onChangeTool('select')}
          className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Select tool: click text to select, drag to reposition"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        {/* Edit */}
        <button
          onClick={() => onChangeTool('edit')}
          className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
            activeTool === 'edit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Edit tool: click any line to edit inline"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        {/* Add Text */}
        <button
          onClick={() => onChangeTool('text')}
          className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
            activeTool === 'text'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Add Text: click anywhere on page to place a new text box"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Text</span>
        </button>

        {/* Cover */}
        <button
          onClick={() => onChangeTool('cover')}
          className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
            activeTool === 'cover'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Cover: drag a rectangle to cover unwanted text, stamps, or logos"
        >
          <Square className="w-3.5 h-3.5" />
          <span>Cover</span>
        </button>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
            hasSelection
              ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          }`}
          title="Delete / Erase selected element"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TEXT & COVER STYLING CONTROLS (Active when selection or tool) */}
      {/* ------------------------------------------------------------- */}
      {hasSelection && (
        <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          {/* Font Size */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Size:</span>
            <button
              onClick={() => handleUpdateFontSize(currentFontSize - 1)}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
            >
              -
            </button>
            <span className="font-mono text-xs w-6 text-center text-slate-800 dark:text-slate-200">
              {currentFontSize}
            </span>
            <button
              onClick={() => handleUpdateFontSize(currentFontSize + 1)}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
            >
              +
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Bold / Italic */}
          <button
            onClick={handleToggleBold}
            className={`p-1 rounded ${
              currentFontWeight === 'bold'
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleToggleItalic}
            className={`p-1 rounded ${
              currentFontStyle === 'italic'
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Text Alignment */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleUpdateAlign('left')}
              className={`p-1 rounded ${
                currentTextAlign === 'left'
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleUpdateAlign('center')}
              className={`p-1 rounded ${
                currentTextAlign === 'center'
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleUpdateAlign('right')}
              className={`p-1 rounded ${
                currentTextAlign === 'right'
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Text Color Presets */}
          <div className="flex items-center gap-1">
            {PRESET_TEXT_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => handleUpdateTextColor(c.hex)}
                className={`w-3.5 h-3.5 rounded-full border transition transform hover:scale-125 ${
                  currentTextColor === c.hex ? 'ring-2 ring-blue-500' : 'border-slate-300'
                }`}
                style={{ backgroundColor: c.hex }}
                title={`Text Color: ${c.name}`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Cover Color Presets */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Cover:</span>
            {PRESET_COVER_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => handleUpdateCoverColor(c.hex)}
                className={`w-3.5 h-3.5 rounded-full border transition transform hover:scale-125 ${
                  currentCoverColor === c.hex ? 'ring-2 ring-blue-500' : 'border-slate-400'
                }`}
                style={{ backgroundColor: c.hex }}
                title={`Cover Background: ${c.name}`}
              />
            ))}
            <input
              type="color"
              value={currentCoverColor}
              onChange={(e) => handleUpdateCoverColor(e.target.value)}
              className="w-4 h-4 rounded cursor-pointer border-0 p-0"
              title="Custom cover color"
            />
          </div>

          {/* Quick Replace Button */}
          <button
            onClick={onOpenDirectCorrection}
            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded font-semibold text-[11px] flex items-center gap-1 transition"
            title="Open precision replacement dialog"
          >
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Replace...</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. HISTORY, ZOOM, FIT PAGE, SAVE & DOWNLOAD */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg border transition ${
            canUndo
              ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              : 'text-slate-300 dark:text-slate-700 border-transparent cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg border transition ${
            canRedo
              ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              : 'text-slate-300 dark:text-slate-700 border-transparent cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Zoom Out / Zoom In / Fit Page */}
        <button
          onClick={onZoomOut}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 min-w-[34px] text-center">
          {zoom}%
        </span>
        <button
          onClick={onZoomIn}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onFitPage}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
          title="Fit Page to Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Page Image Download */}
        <button
          onClick={() => onDownloadPageImage('png')}
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

        {/* Save PDF Button */}
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
          <span>Save PDF</span>
        </button>
      </div>
    </div>
  );
};
