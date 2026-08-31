import React, { useState } from 'react';
import {
  User,
  Settings,
  Shield,
  Zap,
  Check,
  Copy,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Download,
  Trash2,
  Share2,
  Mail,
  X,
  Sparkles,
} from 'lucide-react';
import { UserPreferences, UserProfile, PageView } from '../types.js';
import { saveUserPreferences, saveUserProfile } from '../utils/userStore.js';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  preferences: UserPreferences;
  onPreferencesChange: (newPrefs: UserPreferences) => void;
  onProfileChange: (newProfile: UserProfile) => void;
  usedToday?: number;
  dailyLimit?: number | string;
  isPro?: boolean;
  onNavigate?: (view: PageView) => void;
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  profile,
  preferences,
  onPreferencesChange,
  onProfileChange,
  usedToday = 0,
  dailyLimit = 5,
  isPro = false,
  onNavigate,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'referrals'>('profile');
  const [emailInput, setEmailInput] = useState(profile.email || '');
  const [isSavedEmail, setIsSavedEmail] = useState(profile.isRegistered);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      onToast?.('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }
    const updated = saveUserProfile({ email: emailInput, isRegistered: true });
    onProfileChange(updated);
    setIsSavedEmail(true);
    onToast?.('Account Saved', 'Your optional account profile has been saved.', 'success');
  };

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(profile.referralCode || 'CONVERTX-FREE');
      setCopiedCode(true);
      onToast?.('Code Copied', 'Referral code copied to clipboard.', 'success');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // fallback
    }
  };

  const handlePreferenceUpdate = (key: keyof UserPreferences, value: any) => {
    const updated = saveUserPreferences({ [key]: value });
    onPreferencesChange(updated);
    onToast?.('Preferences Updated', `Saved ${String(key)}.`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-[#2563EB]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                User Account & Settings
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {profile.isRegistered && profile.email ? profile.email : 'Optional client account profile'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-[#E2E8F0] dark:border-[#1E293B] px-3 sm:px-6 bg-slate-50/50 dark:bg-[#0B1120]/50 scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-blue-400'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Account Overview
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'preferences'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-blue-400'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Saved Preferences
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'referrals'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-blue-400'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Referrals & Code
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* TAB 1: PROFILE OVERVIEW */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Plan & Usage Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Active Plan:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                        isPro
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200'
                      }`}
                    >
                      {isPro ? 'Pro Member' : 'Free Tier'}
                    </span>
                  </div>
                  <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                    {isPro ? 'Unlimited conversions available' : `Used today: ${usedToday} / ${dailyLimit}`}
                  </p>
                </div>

                {!isPro && onNavigate && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate('pricing');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>

              {/* Optional Email Registration */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#2563EB]" />
                    <span>Optional Account Registration</span>
                  </span>
                  {isSavedEmail && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                      Saved
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Convert-X never forces account creation for free conversions. Link an email to back up preferences across sessions.
                </p>

                <form onSubmit={handleSaveEmail} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </form>
              </div>

              {/* Zero Retention Notice */}
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero-retention security: Converted files are permanently wiped after 30 minutes.</span>
              </div>
            </div>
          )}

          {/* TAB 2: SAVED PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              {/* Default Output Format */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block">
                  Default Target Format
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['png', 'jpg', 'pdf', 'webp'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handlePreferenceUpdate('defaultTargetFormat', fmt)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        preferences.defaultTargetFormat === fmt
                          ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-blue-400'
                      }`}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Convert on Upload Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#2563EB]" />
                    <span>Auto-Convert on Upload</span>
                  </span>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Automatically convert files upon addition to the queue without manually clicking Convert.
                  </p>
                </div>
                <button
                  type="button"
                  id="account-auto-convert-toggle"
                  onClick={() => handlePreferenceUpdate('autoConvertOnUpload', !preferences.autoConvertOnUpload)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    preferences.autoConvertOnUpload ? 'bg-[#2563EB]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle auto-convert on upload"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      preferences.autoConvertOnUpload ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Download Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[#2563EB]" />
                    <span>Auto-Download Converted Files</span>
                  </span>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Automatically trigger file download when single conversion finishes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceUpdate('autoDownload', !preferences.autoDownload)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    preferences.autoDownload ? 'bg-[#2563EB]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      preferences.autoDownload ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto-Delete After Download Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-[#2563EB]" />
                    <span>Auto-Delete After Download</span>
                  </span>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Automatically clear files from the conversion queue and local storage once downloaded.
                  </p>
                </div>
                <button
                  type="button"
                  id="account-auto-delete-toggle"
                  onClick={() =>
                    handlePreferenceUpdate(
                      'autoDeleteAfterDownload',
                      !preferences.autoDeleteAfterDownload
                    )
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    preferences.autoDeleteAfterDownload ? 'bg-[#2563EB]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle auto-delete after download"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      preferences.autoDeleteAfterDownload ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Image Quality Slider */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#2563EB]" />
                    <span>Default Image Quality</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-[#2563EB]">
                    {preferences.imageQuality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={preferences.imageQuality}
                  onChange={(e) => handlePreferenceUpdate('imageQuality', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  <span>Smallest size (50%)</span>
                  <span>Balanced (85%)</span>
                  <span>Max Fidelity (100%)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REFERRALS */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#2563EB]" />
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Your Personal Referral Code
                  </h4>
                </div>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Share your link with friends. When they perform their first conversion, you receive +1 bonus conversion for the day!
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 font-mono font-bold text-xs text-[#2563EB] dark:text-blue-400">
                    {profile.referralCode || 'CONVERTX-FREE'}
                  </div>
                  <button
                    onClick={handleCopyReferral}
                    className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('referral');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open Full Referral Dashboard</span>
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50/50 dark:bg-[#0B1120]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
