import React, { useState } from 'react';
import { PageView } from '../types.js';
import { ShieldCheck, Lock, Mail, Send, CheckCircle2, MessageSquare } from 'lucide-react';

interface PrivacyTermsContactProps {
  view: PageView;
  onNavigate: (view: PageView) => void;
}

export const PrivacyTermsContact: React.FC<PrivacyTermsContactProps> = ({ view, onNavigate }) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: 'Engine Request', message: '' });

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
            <span>Strict File Privacy Guarantee</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Privacy Policy</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">Effective Date: August 13, 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">1. Automatic File Deletion Policy</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              ConvertX operates on a ephemeral architecture. Files uploaded for conversion are held strictly in temporary server buffers associated with randomized UUID session identifiers. All uploaded source files and converted output files are automatically scrubbed from memory and server disk immediately following file completion or after 15 minutes of inactivity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">2. Zero Permanent Storage</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              We do not permanently store, log, retain, index, or analyze your design files, vector geometry, CAD blueprints, or converted outputs. Your files remain exclusively your intellectual property.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">3. Data Security & Encryption</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              All file transmissions between your browser and ConvertX conversion servers are encrypted in transit using industry-standard TLS 1.3 (HTTPS). We do not sell or transmit your metadata or file contents to third parties.
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
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Terms of Service</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">Last Updated: August 13, 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">1. Acceptance of Terms</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              By accessing ConvertX — Universal Design File Converter, you agree to comply with these terms of service and all applicable laws and regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">2. Permissible File Usage</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              You agree not to upload files containing malicious code, viruses, illegal content, or intellectual property you do not have permission to process.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">3. Service Availability</h2>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              ConvertX provides file conversion tools on an "as-is" basis. While we maintain high reliability and rendering accuracy for images, vectors, PDFs, and CAD drawings, ConvertX is not liable for data loss or conversion discrepancies.
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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Contact & Extension Requests</h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
          Have questions, custom CAD engine requests, or feedback? Send us a message below.
        </p>
      </div>

      {contactSubmitted ? (
        <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">Message Received!</h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
            Thank you for contacting ConvertX. Our engineering team has received your message and request.
          </p>
          <button
            onClick={() => setContactSubmitted(false)}
            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
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
              <option value="Engine Request">Commercial Engine Request (DWG, PSD, FBX)</option>
              <option value="Technical Support">Technical Support & Issue Report</option>
              <option value="API Integration">API Integration & Enterprise License</option>
              <option value="General Feedback">General Feedback</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Message</label>
            <textarea
              required
              rows={4}
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              placeholder="Describe your file conversion workflow or desired engine integration..."
              className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            type="submit"
            id="submit-contact-btn"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Send Message</span>
          </button>
        </form>
      )}
    </div>
  );
};
