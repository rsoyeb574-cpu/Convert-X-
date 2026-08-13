import React, { useState, useEffect } from 'react';
import {
  PageView,
  UploadedFile,
  ConversionOptions,
  ConversionResultData,
  ConversionHistoryItem,
  FormatCapability,
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
import { ArrowRight, RefreshCw, Zap, ShieldCheck, Lock, Sparkles, Layers } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [seoRoute, setSeoRoute] = useState<string>('seo-dxf-to-pdf');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // File Upload and Conversion State
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<string>('png');
  const [options, setOptions] = useState<ConversionOptions>({
    quality: 90,
    dpi: 150,
    backgroundColor: '#ffffff',
    pageSize: 'a4',
    orientation: 'portrait',
  });

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
        if (Array.isArray(data)) {
          setCapabilities(data);
        }
      })
      .catch((err) => console.error('Error loading format catalog:', err));
  }, []);

  // Handle File Upload from Device
  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStage('idle');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload file to processing engine');
      }

      const fileData: UploadedFile = await response.json();
      setUploadedFile(fileData);

      // Default selected format to first supported output format
      if (fileData.supportedOutputs && fileData.supportedOutputs.length > 0) {
        setSelectedOutputFormat(fileData.supportedOutputs[0]);
      } else {
        setSelectedOutputFormat('png');
      }

      setCurrentView('converter');
    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'Error uploading file');
    } finally {
      setIsLoading(false);
    }
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
        throw new Error('Failed to load sample design file');
      }

      const fileData: UploadedFile = await response.json();
      setUploadedFile(fileData);

      if (fileData.supportedOutputs && fileData.supportedOutputs.length > 0) {
        setSelectedOutputFormat(fileData.supportedOutputs[0]);
      } else {
        setSelectedOutputFormat('png');
      }

      setCurrentView('converter');
    } catch (err: any) {
      console.error('Sample Load Error:', err);
      setError(err.message || 'Error loading sample file');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Conversion
  const handleStartConversion = async () => {
    if (!uploadedFile) return;

    setIsLoading(true);
    setError(null);
    setProgress(15);
    setStage('uploading');
    setStatusText('Preparing file streams & magic byte verification...');

    try {
      setTimeout(() => {
        setProgress(45);
        setStage('processing');
        setStatusText('Parsing vector entities, CAD layers & image geometry...');
      }, 500);

      setTimeout(() => {
        setProgress(75);
        setStage('converting');
        setStatusText('Compiling output target raster/vector buffer...');
      }, 1000);

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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Conversion engine failed to process file');
      }

      const resData: ConversionResultData = await response.json();

      setTimeout(() => {
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

        setHistory((prev) => [newHistoryItem, ...prev.slice(0, 24)]);
      }, 1400);
    } catch (err: any) {
      console.error('Conversion Error:', err);
      setError(err.message || 'Conversion failed');
      setStage('idle');
      setProgress(0);
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

  const handleNavigate = (view: PageView) => {
    if (view.startsWith('seo-')) {
      setSeoRoute(view);
      setCurrentView('seo');
    } else {
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased transition-colors selection:bg-[#2563EB] selection:text-white flex flex-col justify-between`}>
      <div>
        {/* Main Header */}
        <Header
          currentView={currentView}
          onNavigate={handleNavigate}
          historyCount={history.length}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        {/* View Switcher */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16">
          {/* 1. Home View */}
          {currentView === 'home' && (
            <div className="space-y-16">
              <Hero
                onFileSelected={handleFileSelected}
                onSampleSelected={handleSampleSelected}
                onNavigate={handleNavigate}
                isLoading={isLoading}
                error={error}
              />
              <HowItWorks />
              <FaqSection />
            </div>
          )}

          {/* 2. Converter Workspace View */}
          {currentView === 'converter' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                    Converter Workspace
                  </h1>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                    Configure target format, DPI, and compression options for server-side processing.
                  </p>
                </div>
                {uploadedFile && (
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white transition-colors"
                  >
                    Reset & Upload New
                  </button>
                )}
              </div>

              {!uploadedFile ? (
                /* No file loaded -> show Upload Zone */
                <Hero
                  onFileSelected={handleFileSelected}
                  onSampleSelected={handleSampleSelected}
                  onNavigate={handleNavigate}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                /* File Loaded -> Two Column Professional Workspace */
                <div className="space-y-6">
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
                        supportedOutputs={uploadedFile.supportedOutputs || ['png', 'pdf', 'jpg', 'webp', 'svg']}
                      />

                      {/* Right: Engine Options & Conversion Trigger */}
                      <div className="space-y-6 flex flex-col justify-between">
                        <ConversionSettings
                          outputFormat={selectedOutputFormat}
                          options={options}
                          onChangeOptions={setOptions}
                        />

                        {/* Progress Bar or Convert Button */}
                        {stage !== 'idle' ? (
                          <ProgressBar progress={progress} stage={stage} statusText={statusText} />
                        ) : (
                          <button
                            onClick={handleStartConversion}
                            disabled={isLoading || uploadedFile.status !== 'supported'}
                            id="start-conversion-btn"
                            className={`w-full py-4 rounded-2xl text-sm font-extrabold text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
                              uploadedFile.status === 'supported'
                                ? 'bg-gradient-to-r from-[#2563EB] via-indigo-600 to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.99]'
                                : 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-70'
                            }`}
                          >
                            <Zap className="w-5 h-5 text-amber-300" />
                            <span>
                              {uploadedFile.status === 'supported'
                                ? `Convert .${uploadedFile.detectedFormat.toUpperCase()} → .${selectedOutputFormat.toUpperCase()} Now`
                                : `Engine Extension Required for .${uploadedFile.detectedFormat.toUpperCase()}`}
                            </span>
                          </button>
                        )}
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
                </div>
              )}
            </div>
          )}

          {/* 3. Supported Formats Matrix */}
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

          {/* 4. How It Works View */}
          {currentView === 'how-it-works' && <HowItWorks />}

          {/* 5. FAQ View */}
          {currentView === 'faq' && <FaqSection />}

          {/* 6. Legal & Contact Views */}
          {(currentView === 'privacy' || currentView === 'terms' || currentView === 'contact') && (
            <PrivacyTermsContact view={currentView} onNavigate={handleNavigate} />
          )}

          {/* 7. History Dashboard */}
          {currentView === 'dashboard' && (
            <DashboardHistory
              history={history}
              onClearHistory={() => setHistory([])}
              onRemoveItem={(id) => setHistory(history.filter((item) => item.id !== id))}
              onConvertNew={() => setCurrentView('converter')}
            />
          )}

          {/* 8. SEO Landing Pages */}
          {currentView === 'seo' && (
            <SeoLandingPage
              route={seoRoute}
              onFileSelected={handleFileSelected}
              onSampleSelected={handleSampleSelected}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>

      {/* Main Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
