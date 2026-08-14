import React, { useState } from 'react';
import { PageView } from '../types.js';
import { ShieldCheck, Lock, Mail, Send, CheckCircle2, FileText, HelpCircle, HardDrive } from 'lucide-react';

interface PrivacyTermsContactProps {
  view: PageView;
  onNavigate: (view: PageView, seoSlug?: string) => void;
}

export const PrivacyTermsContact: React.FC<PrivacyTermsContactProps> = ({ view, onNavigate }) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: 'Technical Support', message: '' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  if (view === 'privacy') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-10 shadow-xl transition-colors">
        <div className="space-y-3 pb-6 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Strict Zero-Retention Privacy Policy</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Privacy Policy</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">Last Updated: August 14, 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">1. Uploaded Files & Ephemeral Processing</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              Convert-X operates on an ephemeral, zero-retention processing architecture. When you upload an image, document, vector, or PDF file for conversion, the file is temporarily loaded in secure, isolated server memory exclusively for the duration of the conversion job.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">2. Automated File Deletion Policy</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              All uploaded source files and converted output files are assigned randomized UUID tokens and are automatically purged from server storage:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#64748B] dark:text-[#94A3B8]">
              <li>Immediately upon successful download by your browser session.</li>
              <li>Or within an absolute maximum window of 15 minutes of server inactivity.</li>
              <li>We never inspect, index, sell, or create machine learning datasets from your files.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">3. Cookies and Local Storage Usage</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              Convert-X uses client-side <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px]">localStorage</code> strictly to store your current UI theme preference (dark/light mode) and to count your daily free plan conversions. We do not use persistent tracking cookies or share cross-device fingerprints.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">4. Analytics & Advertising Networks</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              To support free conversions, Convert-X may display non-intrusive advertisements served through Google AdSense or certified sponsor networks. These third-party advertising partners may use standard web beacons or cookies in compliance with GDPR, CCPA, and Google publisher policies. You may opt out of personalized ads via Google Ad Settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">5. Data Security & Encryption</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              All communication between your client browser and Convert-X conversion endpoints is protected by 256-bit TLS/SSL encryption in transit.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">6. Privacy Contact</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              For any questions regarding our zero-retention privacy practices, contact our security officer at <a href="mailto:privacy@convert-x.com" className="text-[#2563EB] dark:text-blue-400 underline font-medium">privacy@convert-x.com</a>.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (view === 'terms') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-10 shadow-xl transition-colors">
        <div className="space-y-3 pb-6 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            <span>Convert-X Service Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Terms of Service</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">Last Updated: August 14, 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">1. Acceptance of Terms</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              By accessing and using Convert-X ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please discontinue using the service immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">2. Permissible File Usage & Prohibited Activities</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              You retain full ownership and intellectual property rights over all files you upload. You agree not to upload:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#64748B] dark:text-[#94A3B8]">
              <li>Executable files containing malicious software, viruses, or exploits.</li>
              <li>Content that infringes third-party copyrights, trademarks, or proprietary rights.</li>
              <li>Illegal, defamatory, or harmful content.</li>
              <li>Automated scraping or denial-of-service traffic designed to bypass rate limits.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">3. Free Plan Limits and Fair Usage</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              The Free plan is provided for personal and regular business conversions subject to reasonable fair-use limits: 25MB maximum file size and 10 conversions per calendar day. Pro subscriptions unlock increased limits (100MB max file size and unlimited daily conversions).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">4. Service Availability & Disclaimers</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              Convert-X is provided on an "as-is" and "as-available" basis. While our conversion engines strive for pixel-perfect mathematical and raster accuracy, Convert-X is not liable for data loss, document formatting variations, or conversion discrepancies. Always maintain local backups of your critical files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">5. Governing Law</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              These terms are governed by applicable international digital trade laws and service standards.
            </p>
          </section>
        </div>
      </div>
    );
  }

  // Contact Page
  return (
    <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-10 shadow-xl transition-colors">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Contact Convert-X Support</h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
          Have questions about file limits, format support, billing, or feature suggestions? Our team is here to help.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-[#2563EB] shrink-0" />
          <div>
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Direct Support Email: </span>
            <a href="mailto:support@convert-x.com" className="text-[#2563EB] dark:text-blue-400 font-bold hover:underline">
              support@convert-x.com
            </a>
          </div>
        </div>
        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
          Avg Response Time: &lt; 24 hours
        </span>
      </div>

      {contactSubmitted ? (
        <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">Message Received!</h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
            Thank you for reaching out to Convert-X. Our team will review your inquiry and reply to {contactForm.email} shortly.
          </p>
          <button
            onClick={() => setContactSubmitted(false)}
            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Your Name</label>
              <input
                type="text"
                required
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Email Address</label>
              <input
                type="email"
                required
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="jane@company.com"
                className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Inquiry Subject</label>
            <select
              value={contactForm.subject}
              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="Technical Support">Technical Support & Issue Report</option>
              <option value="Pro Plan & Billing">Pro Plan & Pricing Questions</option>
              <option value="Format Request">New Format Request (DWG, PSD, AI)</option>
              <option value="General Inquiry">General Inquiry & Feedback</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Message</label>
            <textarea
              required
              rows={4}
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              placeholder="How can we assist your file conversion workflow?"
              className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            type="submit"
            id="submit-contact-btn"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send Message</span>
          </button>
        </form>
      )}
    </div>
  );
};
