import React from 'react';
import { FormatCapability } from '../types.js';
import { ArrowRight, Check, Lock, Sparkles } from 'lucide-react';

interface FormatSelectorProps {
  inputFormat: string;
  selectedOutputFormat: string;
  onSelectFormat: (format: string) => void;
  capabilities: FormatCapability[];
  supportedOutputs: string[];
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  inputFormat,
  selectedOutputFormat,
  onSelectFormat,
  capabilities,
  supportedOutputs,
}) => {
  const inFmtClean = inputFormat.toLowerCase() === 'jpeg' ? 'jpg' : inputFormat.toLowerCase();

  const activeOutputs = capabilities.filter(
    (c) => c.status === 'supported' && supportedOutputs.includes(c.extension)
  );

  const comingSoonOutputs = capabilities.filter(
    (c) => c.status !== 'supported' || (c.extension !== inFmtClean && !supportedOutputs.includes(c.extension))
  );

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-lg transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
          Target Output Format
        </h3>
        <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Source: <strong className="text-[#2563EB] font-bold uppercase">.{inFmtClean}</strong>
        </span>
      </div>

      {/* Active Available Output Options */}
      <div>
        <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Select Desired Target Format:
        </label>
        {activeOutputs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeOutputs.map((fmt) => {
              const isSelected = selectedOutputFormat === fmt.extension;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  id={`format-option-${fmt.extension}`}
                  onClick={() => onSelectFormat(fmt.extension)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400 font-bold shadow-md shadow-blue-500/10'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold uppercase">{fmt.extension}</span>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                        Supported
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate mt-1">{fmt.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
            No direct converter engine available for input format .{inFmtClean}. You can request an engine extension via our contact page.
          </div>
        )}
      </div>

      {/* Future Formats Notice */}
      {comingSoonOutputs.length > 0 && (
        <div className="pt-2">
          <details className="group">
            <summary className="text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer flex items-center gap-1.5 font-semibold select-none">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>View Commercial & 3D Engine Extension Options</span>
            </summary>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              {comingSoonOutputs.slice(0, 8).map((fmt) => (
                <div
                  key={fmt.id}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] text-xs flex items-center justify-between"
                >
                  <div className="truncate">
                    <span className="font-bold uppercase text-[#0F172A] dark:text-[#F8FAFC] mr-1.5">.{fmt.extension}</span>
                    <span className="text-[10px] truncate block">{fmt.name}</span>
                  </div>
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
