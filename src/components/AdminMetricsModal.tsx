import React, { useState, useEffect } from 'react';
import {
  Activity,
  X,
  RefreshCw,
  Server,
  TrendingUp,
  FileCheck,
  AlertTriangle,
  Download,
  HardDrive,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { ServerMetricsData } from '../types.js';

interface AdminMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminMetricsModal: React.FC<AdminMetricsModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<ServerMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) throw new Error('Failed to load server telemetry.');
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      } else {
        throw new Error('Invalid telemetry payload.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <span>Convert-X Real-Time Operational Analytics</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Live Telemetry
                </span>
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Real server-side metrics, conversion throughput, error logs, and monetization status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white transition-colors cursor-pointer"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading && !metrics && (
          <div className="py-12 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2563EB] mb-2" />
            <span>Fetching live server telemetry...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {metrics && (
          <div className="space-y-6">
            {/* Primary KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Uploads</span>
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  {metrics.totalUploads}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Conversions</span>
                  <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {metrics.successfulConversions}
                </p>
                <span className="text-[10px] text-slate-400">
                  of {metrics.totalConversionsRequested} requested
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Downloads</span>
                  <Download className="w-3.5 h-3.5 text-violet-500" />
                </div>
                <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
                  {metrics.totalDownloads}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Failed Jobs</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {metrics.failedConversions}
                </p>
              </div>
            </div>

            {/* System Health & Memory */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Server Uptime</span>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatUptime(metrics.uptimeSeconds)}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-violet-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">RAM Allocation</span>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    ~{metrics.estimatedMemoryUsageMB} MB RSS
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3">
                <Layers className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Bytes Processed</span>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatBytes(metrics.totalBytesProcessed)}
                  </p>
                </div>
              </div>
            </div>

            {/* Popular Format Distribution */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
                Output Format Breakdown
              </h4>
              {Object.keys(metrics.targetFormatDistribution || {}).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metrics.targetFormatDistribution).map(([format, count]) => (
                    <div
                      key={format}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] text-xs flex items-center gap-2 shadow-xs"
                    >
                      <span className="font-mono font-bold uppercase text-[#2563EB]">.{format}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                        {count} {count === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No conversions recorded during this server cycle yet.</p>
              )}
            </div>

            {/* Google AdSense Status */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Google AdSense Integration
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400">
                  {metrics.adsenseIntegration?.configured ? 'Active' : 'Unconfigured'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Publisher ID: <code className="text-[#0F172A] dark:text-[#F8FAFC] font-mono">{metrics.adsenseIntegration?.publisherId || 'None'}</code>
              </p>
              <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                {metrics.adsenseIntegration?.revenueStatus}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
