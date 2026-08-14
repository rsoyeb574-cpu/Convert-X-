import React, { useState, useEffect } from 'react';
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
import { UsageWidget } from './components/UsageWidget.js';
import { AdPlaceholder } from './components/AdPlaceholder.js';
import {
  fetchAppConfig,
  getDailyConversionCount,
  incrementDailyConversionCount,
  isDailyLimitReached,
  DEFAULT_LIMITS,
  DEFAULT_MONETIZATION,
} from './utils/usageTracker.js';
import { SEO_ROUTES } from './data/seoRoutes.js';
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
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [seoSlug, setSeoSlug] = useState<string>('png-to-jpg');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Monetization & Limits State
  const [limits, setLimits] = useState<AppLimits>(DEFAULT_LIMITS);
  const [monetization, setMonetization] = useState<MonetizationConfig>(DEFAULT_MONETIZATION);
  const [usedToday, setUsedToday] = useState<number>(() => getDailyConversionCount());

  // File Upload and Single Workspace State
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<string>('png');
  const [options, setOptions] = useState<ConversionOptions>({
    quality: 90,
    dpi: 150,
    backgroundColor: '#ffffff',
    pageSize: 'a4',
    orientation: 'portrait',
  });

  // Multi-File Conversion Queue State
  const [queue, setQueue] = useState<ConversionQueueItem[]>([]);
  const [isConvertingAll, setIsConvertingAll] = useState<boolean>(false);

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
        ['converter', 'formats', 'how-it-works', 'faq', 'privacy', 'terms', 'contact', 'dashboard', 'pricing'].includes(
          pathname
        )
      ) {
        setCurrentView(pathname as PageView);
      } else if (pathname.startsWith('seo-')) {
        const clean = pathname.replace(/^seo-/, '');
        if (SEO_ROUTES[clean]) {
          setCurrentView('seo');
          setSeoSlug(clean);
        } else {
          setCurrentView('home');
        }
      } else {
        setCurrentView('home');
      }
    };

    parseUrl();
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

  // Helper to parse specific backend error messages and HTTP status codes
  const parseBackendError = async (
    response: Response,
    inputFormat?: string,
    outputFormat?: string
  ): Promise<string> => {
    let serverErrorMsg = '';

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errData = await response.json();
        serverErrorMsg = errData.error || errData.message || errData.reason || errData.details || '';
      } catch {
        // ignore json parse error
      }
    } else {
      try {
        const textData = await response.text();
        if (textData && textData.trim()) {
          serverErrorMsg = textData.trim();
        }
      } catch {
        // ignore text parse error
      }
    }

    if (!serverErrorMsg) {
      if (response.status === 413) {
        serverErrorMsg = 'File too large: The uploaded file exceeds the 50MB processing limit.';
      } else if (response.status === 415) {
        serverErrorMsg = `Unsupported format: Conversion from .${(inputFormat || '').toUpperCase()} to .${(outputFormat || '').toUpperCase()} is not supported.`;
      } else if (response.status === 404) {
        serverErrorMsg = 'Conversion session expired or file not found. Please upload your file again.';
      } else if (response.status === 400) {
        serverErrorMsg = 'Invalid conversion request. Please check your options and try again.';
      } else if (response.status >= 500) {
        serverErrorMsg = 'Server processing error: The conversion engine encountered an unexpected internal issue.';
      } else {
        serverErrorMsg = `Conversion failed with status ${response.status} (${response.statusText || 'Error'}).`;
      }
    }

    return serverErrorMsg;
  };

  // Handle Multi-File Upload into Queue
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);

    // If multiple files are selected, transition to the queue dashboard
    if (files.length > 1) {
      setCurrentView('dashboard');
    }

    // Create initial queue items
    const newItems: ConversionQueueItem[] = files.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      return {
        id: 'queue-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
        fileName: file.name,
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

    // Concurrently upload each file to /api/upload
    await Promise.all(
      files.map(async (file, index) => {
        const item = newItems[index];
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const parsedError = await parseBackendError(response, item.inputFormat, item.outputFormat);
            throw new Error(parsedError || 'Upload failed');
          }

          const fileData: UploadedFile = await response.json();

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

          // If only 1 file was selected and no single file active yet, sync single file workspace
          if (files.length === 1) {
            setUploadedFile(fileData);
            setSelectedOutputFormat(defaultOutput);
            setCurrentView('converter');
          }
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          const errorMsg = err.message || 'Failed to upload file';
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'failed',
                    error: errorMsg,
                    progress: 0,
                  }
                : q
            )
          );
          if (files.length === 1) {
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

      const fileData: UploadedFile = await response.json();
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

  // Convert an Individual Item in Queue
  const handleConvertQueueItem = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item || !item.uploadedFile || item.status === 'converting') return;

    // Check daily limit
    if (isDailyLimitReached(limits.dailyConversions)) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: 'failed',
                error: `Daily limit reached (${limits.dailyConversions}/${limits.dailyConversions} conversions used). Upgrade to Pro for unlimited conversions.`,
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
          ? { ...q, status: 'converting', progress: 45, error: null, statusText: 'Processing conversion...' }
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

      const resData: ConversionResultData = await response.json();

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
      const displayError = err?.message || 'Conversion failed';
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

  // Convert All Pending / Failed Items in the Queue
  const handleConvertAllPending = async () => {
    const pendingItems = queue.filter(
      (item) => (item.status === 'pending' || item.status === 'failed') && item.uploadedFile
    );

    if (pendingItems.length === 0) return;

    setIsConvertingAll(true);

    // Convert items concurrently
    await Promise.all(pendingItems.map((item) => handleConvertQueueItem(item.id)));

    setIsConvertingAll(false);
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
    if (isDailyLimitReached(limits.dailyConversions)) {
      setError(
        `Daily conversion limit reached (${limits.dailyConversions}/${limits.dailyConversions} conversions used today). Upgrade to Pro for unlimited conversions or try again tomorrow.`
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setStage('converting');
    setProgress(50);
    setStatusText(
      `Converting .${uploadedFile.detectedFormat.toUpperCase()} → .${selectedOutputFormat.toUpperCase()}...`
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

      const resData: ConversionResultData = await response.json();

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
      let displayError = 'Conversion failed';
      if (err?.message) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          displayError =
            'Network connection error: Unable to reach the conversion server. Please check your connection and retry.';
        } else {
          displayError = err.message;
        }
      }
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
          limits={limits}
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
                maxFileSizeMB={limits.maxFileSizeMB}
                onViewPro={() => handleNavigate('pricing')}
              />
              <HowItWorks />
              
              {/* Non-intrusive Ad Placement */}
              <div className="pt-2">
                <AdPlaceholder slot="home-mid" format="horizontal" />
              </div>

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
                dailyLimit={limits.dailyConversions}
                onUpgrade={() => handleNavigate('pricing')}
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
                  maxFileSizeMB={limits.maxFileSizeMB}
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
                    />
                  )}

                  {/* Non-intrusive Ad in Converter Workspace */}
                  <div className="pt-6">
                    <AdPlaceholder slot="converter-bottom" format="horizontal" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Pricing & Pro View */}
          {currentView === 'pricing' && (
            <PricingPage
              limits={limits}
              monetization={monetization}
              usedToday={usedToday}
              onNavigate={handleNavigate}
            />
          )}

          {/* 4. Supported Formats Matrix */}
          {currentView === 'formats' && (
            <div className="space-y-8">
              <div className="max-w-3xl space-y-2">
                <h1 className="text-2xl sm:text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  Supported Formats Matrix
                </h1>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Explore active server-side image, PDF, vector, and CAD engines, as well as future extension modules.
                </p>
              </div>

              <FormatGrid
                capabilities={capabilities}
                onSelectFormat={(ext) => {
                  setSelectedOutputFormat(ext);
                  setCurrentView('converter');
                }}
              />
            </div>
          )}

          {/* 5. How It Works View */}
          {currentView === 'how-it-works' && <HowItWorks />}

          {/* 6. FAQ View */}
          {currentView === 'faq' && <FaqSection />}

          {/* 7. Legal & Contact Views */}
          {(currentView === 'privacy' || currentView === 'terms' || currentView === 'contact') && (
            <PrivacyTermsContact view={currentView} onNavigate={handleNavigate} />
          )}

          {/* 8. History & Queue Dashboard */}
          {currentView === 'dashboard' && (
            <DashboardHistory
              queue={queue}
              history={history}
              capabilities={capabilities}
              onClearHistory={() => setHistory([])}
              onRemoveItem={(id) => setHistory(history.filter((item) => item.id !== id))}
              onConvertNew={() => setCurrentView('converter')}
              onAddFiles={handleFilesSelected}
              onConvertAllPending={handleConvertAllPending}
              onConvertQueueItem={handleConvertQueueItem}
              onUpdateQueueItemFormat={handleUpdateQueueItemFormat}
              onRemoveQueueItem={handleRemoveQueueItem}
              onClearQueue={handleClearQueue}
              isConvertingAll={isConvertingAll}
            />
          )}

          {/* 9. SEO Landing Pages */}
          {currentView === 'seo' && (
            <SeoLandingPage
              slug={seoSlug}
              onFileSelected={handleFileSelected}
              onFilesSelected={handleFilesSelected}
              onSampleSelected={handleSampleSelected}
              onNavigate={handleNavigate}
              isLoading={isLoading}
              error={error}
              maxFileSizeMB={limits.maxFileSizeMB}
              onViewPro={() => handleNavigate('pricing')}
            />
          )}
        </main>
      </div>

      {/* Main Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

