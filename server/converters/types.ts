export interface ConversionOptions {
  quality?: number; // 1 - 100
  resolution?: number; // scale or max dimension
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  dpi?: number; // 72, 150, 300, 600
  backgroundColor?: string; // hex string e.g. '#ffffff' or 'transparent'
  pageSize?: 'a4' | 'a3' | 'a2' | 'a1' | 'a0' | 'letter' | 'legal' | 'auto';
  orientation?: 'portrait' | 'landscape';
  fitToPage?: boolean;
  margin?: number;
  transparentBackground?: boolean;
  pageNumber?: number; // for PDF page extraction
}

export interface ConvertParams {
  inputBuffer: Buffer;
  inputFormat: string;
  outputFormat: string;
  fileName: string;
  options: ConversionOptions;
}

export interface ConvertResult {
  buffer: Buffer;
  mimeType: string;
  outputExtension: string;
  width?: number;
  height?: number;
  pageCount?: number;
  pdfPageSize?: string;
  pngResolution?: string;
  dpi?: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  detectedFormat?: string;
  mimeType?: string;
}

export interface ConverterEngine {
  id: string;
  name: string;
  description: string;
  supportedInputFormats: string[];
  supportedOutputFormats: string[];
  supports?(inputFormat: string, outputFormat: string): boolean;
  validate(fileBuffer: Buffer, inputFormat: string): Promise<ValidationResult>;
  convert(params: ConvertParams): Promise<ConvertResult>;
}

export type FormatCategory = 'images' | 'pdf' | 'documents' | 'vector' | 'cad' | 'adobe' | 'corel' | '3d';
export type FormatStatus = 'supported' | 'coming_soon' | 'engine_unavailable';

export interface FormatCapability {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  category: FormatCategory;
  status: FormatStatus;
  supportedOutputs: string[];
  requiresEngine?: string;
  description: string;
}

export interface UniversalExportCapability {
  inputFormat: string;
  name: string;
  category: string;
  canRender: boolean;
  outputFormats: string[];
  renderer: string;
  multiPageSupport: boolean;
  status: 'supported' | 'coming_soon';
  requiresEngine?: string;
  description: string;
}

export interface ConversionJob {
  id: string;
  originalName: string;
  inputFormat: string;
  outputFormat: string;
  fileSize: number;
  status: 'uploading' | 'processing' | 'converting' | 'finalizing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  error?: string;
  createdAt: string;
  completedAt?: string;
  inputPath?: string;
  outputPath?: string;
  outputMimeType?: string;
  outputSize?: number;
  options: ConversionOptions;
}
