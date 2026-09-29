/**
 * PdfTextObject.tsx
 * Renders an individual detected text line on the PDF canvas.
 * Supports inline editing, selection box, cover preview, font styling, and drag/resize.
 */

import React, { useState, useRef, useEffect } from 'react';
import { PdfTextLine } from '../../types.js';

interface PdfTextObjectProps {
  line: PdfTextLine;
  scaleX: number;
  scaleY: number;
  isSelected: boolean;
  isEditing: boolean;
  isSelectToolActive: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onStartEdit: () => void;
  onCommitEdit: (newText: string) => void;
  onCancelEdit: () => void;
  onDeleteLine: () => void;
  onStartMove: (e: React.MouseEvent) => void;
  onStartResize: (e: React.MouseEvent, handle: string) => void;
  onOpenDirectCorrection: () => void;
}

export const PdfTextObject: React.FC<PdfTextObjectProps> = ({
  line,
  scaleX,
  scaleY,
  isSelected,
  isEditing,
  isSelectToolActive,
  onSelect,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDeleteLine,
  onStartMove,
  onStartResize,
  onOpenDirectCorrection,
}) => {
  const [inputText, setInputText] = useState(line.currentText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputText(line.currentText);
  }, [line.currentText]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (line.isDeleted) {
    // If marked as deleted/covered, show the whiteout/cover patch
    return (
      <div
        className="absolute z-10 transition-opacity"
        style={{
          left: `${(line.x - 2) * scaleX}px`,
          top: `${(line.y - 1) * scaleY}px`,
          width: `${(line.width + 4) * scaleX}px`,
          height: `${(line.height + 2) * scaleY}px`,
          backgroundColor: line.coverColor || '#ffffff',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e);
        }}
        title={`Erased Line: "${line.originalText}" (Click to select or restore)`}
      >
        {isSelected && (
          <div className="w-full h-full border border-dashed border-red-500/70 bg-red-500/10 flex items-center justify-center">
            <span className="text-[9px] font-bold text-red-600 bg-white/90 px-1 rounded shadow-2xs">
              Deleted / Covered
            </span>
          </div>
        )}
      </div>
    );
  }

  const screenLeft = line.x * scaleX;
  const screenTop = line.y * scaleY;
  const screenWidth = Math.max(16, line.width * scaleX);
  const screenHeight = Math.max(14, line.height * scaleY);
  const scaledFontSize = Math.max(9, (line.fontSize || 12) * scaleX);

  const fontFamilyCss =
    line.fontFamily === 'serif'
      ? 'Times New Roman, serif'
      : line.fontFamily === 'mono'
      ? 'Courier New, monospace'
      : 'Inter, system-ui, sans-serif';

  return (
    <div
      className={`pdf-text-line absolute transition-shadow select-none group z-10 ${
        isSelected
          ? 'ring-2 ring-blue-600 ring-offset-1 z-30 shadow-md'
          : isSelectToolActive
          ? 'hover:ring-1 hover:ring-blue-400/80 hover:bg-blue-50/20'
          : ''
      }`}
      style={{
        left: `${screenLeft}px`,
        top: `${screenTop}px`,
        width: `${screenWidth}px`,
        minHeight: `${screenHeight}px`,
        cursor: isEditing ? 'text' : isSelected ? 'move' : 'pointer',
        // If line is modified or OCR, provide a clean background patch behind new text
        backgroundColor: line.isModified ? line.coverColor || '#ffffff' : 'transparent',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      onMouseDown={(e) => {
        if (!isEditing && isSelected) {
          onStartMove(e);
        }
      }}
      title={
        isEditing
          ? 'Press Enter or click away to save changes'
          : `Click to select, Double-click to edit: "${line.currentText}"`
      }
    >
      {/* 1. INLINE EDITING INPUT */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={() => onCommitEdit(inputText)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitEdit(inputText);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setInputText(line.currentText);
              onCancelEdit();
            }
          }}
          className="w-full h-full p-0 m-0 border-0 outline-none bg-white text-blue-950 ring-2 ring-blue-500 rounded-xs shadow-inner"
          style={{
            fontSize: `${scaledFontSize}px`,
            fontWeight: line.fontWeight || 'normal',
            fontStyle: line.fontStyle || 'normal',
            textAlign: line.textAlign || 'left',
            fontFamily: fontFamilyCss,
            color: line.color || '#000000',
          }}
        />
      ) : (
        /* 2. RENDERED TEXT DISPLAY */
        <div
          className="w-full h-full flex items-center overflow-hidden whitespace-nowrap px-0.5"
          style={{
            fontSize: `${scaledFontSize}px`,
            fontWeight: line.fontWeight || 'normal',
            fontStyle: line.fontStyle || 'normal',
            textAlign: line.textAlign || 'left',
            fontFamily: fontFamilyCss,
            color: line.isModified ? line.color || '#000000' : 'transparent',
            // If modified, we make the text clearly visible in its new color!
            // If unmodified, the text remains transparent so the crisp original PDF underlying text is seen,
            // while the interactive bounding box stays clickable/selectable.
          }}
        >
          {line.isModified ? line.currentText : line.currentText}
        </div>
      )}

      {/* 3. MODIFIED INDICATOR BADGE */}
      {line.isModified && !isEditing && (
        <span className="absolute -top-4 right-0 text-[8px] font-bold bg-amber-500 text-white px-1 rounded shadow-2xs pointer-events-none">
          Edited
        </span>
      )}

      {/* 4. HOVER TOOLTIP & QUICK ACTION */}
      {!isSelected && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 absolute -top-5 left-0 bg-slate-900/90 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap z-40 transition-opacity">
          Click to edit: &ldquo;{line.currentText.slice(0, 24)}...&rdquo;
        </div>
      )}

      {/* 5. SELECTION CONTROLS & RESIZE HANDLES */}
      {isSelected && !isEditing && (
        <>
          {/* Quick Line Action Popover Bar */}
          <div
            className="absolute -top-8 left-0 flex items-center gap-1 bg-slate-900 text-white px-1.5 py-1 rounded-md shadow-lg z-50 text-[10px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onStartEdit}
              className="px-1.5 py-0.5 rounded hover:bg-blue-600 transition font-medium"
              title="Edit text inline"
            >
              Edit
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={onOpenDirectCorrection}
              className="px-1.5 py-0.5 rounded hover:bg-purple-600 transition font-medium text-purple-300"
              title="Direct correction with background match"
            >
              Replace
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={onDeleteLine}
              className="px-1.5 py-0.5 rounded hover:bg-red-600 transition text-red-300"
              title="Whiteout / erase this line"
            >
              Erase
            </button>
          </div>

          {/* Bottom-Right Resize Handle */}
          <div
            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-600 border border-white rounded-full cursor-se-resize z-40"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartResize(e, 'se');
            }}
          />
          {/* Right Handle */}
          <div
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-blue-600 border border-white rounded-xs cursor-e-resize z-40"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartResize(e, 'e');
            }}
          />
        </>
      )}
    </div>
  );
};
