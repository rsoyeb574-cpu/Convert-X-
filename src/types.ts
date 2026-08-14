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
  | 'pricing'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'dashboard'
  | 'affiliates'
  | 'seo';

export interface AppLimits {
  maxFileSizeMB: number;
  maxFileSizeBytes: number;
  dailyConversions: number;
  maxPdfPages: number;
}

export interface UsageData {
  dailyConversions: number;
  dailyLimit: number;
  maxFileSizeMB: number;
  plan: 'free' | 'pro';
}

export interface PricingPlan {
  id: 'free' | 'pro';
  name: string;
  amount: number;
  currency: string;
  formattedPrice: string;
  period: string;
  maxFileSizeMB: number | string;
  dailyConversions: number | string;
  maxPdfPages: number | string;
}

export interface MonetizationConfig {
  paymentConfigured: boolean;
  paymentMessage: string;
  adsenseConfigured: boolean;
  adsenseClientId?: string;
  contactEmail?: string;
  pricing: {
    free: PricingPlan;
    pro: PricingPlan;
  };
}

export interface AffiliateTool {
  id: string;
  name: string;
  category: 'Graphic Design' | 'CAD & 3D' | 'Cloud Storage' | 'Productivity';
  description: string;
  features: string[];
  url: string;
  badge?: string;
  isAffiliate: boolean;
  discountText?: string;
}

export interface ReferralData {
  code: string;
  shareUrl: string;
  totalReferrals: number;
  rewardTier: string;
  isLive: boolean;
}

export interface DailyUsage {
  date: string;
  count: number;
}

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
