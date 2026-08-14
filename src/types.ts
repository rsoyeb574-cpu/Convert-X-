export type FormatCategory = 'images' | 'pdf' | 'vector' | 'cad' | 'adobe' | 'corel' | '3d';
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

export interface ConversionOptions {
  quality?: number; // 1 - 100
  resolution?: number; // percentage e.g. 50, 100, 200
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  dpi?: number; // 72, 150, 300
  backgroundColor?: string; // hex or 'transparent'
  pageSize?: 'a4' | 'a3' | 'a2' | 'a1' | 'a0' | 'letter' | 'legal' | 'auto';
  orientation?: 'portrait' | 'landscape';
  fitToPage?: boolean;
  margin?: number;
  transparentBackground?: boolean;
  pageNumber?: number;
}

export interface UploadedFile {
  jobId: string;
  fileName: string;
  detectedFormat: string;
  mimeType: string;
  fileSize: number;
  category: FormatCategory;
  status: FormatStatus;
  requiresEngine?: string;
  supportedOutputs: string[];
}

export interface ConversionResultData {
  jobId: string;
  originalName: string;
  inputFormat: string;
  outputFormat: string;
  originalSize: number;
  outputSize: number;
  completedAt: string;
}

export interface ConversionQueueItem {
  id: string;
  fileName: string;
  inputFormat: string;
  outputFormat: string;
  fileSize: number;
  uploadedFile?: UploadedFile;
  status: 'pending' | 'uploading' | 'converting' | 'completed' | 'failed';
  progress: number;
  statusText?: string;
  error?: string | null;
  result?: ConversionResultData | null;
  options: ConversionOptions;
  createdAt: string;
}

export type ConversionStepStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'converting'
  | 'finalizing'
  | 'completed'
  | 'failed';

export interface ConversionHistoryItem {
  id: string;
  fileName: string;
  inputFormat: string;
  outputFormat: string;
  originalSize: number;
  outputSize?: number;
  date: string;
  status: 'completed' | 'failed';
  jobId: string;
}

export type PageView =
  | 'home'
  | 'converter'
  | 'formats'
  | 'how-it-works'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'dashboard'
  | 'seo';

export interface SeoRouteConfig {
  slug: string;
  title: string;
  description: string;
  fromFormat: string;
  toFormat: string;
  category: FormatCategory;
  content: {
    heroHeading: string;
    heroSubtitle: string;
    benefits: string[];
    steps: string[];
    faq: { question: string; answer: string }[];
  };
}
