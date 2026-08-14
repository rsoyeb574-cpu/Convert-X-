import React from 'react';
import { PageView } from '../types.js';
import { Layers, ShieldCheck, Lock } from 'lucide-react';
import { SEO_ROUTES } from '../data/seoRoutes.js';

interface FooterProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const imageConverters = ['png-to-jpg', 'jpg-to-png', 'png-to-webp', 'jpg-to-webp', 'webp-to-png', 'webp-to-jpg'];
  const docVectorConverters = ['png-to-pdf', 'jpg-to-pdf', 'pdf-to-png', 'pdf-to-jpg', 'svg-to-png', 'svg-to-jpg', 'svg-to-pdf', 'dxf-to-pdf'];

  return (
    <footer className="bg-white dark:bg-[#0B1120] border-t border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] transition-colors mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Convert<span className="text-[#2563EB]">-X</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8] max-w-sm">
              Your files are processed strictly for conversion and are not permanently stored. Convert-X uses real server-side engines with instant automatic memory file purging upon download.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>256-bit TLS</span>
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Zero-Retention</span>
              </span>
            </div>
          </div>

          {/* Raster Image Converters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
              Image Converters
            </h4>
            <ul className="space-y-2 text-xs">
              {imageConverters.map((slug) => {
                const item = SEO_ROUTES[slug];
                if (!item) return null;
                return (
                  <li key={slug}>
                    <a
                      href={`/${slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('seo', slug);
                      }}
                      className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                    >
                      {item.h1}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* PDF & Vector Converters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
              PDF & Vector Tools
            </h4>
            <ul className="space-y-2 text-xs">
              {docVectorConverters.map((slug) => {
                const item = SEO_ROUTES[slug];
                if (!item) return null;
                return (
                  <li key={slug}>
                    <a
                      href={`/${slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('seo', slug);
                      }}
                      className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                    >
                      {item.h1}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Workspace & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
              Platform & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/converter"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('converter');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                >
                  Universal Workspace
                </a>
              </li>
              <li>
                <a
                  href="/formats"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('formats');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                >
                  Supported Formats
                </a>
              </li>
              <li>
                <a
                  href="/how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('how-it-works');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="/affiliates"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('affiliates');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium"
                >
                  <span>Recommended Tools</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">Partner</span>
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('pricing');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors font-medium text-amber-600 dark:text-amber-400"
                >
                  Pricing & Pro
                </a>
              </li>
              <li>
                <a
                  href="/faq"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('faq');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                >
                  FAQ & Docs
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('privacy');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('terms');
                  }}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 Convert-X. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('privacy');
              }}
              className="hover:text-[#2563EB]"
            >
              Privacy
            </a>
            <span>•</span>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('terms');
              }}
              className="hover:text-[#2563EB]"
            >
              Terms
            </a>
            <span>•</span>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('contact');
              }}
              className="hover:text-[#2563EB]"
            >
              Contact
            </a>
            <span>•</span>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-[#2563EB]">
              Sitemap.xml
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
