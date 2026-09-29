/**
 * PdfOverlayLayer.tsx
 * Renders user-drawn cover whiteout rectangles, added text boxes, and drag previews.
 */

import React from 'react';
import { PdfVisualOverlayObject } from '../../types.js';

interface PdfOverlayLayerProps {
  objects: PdfVisualOverlayObject[];
  scaleX: number;
  scaleY: number;
  selectedObjectId: string | null;
  editingObjectId: string | null;
  dragCoverPreview: {
    startPdfX: number;
    startPdfY: number;
    currentPdfX: number;
    currentPdfY: number;
  } | null;
  onSelectObject: (id: string) => void;
  onStartMoveObject: (e: React.MouseEvent, obj: PdfVisualOverlayObject) => void;
  onStartResizeObject: (e: React.MouseEvent, obj: PdfVisualOverlayObject, handle: string) => void;
  onDoubleClickObject: (obj: PdfVisualOverlayObject) => void;
  editingTextVal: string;
  onChangeEditingTextVal: (val: string) => void;
  onFinishInlineEdit: () => void;
}

export const PdfOverlayLayer: React.FC<PdfOverlayLayerProps> = ({
  objects,
  scaleX,
  scaleY,
  selectedObjectId,
  editingObjectId,
  dragCoverPreview,
  onSelectObject,
  onStartMoveObject,
  onStartResizeObject,
  onDoubleClickObject,
  editingTextVal,
  onChangeEditingTextVal,
  onFinishInlineEdit,
}) => {
  return (
    <div className="pdf-overlay-layer absolute inset-0 pointer-events-none">
      {/* 1. Render all custom overlays (covers & added texts) */}
      {objects.map((obj) => {
        const isSelected = obj.id === selectedObjectId;
        const isEditing = obj.id === editingObjectId;

        return (
          <div
            key={obj.id}
            className={`overlay-item absolute pointer-events-auto transition-shadow ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-30 shadow-md' : 'z-20'
            }`}
            style={{
              left: `${obj.x * scaleX}px`,
              top: `${obj.y * scaleY}px`,
              width: `${Math.max(12, obj.width * scaleX)}px`,
              height: `${Math.max(12, obj.height * scaleY)}px`,
              backgroundColor:
                obj.type === 'cover' || obj.type === 'correction'
                  ? obj.backgroundColor || '#ffffff'
                  : 'transparent',
              opacity: typeof obj.opacity === 'number' ? obj.opacity : 1.0,
              cursor: isSelected ? 'grab' : 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(obj.id);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelectObject(obj.id);
              onStartMoveObject(e, obj);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClickObject(obj);
            }}
          >
            {/* Content Rendering */}
            {obj.type === 'cover' ? (
              <div className="w-full h-full border border-dashed border-slate-400/40" />
            ) : isEditing ? (
              <textarea
                autoFocus
                value={editingTextVal}
                onChange={(e) => onChangeEditingTextVal(e.target.value)}
                onBlur={onFinishInlineEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onFinishInlineEdit();
                  }
                }}
                className="w-full h-full p-0 m-0 border-0 outline-none resize-none bg-white/90 text-slate-900 rounded ring-1 ring-blue-500"
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
                <div
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-600 border border-white rounded-full cursor-se-resize z-40 pointer-events-auto"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onStartResizeObject(e, obj, 'se');
                  }}
                />
                <div
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-blue-600 border border-white rounded-xs cursor-e-resize z-40 pointer-events-auto"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onStartResizeObject(e, obj, 'e');
                  }}
                />
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 border border-white rounded-xs cursor-s-resize z-40 pointer-events-auto"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onStartResizeObject(e, obj, 's');
                  }}
                />
              </>
            )}
          </div>
        );
      })}

      {/* 2. Drag Cover Box Preview Rectangle */}
      {dragCoverPreview && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-40"
          style={{
            left: `${Math.min(dragCoverPreview.startPdfX, dragCoverPreview.currentPdfX) * scaleX}px`,
            top: `${Math.min(dragCoverPreview.startPdfY, dragCoverPreview.currentPdfY) * scaleY}px`,
            width: `${Math.abs(dragCoverPreview.currentPdfX - dragCoverPreview.startPdfX) * scaleX}px`,
            height: `${Math.abs(dragCoverPreview.currentPdfY - dragCoverPreview.startPdfY) * scaleY}px`,
          }}
        />
      )}
    </div>
  );
};
