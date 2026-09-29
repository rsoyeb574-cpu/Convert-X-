/**
 * PdfTextLayer.tsx
 * Renders the full interactive text layer for the visual PDF canvas.
 * Every detected text line is rendered at its exact coordinates and is independently editable.
 */

import React from 'react';
import { PdfTextLine } from '../../types.js';
import { PdfTextObject } from './PdfTextObject.js';

interface PdfTextLayerProps {
  lines: PdfTextLine[];
  scaleX: number;
  scaleY: number;
  selectedLineId: string | null;
  editingLineId: string | null;
  activeTool: 'select' | 'text' | 'edit' | 'cover';
  onSelectLine: (id: string) => void;
  onStartEditLine: (id: string) => void;
  onCommitEditLine: (id: string, newText: string) => void;
  onCancelEditLine: () => void;
  onDeleteLine: (id: string) => void;
  onStartMoveLine: (e: React.MouseEvent, line: PdfTextLine) => void;
  onStartResizeLine: (e: React.MouseEvent, line: PdfTextLine, handle: string) => void;
  onOpenDirectCorrection: (line: PdfTextLine) => void;
}

export const PdfTextLayer: React.FC<PdfTextLayerProps> = ({
  lines,
  scaleX,
  scaleY,
  selectedLineId,
  editingLineId,
  activeTool,
  onSelectLine,
  onStartEditLine,
  onCommitEditLine,
  onCancelEditLine,
  onDeleteLine,
  onStartMoveLine,
  onStartResizeLine,
  onOpenDirectCorrection,
}) => {
  return (
    <div className="pdf-text-layer absolute inset-0 pointer-events-auto">
      {lines.map((line) => (
        <PdfTextObject
          key={line.id}
          line={line}
          scaleX={scaleX}
          scaleY={scaleY}
          isSelected={selectedLineId === line.id}
          isEditing={editingLineId === line.id}
          isSelectToolActive={activeTool === 'select' || activeTool === 'edit'}
          onSelect={() => onSelectLine(line.id)}
          onStartEdit={() => onStartEditLine(line.id)}
          onCommitEdit={(newText) => onCommitEditLine(line.id, newText)}
          onCancelEdit={onCancelEditLine}
          onDeleteLine={() => onDeleteLine(line.id)}
          onStartMove={(e) => onStartMoveLine(e, line)}
          onStartResize={(e, handle) => onStartResizeLine(e, line, handle)}
          onOpenDirectCorrection={() => onOpenDirectCorrection(line)}
        />
      ))}
    </div>
  );
};
