import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Are conversions real or simulated?',
      a: 'All supported conversions (PNG, JPG, WEBP, PDF, SVG, DXF) are executed in real-time by high-performance server-side engines (Sharp, pdf-lib, dxf-parser). We never fake or simulate file conversions.',
    },
    {
      q: 'How does ConvertX handle temporary uploaded files?',
      a: 'Your security and privacy are paramount. Uploaded files are stored in temporary isolated server buffers assigned with random UUIDs. They are automatically deleted immediately after conversion or after 15 minutes of inactivity.',
    },
    {
      q: 'How are CAD .DXF files converted without AutoCAD?',
      a: 'ConvertX includes a custom vector CAD parser that parses DXF entity structures (lines, arcs, circles, polylines, layers, ACI color indices, text) directly into scaled vector SVGs and printable PDFs.',
    },
    {
      q: 'Why are Adobe PSD/AI and 3D OBJ/FBX formats marked as "Coming Soon"?',
      a: 'ConvertX follows a strict "No Fake Conversions" policy. Rather than generating broken placeholders, proprietary commercial formats (Photoshop, Illustrator, AutoCAD DWG, 3ds Max, Maya FBX) are clearly marked with their engine extension requirements until those specific server modules are connected.',
    },
    {
      q: 'What is the maximum file size limit for uploads?',
      a: 'The current free workspace supports design and document files up to 50MB per upload.',
    },
    {
      q: 'Can I choose custom DPI and background colors for exports?',
      a: 'Yes! ConvertX provides configurable DPI sliders (72 DPI web, 150 DPI HD, 300 DPI print quality) and custom background color pickers for transparent PNG/SVG inputs.',
    },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl transition-colors">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-center gap-2">
          <HelpCircle className="w-6 h-6 text-[#2563EB]" />
          <span>Frequently Asked Questions</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
          Everything you need to know about ConvertX file conversion, security, and CAD parsing.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl bg-slate-50 dark:bg-[#0B1120] overflow-hidden transition-colors"
            >
              <button
                id={`faq-toggle-${idx}`}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-between gap-4 hover:text-[#2563EB] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#64748B] dark:text-[#94A3B8] transition-transform ${isOpen ? 'rotate-180 text-[#2563EB]' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed border-t border-[#E2E8F0] dark:border-[#1E293B] pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
