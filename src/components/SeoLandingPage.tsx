import React from 'react';
import { PageView } from '../types.js';
import { UploadZone } from './UploadZone.js';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Sparkles, FileCode, FileText, Image as ImageIcon } from 'lucide-react';

interface SeoLandingPageProps {
  route: string;
  onFileSelected: (file: File) => void;
  onSampleSelected: (sampleKey: string) => void;
  onNavigate: (view: PageView) => void;
}

export const SeoLandingPage: React.FC<SeoLandingPageProps> = ({
  route,
  onFileSelected,
  onSampleSelected,
  onNavigate,
}) => {
  const getRouteInfo = () => {
    switch (route) {
      case 'seo-dxf-to-pdf':
        return {
          title: 'Convert DXF Architectural CAD to PDF Online',
          badge: 'DXF → PDF Vector Engine',
          subtitle: 'Parse AutoCAD .DXF blueprint entities (lines, arcs, layers, polylines) into crisp, scalable PDF drawings instantly.',
          sampleKey: 'sample-dxf',
          icon: <FileCode className="w-6 h-6 text-[#2563EB]" />,
          features: [
            'Preserves CAD vector scaling and layer entity structures',
            'Supports AutoCAD ACI color tables and line weights',
            'No AutoCAD software installation required',
            'Encrypted 256-bit TLS transmission & instant file purging',
          ],
        };
      case 'seo-image-to-pdf':
        return {
          title: 'Convert PNG, JPG & WEBP Images to PDF',
          badge: 'Image → PDF Compiler',
          subtitle: 'Combine and convert raster design images into clean printable PDF documents with custom page margins and orientation.',
          sampleKey: 'sample-png',
          icon: <ImageIcon className="w-6 h-6 text-emerald-500" />,
          features: [
            'Configurable page dimensions (A4, Letter, Legal)',
            'Ultra-sharp 300 DPI print-ready rendering option',
            'Supports transparent PNG/WEBP background color fills',
            '100% real server compilation with pdf-lib engine',
          ],
        };
      case 'seo-pdf-to-png':
        return {
          title: 'Rasterize PDF Pages to High-Resolution PNG',
          badge: 'PDF → PNG Renderer',
          subtitle: 'Extract and convert PDF page vectors into high-density raster PNG images for web display or design presentations.',
          sampleKey: 'sample-pdf',
          icon: <FileText className="w-6 h-6 text-cyan-500" />,
          features: [
            'Adjustable rendering density (72 DPI, 150 DPI, 300 DPI)',
            'Clean vector font rendering and antialiasing',
            'Preserves exact page proportions and graphics',
            'Free instant download with zero registration',
          ],
        };
      case 'seo-svg-to-png':
      default:
        return {
          title: 'Rasterize SVG Vector Graphics to PNG',
          badge: 'SVG → PNG Converter',
          subtitle: 'Convert scalable vector graphics (.SVG) into crisp raster PNG images with custom background transparency options.',
          sampleKey: 'sample-svg',
          icon: <Sparkles className="w-6 h-6 text-[#7C3AED]" />,
          features: [
            'Custom background fill (Transparent, White, Slate)',
            'Sharp vector element rendering powered by Sharp engine',
            'Perfect for app icons, website graphics, and UI design',
            'Scrubbed from server buffers immediately after output',
          ],
        };
    }
  };

  const info = getRouteInfo();

  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-xs font-bold">
          {info.icon}
          <span>{info.badge}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
          {info.title}
        </h1>

        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          {info.subtitle}
        </p>
      </div>

      {/* Upload Box */}
      <UploadZone
        onFileSelected={onFileSelected}
        onSampleSelected={onSampleSelected}
      />

      {/* Feature Bullet Grid */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
          Why Use ConvertX for {info.badge}?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {info.features.map((feat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                {feat}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-4 text-center border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <button
            onClick={() => onNavigate('converter')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 inline-flex items-center gap-2"
          >
            <span>Open Universal Converter Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
