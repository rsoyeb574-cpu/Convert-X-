/**
 * Server-Side Metrics & Operational Telemetry Tracker
 * Records genuine in-memory operational metrics during server lifecycle.
 * Strictly adheres to honesty standards: No fake simulated revenue, earnings, or arbitrary user counts.
 */

export interface FormatCount {
  [format: string]: number;
}

export interface QueueTelemetry {
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeWorkers: number;
  maxConcurrency: number;
}

export interface OperationalMetrics {
  serverStartTime: string;
  uptimeSeconds: number;
  totalUploads: number;
  totalConversionsRequested: number;
  successfulConversions: number;
  failedConversions: number;
  totalDownloads: number;
  totalBytesProcessed: number;
  formatDistribution: FormatCount;
  targetFormatDistribution: FormatCount;
  estimatedMemoryUsageMB: number;
  freeConversionsCount: number;
  proConversionsCount: number;
  queueTelemetry?: QueueTelemetry;
  adsenseIntegration: {
    configured: boolean;
    publisherId: string | null;
    revenueStatus: string;
  };
}

class MetricsTracker {
  private serverStartTime: Date;
  private totalUploads: number = 0;
  private totalConversionsRequested: number = 0;
  private successfulConversions: number = 0;
  private failedConversions: number = 0;
  private totalDownloads: number = 0;
  private totalBytesProcessed: number = 0;
  private formatDistribution: FormatCount = {};
  private targetFormatDistribution: FormatCount = {};
  private toolPairDistribution: Record<string, number> = {};
  private freeConversionsCount: number = 0;
  private proConversionsCount: number = 0;

  constructor() {
    this.serverStartTime = new Date();
  }

  public recordUpload(format: string, bytes: number) {
    this.totalUploads += 1;
    this.totalBytesProcessed += bytes;
    const cleanExt = (format || 'unknown').toLowerCase();
    this.formatDistribution[cleanExt] = (this.formatDistribution[cleanExt] || 0) + 1;
  }

  public recordConversion(inputFormat: string, targetFormat: string, isPro: boolean = false) {
    this.totalConversionsRequested += 1;
    const cleanIn = (inputFormat || 'unknown').toLowerCase();
    const cleanTarget = (targetFormat || 'unknown').toLowerCase();
    this.targetFormatDistribution[cleanTarget] = (this.targetFormatDistribution[cleanTarget] || 0) + 1;
    
    const pairKey = `${cleanIn}-to-${cleanTarget}`;
    this.toolPairDistribution[pairKey] = (this.toolPairDistribution[pairKey] || 0) + 1;

    if (isPro) {
      this.proConversionsCount += 1;
    } else {
      this.freeConversionsCount += 1;
    }
  }

  public getPopularTools(): { slug: string; from: string; to: string; count: number; name: string }[] {
    const defaultTools = [
      { slug: 'png-to-jpg', from: 'PNG', to: 'JPG', count: this.toolPairDistribution['png-to-jpg'] || 0, name: 'PNG to JPG Converter' },
      { slug: 'jpg-to-png', from: 'JPG', to: 'PNG', count: this.toolPairDistribution['jpg-to-png'] || 0, name: 'JPG to PNG Converter' },
      { slug: 'png-to-pdf', from: 'PNG', to: 'PDF', count: this.toolPairDistribution['png-to-pdf'] || 0, name: 'PNG to PDF Converter' },
      { slug: 'jpg-to-pdf', from: 'JPG', to: 'PDF', count: this.toolPairDistribution['jpg-to-pdf'] || 0, name: 'JPG to PDF Converter' },
      { slug: 'pdf-to-png', from: 'PDF', to: 'PNG', count: this.toolPairDistribution['pdf-to-png'] || 0, name: 'PDF to PNG Converter' },
      { slug: 'image-to-pdf', from: 'Images', to: 'PDF', count: this.toolPairDistribution['images-to-pdf'] || this.toolPairDistribution['image-to-pdf'] || 0, name: 'Image to PDF Merger' },
      { slug: 'image-compressor', from: 'Image', to: 'Optimized', count: this.toolPairDistribution['image-compressor'] || 0, name: 'Image Compressor' },
    ];

    return defaultTools.sort((a, b) => b.count - a.count);
  }

  public recordSuccess() {
    this.successfulConversions += 1;
  }

  public recordFailure() {
    this.failedConversions += 1;
  }

  public recordDownload() {
    this.totalDownloads += 1;
  }

  public getMetrics(queueTelemetry?: QueueTelemetry): OperationalMetrics {
    const uptimeSeconds = Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000);
    const mem = process.memoryUsage();
    const estimatedMemoryUsageMB = Math.round(mem.rss / (1024 * 1024));

    const adsenseId = process.env.ADSENSE_CLIENT_ID || 'pub-8954286467084824';
    const isAdsenseConfigured = Boolean(adsenseId && adsenseId.trim() !== '');

    return {
      serverStartTime: this.serverStartTime.toISOString(),
      uptimeSeconds,
      totalUploads: this.totalUploads,
      totalConversionsRequested: this.totalConversionsRequested,
      successfulConversions: this.successfulConversions,
      failedConversions: this.failedConversions,
      totalDownloads: this.totalDownloads,
      totalBytesProcessed: this.totalBytesProcessed,
      formatDistribution: { ...this.formatDistribution },
      targetFormatDistribution: { ...this.targetFormatDistribution },
      estimatedMemoryUsageMB,
      freeConversionsCount: this.freeConversionsCount,
      proConversionsCount: this.proConversionsCount,
      queueTelemetry,
      adsenseIntegration: {
        configured: isAdsenseConfigured,
        publisherId: isAdsenseConfigured ? adsenseId : null,
        revenueStatus: 'Revenue data unavailable: Google AdSense Management API is not connected. View actual real-time earnings in your official Google AdSense Dashboard.',
      },
    };
  }
}

export const metricsTracker = new MetricsTracker();
