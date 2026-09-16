import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  FileText,
  Lock,
  Layers,
  Sparkles,
  Download,
  Info,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { FileDoctorReport, DoctorProblem, DoctorAction, PageView } from '../types.js';

interface SmartFileDoctorProps {
  initialFile?: File | null;
  jobId?: string;
  initialReport?: FileDoctorReport | null;
  onClose?: () => void;
  onConvert?: (format: string, repairedJobId?: string) => void;
  onNavigate?: (view: PageView) => void;
  asModal?: boolean;
}

export const SmartFileDoctor: React.FC<SmartFileDoctorProps> = ({
  initialFile,
  jobId,
  initialReport,
  onClose,
  onConvert,
  onNavigate,
  asModal = false,
}) => {
  const [report, setReport] = useState<FileDoctorReport | null>(initialReport || null);
  const [loading, setLoading] = useState<boolean>(!initialReport && !!(initialFile || jobId));
  const [error, setError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState<boolean>(false);
  const [repairNotes, setRepairNotes] = useState<string[] | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | undefined>(jobId);

  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
      return;
    }

    const runDiagnosis = async () => {
      setLoading(true);
      setError(null);
      try {
        if (initialFile) {
          const formData = new FormData();
          formData.append('file', initialFile);
          const res = await fetch('/api/doctor/diagnose', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Diagnosis failed');
          setReport(data.report);
        } else if (activeJobId) {
          const res = await fetch('/api/doctor/diagnose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: activeJobId }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Diagnosis failed');
          setReport(data.report);
        }
      } catch (err: any) {
        console.error('Doctor diagnosis error:', err);
        setError(err.message || 'Could not analyze the file.');
      } finally {
        setLoading(false);
      }
    };

    if (initialFile || activeJobId) {
      runDiagnosis();
    }
  }, [initialFile, activeJobId, initialReport]);

  const handleRepair = async () => {
    if (!activeJobId) return;
    setRepairing(true);
    try {
      const res = await fetch('/api/doctor/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: activeJobId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.notes?.join(' ') || 'Repair could not be completed.');
      }
      setRepairNotes(data.notes || ['File successfully repaired.']);
      if (data.updatedReport) {
        setReport(data.updatedReport);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to repair file.');
    } finally {
      setRepairing(false);
    }
  };

  const getHealthBadge = (status: string, score: number) => {
    if (status === 'HEALTHY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" /> Healthy ({score}/100)
        </span>
      );
    }
    if (status === 'EXTENSION_MISMATCH') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs">
          <AlertTriangle className="w-3.5 h-3.5" /> Extension Mismatch ({score}/100)
        </span>
      );
    }
    if (status === 'PARTIALLY_READABLE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-bold text-xs">
          <AlertTriangle className="w-3.5 h-3.5" /> Partially Readable ({score}/100)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs">
        <XCircle className="w-3.5 h-3.5" /> Structural Corruption ({score}/100)
      </span>
    );
  };

  const content = (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Smart File Doctor</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                AI & Structural Diagnostics
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deep binary inspection, extension mismatch detection, header verification, and automatic file repair.
            </p>
          </div>
        </div>

        {asModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Analyzing file structure, magic signatures, and security integrity...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm space-y-1">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Diagnosis Notice
          </div>
          <div>{error}</div>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Extension Mismatch Banner */}
          {!report.file.extensionMatches && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Extension Mismatch Detected!
              </div>
              <p className="text-xs leading-relaxed">
                This file is named with extension <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 font-mono font-bold">.{report.file.declaredExtension}</code>,
                but internal binary magic bytes verify it is actually a <strong className="underline">.{report.file.detectedExtension.toUpperCase()}</strong> ({report.format.name}).
              </p>
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 pt-1">
                Convert-X automatically corrected the engine pipeline to process it using the genuine format!
              </div>
            </div>
          )}

          {/* Health & Security Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Health Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                File Health Status
              </span>
              <div className="flex items-center justify-between">
                {getHealthBadge(report.validity.status, report.validity.healthScore)}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                {report.validity.summary}
              </p>
            </div>

            {/* Magic Bytes Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Magic Signature
              </span>
              <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                {report.format.magicBytes}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Container: {report.format.containerType}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                MIME: {report.file.mimeType}
              </div>
            </div>

            {/* Security Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Security Sandbox Audit
              </span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {report.security.status === 'SAFE' ? 'Safe to Process' : report.security.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {report.security.details}
              </p>
            </div>
          </div>

          {/* Repair Notification if triggered */}
          {repairNotes && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Repair Successful!
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {repairNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Repair Action Banner if canRepair is true */}
          {report.validity.canRepair && !repairNotes && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Automated Repair Available
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  We can rebuild damaged trailers, normalize corrupted headers, and restore readable page trees.
                </p>
              </div>

              {activeJobId && (
                <button
                  onClick={handleRepair}
                  disabled={repairing}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {repairing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                  <span>{repairing ? 'Repairing File...' : 'Repair File Now'}</span>
                </button>
              )}
            </div>
          )}

          {/* Problems List */}
          {report.problemsFound.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Diagnostic Findings ({report.problemsFound.length})
              </h3>
              <div className="space-y-2">
                {report.problemsFound.map((prob, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      prob.severity === 'critical'
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
                        : prob.severity === 'warning'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {prob.severity === 'critical' ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>{prob.title}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">{prob.description}</p>
                    {prob.userGuidance && (
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 pt-0.5">
                        💡 Guidance: {prob.userGuidance}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recommended Actions
              </h3>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                {report.supportedActions.length} Actions Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {report.supportedActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.targetFormat && onConvert) {
                      onConvert(action.targetFormat, activeJobId);
                      if (onClose) onClose();
                    } else if (action.type === 'compress' && onNavigate) {
                      onNavigate('compress');
                      if (onClose) onClose();
                    } else if (action.type === 'repair') {
                      handleRepair();
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all group flex items-center justify-between gap-2 cursor-pointer ${
                    action.isRecommended
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 hover:border-blue-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {action.label}
                      </span>
                      {action.isRecommended && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-600 text-white">
                          Best
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {action.description}
                    </p>
                  </div>

                  <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 transition-colors shrink-0">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      {content}
    </div>
  );
};
