import React from 'react';
import { PageView } from '../types.js';
import { Layers, ArrowRight, Clock, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  historyCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  historyCount,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
          id="header-logo-btn"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              Convert<span className="text-[#2563EB]">X</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              SaaS Engine
            </span>
          </div>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
          <button
            id="nav-home-btn"
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentView === 'home'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Home
          </button>
          <button
            id="nav-converter-btn"
            onClick={() => onNavigate('converter')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentView === 'converter'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Converter
          </button>
          <button
            id="nav-formats-btn"
            onClick={() => onNavigate('formats')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentView === 'formats'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Supported Formats
          </button>
          <button
            id="nav-how-it-works-btn"
            onClick={() => onNavigate('how-it-works')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentView === 'how-it-works'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            How It Works
          </button>
          <button
            id="nav-faq-btn"
            onClick={() => onNavigate('faq')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentView === 'faq'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            FAQ
          </button>
        </nav>

        {/* Action Buttons & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white bg-slate-50 dark:bg-[#111827] transition-colors"
            title="Toggle Light / Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            id="nav-history-btn"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] transition-colors"
            title="Recent Conversion History"
          >
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#2563EB] text-white font-bold">
                {historyCount}
              </span>
            )}
          </button>

          <button
            id="nav-start-converting-btn"
            onClick={() => onNavigate('converter')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Converting</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
