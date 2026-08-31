import React, { useState } from 'react';
import { PageView, AppLimits } from '../types.js';
import { DEFAULT_LIMITS } from '../utils/usageTracker.js';
import { Layers, ArrowRight, Clock, Sun, Moon, Sparkles, Gift, User, Menu, X, Wrench, FileText, HelpCircle } from 'lucide-react';

interface HeaderProps {
  currentView: PageView;
  onNavigate: (view: PageView, seoSlug?: string) => void;
  historyCount: number;
  queueCount?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  usedToday?: number;
  limits?: AppLimits;
  onOpenAccountModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  historyCount,
  queueCount = 0,
  darkMode,
  onToggleDarkMode,
  usedToday = 0,
  limits = DEFAULT_LIMITS,
  onOpenAccountModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const safeLimits = limits || DEFAULT_LIMITS;
  const maxConversions = safeLimits?.dailyConversions ?? DEFAULT_LIMITS.dailyConversions;
  const safeUsedToday = typeof usedToday === 'number' && !isNaN(usedToday) ? Math.max(0, usedToday) : 0;
  const isLimitReached = safeUsedToday >= maxConversions;

  const handleMobileNav = (view: PageView) => {
    setMobileMenuOpen(false);
    onNavigate(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Logo & Mobile Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white bg-slate-50 dark:bg-[#111827] transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-left group focus:outline-none"
            id="header-logo-btn"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                Convert<span className="text-[#2563EB]">-X</span>
              </span>
              <span className="hidden lg:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                Online Engine
              </span>
            </div>
          </a>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
          <a
            id="nav-home-btn"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              currentView === 'home'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Home
          </a>
          <a
            id="nav-converter-btn"
            href="/converter"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('converter');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              currentView === 'converter'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Converter
          </a>
          <a
            id="nav-text-to-pdf-btn"
            href="/text-to-pdf"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('text-to-pdf');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              currentView === 'text-to-pdf'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Text to PDF</span>
            <span className="px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold">
              New
            </span>
          </a>
          <a
            id="nav-compress-btn"
            href="/compress"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('compress');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              currentView === 'compress'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Compress File</span>
          </a>
          <a
            id="nav-tools-btn"
            href="/tools"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('tools');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              currentView === 'tools'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Tools
          </a>
          <a
            id="nav-formats-btn"
            href="/formats"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('formats');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              currentView === 'formats'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Formats
          </a>
          <a
            id="nav-how-it-works-btn"
            href="/how-it-works"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('how-it-works');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              currentView === 'how-it-works'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            How It Works
          </a>
          <a
            id="nav-pricing-btn"
            href="/pricing"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('pricing');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              currentView === 'pricing'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Pricing</span>
            <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold">
              Pro
            </span>
          </a>
          <a
            id="nav-referral-btn"
            href="/referral"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('referral');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              currentView === 'referral'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-blue-500" />
            <span>Referrals</span>
          </a>
          <a
            id="nav-faq-btn"
            href="/faq"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('faq');
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              currentView === 'faq'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white font-bold'
                : 'hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            FAQ
          </a>
        </nav>

        {/* Action Buttons & Theme Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Account Trigger */}
          {onOpenAccountModal && (
            <button
              id="header-account-btn"
              onClick={onOpenAccountModal}
              className="p-1.5 sm:p-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white bg-slate-50 dark:bg-[#111827] transition-colors cursor-pointer"
              title="Account Settings"
              aria-label="Account Settings"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2563EB]" />
            </button>
          )}

          {/* Daily Usage Counter Pill */}
          <button
            onClick={() => onNavigate('pricing')}
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all hover:scale-[1.02] cursor-pointer ${
              isLimitReached
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]'
            }`}
            title="Today's free conversion usage"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>
              Today: <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{safeUsedToday}</strong>/{maxConversions}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleDarkMode}
            className="p-1.5 sm:p-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white bg-slate-50 dark:bg-[#111827] transition-colors cursor-pointer"
            title="Toggle Light / Dark Mode"
            aria-label="Toggle Light and Dark Mode"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />}
          </button>

          {/* Dashboard Button */}
          <a
            id="nav-history-btn"
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('dashboard');
            }}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl border transition-colors ${
              currentView === 'dashboard'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white border-blue-200 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#1E293B]'
            }`}
            title="Dashboard & Conversion Queue"
          >
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">Dashboard</span>
            {queueCount > 0 ? (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-bold animate-pulse">
                {queueCount}
              </span>
            ) : historyCount > 0 ? (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#2563EB] text-white font-bold">
                {historyCount}
              </span>
            ) : null}
          </a>

          {/* Upgrade to Pro Button */}
          <a
            id="nav-pro-btn"
            href="/pricing"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('pricing');
            }}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 rounded-xl shadow-xs shadow-blue-500/20 transition-all active:scale-[0.98] shrink-0"
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Upgrade</span>
            <span className="xs:hidden">Pro</span>
          </a>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1120] px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleMobileNav('home')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'home'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Home Converter</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('converter')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'converter'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Universal Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('text-to-pdf')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'text-to-pdf'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Text to PDF Studio</span>
              <span className="px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold">
                New
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('compress')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'compress'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Compress Files Online</span>
              <span className="px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold">
                New
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('tools')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'tools'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>All 40+ Online Tools</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('formats')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'formats'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Supported File Formats</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('how-it-works')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'how-it-works'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>How It Works</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('pricing')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'pricing'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Pricing & Pro Plans</span>
              <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold">
                Pro
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('referral')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'referral'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[#2563EB] dark:text-blue-400">
              <Gift className="w-3.5 h-3.5" />
              <span>Referrals & Free Bonus</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleMobileNav('faq')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
              currentView === 'faq'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-white'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>FAQ & Help</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}
    </header>
  );
};


