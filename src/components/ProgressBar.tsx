import React from 'react';
import { Upload, Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  stage: 'uploading' | 'processing' | 'converting' | 'completed' | 'idle';
  statusText?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, stage, statusText }) => {
  const stages = [
    { id: 'uploading', label: 'Upload', icon: <Upload className="w-3.5 h-3.5" /> },
    { id: 'processing', label: 'Process', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'converting', label: 'Convert', icon: <RefreshCw className="w-3.5 h-3.5" /> },
    { id: 'completed', label: 'Complete', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  const getStageIndex = (currentStage: string) => {
    switch (currentStage) {
      case 'uploading':
        return 0;
      case 'processing':
        return 1;
      case 'converting':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(stage);
  const isCompleted = stage === 'completed';

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <span>Server Processing Engine</span>
            {isCompleted && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold uppercase">
                Success
              </span>
            )}
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {statusText || 'Converting vectors, geometry and raster data...'}
          </p>
        </div>
        <span className={`text-base font-black ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#2563EB]'}`}>
          {progress}%
        </span>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 relative">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-500 to-green-600'
              : 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] animate-pulse'
          }`}
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>

      {/* Stages Stepper */}
      <div className="grid grid-cols-4 gap-2 pt-2">
        {stages.map((s, idx) => {
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex || isCompleted;

          return (
            <div
              key={s.id}
              className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                isDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold'
                  : isActive
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 font-extrabold'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 text-xs ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isActive
                    ? 'bg-[#2563EB] text-white animate-bounce'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {s.icon}
              </div>
              <span className="text-[11px] uppercase tracking-wider">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
