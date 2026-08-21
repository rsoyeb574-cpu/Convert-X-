// Compatibility re-export for the Text → PDF converter.
// The production implementation lives in textToPdfConverter.ts and uses pdf-lib.
export { generateTextToPdf } from './textToPdfConverter.js';
export type { TextToPdfOptions } from './textToPdfConverter.js';
