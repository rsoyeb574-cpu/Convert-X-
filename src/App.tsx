import React, { useState, useEffect, useRef } from 'react';
import {
  PageView,
  UploadedFile,
  ConversionOptions,
  ConversionResultData,
  ConversionHistoryItem,
  ConversionQueueItem,
  FormatCapability,
  AppLimits,
  MonetizationConfig,
  UserProfile,
  UserPreferences,
  ToastNotification,
} from './types.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Hero } from './components/Hero.js';
import { FileCard } from './components/FileCard.js';
import { FormatSelector } from './components/FormatSelector.js';
import { ConversionSettings } from './components/ConversionSettings.js';
import { ProgressBar } from './components/ProgressBar.js';
import { ConversionResult } from './components/ConversionResult.js';
import { FormatGrid } from './components/FormatGrid.js';
import { HowItWorks } from './components/HowItWorks.js';
import { FaqSection } from './components/FaqSection.js';
import { PrivacyTermsContact } from './components/PrivacyTermsContact.js';
import { DashboardHistory } from './components/DashboardHistory.js';
import { SeoLandingPage } from './components/SeoLandingPage.js';
import { SeoMetaManager } from './components/SeoMetaManager.js';
import { PricingPage } from './components/PricingPage.js';
import { ToolsDirectory } from './components/ToolsDirectory.js';
import { TextToPdfStudio } from './components/TextToPdfStudio.js';
import { AboutPage } from './components/AboutPage.js';
import { NotFoundPage } from './components/NotFoundPage.js';
import { UsageWidget } from './components/UsageWidget.js';
import { AdSlot } from './components/AdSlot.js';
import { AffiliateSection } from './components/AffiliateSection.js';
import { UniversalExportSection } from './components/UniversalExportSection.js';
import { AdminMetricsModal } from './components/AdminMetricsModal.js';
import { AccountModal } from './components/AccountModal.js';
import { ReferralPage } from './components/ReferralPage.js';
import { NotificationToastContainer } from './components/NotificationToast.js';
import { initAnalytics } from './utils/analytics.js';
import {
  fetchAppConfig,
  getDailyConversionCount,
  incrementDailyConversionCount,
  isDailyLimitReached,
  DEFAULT_LIMITS,
  DEFAULT_MONETIZATION,
} from './utils/usageTracker.js';
import {
  getStoredUserProfile,
  saveUserProfile,
  getStoredUserPreferences,
  saveUserPreferences,
  recordRecentTool,
} from './utils/userStore.js';
import { SEO_ROUTES } from './data/seoRoutes.js';
import { safeParseJson } from './utils/apiHelper.js';
import {
  ArrowRight,
  RefreshCw,
  Zap,
  ShieldCheck,
  Lock,
  Sparkles,
  Layers,
  AlertTriangle,
  X,
  ListOrdered,
  Keyboard,
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [seoSlug, setSeoSlug] = useState<string>('png-to-jpg');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // User Profile & Preferences State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => getStoredUserProfile());
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => getStoredUserPreferences());
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Hidden Global File Input Ref for Ctrl+O / Cmd+O trigger
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (title: string, message?: string, type: ToastNotification['type'] = 'info') => {
    const newToast: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      duration: 4000,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  // Monetization & Limits State
  const [limits, setLimits] = useState<AppLimits>(DEFAULT_LIMITS);
  const [monetization, setMonetization] = useState<MonetizationConfig>(DEFAULT_MONETIZATION);
  const [usedToday, setUsedToday] = useState<number>(() => getDailyConversionCount());
  const [showAdminMetrics, setShowAdminMetrics] = useState<boolean>(false);

  // File Upload and Single Workspace State
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<string>('png');
  const [options, setOptions] = useState<ConversionOptions>({
    quality: 90,
    dpi: 300,
    backgroundColor: '#ffffff',
    pageSize: 'a4',
    orientation: 'portrait',
  });

  // Multi-File Conversion Queue State with LocalStorage Persistence Recovery
  const [queue, setQueue] = useState<ConversionQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('convertx_queue') || sessionStorage.getItem('convertx_queue');
      if (saved) {
        const parsed: ConversionQueueItem[] = JSON.parse(saved);
        return parsed.map((item) => {
          if (item.status === 'uploading') {
            return { ...item, status: 'failed', error: 'Upload interrupted by page reload. Click Retry.' };
          }
          if (item.status === 'converting') {
            return { ...item, status: 'pending', progress: 0 };
          }
          return item;
        });
      }
      return [];
    } catch {
      return [];
    }
  });
  const [isConvertingAll, setIsConvertingAll] = useState<boolean>(false);
  const [isCombiningPdf, setIsCombiningPdf] = useState<boolean>(false);
  const [isReconverting, setIsReconverting] = useState<boolean>(false);

  // Save queue to LocalStorage (omitting non-serializable File objects)
  useEffect(() => {
    try {
      const serializable = queue.map(({ file, ...rest }) => rest);
      localStorage.setItem('convertx_queue', JSON.stringify(serializable));
    } catch (e) {
      console.error('Failed to save queue to localStorage', e);
    }
  }, [queue]);

  // Cross-reference restored queue items with server-side health checks on mount
  useEffect(() => {
    let isMounted = true;

    const verifyServerJobs = async () => {
      const saved = localStorage.getItem('convertx_queue');
      if (!saved) return;

      try {
        const items: ConversionQueueItem[] = JSON.parse(saved);
        const unverifiedItems = items.filter((item) => item.uploadedFile?.jobId);
        if (unverifiedItems.length === 0) return;

        // Perform health check on server for each job
        await Promise.all(
          unverifiedItems.map(async (item) => {
            const jobId = item.uploadedFile!.jobId;
            try {
              const res = await fetch(`/api/status/${jobId}`);
              if (!res.ok) {
                if (isMounted) {
                  setQueue((prev) =>
                    prev.map((q) =>
                      q.id === item.id && q.status !== 'completed'
                        ? {
                            ...q,
                            status: 'failed',
                            error: 'Temporary file session expired on server. Click Retry or re-upload.',
                          }
                        : q
                    )
                  );
                }
                return;
              }

              const data = await safeParseJson(res);
              if (data && data.success) {
                if (data.status === 'failed' && isMounted) {
                  setQueue((prev) =>
                    prev.map((q) =>
                      q.id === item.id
                        ? {
                            ...q,
                            status: 'failed',
                            error: data.error || 'Conversion session failed on server.',
                          }
                        : q
                    )
                  );
                } else if (data.status === 'completed' && isMounted) {
                  setQueue((prev) =>
                    prev.map((q) =>
                      q.id === item.id
                        ? {
                            ...q,
                            status: 'completed',
                            progress: 100,
                            result: {
                              jobId: data.jobId,
                              originalName: data.originalName,
                              inputFormat: data.inputFormat,
                              outputFormat: data.outputFormat,
                              originalSize: data.fileSize,
                              outputSize: data.outputSize || 0,
                              downloadUrl: `/api/download/${data.jobId}`,
                              completedAt: new Date().toISOString(),
                            },
                          }
                        : q
                    )
                  );
                }
              }
            } catch (err) {
              console.warn(`Could not verify server status for job ${jobId}:`, err);
            }
          })
        );
      } catch (err) {
        console.error('Error verifying restored conversion queue:', err);
      }
    };

    verifyServerJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'processing' | 'converting' | 'completed'>('idle');
  const [statusText, setStatusText] = useState<string>('');
  const [result, setResult] = useState<ConversionResultData | null>(null);

  // Conversion History State
  const [history, setHistory] = useState<ConversionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('convertx_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Available Capabilities Catalog
  const [capabilities, setCapabilities] = useState<FormatCapability[]>([]);

  // 1. Initial URL Path Parsing and PopState listener for real URL routing
  useEffect(() => {
    const parseUrl = () => {
      const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
      if (!pathname) {
        setCurrentView('home');
        return;
      }

      if (SEO_ROUTES[pathname]) {
        setCurrentView('seo');
        setSeoSlug(pathname);
      } else if (
        [
          'converter',
          'text-to-pdf',
          'formats',
          'tools',
          'about',
          'how-it-works',
          'faq',
          'privacy',
          'terms',
          'contact',
          'dashboard',
          'pricing',
          'affiliates',
        ].includes(pathname)
      ) {
        setCurrentView(pathname as PageView);
      } else if (pathname.startsWith('seo-')) {
        const clean = pathname.replace(/^seo-/, '');
        if (SEO_ROUTES[clean]) {
          setCurrentView('seo');
          setSeoSlug(clean);
        } else {
          setCurrentView('404');
        }
      } else {
        setCurrentView('404');
      }
    };

    parseUrl();
    initAnalytics();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  // Fetch App Limits and Monetization Config on Mount + Listen to usage updates
  useEffect(() => {
    fetchAppConfig()
      .then((cfg) => {
        if (cfg.limits) setLimits(cfg.limits);
        if (cfg.monetization) setMonetization(cfg.monetization);
      })
      .catch((err) => console.error('Failed to load monetization config:', err));

    const handleUsageUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === 'number') {
        setUsedToday(customEvent.detail.count);
      } else {
        setUsedToday(getDailyConversionCount());
      }
    };

    window.addEventListener('convertx_usage_updated', handleUsageUpdated);
    return () => window.removeEventListener('convertx_usage_updated', handleUsageUpdated);
  }, []);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Save history to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('convertx_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }, [history]);

  // Fetch capabilities on mount
  useEffect(() => {
    fetch('/api/formats')
      .then((res) => res.json())
      .then((data) => {
        const caps = data.capabilities || (Array.isArray(data) ? data : []);
        setCapabilities(caps);
      })
      .catch((err) => console.error('Error loading format catalog:', err));
  }, []);

  // Helper to safely format catch/network exceptions without generic raw 'Failed to fetch'
  const formatCatchError = (err: any, defaultFallback = 'Conversion failed'): string => {
    if (!err) return defaultFallback;
    const msg: string = typeof err === 'string' ? err : err.message || '';
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed') ||
      msg.includes('network error')
    ) {
      return 'Network connection issue: Unable to communicate with conversion server. Please check your connection and click Retry.';
    }
    return msg || defaultFallback;
  };

  // Helper to parse specific backend error messages and HTTP status codes
  const parseBackendError = async (
    response: Response,
    inputFormat?: string,
    outputFormat?: string
  ): Promise<string> => {
    let serverErrorMsg = '';

    try {
      const clone = response.clone();
      const contentType = clone.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          const errData = await clone.json();
          if (errData) {
            if (typeof errData.error === 'string' && errData.error.trim()) {
              serverErrorMsg = errData.error.trim();
            } else if (typeof errData.message === 'string' && errData.message.trim()) {
              serverErrorMsg = errData.message.trim();
            } else if (typeof errData.reason === 'string' && errData.reason.trim()) {
              serverErrorMsg = errData.reason.trim();
            } else if (typeof errData.details === 'string' && errData.details.trim()) {
              serverErrorMsg = errData.details.trim();
            } else if (errData.error && typeof errData.error === 'object' && errData.error.message) {
              serverErrorMsg = errData.error.message;
            }
          }
        } catch {
          // fall through to text parsing
        }
      }

      if (!serverErrorMsg) {
        try {
          const textData = await response.text();
          if (textData && textData.trim()) {
            try {
              const parsed = JSON.parse(textData);
              serverErrorMsg = parsed.error || parsed.message || parsed.reason || '';
            } catch {
              if (!textData.includes('<!DOCTYPE html>') && textData.length < 300) {
                serverErrorMsg = textData.trim();
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    if (!serverErrorMsg) {
      if (response.status === 413) {
        serverErrorMsg = 'File too large: The uploaded file exceeds the processing limit. Please compress or select a smaller file.';
      } else if (response.status === 415) {
        serverErrorMsg = `Unsupported format: Conversion from .${(inputFormat || '').toUpperCase()} to .${(outputFormat || '').toUpperCase()} is not currently supported.`;
      } else if (response.status === 404) {
        serverErrorMsg = 'Conversion session expired or file not found on server. Please re-upload your file.';
      } else if (response.status === 400) {
        serverErrorMsg = 'Invalid conversion request or incompatible options specified.';
      } else if (response.status === 429) {
        serverErrorMsg = 'Too many requests. Please wait a moment before trying again.';
      } else if (response.status >= 500) {
        serverErrorMsg = 'Server processing error: The backend engine encountered an internal issue.';
      } else {
        serverErrorMsg = `Request failed (HTTP ${response.status}: ${response.statusText || 'Error'}).`;
      }
    }

    return serverErrorMsg;
  };

  // Handle Multi-File Upload into Queue
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);

    // If multiple files are selected from home/converter, transition to dashboard
    if (files.length > 1 && currentView !== 'dashboard') {
      setCurrentView('dashboard');
    }

    // Create initial queue items
    const newItems: ConversionQueueItem[] = files.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      return {
        id: 'queue-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
        fileName: file.name,
        file: file,
        inputFormat: ext,
        outputFormat: ext === 'pdf' ? 'png' : 'pdf',
        fileSize: file.size,
        status: 'uploading',
        progress: 30,
        options: { ...options },
        createdAt: new Date().toISOString(),
      };
    });

    setQueue((prev) => [...newItems, ...prev]);

    // Concurrently upload each file to /api/upload with retry resilience
    await Promise.all(
      files.map(async (file, index) => {
        const item = newItems[index];
        try {
          let response: Response | null = null;
          let lastFetchError: any = null;
          let retries = 2;

          while (retries >= 0) {
            try {
              const formData = new FormData();
              formData.append('file', file);

              response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });

              if (response.ok || response.status < 500) {
                break;
              }
            } catch (fetchErr: any) {
              lastFetchError = fetchErr;
              if (retries === 0) break;
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
            retries--;
          }

          if (!response) {
            throw new Error(
              lastFetchError?.message
                ? `Connection error: ${lastFetchError.message}. Please check your connection and try again.`
                : 'Unable to connect to the file conversion server. Please try again.'
            );
          }

          if (!response.ok) {
            const parsedError = await parseBackendError(response, item.inputFormat, item.outputFormat);
            throw new Error(parsedError || 'Upload failed');
          }

          const fileData: UploadedFile = await safeParseJson(response);

          // Set default target output format
          const defaultOutput =
            fileData.supportedOutputs && fileData.supportedOutputs.length > 0
              ? fileData.supportedOutputs[0]
              : 'png';

          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    file: file,
                    uploadedFile: fileData,
                    inputFormat: fileData.detectedFormat,
                    outputFormat: defaultOutput,
                    fileSize: fileData.fileSize,
                    status: 'pending',
                    progress: 0,
                    error: null,
                  }
                : q
            )
          );

          // If only 1 file was selected from a non-dashboard view and no single file active yet, sync single file workspace
          if (files.length === 1 && currentView !== 'dashboard') {
            setUploadedFile(fileData);
            setSelectedOutputFormat(defaultOutput);
            setCurrentView('converter');
          }
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          const errorMsg = formatCatchError(err, 'Failed to upload file');
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    file: file,
                    status: 'failed',
                    error: errorMsg,
                    progress: 0,
                  }
                : q
            )
          );
          if (files.length === 1 && currentView !== 'dashboard') {
            setError(errorMsg);
          }
        }
      })
    );

    setIsLoading(false);
  };

  // Handle Single File Selection (forward to multi-file queue handler)
  const handleFileSelected = async (file: File) => {
    await handleFilesSelected([file]);
  };

  // Handle Sample File Load
  const handleSampleSelected = async (sampleKey: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStage('idle');

    try {
      const response = await fetch(`/api/sample/${sampleKey}`);
      if (!response.ok) {
        const parsedError = await parseBackendError(response);
        throw new Error(parsedError || 'Failed to load sample design file');
      }

      const fileData: UploadedFile = await safeParseJson(response);
      setUploadedFile(fileData);

      const defaultOutput =
        fileData.supportedOutputs && fileData.supportedOutputs.length > 0
          ? fileData.supportedOutputs[0]
          : 'png';

      setSelectedOutputFormat(defaultOutput);

      // Also register in queue for batch conversion access
      const queueItem: ConversionQueueItem = {
        id: 'queue-sample-' + Date.now(),
        fileName: fileData.fileName,
        inputFormat: fileData.detectedFormat,
        outputFormat: defaultOutput,
        fileSize: fileData.fileSize,
        uploadedFile: fileData,
        status: 'pending',
        progress: 0,
        options: { ...options },
        createdAt: new Date().toISOString(),
      };

      setQueue((prev) => [queueItem, ...prev]);
      setCurrentView('converter');
    } catch (err: any) {
      console.error('Sample Load Error:', err);
      setError(err.message || 'Error loading sample file');
    } finally {
      setIsLoading(false);
    }
  };

  // App Limits & Monetization Safe Defaults
  const safeDailyLimit = limits?.dailyConversions ?? DEFAULT_LIMITS.dailyConversions;
  const safeMaxFileSizeMB = limits?.maxFileSizeMB ?? DEFAULT_LIMITS.maxFileSizeMB;

  // Poll Job Status until completed, failed, or expired
  const pollJobStatus = async (
    jobId: string,
    onProgress?: (progress: number, stage: string, retryCount: number) => void,
    maxWaitMs: number = 180000
  ): Promise<ConversionResultData> => {
    const startTime = Date.now();
    const pollInterval = 700;

    while (Date.now() - startTime < maxWaitMs) {
      let res: Response;
      try {
        res = await fetch(`/api/status/${jobId}`);
      } catch {
        // Transient network hiccup - wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Conversion session expired or file not found on server. Please re-upload your file.');
        }
        throw new Error(`Status check failed with HTTP ${res.status}`);
      }

      const data = await safeParseJson(res);
      if (!data.success) {
        throw new Error(data.error || 'Failed to check conversion status.');
      }

      if (data.status === 'completed') {
        onProgress?.(100, data.progressStage || 'Completed', data.retryCount || 0);
        return {
          jobId: data.jobId,
          originalName: data.originalName,
          inputFormat: data.inputFormat,
          outputFormat: data.outputFormat,
          originalSize: data.fileSize,
          outputSize: data.outputSize || 0,
          completedAt: data.completedAt || new Date().toISOString(),
          width: data.width,
          height: data.height,
          pdfPageSize: data.pdfPageSize,
          pngResolution: data.pngResolution,
          dpi: data.dpi,
        };
      }

      if (data.status === 'failed') {
        throw new Error(data.error || data.errorCode || 'Conversion failed on server.');
      }

      if (data.status === 'expired') {
        throw new Error(data.error || 'File session expired on server. Please re-upload.');
      }

      // Still queued or processing
      const progressVal = typeof data.progress === 'number' ? data.progress : (data.status === 'queued' ? 10 : 50);
      const stageText = data.progressStage || (data.status === 'queued' ? 'Waiting in queue...' : 'Processing...');
      onProgress?.(progressVal, stageText, data.retryCount || 0);

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Conversion timed out on server. Please try again.');
  };

  // Convert an Individual Item in Queue with Real Worker Queue Polling
  const handleConvertQueueItem = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item || !item.uploadedFile || item.status === 'converting') return;

    // Check daily limit
    if (isDailyLimitReached(safeDailyLimit)) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: 'failed',
                error: `Daily limit reached (${safeDailyLimit}/${safeDailyLimit} conversions used). Upgrade to Pro for unlimited conversions.`,
              }
            : q
        )
      );
      return;
    }

    // Update status to converting
    setQueue((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, status: 'converting', progress: 10, error: null, statusText: 'Enqueuing...' }
          : q
      )
    );

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: item.uploadedFile.jobId,
          outputFormat: item.outputFormat,
          options: item.options || options,
        }),
      });

      if (!response.ok) {
        const serverErrorMsg = await parseBackendError(response, item.inputFormat, item.outputFormat);
        throw new Error(serverErrorMsg);
      }

      const enqueueData = await safeParseJson(response);
      if (enqueueData.success === false && enqueueData.error) {
        throw new Error(enqueueData.error);
      }

      // Poll until worker queue finishes processing the job
      const resData = await pollJobStatus(
        item.uploadedFile.jobId,
        (progress, stage) => {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === id
                ? {
                    ...q,
                    progress,
                    statusText: stage,
                  }
                : q
            )
          );
        }
      );

      // Increment daily usage count
      incrementDailyConversionCount(1);
      setUsedToday(getDailyConversionCount());

      // Mark queue item as completed
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: 'completed',
                progress: 100,
                result: resData,
                statusText: 'Completed',
                error: null,
              }
            : q
        )
      );

      // Add to Session History
      const newHistoryItem: ConversionHistoryItem = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        fileName: resData.originalName,
        inputFormat: resData.inputFormat,
        outputFormat: resData.outputFormat,
        originalSize: resData.originalSize,
        outputSize: resData.outputSize,
        date: new Date().toISOString(),
        status: 'completed',
        jobId: resData.jobId,
      };

      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 49)]);

      // If this item was the active single file, update single workspace result
      if (uploadedFile && uploadedFile.jobId === item.uploadedFile.jobId) {
        setResult(resData);
        setStage('completed');
        setStatusText('Conversion complete! File ready for instant download.');
        setProgress(100);
      }
    } catch (err: any) {
      console.error(`Conversion error for ${item.fileName}:`, err);
      const displayError = formatCatchError(err, 'Conversion failed. Please try again.');
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: 'failed',
                error: displayError,
                progress: 0,
              }
            : q
        )
      );
    }
  };

  // Retry a Failed Item in the Queue (Retries upload if file is cached, or re-runs conversion)
  const handleRetryQueueItem = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    // If upload previously failed and the browser still has the File object in memory, re-upload
    if (!item.uploadedFile && item.file) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, status: 'uploading', progress: 30, error: null } : q
        )
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const parsedError = await parseBackendError(response, item.inputFormat, item.outputFormat);
          throw new Error(parsedError || 'Upload failed');
        }

        const fileData: UploadedFile = await safeParseJson(response);
        const defaultOutput =
          fileData.supportedOutputs && fileData.supportedOutputs.length > 0
            ? fileData.supportedOutputs[0]
            : item.outputFormat || 'png';

        setQueue((prev) =>
          prev.map((q) =>
            q.id === id
              ? {
                  ...q,
                  uploadedFile: fileData,
                  inputFormat: fileData.detectedFormat,
                  outputFormat: defaultOutput,
                  fileSize: fileData.fileSize,
                  status: 'pending',
                  progress: 0,
                  error: null,
                }
              : q
          )
        );
      } catch (err: any) {
        console.error(`Retry upload error for ${item.fileName}:`, err);
        const displayError = formatCatchError(err, 'Retry upload failed');
        setQueue((prev) =>
          prev.map((q) =>
            q.id === id
              ? {
                  ...q,
                  status: 'failed',
                  error: displayError,
                  progress: 0,
                }
              : q
          )
        );
      }
      return;
    }

    // If uploadedFile exists, run conversion
    if (item.uploadedFile) {
      await handleConvertQueueItem(id);
    }
  };

  // Convert All Pending / Failed Items in the Queue with Strict Semaphore Concurrency (Max 2 simultaneous jobs)
  const handleConvertAllPending = async () => {
    if (isConvertingAll) return;

    // Snapshot of eligible items (pending or failed, not currently converting)
    const pendingItems = queue.filter(
      (item) =>
        (item.status === 'pending' || item.status === 'failed') &&
        (item.uploadedFile || item.file) &&
        item.status !== 'converting'
    );

    if (pendingItems.length === 0) return;

    setIsConvertingAll(true);

    try {
      const MAX_CONCURRENT = 2;
      let currentIndex = 0;

      // Worker function pulling the next job index atomically
      const runWorker = async () => {
        while (currentIndex < pendingItems.length) {
          const itemIndex = currentIndex++;
          const targetItem = pendingItems[itemIndex];
          if (!targetItem) break;

          try {
            if (targetItem.uploadedFile) {
              await handleConvertQueueItem(targetItem.id);
            } else if (targetItem.file) {
              await handleRetryQueueItem(targetItem.id);
            }
          } catch (itemErr) {
            // Independent error isolation ensures one failure never aborts other jobs (avoiding all-fail)
            console.error(`Error processing queue item ${targetItem.fileName}:`, itemErr);
          }
        }
      };

      // Launch up to MAX_CONCURRENT workers
      const activeWorkerCount = Math.min(MAX_CONCURRENT, pendingItems.length);
      const workers = Array.from({ length: activeWorkerCount }, () => runWorker());

      // Wait for all workers to settle independently
      await Promise.allSettled(workers);
    } catch (err) {
      console.error('Unexpected error in batch conversion scheduler:', err);
    } finally {
      setIsConvertingAll(false);
    }
  };

  // Update target format for a specific item in queue
  const handleUpdateQueueItemFormat = (id: string, format: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, outputFormat: format } : item))
    );
  };

  // Remove single item from queue
  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all items in queue
  const handleClearQueue = () => {
    setQueue([]);
  };

  // Execute Single Conversion (from Single Workspace)
  const handleStartConversion = async () => {
    if (!uploadedFile) return;

    // Check daily limit
    if (isDailyLimitReached(safeDailyLimit)) {
      setError(
        `Daily conversion limit reached (${safeDailyLimit}/${safeDailyLimit} conversions used today). Upgrade to Pro for unlimited conversions or try again tomorrow.`
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setStage('converting');
    setProgress(10);
    setStatusText(
      `Queuing .${uploadedFile.detectedFormat.toUpperCase()} → .${selectedOutputFormat.toUpperCase()}...`
    );

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: uploadedFile.jobId,
          outputFormat: selectedOutputFormat,
          options,
        }),
      });

      if (!response.ok) {
        const serverErrorMsg = await parseBackendError(
          response,
          uploadedFile.detectedFormat,
          selectedOutputFormat
        );
        throw new Error(serverErrorMsg);
      }

      const enqueueData = await safeParseJson(response);
      if (enqueueData.success === false && enqueueData.error) {
        throw new Error(enqueueData.error);
      }

      // Poll until finished
      const resData = await pollJobStatus(
        uploadedFile.jobId,
        (p, stage) => {
          setProgress(p);
          setStatusText(stage);
        }
      );

      // Increment daily usage
      incrementDailyConversionCount(1);
      setUsedToday(getDailyConversionCount());

      setProgress(100);
      setStage('completed');
      setStatusText('Conversion complete! File ready for instant download.');
      setResult(resData);

      // Add to history
      const newHistoryItem: ConversionHistoryItem = {
        id: 'hist-' + Date.now(),
        fileName: resData.originalName,
        inputFormat: resData.inputFormat,
        outputFormat: resData.outputFormat,
        originalSize: resData.originalSize,
        outputSize: resData.outputSize,
        date: new Date().toISOString(),
        status: 'completed',
        jobId: resData.jobId,
      };

      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 49)]);

      // Also update any matching queue item
      setQueue((prev) =>
        prev.map((q) =>
          q.uploadedFile?.jobId === uploadedFile.jobId
            ? { ...q, status: 'completed', progress: 100, result: resData, error: null }
            : q
        )
      );
    } catch (err: any) {
      console.error('Conversion Error:', err);
      const displayError = formatCatchError(err, 'Conversion failed');
      setError(displayError);
      setStage('idle');
      setProgress(0);

      // Also update queue item to failed state
      setQueue((prev) =>
        prev.map((q) =>
          q.uploadedFile?.jobId === uploadedFile.jobId
            ? { ...q, status: 'failed', error: displayError, progress: 0 }
            : q
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Re-convert directly from ConversionResult Screen (Goal 7)
  const handleReconvert = async (targetFormat: string) => {
    const activeJobId = uploadedFile?.jobId || result?.jobId;
    if (!activeJobId) return;

    if (isDailyLimitReached(safeDailyLimit)) {
      setError(
        `Daily conversion limit reached (${safeDailyLimit}/${safeDailyLimit} conversions used today). Upgrade to Pro for unlimited conversions or try again tomorrow.`
      );
      return;
    }

    setIsReconverting(true);
    setError(null);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: activeJobId,
          outputFormat: targetFormat,
          options,
        }),
      });

      if (!response.ok) {
        const serverErrorMsg = await parseBackendError(
          response,
          uploadedFile?.detectedFormat || result?.inputFormat || 'file',
          targetFormat
        );
        throw new Error(serverErrorMsg);
      }

      const enqueueData = await safeParseJson(response);
      if (enqueueData.success === false && enqueueData.error) {
        throw new Error(enqueueData.error);
      }

      const resData = await pollJobStatus(activeJobId);

      setSelectedOutputFormat(targetFormat);
      setResult(resData);
      incrementDailyConversionCount(1);
      setUsedToday(getDailyConversionCount());

      const newHistoryItem: ConversionHistoryItem = {
        id: 'hist-' + Date.now(),
        fileName: resData.originalName,
        inputFormat: resData.inputFormat,
        outputFormat: resData.outputFormat,
        originalSize: resData.originalSize,
        outputSize: resData.outputSize,
        date: new Date().toISOString(),
        status: 'completed',
        jobId: resData.jobId,
      };
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 49)]);
    } catch (err: any) {
      console.error('Re-conversion error:', err);
      const displayError = formatCatchError(err, 'Quick re-conversion failed');
      setError(displayError);
    } finally {
      setIsReconverting(false);
    }
  };

  // Combine multiple images / documents in queue into 1 PDF (Goal 10)
  const handleCombineToPdf = async () => {
    if (isCombiningPdf || queue.length < 2) return;

    if (isDailyLimitReached(safeDailyLimit)) {
      setError(
        `Daily conversion limit reached (${safeDailyLimit}/${safeDailyLimit} conversions used today). Upgrade to Pro for unlimited conversions or try again tomorrow.`
      );
      return;
    }

    setIsCombiningPdf(true);
    setError(null);

    try {
      const jobIds: string[] = [];
      for (const item of queue) {
        if (item.uploadedFile?.jobId) {
          jobIds.push(item.uploadedFile.jobId);
        } else if (item.result?.jobId) {
          jobIds.push(item.result.jobId);
        } else if (item.file) {
          const formData = new FormData();
          formData.append('file', item.file);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (uploadRes.ok) {
            const upData = await safeParseJson(uploadRes);
            if (upData && upData.jobId) {
              jobIds.push(upData.jobId);
            }
          }
        }
      }

      if (jobIds.length === 0) {
        throw new Error('No valid uploaded files available to combine into PDF.');
      }

      const response = await fetch('/api/combine-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobIds,
          options: {
            pageSize: options.pageSize || 'a4',
            orientation: options.orientation || 'portrait',
          },
          filename: `combined_${jobIds.length}_files.pdf`,
        }),
      });

      if (!response.ok) {
        const errorData = await safeParseJson(response).catch(() => ({}));
        throw new Error(errorData.error || 'Failed to merge files into PDF.');
      }

      const resData = await safeParseJson(response);
      incrementDailyConversionCount(1);
      setUsedToday(getDailyConversionCount());

      const resultObj: ConversionResultData = {
        jobId: resData.jobId,
        originalName: resData.originalName || 'combined_document.pdf',
        inputFormat: 'images',
        outputFormat: 'pdf',
        originalSize: 0,
        outputSize: resData.outputSize,
        completedAt: new Date().toISOString(),
      };

      const newHistoryItem: ConversionHistoryItem = {
        id: 'hist-' + Date.now(),
        fileName: resultObj.originalName,
        inputFormat: 'images',
        outputFormat: 'pdf',
        originalSize: 0,
        outputSize: resData.outputSize,
        date: new Date().toISOString(),
        status: 'completed',
        jobId: resData.jobId,
      };

      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 49)]);
      setResult(resultObj);
      setStage('completed');
      setCurrentView('converter');
    } catch (err: any) {
      console.error('Combine PDF error:', err);
      const displayError = formatCatchError(err, 'Failed to merge files into PDF');
      setError(displayError);
    } finally {
      setIsCombiningPdf(false);
    }
  };

  // Reset workspace
  const handleReset = () => {
    setUploadedFile(null);
    setResult(null);
    setStage('idle');
    setProgress(0);
    setError(null);
    setCurrentView('home');
  };

  const handleNavigate = (view: PageView, targetSeoSlug?: string) => {
    let targetPath = '/';
    if (view === 'seo' || view.startsWith('seo-')) {
      const clean = targetSeoSlug || (view.startsWith('seo-') ? view.replace(/^seo-/, '') : seoSlug);
      setSeoSlug(clean);
      setCurrentView('seo');
      targetPath = `/${clean}`;
    } else if (view === 'home') {
      setCurrentView('home');
      targetPath = '/';
    } else {
      setCurrentView(view);
      targetPath = `/${view}`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard Shortcuts State Reference to avoid stale closure issues
  const shortcutStateRef = useRef({
    uploadedFile,
    isLoading,
    stage,
    currentView,
    queue,
    isConvertingAll,
  });

  useEffect(() => {
    shortcutStateRef.current = {
      uploadedFile,
      isLoading,
      stage,
      currentView,
      queue,
      isConvertingAll,
    };
  });

  // Global Keyboard Shortcuts Listener:
  // - Ctrl+O / Cmd+O: Trigger file picker dialog
  // - Ctrl+Enter / Cmd+Enter: Initiate active conversion in workspace
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // 1. Ctrl+O or Cmd+O: Trigger file upload
      if (isCmdOrCtrl && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        globalFileInputRef.current?.click();
        return;
      }

      // 2. Ctrl+Enter or Cmd+Enter: Initiate conversion
      if (isCmdOrCtrl && e.key === 'Enter') {
        const {
          uploadedFile: file,
          isLoading: loading,
          stage: stg,
          currentView: view,
          queue: q,
          isConvertingAll: batching,
        } = shortcutStateRef.current;

        // In Single File Converter Workspace: initiate single conversion if file is ready
        if (file && file.status === 'supported' && !loading && stg === 'idle') {
          e.preventDefault();
          handleStartConversion();
          return;
        }

        // In Dashboard / Batch Workspace: initiate batch conversion if pending items exist
        if (
          (view === 'dashboard' || view === 'converter') &&
          q.some(
            (item) =>
              (item.status === 'pending' || item.status === 'failed') &&
              (item.uploadedFile || item.file)
          ) &&
          !batching
        ) {
          e.preventDefault();
          handleConvertAllPending();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const pendingQueueCount = queue.filter(
    (item) => item.status === 'pending' || item.status === 'uploading'
  ).length;

  return (
    <div
      className={`min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased transition-colors selection:bg-[#2563EB] selection:text-white flex flex-col justify-between`}
    >
      <SeoMetaManager currentView={currentView} seoSlug={seoSlug} />
      <div>
        {/* Main Header */}
        <Header
          currentView={currentView}
          onNavigate={handleNavigate}
          historyCount={history.length}
          queueCount={pendingQueueCount}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          usedToday={usedToday}
          limits={limits || DEFAULT_LIMITS}
          onOpenAccountModal={() => setShowAccountModal(true)}
        />

        {/* Hidden Global File Input for Ctrl+O / Cmd+O */}
        <input
          type="file"
          ref={globalFileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFilesSelected(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
          multiple
          className="hidden"
          id="global-keyboard-file-input"
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* View Switcher */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16">
          {/* 1. Home View */}
          {currentView === 'home' && (
            <div className="space-y-16">
              <Hero
                onFileSelected={handleFileSelected}
                onFilesSelected={handleFilesSelected}
                onSampleSelected={handleSampleSelected}
                onNavigate={handleNavigate}
                isLoading={isLoading}
                error={error}
                maxFileSizeMB={safeMaxFileSizeMB}
                onViewPro={() => handleNavigate('pricing')}
              />
              <UniversalExportSection
                onSelectSample={handleSampleSelected}
                onNavigateToConverter={() => setCurrentView('converter')}
              />
              <HowItWorks />
              
              {/* Curated Partner & Affiliate Tools Section */}
              <AffiliateSection
                title="Recommended Design & Engineering Tools"
                subtitle="Industry-standard software for CAD, 3D modeling, vector design, and high-performance creative workflows."
                limit={4}
                showCategoryFilter={false}
              />

              <FaqSection />
            </div>
          )}

          {/* 2. Converter Workspace View */}
          {currentView === 'converter' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                    Converter Workspace
                  </h1>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                    Configure target format, DPI, and compression options for server-side processing.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Keyboard Shortcuts Hint Pill */}
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <Keyboard className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="font-semibold">Shortcuts:</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      Ctrl+O
                    </kbd>
                    <span>Upload</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      Ctrl+↵
                    </kbd>
                    <span>Convert</span>
                  </div>

                  {queue.length > 1 && (
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      id="view-queue-btn"
                      className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>View Batch Queue ({queue.length})</span>
                    </button>
                  )}
                  {uploadedFile && (
                    <button
                      onClick={handleReset}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white transition-colors"
                    >
                      Reset & Upload New
                    </button>
                  )}
                </div>
              </div>

              {/* Usage Quota & Limit State Banner */}
              <UsageWidget
                usedToday={usedToday}
                limits={limits || DEFAULT_LIMITS}
                onNavigate={handleNavigate}
              />

              {!uploadedFile ? (
                /* No file loaded -> show Upload Zone */
                <Hero
                  onFileSelected={handleFileSelected}
                  onFilesSelected={handleFilesSelected}
                  onSampleSelected={handleSampleSelected}
                  onNavigate={handleNavigate}
                  isLoading={isLoading}
                  error={error}
                  maxFileSizeMB={safeMaxFileSizeMB}
                  onViewPro={() => handleNavigate('pricing')}
                />
              ) : (
                /* File Loaded -> Two Column Professional Workspace */
                <div className="space-y-6">
                  {/* Error Alert Banner */}
                  {error && (
                    <div
                      id="conversion-error-alert"
                      className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
                      role="alert"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                            Conversion Error
                          </h4>
                          <p className="text-sm font-medium mt-0.5 text-rose-800 dark:text-rose-200">
                            {error}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setError(null)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500 transition-colors"
                        title="Dismiss error"
                        aria-label="Dismiss error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* File Info Card */}
                  <FileCard file={uploadedFile} onReset={handleReset} />

                  {/* Two Column Layout on Desktop */}
                  {stage !== 'completed' && result === null ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Target Format Selector */}
                      <FormatSelector
                        inputFormat={uploadedFile.detectedFormat}
                        selectedOutputFormat={selectedOutputFormat}
                        onSelectFormat={setSelectedOutputFormat}
                        capabilities={capabilities}
                        supportedOutputs={
                          uploadedFile.supportedOutputs || ['png', 'pdf', 'jpg', 'webp', 'svg']
                        }
                      />

                      {/* Right: Engine Options & Conversion Trigger */}
                      <div className="space-y-6 flex flex-col justify-between">
                        <ConversionSettings
                          inputFormat={uploadedFile.detectedFormat}
                          outputFormat={selectedOutputFormat}
                          options={options}
                          onChangeOptions={setOptions}
                        />

                        {/* Progress Bar & Convert Button */}
                        <div className="space-y-4">
                          <button
                            onClick={handleStartConversion}
                            disabled={
                              isLoading || stage !== 'idle' || uploadedFile.status !== 'supported'
                            }
                            id="start-conversion-btn"
                            className={`relative overflow-hidden w-full py-4 rounded-2xl text-sm font-extrabold text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
                              isLoading || stage !== 'idle'
                                ? 'bg-gradient-to-r from-[#2563EB] via-indigo-600 to-[#7C3AED] shadow-blue-500/30 animate-pulse cursor-wait'
                                : uploadedFile.status === 'supported'
                                ? 'bg-gradient-to-r from-[#2563EB] via-indigo-600 to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.99]'
                                : 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-70'
                            }`}
                          >
                            {/* Loading Shimmer Sweep Overlay */}
                            {(isLoading || stage !== 'idle') && (
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                            )}

                            {isLoading || stage !== 'idle' ? (
                              <>
                                <RefreshCw className="w-5 h-5 text-amber-300 animate-spin" />
                                <span>
                                  Converting .{uploadedFile.detectedFormat.toUpperCase()} → .
                                  {selectedOutputFormat.toUpperCase()}...
                                </span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-5 h-5 text-amber-300" />
                                <span>
                                  {uploadedFile.status === 'supported'
                                    ? `Convert .${uploadedFile.detectedFormat.toUpperCase()} → .${selectedOutputFormat.toUpperCase()} Now`
                                    : `Engine Extension Required for .${uploadedFile.detectedFormat.toUpperCase()}`}
                                </span>
                                {uploadedFile.status === 'supported' && (
                                  <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 ml-1.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30 tracking-tight">
                                    Ctrl+↵
                                  </kbd>
                                )}
                              </>
                            )}
                          </button>

                          {stage !== 'idle' && (
                            <ProgressBar
                              progress={progress}
                              stage={stage}
                              statusText={statusText}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Conversion Complete Result Screen */
                    <ConversionResult
                      result={result!}
                      onConvertAnother={() => {
                        setResult(null);
                        setStage('idle');
                      }}
                      onNavigate={handleNavigate}
                      onReconvert={handleReconvert}
                      isReconverting={isReconverting}
                      availableFormats={
                        uploadedFile?.supportedOutputs || ['png', 'jpg', 'webp', 'pdf', 'svg']
                      }
                    />
                  )}

                  {/* Ad Slot 1: After the converter/result section */}
                  <AdSlot position="primary" isPro={limits?.isPro} className="pt-2" />
                </div>
              )}
            </div>
          )}

          {/* 3. Pricing & Pro View */}
          {currentView === 'pricing' && (
            <PricingPage
              limits={limits || DEFAULT_LIMITS}
              monetization={monetization || DEFAULT_MONETIZATION}
              usedToday={usedToday}
              onNavigate={handleNavigate}
            />
          )}

          {/* 3b. Dedicated Text to PDF Studio View */}
          {currentView === 'text-to-pdf' && (
            <TextToPdfStudio
              onNavigate={handleNavigate}
              showToast={showToast}
              onRecordHistory={(histItem) => {
                setHistory((prev) => {
                  const updated = [histItem, ...prev];
                  try {
                    localStorage.setItem('convertx_history', JSON.stringify(updated));
                  } catch (e) {
                    console.warn('Failed to persist history item', e);
                  }
                  return updated;
                });
              }}
              darkMode={darkMode}
            />
          )}

          {/* 4. Supported Formats Matrix */}
          {currentView === 'formats' && (
            <div className="space-y-12">
              <div className="max-w-3xl space-y-2">
                <h1 className="text-2xl sm:text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  Supported Formats Matrix
                </h1>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Explore active server-side image, PDF, vector, CAD, and document engines, as well as future extension modules.
                </p>
              </div>

              <UniversalExportSection
                onSelectSample={handleSampleSelected}
                onNavigateToConverter={() => setCurrentView('converter')}
              />

              <FormatGrid
                capabilities={capabilities}
                onSelectFormat={(ext) => {
                  setSelectedOutputFormat(ext);
                  setCurrentView('converter');
                }}
              />
            </div>
          )}

          {/* 5. Tools Directory View */}
          {currentView === 'tools' && <ToolsDirectory onNavigate={handleNavigate} />}

          {/* 6. About Page View */}
          {currentView === 'about' && <AboutPage onNavigate={handleNavigate} />}

          {/* 7. How It Works View */}
          {currentView === 'how-it-works' && <HowItWorks />}

          {/* 8. FAQ View */}
          {currentView === 'faq' && <FaqSection />}

          {/* 9. Legal & Contact Views */}
          {(currentView === 'privacy' || currentView === 'terms' || currentView === 'contact') && (
            <PrivacyTermsContact view={currentView} onNavigate={handleNavigate} />
          )}

          {/* 10. History & Queue Dashboard */}
          {currentView === 'dashboard' && (
            <DashboardHistory
              queue={queue}
              history={history}
              capabilities={capabilities}
              usedToday={usedToday}
              limits={limits || DEFAULT_LIMITS}
              isPro={limits?.isPro}
              onClearHistory={() => setHistory([])}
              onRemoveItem={(id) => setHistory(history.filter((item) => item.id !== id))}
              onConvertNew={() => setCurrentView('converter')}
              onNavigate={handleNavigate}
              onOpenSeoRoute={(slug) => {
                setSeoSlug(slug);
                setCurrentView('seo');
              }}
              onAddFiles={handleFilesSelected}
              onConvertAllPending={handleConvertAllPending}
              onConvertQueueItem={handleConvertQueueItem}
              onRetryQueueItem={handleRetryQueueItem}
              onUpdateQueueItemFormat={handleUpdateQueueItemFormat}
              onRemoveQueueItem={handleRemoveQueueItem}
              onClearQueue={handleClearQueue}
              onCombineToPdf={handleCombineToPdf}
              onConvertAgain={(item) => {
                if ('file' in item && item.file) {
                  handleFileSelected(item.file);
                }
                setSelectedOutputFormat(item.outputFormat || 'png');
                setCurrentView('converter');
              }}
              isConvertingAll={isConvertingAll}
              isCombiningPdf={isCombiningPdf}
              onOpenAccountModal={() => setShowAccountModal(true)}
            />
          )}

          {/* 11. Curated Partner Tools & Software Directory */}
          {currentView === 'affiliates' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <AffiliateSection
                title="Recommended Design & Engineering Software"
                subtitle="Curated, tested software tools for CAD drafting, 3D parametric modeling, vector design, and creative productivity."
                showCategoryFilter={true}
              />
            </div>
          )}

          {/* 12. Referral & Rewards Center */}
          {currentView === 'referral' && (
            <ReferralPage
              referralCode={userProfile.referralCode}
              onNavigate={handleNavigate}
              onToast={showToast}
            />
          )}

          {/* 13. 404 Not Found Page */}
          {currentView === '404' && <NotFoundPage onNavigate={handleNavigate} />}

          {/* Ad Slot 2: Lower on the page */}
          <div className="pt-8">
            <AdSlot position="secondary" isPro={limits?.isPro} />
          </div>

          {/* 10. SEO Landing Pages */}
          {currentView === 'seo' && (
            <SeoLandingPage
              slug={seoSlug}
              onFileSelected={handleFileSelected}
              onFilesSelected={handleFilesSelected}
              onSampleSelected={handleSampleSelected}
              onNavigate={handleNavigate}
              isLoading={isLoading}
              error={error}
              maxFileSizeMB={safeMaxFileSizeMB}
              onViewPro={() => handleNavigate('pricing')}
            />
          )}
        </main>
      </div>

      {/* Main Footer */}
      <Footer onNavigate={handleNavigate} onOpenMetrics={() => setShowAdminMetrics(true)} />

      {/* Account Settings & Preferences Modal */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        profile={userProfile}
        preferences={userPreferences}
        onPreferencesChange={(p) => {
          setUserPreferences(p);
          saveUserPreferences(p);
        }}
        onProfileChange={(p) => {
          setUserProfile(p);
          saveUserProfile(p);
        }}
        usedToday={usedToday}
        dailyLimit={limits?.dailyConversions || DEFAULT_LIMITS.dailyConversions}
        isPro={limits?.isPro}
        onNavigate={handleNavigate}
        onToast={showToast}
      />

      {/* Global Interactive Notification Toasts Container */}
      <NotificationToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Admin Real-Time Operational Analytics Telemetry Modal */}
      <AdminMetricsModal
        isOpen={showAdminMetrics}
        onClose={() => setShowAdminMetrics(false)}
      />
    </div>
  );
}

