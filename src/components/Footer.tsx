import React from 'react';
import { PageView } from '../types.js';
import { Layers, ShieldCheck, Zap, Lock, Mail } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: PageView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white dark:bg-[#0B1120] border-t border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] transition-colors mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Convert<span className="text-[#2563EB]">X</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              Premium Universal Design & CAD file converter. Real server-side vector rendering and image engines with instant automatic file deletion.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>256-bit TLS</span>
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Auto Scrubbed</span>
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
              Workspace & Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('converter')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  File Converter
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('formats')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  Supported Formats Matrix
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  Conversion History
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* Popular Converter Routes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
              Popular Converters
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('seo-dxf-to-pdf')}
                  className="hover:text-[#2563EB] transition-colors text-left"
                >
                  DXF CAD to PDF
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('seo-image-to-pdf')}
                  className="hover:text-[#2563EB] transition-colors text-left"
                >
                  PNG / JPG to PDF
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('seo-pdf-to-png')}
                  className="hover:text-[#2563EB] transition-colors text-left"
                >
                  PDF to PNG
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('seo-svg-to-png')}
                  className="hover:text-[#2563EB] transition-colors text-left"
                >
                  SVG to PNG
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
              Company & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  Contact & Engine Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('faq')}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  FAQ & Documentation
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 ConvertX SaaS Engine. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('privacy')} className="hover:text-[#2563EB]">
              Privacy
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('terms')} className="hover:text-[#2563EB]">
              Terms
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('contact')} className="hover:text-[#2563EB]">
              Contact
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
