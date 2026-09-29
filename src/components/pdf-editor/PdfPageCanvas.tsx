/**
 * PdfPageCanvas.tsx
 * Visual rendering canvas for a single PDF page.
 * Manages original background image rendering, scaling math, text layer, and overlay layer.
 */

import React, { useRef, useEffect } from 'react';
import { PdfToTextPage, PdfTextLine, PdfVisualOverlayObject } from '../../types.js';
import { PdfTextLayer } from './PdfTextLayer.js';
import { PdfOverlayLayer } from './PdfOverlayLayer.js';
import { ToolMode } from './PdfEditorToolbar.js';

interface PdfPageCanvasProps {
  page: PdfToTextPage;
  jobId: string;
  zoom: number;
  activeTool: ToolMode;
  lines: PdfTextLine[];
  overlays: PdfVisualOverlayObject[];
  selectedLineId: string | null;
  editingLineId: string | null;
  selectedOverlayId: string | null;
  editingOverlayId: string | null;
  dragAction: any;
  renderedDims: { width: number; height: number };
  onUpdateRenderedDims: (dims: { width: number; height: number }) => void;
  onCanvasMouseDown: (e: React.MouseEvent) => void;
  onCanvasMouseMove: (e: React.MouseEvent) => void;
  onCanvasMouseUp: () => void;
  onSelectLine: (id: string) => void;
  onStartEditLine: (id: string) => void;
  onCommitEditLine: (id: string, newText: string) => void;
  onCancelEditLine: () => void;
  onDeleteLine: (id: string) => void;
  onStartMoveLine: (e: React.MouseEvent, line: PdfTextLine) => void;
  onStartResizeLine: (e: React.MouseEvent, line: PdfTextLine, handle: string) => void;
  onOpenDirectCorrection: (line: PdfTextLine) => void;
  onSelectOverlay: (id: string) => void;
  onStartMoveOverlay: (e: React.MouseEvent, obj: PdfVisualOverlayObject) => void;
  onStartResizeOverlay: (e: React.MouseEvent, obj: PdfVisualOverlayObject, handle: string) => void;
  onDoubleClickOverlay: (obj: PdfVisualOverlayObject) => void;
  editingOverlayVal: string;
  onChangeEditingOverlayVal: (val: string) => void;
  onFinishInlineEditOverlay: () => void;
  darkMode: boolean;
}

export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({
  page,
  jobId,
  zoom,
  activeTool,
  lines,
  overlays,
  selectedLineId,
  editingLineId,
  selectedOverlayId,
  editingOverlayId,
  dragAction,
  renderedDims,
  onUpdateRenderedDims,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onSelectLine,
  onStartEditLine,
  onCommitEditLine,
  onCancelEditLine,
  onDeleteLine,
  onStartMoveLine,
  onStartResizeLine,
  onOpenDirectCorrection,
  onSelectOverlay,
  onStartMoveOverlay,
  onStartResizeOverlay,
  onDoubleClickOverlay,
  editingOverlayVal,
  onChangeEditingOverlayVal,
  onFinishInlineEditOverlay,
  darkMode,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageWidth = page.width || 595.28;
  const pageHeight = page.height || 841.89;

  const scaleX = renderedDims.width > 0 ? renderedDims.width / pageWidth : 1;
  const scaleY = renderedDims.height > 0 ? renderedDims.height / pageHeight : 1;

  // Track natural or rendered size of the background image
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          onUpdateRenderedDims({ width: rect.width, height: rect.height });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [page.pageNumber, zoom, onUpdateRenderedDims]);

  return (
    <div
      ref={containerRef}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      className={`p-4 sm:p-8 min-h-[640px] flex items-center justify-center relative overflow-auto ${
        darkMode ? 'bg-slate-950' : 'bg-slate-100/75'
      }`}
      style={{
        cursor:
          activeTool === 'text'
            ? 'text'
            : activeTool === 'cover'
            ? 'crosshair'
            : dragAction?.type === 'move_line' || dragAction?.type === 'move_overlay'
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
        {/* 1. ORIGINAL PAGE RENDERED AT FULL RESOLUTION */}
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
              onUpdateRenderedDims({ width: img.clientWidth, height: img.clientHeight });
            }
          }}
        />

        {/* 2. INTERACTIVE TEXT LAYER (Every detected line is an editable object) */}
        <PdfTextLayer
          lines={lines}
          scaleX={scaleX}
          scaleY={scaleY}
          selectedLineId={selectedLineId}
          editingLineId={editingLineId}
          activeTool={activeTool}
          onSelectLine={onSelectLine}
          onStartEditLine={onStartEditLine}
          onCommitEditLine={onCommitEditLine}
          onCancelEditLine={onCancelEditLine}
          onDeleteLine={onDeleteLine}
          onStartMoveLine={onStartMoveLine}
          onStartResizeLine={onStartResizeLine}
          onOpenDirectCorrection={onOpenDirectCorrection}
        />

        {/* 3. USER OVERLAYS LAYER (Added text, manual cover whiteouts, and drag preview) */}
        <PdfOverlayLayer
          objects={overlays}
          scaleX={scaleX}
          scaleY={scaleY}
          selectedObjectId={selectedOverlayId}
          editingObjectId={editingOverlayId}
          dragCoverPreview={
            dragAction?.type === 'create_cover'
              ? {
                  startPdfX: dragAction.startPdfX,
                  startPdfY: dragAction.startPdfY,
                  currentPdfX: dragAction.currentPdfX,
                  currentPdfY: dragAction.currentPdfY,
                }
              : null
          }
          onSelectObject={onSelectOverlay}
          onStartMoveObject={onStartMoveOverlay}
          onStartResizeObject={onStartResizeOverlay}
          onDoubleClickObject={onDoubleClickOverlay}
          editingTextVal={editingOverlayVal}
          onChangeEditingTextVal={onChangeEditingOverlayVal}
          onFinishInlineEdit={onFinishInlineEditOverlay}
        />
      </div>
    </div>
  );
};
