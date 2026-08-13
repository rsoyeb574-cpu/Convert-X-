import React from 'react';
import { ConversionHistoryItem } from '../types.js';
import { Clock, Download, Trash2, FileText, CheckCircle2 } from 'lucide-react';

interface DashboardHistoryProps {
  history: ConversionHistoryItem[];
  onClearHistory: () => void;
  onRemoveItem: (id: string) => void;
  onConvertNew: () => void;
}

export const DashboardHistory: React.FC<DashboardHistoryProps> = ({
  history,
  onClearHistory,
  onRemoveItem,
  onConvertNew,
}) => {
  const formatSize = (bytes?: number): string => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2563EB]" />
            <span>Recent Conversions Workspace</span>
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Local session history of converted files and direct download links.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            id="clear-history-btn"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold border border-[#E2E8F0] dark:border-[#1E293B] transition-colors flex items-center gap-1.5 w-fit"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold text-[10px]">
                <th className="py-3 px-3">File Name</th>
                <th className="py-3 px-3">Input</th>
                <th className="py-3 px-3">Output</th>
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 font-bold text-[#0F172A] dark:text-[#F8FAFC] max-w-xs truncate">
                    {item.fileName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] font-mono uppercase font-semibold">
                      {item.inputFormat}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-mono uppercase font-bold">
                      {item.outputFormat}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8]">{formatSize(item.outputSize)}</td>
                  <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                    <a
                      href={`/api/download/${item.jobId}`}
                      download
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-[11px] transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 rounded text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                      title="Remove from log"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 space-y-3 bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl">
          <Clock className="w-10 h-10 text-[#64748B] dark:text-[#94A3B8] mx-auto" />
          <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">No recent conversions found</p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
            Your recent conversion session history will appear here for quick access and downloads.
          </p>
          <button
            onClick={onConvertNew}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20"
          >
            Start Converting Now
          </button>
        </div>
      )}
    </div>
  );
};
