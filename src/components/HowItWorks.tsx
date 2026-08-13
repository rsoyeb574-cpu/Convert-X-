import React from 'react';
import { Upload, FileSearch, Sliders, Cpu, Download } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Upload & Magic-Byte Detection',
      desc: 'Drag and drop your file. ConvertX inspects binary magic bytes to auto-detect file format securely without trusting raw extension strings.',
      icon: <Upload className="w-6 h-6 text-[#2563EB]" />,
    },
    {
      step: '02',
      title: 'Select Output & Engine Options',
      desc: 'Choose your desired export target (PNG, JPG, WEBP, PDF, SVG). Adjust compression quality, DPI density (72 to 300 DPI), background fill, and PDF page dimensions.',
      icon: <Sliders className="w-6 h-6 text-cyan-500" />,
    },
    {
      step: '03',
      title: 'Server-Side Vector & Raster Engine',
      desc: 'The backend conversion engine parses CAD vectors (DXF), PDF documents, or image buffers directly without fake mock conversions.',
      icon: <Cpu className="w-6 h-6 text-[#7C3AED]" />,
    },
    {
      step: '04',
      title: 'Preview & Instant Download',
      desc: 'Inspect the live high-definition preview of your converted output and download the converted file directly to your device.',
      icon: <Download className="w-6 h-6 text-emerald-500" />,
    },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl transition-colors">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC]">How ConvertX Works</h2>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
          Professional design file processing powered by server-side vector rendering and image engines.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {steps.map((s) => (
          <div
            key={s.step}
            className="p-6 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 relative group hover:border-[#2563EB] transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center shadow-sm">
                {s.icon}
              </div>
              <span className="text-2xl font-black text-slate-300 dark:text-slate-700 group-hover:text-[#2563EB] transition-colors">
                {s.step}
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{s.title}</h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
