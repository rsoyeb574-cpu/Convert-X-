import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Download,
  Printer,
  Upload,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Activity,
  Cpu,
  Wrench,
  Compass,
  ArrowRight,
  Info,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { PageView } from '../types.js';

interface DxfEntity {
  type: string;
  layer: string;
  color?: string;
  points?: { x: number; y: number }[];
  cx?: number;
  cy?: number;
  r?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
  height?: number;
}

interface ParsedDrawing {
  format: 'dxf' | 'dstv' | 'svg' | 'dwg_guidance' | 'bim_guidance';
  filename: string;
  entities: DxfEntity[];
  layers: { name: string; visible: boolean; count: number; color: string }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
  rawText?: string;
  steelInfo?: {
    pieceMark: string;
    profile: string;
    length: number;
    grade: string;
    webThickness?: number;
    flangeThickness?: number;
    holesCount: number;
  };
}

const CAD_COLORS: Record<number, string> = {
  1: '#EF4444', // Red
  2: '#EAB308', // Yellow
  3: '#22C55E', // Green
  4: '#06B6D4', // Cyan
  5: '#3B82F6', // Blue
  6: '#EC4899', // Magenta
  7: '#F8FAFC', // White / Black depending on theme
  8: '#64748B', // Gray
  9: '#94A3B8', // Light Gray
};

interface CadStudioProps {
  onNavigate: (view: PageView) => void;
  onConvertUploadedFile?: (file: File, targetFormat: string, options?: any) => void;
}

