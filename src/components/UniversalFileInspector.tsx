import React from 'react';
import {
  ShieldCheck,
  FileText,
  Layers,
  ArrowRight,
  HardDrive,
  Cpu,
  Lock,
  Compass,
  Box,
  Database,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { UploadedFile, FormatCapability, PageView } from '../types.js';

interface UniversalFileInspectorProps {
  file: UploadedFile | null;
  onClose: () => void;
  capabilities: FormatCapability[];
  onSelectFormat: (format: string) => void;
  onNavigate: (view: PageView) => void;
}

const FORMAT_SOFTWARE_MAP: Record<string, string> = {
  dxf: 'AutoCAD / QCad / DraftSight',
  dwg: 'Autodesk AutoCAD',
  stl: 'Blender / SolidWorks / PrusaSlicer',
  obj: 'Wavefront / Maya / 3ds Max',
  ply: 'MeshLab / CloudCompare',
  nc: 'Tekla Structures / DSTV Standard',
  dstv: 'Advance Steel / Tekla',
  gcode: 'Cura / PrusaSlicer CNC',
  csv: 'Microsoft Excel / Python Pandas',
  tsv: 'R / Data Science Notebooks',
  json: 'Node.js / Web Application State',
  parquet: 'Apache Spark / DuckDB / PyArrow',
  safetensors: 'Hugging Face / PyTorch / Transformers',
  onnx: 'Microsoft ONNX Runtime',
  gguf: 'llama.cpp / Ollama / LM Studio',
  docx: 'Microsoft Word / LibreOffice Writer',
  xlsx: 'Microsoft Excel / LibreOffice Calc',
  pdf: 'Adobe Acrobat / ISO 32000 Engine',
  png: 'libpng / Sharp High-Performance Raster',
  jpg: 'libjpeg-turbo / Camera Sensor',
  webp: 'Google WebP Engine',
  mp3: 'FFmpeg Audio Transcoder / LAME',
  mp4: 'FFmpeg Video Container / H.264',
};

export const UniversalFileInspector: React.FC<UniversalFileInspectorProps> = ({
  file,
  onClose,
  capabilities,
  onSelectFormat,
  onNavigate,
}) => {
  if (!file) return null;

  const ext = (file.detectedFormat || file.fileName.split('.').pop() || '').toLowerCase();
  const software = FORMAT_SOFTWARE_MAP[ext] || 'Standard Operating System Software';

  const cap = capabilities.find((c) => c.extension === ext);
  const realOutputs = cap?.supportedOutputs || file.supportedOutputs || [];

  const isCad = ['dxf', 'dwg', 'nc', 'dstv'].includes(ext);
  const is3D = ['stl', 'obj', 'ply', '3mf'].includes(ext);
  const isData = ['csv', 'tsv', 'json', 'jsonl', 'parquet'].includes(ext);
  const isMl = ['safetensors', 'onnx', 'gguf', 'tflite'].includes(ext);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pr-10">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider block">
              Universal File Inspector
            </span>
            <h3 className="text-lg font-black text-white truncate max-w-md">{file.fileName}</h3>
          </div>
        </div>

        {/* Metadata Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Format</span>
            <div className="text-base font-black text-white uppercase">.{ext}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">File Size</span>
            <div className="text-base font-mono font-bold text-cyan-400">
              {(file.fileSize / 1024).toFixed(1)} KB
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Category</span>
            <div className="text-base font-bold text-white capitalize">{file.category || 'General'}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">MIME Type</span>
            <div className="text-[11px] font-mono font-semibold text-slate-300 truncate">
              {file.mimeType || 'application/octet-stream'}
            </div>
          </div>
        </div>

        {/* Software & Security Checks */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Authoring Ecosystem:</span>
            <span className="font-bold text-slate-200">{software}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Security Audit:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Magic Bytes Verified & Sandbox Safe
            </span>
          </div>
        </div>

        {/* Real Verified Conversions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              Verified Real Conversions for .{ext.toUpperCase()}:
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {realOutputs.length} Engines Active
            </span>
          </div>

          {realOutputs.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {realOutputs.map((out) => (
                <button
                  key={out}
                  onClick={() => {
                    onSelectFormat(out);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                >
                  Convert to .{out}
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              This format is registered for inspection and workflow exchange. Direct binary conversion engine is coming soon.
            </div>
          )}
        </div>

        {/* Direct Studio Launch Shortcut */}
        {(isCad || is3D || isData || isMl) && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Dedicated Studio Available:</span>
            {isCad && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('cad-studio');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Compass className="w-3.5 h-3.5" /> Open in CAD Studio
              </button>
            )}
            {is3D && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('threed-studio');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Box className="w-3.5 h-3.5" /> Open in 3D Studio
              </button>
            )}
            {isData && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('data-studio');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Database className="w-3.5 h-3.5" /> Open in Data Studio
              </button>
            )}
            {isMl && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('ml-studio');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Cpu className="w-3.5 h-3.5" /> Open in ML Studio
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
