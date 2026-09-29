/**
 * pdfEditorExport.ts
 * Verification, PDF generation client helper, and page image export.
 */

import { PdfTextLine, PdfVisualOverlayObject, PdfToTextPage } from '../../types.js';

/**
 * Converts modified or deleted PdfTextLine items into PdfVisualOverlayObject records.
 * Modified lines produce a cover rectangle + a replacement text overlay.
 * Deleted lines produce a cover rectangle.
 */
export function convertTextLinesToOverlayObjects(
  lines: PdfTextLine[],
  pageNumber: number
): PdfVisualOverlayObject[] {
  const result: PdfVisualOverlayObject[] = [];

  for (const line of lines) {
    if (line.isDeleted) {
      // Cover patch to whiteout/erase the line
      result.push({
        id: `cover_del_${line.id}`,
        pageNumber,
        type: 'cover',
        x: Math.max(0, line.x - 2),
        y: Math.max(0, line.y - 1),
        width: Math.round(line.width + 4),
        height: Math.round(line.height + 2),
        backgroundColor: line.coverColor || '#ffffff',
        opacity: 1.0,
      });
    } else if (line.isModified) {
      // 1. Cover patch over original text
      result.push({
        id: `cover_mod_${line.id}`,
        pageNumber,
        type: 'cover',
        x: Math.max(0, line.x - 2),
        y: Math.max(0, line.y - 1),
        width: Math.round(line.width + 4),
        height: Math.round(line.height + 2),
        backgroundColor: line.coverColor || '#ffffff',
        opacity: 1.0,
      });

      // 2. Replacement text overlay
      if (line.currentText && line.currentText.trim().length > 0) {
        result.push({
          id: `text_mod_${line.id}`,
          pageNumber,
          type: 'text',
          x: Math.round(line.x),
          y: Math.round(line.y),
          width: Math.round(line.width),
          height: Math.round(line.height),
          text: line.currentText,
          originalText: line.originalText,
          fontSize: line.fontSize || 12,
          fontFamily: (line.fontFamily as any) || 'sans',
          fontWeight: line.fontWeight || 'normal',
          fontStyle: line.fontStyle || 'normal',
          textAlign: line.textAlign || 'left',
          color: line.color || '#000000',
        });
      }
    }
  }

  return result;
}

/**
 * Composites page image with all visual cover boxes and text overlays, and downloads as PNG or JPG.
 */
export async function downloadPageCompositeImage(
  page: PdfToTextPage,
  jobId: string,
  allObjects: PdfVisualOverlayObject[],
  format: 'png' | 'jpg' = 'png'
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const offscreen = document.createElement('canvas');
        const targetWidth = img.naturalWidth || 1200;
        const targetHeight = img.naturalHeight || 1700;
        offscreen.width = targetWidth;
        offscreen.height = targetHeight;

        const ctx = offscreen.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2d context for canvas'));
          return;
        }

        // Draw original page background image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const scaleX = targetWidth / (page.width || 595.28);
        const scaleY = targetHeight / (page.height || 841.89);

        // 1. Draw Cover Rectangles
        for (const obj of allObjects) {
          if (obj.type === 'cover' || obj.type === 'correction') {
            ctx.fillStyle = obj.backgroundColor || '#ffffff';
            ctx.globalAlpha = typeof obj.opacity === 'number' ? obj.opacity : 1.0;
            ctx.fillRect(
              obj.x * scaleX,
              obj.y * scaleY,
              obj.width * scaleX,
              obj.height * scaleY
            );
            ctx.globalAlpha = 1.0;
          }
        }

        // 2. Draw Text Overlays
        for (const obj of allObjects) {
          if ((obj.type === 'text' || obj.type === 'correction') && obj.text && obj.text.trim()) {
            const fontSizePx = (obj.fontSize || 12) * scaleX;
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
                ? (obj.x + obj.width / 2) * scaleX
                : obj.textAlign === 'right'
                ? (obj.x + obj.width) * scaleX
                : obj.x * scaleX;

            ctx.fillText(obj.text, drawX, obj.y * scaleY);
          }
        }

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        offscreen.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }
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
            resolve(true);
          },
          mimeType,
          0.95
        );
      };

      img.onerror = (err) => {
        reject(err);
      };

      img.src =
        page.pageImageUrl ||
        page.thumbnailUrl ||
        `/api/pdf-to-text/page-image/${jobId}/${page.pageNumber}`;
    } catch (err) {
      reject(err);
    }
  });
}
