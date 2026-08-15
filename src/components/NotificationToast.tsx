import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { ToastNotification } from '../types.js';

interface NotificationToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              isSuccess
                ? 'bg-white/95 dark:bg-[#111827]/95 border-emerald-300 dark:border-emerald-700/60 text-[#0F172A] dark:text-white'
                : isError
                ? 'bg-white/95 dark:bg-[#111827]/95 border-rose-300 dark:border-rose-700/60 text-[#0F172A] dark:text-white'
                : isWarning
                ? 'bg-white/95 dark:bg-[#111827]/95 border-amber-300 dark:border-amber-700/60 text-[#0F172A] dark:text-white'
                : 'bg-white/95 dark:bg-[#111827]/95 border-blue-300 dark:border-blue-700/60 text-[#0F172A] dark:text-white'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {isError && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