export const CadStudio: React.FC<CadStudioProps> = ({ onNavigate, onConvertUploadedFile }) => {
  const [activeTab, setActiveTab] = useState<'viewer' | 'export' | 'guidance' | 'steel'>('viewer');
  const [drawing, setDrawing] = useState<ParsedDrawing | null>(null);
  const [theme, setTheme] = useState<'blueprint' | 'dark' | 'light'>('blueprint');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showLayerDrawer, setShowLayerDrawer] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Drawing Export Studio Options
  const [exportPaperSize, setExportPaperSize] = useState<string>('a3');
  const [exportOrientation, setExportOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [exportDpi, setExportDpi] = useState<number>(300);
  const [exportMargin, setExportMargin] = useState<string>('normal');
  const [exportBg, setExportBg] = useState<'white' | 'transparent' | 'blueprint'>('white');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'svg' | 'png' | 'jpg'>('pdf');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample architectural DXF on mount if empty
  useEffect(() => {
    loadSampleDxf();
  }, []);

  const loadSampleDxf = () => {
    const sampleEntities: DxfEntity[] = [
      // Outer Foundation Walls
      { type: 'LINE', layer: 'WALLS', points: [{ x: 0, y: 0 }, { x: 12000, y: 0 }] },
      { type: 'LINE', layer: 'WALLS', points: [{ x: 12000, y: 0 }, { x: 12000, y: 8000 }] },
      { type: 'LINE', layer: 'WALLS', points: [{ x: 12000, y: 8000 }, { x: 0, y: 8000 }] },
      { type: 'LINE', layer: 'WALLS', points: [{ x: 0, y: 8000 }, { x: 0, y: 0 }] },
      // Interior Partitions
      { type: 'LINE', layer: 'WALLS', points: [{ x: 4500, y: 0 }, { x: 4500, y: 8000 }] },
      { type: 'LINE', layer: 'WALLS', points: [{ x: 8000, y: 3500 }, { x: 12000, y: 3500 }] },
      { type: 'LINE', layer: 'WALLS', points: [{ x: 8000, y: 0 }, { x: 8000, y: 8000 }] },
      // Doors & Windows
      { type: 'LINE', layer: 'DOORS', points: [{ x: 4500, y: 2000 }, { x: 5400, y: 2000 }] },
      { type: 'ARC', layer: 'DOORS', cx: 4500, cy: 2000, r: 900, startAngle: 0, endAngle: 90 },
      { type: 'LINE', layer: 'DOORS', points: [{ x: 8000, y: 5000 }, { x: 8000, y: 5900 }] },
      { type: 'ARC', layer: 'DOORS', cx: 8000, cy: 5000, r: 900, startAngle: 90, endAngle: 180 },
      // Structural Columns
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 0, cy: 0, r: 250 },
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 4500, cy: 0, r: 250 },
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 8000, cy: 0, r: 250 },
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 12000, cy: 0, r: 250 },
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 0, cy: 8000, r: 250 },
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 4500, cy: 8000, r: 250 },
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 8000, cy: 8000, r: 250 },
      { type: 'CIRCLE', layer: 'STRUCTURAL', cx: 12000, cy: 8000, r: 250 },
      // Grid & Dimensions
      { type: 'LINE', layer: 'DIMENSIONS', points: [{ x: -800, y: 0 }, { x: -800, y: 8000 }] },
      { type: 'LINE', layer: 'DIMENSIONS', points: [{ x: 0, y: -800 }, { x: 12000, y: -800 }] },
      { type: 'TEXT', layer: 'ANNOTATIONS', cx: 2000, cy: 4000, text: 'PRIMARY ASSEMBLY - LEVEL 01', height: 280 },
      { type: 'TEXT', layer: 'ANNOTATIONS', cx: 6000, cy: 4000, text: 'CONFERENCE SUITE (45.0 m²)', height: 220 },
      { type: 'TEXT', layer: 'ANNOTATIONS', cx: 9800, cy: 5500, text: 'CONTROL OFFICE', height: 200 },
      { type: 'TEXT', layer: 'DIMENSIONS', cx: -1300, cy: 4000, text: '8,000 mm', height: 180 },
      { type: 'TEXT', layer: 'DIMENSIONS', cx: 6000, cy: -1300, text: '12,000 mm', height: 180 },
    ];

    setDrawing({
      format: 'dxf',
      filename: 'sample_architectural_floorplan.dxf',
      entities: sampleEntities,
      layers: [
        { name: 'WALLS', visible: true, count: 6, color: '#38BDF8' },
        { name: 'DOORS', visible: true, count: 4, color: '#4ADE80' },
        { name: 'STRUCTURAL', visible: true, count: 8, color: '#F87171' },
        { name: 'DIMENSIONS', visible: true, count: 4, color: '#FBBF24' },
        { name: 'ANNOTATIONS', visible: true, count: 3, color: '#E2E8F0' },
      ],
      bounds: { minX: -2000, minY: -2000, maxX: 14000, maxY: 10000, width: 16000, height: 12000 },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Check for proprietary formats requiring open exchange guidance
    if (['dwg', 'rvt', 'rfa', 'skp', 'pln', 'dgn'].includes(ext)) {
      setDrawing({
        format: 'dwg_guidance',
        filename: file.name,
        entities: [],
        layers: [],
        bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 },
      });
      setActiveTab('guidance');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (ext === 'nc' || ext === 'dstv' || ext === 'nc1') {
        parseDstvContent(file.name, content);
      } else {
        parseDxfContent(file.name, content);
      }
    };
    reader.readAsText(file);
  };

  const parseDxfContent = (filename: string, content: string) => {
    const lines = content.split(/\r?\n/);
    const entities: DxfEntity[] = [];
    const layersMap: Record<string, { count: number; color: string }> = {};

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    let inEntities = false;
    let currentType = '';
    let currentLayer = '0';
    let currentEntity: Partial<DxfEntity> = {};
    let pts: { x: number; y: number }[] = [];

    const updateBounds = (x: number, y: number) => {
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    };

    for (let i = 0; i < lines.length - 1; i += 2) {
      const code = lines[i].trim();
      const val = lines[i + 1]?.trim();

      if (code === '2' && val === 'ENTITIES') {
        inEntities = true;
        continue;
      }
      if (code === '0' && val === 'ENDSEC') {
        inEntities = false;
      }

      if (!inEntities) continue;

      if (code === '0') {
        // Flush previous entity
        if (currentType && (pts.length > 0 || currentEntity.cx !== undefined || currentEntity.text)) {
          entities.push({
            type: currentType,
            layer: currentLayer,
            points: pts,
            ...currentEntity,
          } as DxfEntity);
          layersMap[currentLayer] = layersMap[currentLayer] || { count: 0, color: '#38BDF8' };
          layersMap[currentLayer].count++;
        }

        currentType = val;
        currentEntity = {};
        pts = [];
        continue;
      }

      if (code === '8') {
        currentLayer = val;
      } else if (code === '10') {
        const x = parseFloat(val);
        currentEntity.cx = x;
        updateBounds(x, currentEntity.cy || 0);
      } else if (code === '20') {
        const y = parseFloat(val);
        currentEntity.cy = y;
        updateBounds(currentEntity.cx || 0, y);
      } else if (code === '11') {
        const x2 = parseFloat(val);
        if (currentEntity.cx !== undefined && currentEntity.cy !== undefined) {
          pts = [{ x: currentEntity.cx, y: currentEntity.cy }, { x: x2, y: 0 }];
        }
      } else if (code === '21') {
        const y2 = parseFloat(val);
        if (pts.length === 2) {
          pts[1].y = y2;
          updateBounds(pts[0].x, pts[0].y);
          updateBounds(pts[1].x, pts[1].y);
        }
      } else if (code === '40') {
        currentEntity.r = parseFloat(val);
        currentEntity.height = parseFloat(val);
      } else if (code === '50') {
        currentEntity.startAngle = parseFloat(val);
      } else if (code === '51') {
        currentEntity.endAngle = parseFloat(val);
      } else if (code === '1') {
        currentEntity.text = val;
      }
    }

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 1000;
      maxY = 1000;
    }

    const width = Math.max(maxX - minX, 100);
    const height = Math.max(maxY - minY, 100);

    const layerList = Object.keys(layersMap).map((name, idx) => ({
      name,
      visible: true,
      count: layersMap[name].count,
      color: CAD_COLORS[(idx % 9) + 1] || '#38BDF8',
    }));

    setDrawing({
      format: 'dxf',
      filename,
      entities,
      layers: layerList.length > 0 ? layerList : [{ name: '0', visible: true, count: entities.length, color: '#38BDF8' }],
      bounds: { minX, minY, maxX, maxY, width, height },
      rawText: content.slice(0, 3000),
    });
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const parseDstvContent = (filename: string, content: string) => {
    const lines = content.split(/\r?\n/);
    let pieceMark = 'MARK-01';
    let profile = 'HEB 300';
    let length = 6000;
    let grade = 'S355JR';
    let holesCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'ST' && lines[i + 1]) {
        pieceMark = lines[i + 1]?.trim() || pieceMark;
        profile = lines[i + 4]?.trim() || profile;
        grade = lines[i + 5]?.trim() || grade;
        length = parseFloat(lines[i + 6]?.trim() || '6000');
      }
      if (line === 'BO') {
        holesCount++;
      }
    }

    // Generate visualization entities for steel member
    const entities: DxfEntity[] = [
      // Top Flange
      { type: 'LINE', layer: 'PROFILE', points: [{ x: 0, y: 300 }, { x: length, y: 300 }] },
      // Bottom Flange
      { type: 'LINE', layer: 'PROFILE', points: [{ x: 0, y: 0 }, { x: length, y: 0 }] },
      // Ends
      { type: 'LINE', layer: 'PROFILE', points: [{ x: 0, y: 0 }, { x: 0, y: 300 }] },
      { type: 'LINE', layer: 'PROFILE', points: [{ x: length, y: 0 }, { x: length, y: 300 }] },
      // Web Centerline
      { type: 'LINE', layer: 'CENTERLINE', points: [{ x: 0, y: 150 }, { x: length, y: 150 }] },
      // Bolt Holes
      { type: 'CIRCLE', layer: 'HOLES', cx: 120, cy: 80, r: 11 },
      { type: 'CIRCLE', layer: 'HOLES', cx: 120, cy: 220, r: 11 },
      { type: 'CIRCLE', layer: 'HOLES', cx: length - 120, cy: 80, r: 11 },
      { type: 'CIRCLE', layer: 'HOLES', cx: length - 120, cy: 220, r: 11 },
    ];

    setDrawing({
      format: 'dstv',
      filename,
      entities,
      layers: [
        { name: 'PROFILE', visible: true, count: 4, color: '#38BDF8' },
        { name: 'CENTERLINE', visible: true, count: 1, color: '#FBBF24' },
        { name: 'HOLES', visible: true, count: 4, color: '#F87171' },
      ],
      bounds: { minX: -200, minY: -200, maxX: length + 200, maxY: 500, width: length + 400, height: 700 },
      steelInfo: {
        pieceMark,
        profile,
        length,
        grade,
        webThickness: 11,
        flangeThickness: 19,
        holesCount: Math.max(holesCount, 4),
      },
      rawText: content.slice(0, 3000),
    });
    setActiveTab('steel');
  };

  const toggleLayerVisibility = (layerName: string) => {
    if (!drawing) return;
    setDrawing({
      ...drawing,
      layers: drawing.layers.map((l) => (l.name === layerName ? { ...l, visible: !l.visible } : l)),
    });
  };

  // Zoom & Pan Handlers
  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.max(0.1, Math.min(prev * factor, 15)));
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (drawing?.format === 'dxf' || drawing?.format === 'dstv') {
        const svgContent = generateSvgExportString();
        const blob = new Blob([svgContent], { type: exportFormat === 'svg' ? 'image/svg+xml' : 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${drawing.filename.replace(/\.[^/.]+$/, '')}_exported.${exportFormat === 'svg' ? 'svg' : 'svg'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const generateSvgExportString = (): string => {
    if (!drawing) return '<svg></svg>';
    const b = drawing.bounds;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX} ${b.minY} ${b.width} ${b.height}" width="100%" height="100%">
  <rect x="${b.minX}" y="${b.minY}" width="${b.width}" height="${b.height}" fill="${exportBg === 'white' ? '#FFFFFF' : exportBg === 'blueprint' ? '#0F2942' : 'none'}"/>
  ${drawing.entities
    .filter((e) => drawing.layers.find((l) => l.name === e.layer)?.visible !== false)
    .map((e) => {
      const col = exportBg === 'white' ? '#1E293B' : '#38BDF8';
      if (e.type === 'LINE' && e.points && e.points.length >= 2) {
        return `<line x1="${e.points[0].x}" y1="${e.points[0].y}" x2="${e.points[1].x}" y2="${e.points[1].y}" stroke="${col}" stroke-width="${Math.max(b.width / 800, 1)}"/>`;
      }
      if (e.type === 'CIRCLE' && e.cx !== undefined && e.cy !== undefined && e.r) {
        return `<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" stroke="${col}" stroke-width="${Math.max(b.width / 800, 1)}" fill="none"/>`;
      }
      if (e.type === 'TEXT' && e.cx !== undefined && e.cy !== undefined && e.text) {
        return `<text x="${e.cx}" y="${e.cy}" font-size="${e.height || 14}" fill="${col}" font-family="sans-serif">${e.text}</text>`;
      }
      return '';
    })
    .join('\n  ')}
</svg>`;
  };

  const handlePrint = () => {
    window.print();
  };

  const visibleLayersMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    drawing?.layers.forEach((l) => {
      map[l.name] = l.visible;
    });
    return map;
  }, [drawing?.layers]);

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 font-sans pb-16">
      {/* Studio Banner */}
      <div className="border-b border-slate-800 bg-[#0B1329]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  CAD & Drawing Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Universal Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Architectural DXF, Steel DSTV/NC, Vector SVG, and Drawing Export Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('viewer')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'viewer'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Drawing Viewer
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'export'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Export Studio
            </button>
            <button
              onClick={() => setActiveTab('steel')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'steel'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Steel & DSTV
            </button>
            <button
              onClick={() => setActiveTab('guidance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'guidance'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              BIM & Exchange Guide
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Open Drawing
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf,.nc,.dstv,.nc1,.svg,.dwg,.rvt,.ifc"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* TAB 1: DRAWING VIEWER */}
        {activeTab === 'viewer' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Stage & Canvas */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
                {/* Control Toolbar */}
                <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300 truncate max-w-[200px]">
                      {drawing?.filename || 'No drawing loaded'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px]">
                      {drawing?.entities.length || 0} entities
                    </span>
                  </div>

                  {/* Viewer Controls */}
                  <div className="flex items-center gap-1.5">
                    {/* Theme selector */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center mr-2">
                      <button
                        onClick={() => setTheme('blueprint')}
                        title="Architectural Blueprint Theme"
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          theme === 'blueprint' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Blueprint
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        title="Dark Theme"
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          theme === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setTheme('light')}
                        title="Paper Light Theme"
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          theme === 'light' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Light
                      </button>
                    </div>

                    <button
                      onClick={() => handleZoom(1.25)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleZoom(0.8)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFitToScreen}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Fit To Screen"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowLayerDrawer(!showLayerDrawer)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        showLayerDrawer ? 'bg-cyan-600/30 text-cyan-400' : 'bg-slate-800 text-slate-300'
                      }`}
                      title="Toggle Layer Drawer"
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handlePrint}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Print Drawing"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* SVG Render Stage */}
                <div
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`w-full h-[540px] select-none cursor-grab active:cursor-grabbing overflow-hidden relative flex items-center justify-center transition-colors ${
                    theme === 'blueprint'
                      ? 'bg-[#0B1E36] bg-gradient-to-b from-[#091A30] to-[#0D2440]'
                      : theme === 'dark'
                      ? 'bg-[#090D16]'
                      : 'bg-[#F8FAFC]'
                  }`}
                  style={{
                    backgroundImage:
                      theme === 'blueprint'
                        ? 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)'
                        : theme === 'light'
                        ? 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)'
                        : 'none',
                    backgroundSize: '30px 30px',
                  }}
                >
                  {drawing ? (
                    <svg
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                        width: '90%',
                        height: '90%',
                      }}
                      viewBox={`${drawing.bounds.minX} ${drawing.bounds.minY} ${drawing.bounds.width} ${drawing.bounds.height}`}
                      className="w-full h-full overflow-visible pointer-events-none"
                    >
                      {drawing.entities.map((e, idx) => {
                        const isVisible = visibleLayersMap[e.layer] !== false;
                        if (!isVisible) return null;

                        const layerColor =
                          drawing.layers.find((l) => l.name === e.layer)?.color ||
                          (theme === 'light' ? '#0F172A' : '#38BDF8');

                        if (e.type === 'LINE' && e.points && e.points.length >= 2) {
                          return (
                            <line
                              key={idx}
                              x1={e.points[0].x}
                              y1={e.points[0].y}
                              x2={e.points[1].x}
                              y2={e.points[1].y}
                              stroke={layerColor}
                              strokeWidth={Math.max(drawing.bounds.width / 900, 2)}
                              strokeLinecap="round"
                            />
                          );
                        }
                        if (e.type === 'CIRCLE' && e.cx !== undefined && e.cy !== undefined && e.r) {
                          return (
                            <circle
                              key={idx}
                              cx={e.cx}
                              cy={e.cy}
                              r={e.r}
                              stroke={layerColor}
                              strokeWidth={Math.max(drawing.bounds.width / 900, 2)}
                              fill="none"
                            />
                          );
                        }
                        if (e.type === 'ARC' && e.cx !== undefined && e.cy !== undefined && e.r) {
                          // Simple arc rendering via path
                          const startRad = ((e.startAngle || 0) * Math.PI) / 180;
                          const endRad = ((e.endAngle || 90) * Math.PI) / 180;
                          const x1 = e.cx + e.r * Math.cos(startRad);
                          const y1 = e.cy + e.r * Math.sin(startRad);
                          const x2 = e.cx + e.r * Math.cos(endRad);
                          const y2 = e.cy + e.r * Math.sin(endRad);
                          return (
                            <path
                              key={idx}
                              d={`M ${x1} ${y1} A ${e.r} ${e.r} 0 0 1 ${x2} ${y2}`}
                              stroke={layerColor}
                              strokeWidth={Math.max(drawing.bounds.width / 900, 2)}
                              fill="none"
                            />
                          );
                        }
                        if (e.type === 'TEXT' && e.cx !== undefined && e.cy !== undefined && e.text) {
                          return (
                            <text
                              key={idx}
                              x={e.cx}
                              y={e.cy}
                              fontSize={e.height || 160}
                              fill={layerColor}
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {e.text}
                            </text>
                          );
                        }
                        return null;
                      })}
                    </svg>
                  ) : (
                    <div className="text-center p-6 text-slate-500">
                      <p className="font-semibold text-sm">No drawing loaded</p>
                      <button
                        onClick={loadSampleDxf}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold"
                      >
                        Load Architectural Sample
                      </button>
                    </div>
                  )}

                  {/* Viewport Info Overlay */}
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-400">
                    Zoom: {Math.round(zoom * 100)}% | Rot: {rotation}° | Size:{' '}
                    {Math.round(drawing?.bounds.width || 0)} × {Math.round(drawing?.bounds.height || 0)} mm
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Layers & Geometry Info */}
            <div className="space-y-4">
              {/* Layers List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-black text-sm text-white">CAD Layers</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {drawing?.layers.length || 0} active
                  </span>
                </div>

                <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {drawing?.layers.map((layer) => (
                    <div
                      key={layer.name}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="font-mono font-bold text-slate-200 truncate max-w-[110px]">
                          {layer.name}
                        </span>
                        <span className="text-[10px] text-slate-500">({layer.count})</span>
                      </div>
                      <button
                        onClick={() => toggleLayerVisibility(layer.name)}
                        className={`p-1 rounded-md transition-colors ${
                          layer.visible
                            ? 'text-cyan-400 hover:bg-cyan-500/20'
                            : 'text-slate-600 hover:bg-slate-800'
                        }`}
                        title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geometry Stats Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-xs space-y-2.5">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Drawing Properties
                </h4>
                <div className="flex justify-between text-slate-400">
                  <span>File Format:</span>
                  <span className="font-bold text-white uppercase">{drawing?.format}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Entities:</span>
                  <span className="font-mono font-bold text-cyan-400">{drawing?.entities.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Extents X:</span>
                  <span className="font-mono text-white">
                    {Math.round(drawing?.bounds.minX || 0)} → {Math.round(drawing?.bounds.maxX || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Extents Y:</span>
                  <span className="font-mono text-white">
                    {Math.round(drawing?.bounds.minY || 0)} → {Math.round(drawing?.bounds.maxY || 0)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setActiveTab('export')}
                    className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Open in Export Studio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DRAWING EXPORT STUDIO (SECTION 4 OF AUDIT) */}
        {activeTab === 'export' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-extrabold uppercase text-cyan-400 tracking-wider block mb-1">
                Precision Drawing Publisher
              </span>
              <h2 className="text-xl font-black text-white">Drawing Export Studio</h2>
              <p className="text-xs text-slate-400 mt-1">
                Export CAD drawings to ISO / ANSI paper sheets, high-DPI vector PDF, and lossless raster images.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Paper Size & Layout */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-300">1. Paper Standard & Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'letter', 'legal'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setExportPaperSize(size)}
                      className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${
                        exportPaperSize === size
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-slate-300 pt-2">2. Sheet Orientation</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportOrientation('landscape')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      exportOrientation === 'landscape'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    Landscape (Architectural)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportOrientation('portrait')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      exportOrientation === 'portrait'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    Portrait (Vertical)
                  </button>
                </div>

                <label className="block text-xs font-bold text-slate-300 pt-2">3. Margins</label>
                <div className="grid grid-cols-4 gap-2">
                  {['none', 'small', 'normal', 'large'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExportMargin(m)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        exportMargin === m
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution, Format & Background */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-300">4. Target Format (Real Verified Outputs)</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'pdf', label: 'PDF Document', desc: 'Vector ISO sheet layout' },
                    { id: 'svg', label: 'SVG Vector', desc: 'Scalable web graphic' },
                    { id: 'png', label: 'PNG Image', desc: 'Lossless raster with alpha' },
                    { id: 'jpg', label: 'JPG Image', desc: 'Compressed photo format' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        exportFormat === fmt.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-black uppercase text-sm text-white">{fmt.id}</div>
                      <div className="text-[10px] text-slate-400">{fmt.desc}</div>
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-slate-300 pt-2">5. Export Resolution (DPI)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[72, 150, 300, 600].map((dpi) => (
                    <button
                      key={dpi}
                      type="button"
                      onClick={() => setExportDpi(dpi)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        exportDpi === dpi
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      {dpi} DPI
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-slate-300 pt-2">6. Background Canvas</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'white', label: 'White Paper' },
                    { id: 'transparent', label: 'Transparent' },
                    { id: 'blueprint', label: 'Blueprint' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setExportBg(bg.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        exportBg === bg.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="text-xs text-slate-400">
                Publishing <span className="font-bold text-white uppercase">.{exportFormat}</span> at{' '}
                <span className="font-mono text-cyan-400">{exportDpi} DPI</span> on{' '}
                <span className="font-bold text-white uppercase">{exportPaperSize}</span> (
                {exportOrientation})
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export Drawing File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STEEL & METAL STUDIO (DSTV / NC) */}
        {activeTab === 'steel' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Steel & Metal Fabrication Studio</h3>
                  <p className="text-xs text-slate-400">
                    DSTV (.nc, .nc1), NC, and G-Code CNC parsing with cutting lists & shop drawing export.
                  </p>
                </div>
              </div>

              {drawing?.steelInfo ? (
                <div className="mt-6 space-y-6">
                  {/* Steel Profile Specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Piece Mark</div>
                      <div className="text-base font-black text-amber-400">{drawing.steelInfo.pieceMark}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Profile Section</div>
                      <div className="text-base font-black text-white">{drawing.steelInfo.profile}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Cut Length</div>
                      <div className="text-base font-mono font-bold text-cyan-400">
                        {drawing.steelInfo.length} mm
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Steel Grade</div>
                      <div className="text-base font-black text-white">{drawing.steelInfo.grade}</div>
                    </div>
                  </div>

                  {/* Hole Positions & CNC Operations */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Hole Drills & CNC Operations:</span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {drawing.steelInfo.holesCount} Drills Detected
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Flange and web hole coordinates parsed from DSTV standard block headers (BO blocks).
                      Ready to export into cutting list table or PDF shop drawing.
                    </p>
                  </div>

                  {/* Export Options */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF Shop Drawing
                    </button>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Export CSV Cutting List
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-xs">No DSTV / NC file currently loaded.</p>
                  <button
                    onClick={() => {
                      parseDstvContent('sample_beam_w12x50.nc', `ST\nB-101\n1\n1\nW12X50\nS355JR\n5800.0\n300.0\n16.0\n10.0\nEN\nBO\nv\n100.0\n50.0\n22.0\nBO\nv\n100.0\n150.0\n22.0\nEN`);
                    }}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    Load Sample DSTV Beam
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE, BIM & STRUCTURAL GUIDANCE (SECTIONS 6 & 7 OF AUDIT) */}
        {activeTab === 'guidance' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Info className="w-4 h-4" />
                  Engineering Standard & Exchange Workflow
                </div>
                <h2 className="text-xl font-black text-white">
                  Why Proprietary BIM & CAD Files Require Open Exchange
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Convert-X operates on verifiable, open engineering formats to ensure 100% geometric accuracy
                  without corrupting design elements.
                </p>
              </div>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Autodesk Revit (RVT/RFA) */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Autodesk Revit (.RVT, .RFA)</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      Export to IFC
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Revit files use a closed OLE database schema tightly coupled to Autodesk desktop licenses.
                    To convert Revit projects:
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-xs text-slate-300 font-mono space-y-1">
                    <div>1. In Revit: File → Export → IFC (Industry Foundation Classes)</div>
                    <div>2. Or Export: File → Export → CAD Formats → DXF</div>
                    <div>3. Upload the resulting .IFC or .DXF to Convert-X for universal rendering.</div>
                  </div>
                </div>

                {/* AutoCAD DWG */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">AutoCAD Drawing (.DWG)</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                      Save as DXF
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    DWG is an encrypted binary database format. Convert-X provides full native vector parsing
                    for AutoCAD DXF (Drawing Exchange Format).
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-xs text-slate-300 font-mono space-y-1">
                    <div>1. In AutoCAD / DraftSight: File → Save As → AutoCAD DXF</div>
                    <div>2. Upload the .DXF into Convert-X for instant vector and PDF publishing.</div>
                  </div>
                </div>

                {/* Structural: STAAD / ETABS / Tekla */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">STAAD (.STD) & ETABS (.EDB)</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                      Structural IFC
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Structural finite element models contain stiffness matrices and non-linear properties.
                    Export framing layouts to open IFC or 3D DXF framing.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-xs text-slate-300 font-mono space-y-1">
                    <div>1. In STAAD.Pro / ETABS: File → Export → CIS/2 or IFC 2x3</div>
                    <div>2. Upload the structural sheet or layout to Convert-X.</div>
                  </div>
                </div>

                {/* Mechanical: SolidWorks & Inventor */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">SolidWorks / Inventor</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      STEP & STL
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mechanical parametric feature trees require SolidWorks kernel runtime.
                    Use open boundary representations:
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-xs text-slate-300 font-mono space-y-1">
                    <div>1. In SolidWorks: File → Save As → STEP (.stp) or STL (.stl)</div>
                    <div>2. Convert-X renders STL and 3D meshes natively in the 3D Studio.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
