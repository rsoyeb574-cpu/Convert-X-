/**
 * pdfCoordinateUtils.ts
 * High-precision coordinate conversion and viewport math for the Visual PDF Editor.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts PDF points (origin top-left) to rendered screen pixels.
 */
export function pdfToScreen(pt: Point, scaleX: number, scaleY: number): Point {
  return {
    x: Math.round(pt.x * scaleX),
    y: Math.round(pt.y * scaleY),
  };
}

/**
 * Converts screen client coordinates (e.g. from mouse event) into PDF points.
 */
export function screenToPdf(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  scaleX: number,
  scaleY: number,
  pageWidth: number,
  pageHeight: number
): Point {
  const relX = clientX - containerRect.left;
  const relY = clientY - containerRect.top;

  const pdfX = clamp(Math.round(relX / scaleX), 0, pageWidth);
  const pdfY = clamp(Math.round(relY / scaleY), 0, pageHeight);

  return { x: pdfX, y: pdfY };
}

/**
 * Converts a PDF rectangle to CSS style properties in screen pixels.
 */
export function pdfRectToStyle(
  rect: Rect,
  scaleX: number,
  scaleY: number
): { left: string; top: string; width: string; height: string } {
  return {
    left: `${Math.round(rect.x * scaleX)}px`,
    top: `${Math.round(rect.y * scaleY)}px`,
    width: `${Math.max(1, Math.round(rect.width * scaleX))}px`,
    height: `${Math.max(1, Math.round(rect.height * scaleY))}px`,
  };
}

/**
 * Checks if a PDF point is inside a PDF rectangle.
 */
export function isPointInRect(pt: Point, rect: Rect, tolerance = 0): boolean {
  return (
    pt.x >= rect.x - tolerance &&
    pt.x <= rect.x + rect.width + tolerance &&
    pt.y >= rect.y - tolerance &&
    pt.y <= rect.y + rect.height + tolerance
  );
}

/**
 * Calculates optimal scale percentage to fit PDF page cleanly within the editor viewport.
 */
export function calculateFitPageZoom(
  viewportWidth: number,
  viewportHeight: number,
  pageWidth: number,
  pageHeight: number,
  padding = 40
): number {
  const availW = Math.max(200, viewportWidth - padding);
  const availH = Math.max(300, viewportHeight - padding);

  const scaleW = availW / pageWidth;
  const scaleH = availH / pageHeight;

  const bestScale = Math.min(scaleW, scaleH);
  return clamp(Math.round(bestScale * 100), 40, 250);
}
