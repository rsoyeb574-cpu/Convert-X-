import React from 'react';
import { ToolItem } from '../data/toolRegistry.js';
import {
  FileText,
  FileType,
  Minimize2,
  Image as ImageIcon,
  Volume2,
  RefreshCw,
  Cpu,
  Box,
  FileSpreadsheet,
  BookOpen,
  Film,
  Scissors,
  Layers,
  Music,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface ToolCardProps {
  tool: ToolItem;
  onOpenTool: (tool: ToolItem) => void;
  isRecent?: boolean;
}

export const renderToolIcon = (iconName: string, className: string = 'w-4 h-4') => {
  switch (iconName) {
    case 'FileText':
      return <FileText className={className} />;
    case 'FileType':
      return <FileType className={className} />;
    case 'Minimize2':
      return <Minimize2 className={className} />;
    case 'Image':
      return <ImageIcon className={className} />;
    case 'Volume2':
      return <Volume2 className={className} />;
    case 'RefreshCw':
      return <RefreshCw className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Box':
      return <Box className={className} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Film':
      return <Film className={className} />;
    case 'Scissors':
      return <Scissors className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Music':
      return <Music className={className} />;
    case 'Sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onOpenTool, isRecent }) => {
  const isAvailable = tool.status === 'available';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenTool(tool);
  };

  // Category-specific color accents
  const getCategoryStyles = () => {
    switch (tool.category) {
      case 'pdf':
        return {
          iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
          accent: 'hover:border-rose-300 dark:hover:border-rose-700/80',
        };
      case 'compress':
        return {
          iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
          accent: 'hover:border-emerald-300 dark:hover:border-emerald-700/80',
        };
      case 'tts':
        return {
          iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60',
          accent: 'hover:border-indigo-300 dark:hover:border-indigo-700/80',
        };
      case 'other':
        return {
          iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-900/60',
          accent: 'hover:border-purple-300 dark:hover:border-purple-700/80',
        };
      case 'converter':
      default:
        return {
          iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-900/60',
          accent: 'hover:border-blue-300 dark:hover:border-blue-700/80',
        };
    }
  };

  const styles = getCategoryStyles();

  return (
    <div
      id={`tool-card-${tool.id}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenTool(tool);
        }
      }}
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 dark:focus:ring-offset-[#0B0F17] ${
        styles.accent
      } ${!isAvailable ? 'opacity-85 hover:opacity-100 bg-slate-50/50 dark:bg-slate-900/40' : ''}`}
    >
      <div className="space-y-3">
        {/* Top bar: Icon & Badges */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${styles.iconBg}`}
          >
            {renderToolIcon(tool.icon, 'w-4 h-4')}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {isRecent && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                <Clock className="w-2.5 h-2.5" />
                <span>Recent</span>
              </span>
            )}

            {tool.badge && isAvailable && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                {tool.badge}
              </span>
            )}

            {/* Status Badge */}
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Available</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700">
                <span>Coming Soon</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            {tool.name}
          </h3>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Supported Formats Pill Row */}
        {(tool.inputFormats.length > 0 || tool.outputFormats.length > 0) && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8] flex-wrap pt-0.5">
            <span className="font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase">
              Formats:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {tool.inputFormats.slice(0, 2).map((fmt) => (
                <span
                  key={`in-${fmt}`}
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]"
                >
                  {fmt}
                </span>
              ))}
              <span className="text-slate-300 dark:text-slate-600 text-xs">→</span>
              {tool.outputFormats.slice(0, 2).map((fmt) => (
                <span
                  key={`out-${fmt}`}
                  className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-[10px] font-mono font-bold"
                >
                  {fmt}
                </span>
              ))}
              {tool.outputFormats.length > 2 && (
                <span className="text-[10px] text-slate-400 font-medium">
                  +{tool.outputFormats.length - 2}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer with CTA */}
      <div className="mt-3 pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
          {tool.category === 'tts' ? 'Voice' : tool.category}
        </span>
        <span
          className={`font-bold flex items-center gap-1 transition-transform group-hover:translate-x-0.5 ${
            isAvailable
              ? 'text-[#2563EB] dark:text-blue-400 group-hover:underline'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <span>{isAvailable ? 'Open Tool' : 'Preview'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
