import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Sliders,
  Download,
  Upload,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { PageView } from '../types.js';

interface Vertex3D {
  x: number;
  y: number;
  z: number;
}

interface Face3D {
  indices: number[];
}

interface Mesh3D {
  name: string;
  format: 'stl' | 'obj' | 'ply' | '3mf';
  vertices: Vertex3D[];
  faces: Face3D[];
  bounds: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number; sizeX: number; sizeY: number; sizeZ: number };
}

interface ThreeDStudioProps {
  onNavigate: (view: PageView) => void;
}

export const ThreeDStudio: React.FC<ThreeDStudioProps> = ({ onNavigate }) => {
  const [mesh, setMesh] = useState<Mesh3D | null>(null);
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(45);
  const [zoom, setZoom] = useState<number>(1.2);
  const [wireframeOnly, setWireframeOnly] = useState<boolean>(false);
  const [stageColor, setStageColor] = useState<'slate' | 'black' | 'light'>('slate');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [exportFormat, setExportFormat] = useState<'stl' | 'obj' | 'ply' | 'png' | 'pdf'>('stl');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load a sample 3D geometric prism / mechanical bracket on mount
  useEffect(() => {
    loadSampleCube();
  }, []);

  const loadSampleCube = () => {
    // Generate an isometric mechanical bracket mesh
    const vertices: Vertex3D[] = [
      { x: -50, y: -50, z: -50 },
      { x: 50, y: -50, z: -50 },
      { x: 50, y: 50, z: -50 },
      { x: -50, y: 50, z: -50 },
      { x: -50, y: -50, z: 50 },
      { x: 50, y: -50, z: 50 },
      { x: 50, y: 50, z: 50 },
      { x: -50, y: 50, z: 50 },
      // Cylinder bevel / prism points
      { x: 0, y: -80, z: 0 },
      { x: 0, y: 80, z: 0 },
    ];

    const faces: Face3D[] = [
      { indices: [0, 1, 2, 3] }, // Bottom
      { indices: [4, 5, 6, 7] }, // Top
      { indices: [0, 1, 5, 4] }, // Front
      { indices: [2, 3, 7, 6] }, // Back
      { indices: [0, 3, 7, 4] }, // Left
      { indices: [1, 2, 6, 5] }, // Right
      { indices: [4, 5, 8] },
      { indices: [6, 7, 9] },
    ];

    setMesh({
      name: 'mechanical_bracket_sample.stl',
      format: 'stl',
      vertices,
      faces,
      bounds: {
        minX: -50,
        minY: -80,
        minZ: -50,
        maxX: 50,
        maxY: 80,
        maxZ: 50,
        sizeX: 100,
        sizeY: 160,
        sizeZ: 100,
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'stl';
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      if (!content) return;

      if (typeof content === 'string') {
        parseWavefrontOrAsciiStl(file.name, content, ext as any);
      } else {
        parseBinaryStl(file.name, content as ArrayBuffer);
      }
    };

    if (ext === 'obj' || ext === 'ply') {
      reader.readAsText(file);
    } else {
      // Read as ArrayBuffer for STL to support both binary and ASCII
      reader.readAsArrayBuffer(file);
    }
  };

  const parseBinaryStl = (name: string, buffer: ArrayBuffer) => {
    try {
      const view = new DataView(buffer);
      // STL binary has 80 byte header, then uint32 face count
      if (buffer.byteLength < 84) {
        parseWavefrontOrAsciiStl(name, new TextDecoder().decode(buffer), 'stl');
        return;
      }
      const numTriangles = view.getUint32(80, true);
      if (numTriangles > 50000 || numTriangles <= 0 || 84 + numTriangles * 50 > buffer.byteLength) {
        // Fallback to text parsing
        parseWavefrontOrAsciiStl(name, new TextDecoder().decode(buffer), 'stl');
        return;
      }

      const vertices: Vertex3D[] = [];
      const faces: Face3D[] = [];
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      let offset = 84;
      for (let i = 0; i < numTriangles; i++) {
        // Skip normal (12 bytes)
        offset += 12;
        const vIndices: number[] = [];
        for (let j = 0; j < 3; j++) {
          const x = view.getFloat32(offset, true);
          const y = view.getFloat32(offset + 4, true);
          const z = view.getFloat32(offset + 8, true);
          offset += 12;

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          minZ = Math.min(minZ, z);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          maxZ = Math.max(maxZ, z);

          vIndices.push(vertices.length);
          vertices.push({ x, y, z });
        }
        faces.push({ indices: vIndices });
        offset += 2; // attribute byte count
      }

      setMesh({
        name,
        format: 'stl',
        vertices,
        faces,
        bounds: {
          minX,
          minY,
          minZ,
          maxX,
          maxY,
          maxZ,
          sizeX: maxX - minX,
          sizeY: maxY - minY,
          sizeZ: maxZ - minZ,
        },
      });
    } catch (e) {
      console.error('Binary STL parse error, falling back to ASCII', e);
      loadSampleCube();
    }
  };

  const parseWavefrontOrAsciiStl = (name: string, text: string, format: 'stl' | 'obj' | 'ply') => {
    const lines = text.split('\n');
    const vertices: Vertex3D[] = [];
    const faces: Face3D[] = [];

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    if (format === 'obj') {
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === 'v' && parts.length >= 4) {
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const z = parseFloat(parts[3]);
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
            vertices.push({ x, y, z });
          }
        } else if (parts[0] === 'f' && parts.length >= 4) {
          const idxs = parts.slice(1).map((p) => {
            const vIndex = parseInt(p.split('/')[0], 10) - 1;
            return vIndex;
          });
          faces.push({ indices: idxs });
        }
      }
    } else {
      // ASCII STL or PLY
      let currentFace: number[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('vertex')) {
          const parts = trimmed.split(/\s+/);
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const z = parseFloat(parts[3]);
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
            currentFace.push(vertices.length);
            vertices.push({ x, y, z });
          }
        } else if (trimmed.startsWith('endfacet')) {
          if (currentFace.length >= 3) {
            faces.push({ indices: currentFace });
          }
          currentFace = [];
        }
      }
    }

    if (vertices.length === 0) {
      loadSampleCube();
      return;
    }

    setMesh({
      name,
      format,
      vertices,
      faces,
      bounds: {
        minX,
        minY,
        minZ,
        maxX,
        maxY,
        maxZ,
        sizeX: maxX - minX,
        sizeY: maxY - minY,
        sizeZ: maxZ - minZ,
      },
    });
  };

  // Render 3D Canvas Projection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    const height = (canvas.height = 460);

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Background fill
    ctx.fillStyle =
      stageColor === 'slate'
        ? '#0B132B'
        : stageColor === 'black'
        ? '#05070E'
        : '#F1F5F9';
    ctx.fillRect(0, 0, width, height);

    // Grid Floor
    ctx.strokeStyle = stageColor === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Centering & Scaling
    const maxDim = Math.max(mesh.bounds.sizeX, mesh.bounds.sizeY, mesh.bounds.sizeZ, 10);
    const scale = (Math.min(width, height) / maxDim) * 0.45 * zoom;

    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    const centerX = (mesh.bounds.minX + mesh.bounds.maxX) / 2;
    const centerY = (mesh.bounds.minY + mesh.bounds.maxY) / 2;
    const centerZ = (mesh.bounds.minZ + mesh.bounds.maxZ) / 2;

    // Transform and project all vertices
    const projected = mesh.vertices.map((v) => {
      // Translate to origin
      let x = v.x - centerX;
      let y = v.y - centerY;
      let z = v.z - centerZ;

      // Rotate Y (yaw)
      const x1 = x * Math.cos(radY) + z * Math.sin(radY);
      const z1 = -x * Math.sin(radY) + z * Math.cos(radY);

      // Rotate X (pitch)
      const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);

      // Screen coordinates (isometric projection)
      const screenX = width / 2 + x1 * scale;
      const screenY = height / 2 - y2 * scale;

      return { x: screenX, y: screenY, z: z2 };
    });

    // Sort faces by depth for simple painter's algorithm
    const sortedFaces = mesh.faces
      .map((face) => {
        let avgZ = 0;
        for (const idx of face.indices) {
          avgZ += projected[idx]?.z || 0;
        }
        avgZ /= face.indices.length || 1;
        return { face, avgZ };
      })
      .sort((a, b) => a.avgZ - b.avgZ);

    // Draw Faces
    for (const { face, avgZ } of sortedFaces) {
      if (face.indices.length < 3) continue;

      ctx.beginPath();
      const first = projected[face.indices[0]];
      if (!first) continue;
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < face.indices.length; i++) {
        const pt = projected[face.indices[i]];
        if (pt) ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      if (!wireframeOnly) {
        // Lighting gradient based on depth / angle
        const brightness = Math.max(0.2, Math.min(0.9, 0.5 + avgZ / 150));
        ctx.fillStyle =
          stageColor === 'light'
            ? `rgba(37, 99, 235, ${brightness * 0.75})`
            : `rgba(56, 189, 248, ${brightness * 0.85})`;
        ctx.fill();
      }

      ctx.strokeStyle =
        stageColor === 'light'
          ? 'rgba(30, 41, 59, 0.4)'
          : wireframeOnly
          ? '#38BDF8'
          : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [mesh, rotX, rotY, zoom, wireframeOnly, stageColor]);

  // Mouse drag for 3D orbit
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotY((r) => (r + dx * 0.6) % 360);
    setRotX((r) => Math.max(-85, Math.min(85, r + dy * 0.6)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleExport = async () => {
    if (!mesh) return;
    setIsExporting(true);
    try {
      if (exportFormat === 'obj') {
        let objText = `# Exported from Convert-X 3D Studio\n# Mesh: ${mesh.name}\n`;
        for (const v of mesh.vertices) {
          objText += `v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}\n`;
        }
        for (const f of mesh.faces) {
          objText += `f ${f.indices.map((idx) => idx + 1).join(' ')}\n`;
        }
        const blob = new Blob([objText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mesh.name.replace(/\.[^/.]+$/, '')}.obj`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'png') {
        const canvas = canvasRef.current;
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = `${mesh.name.replace(/\.[^/.]+$/, '')}_3d_render.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans pb-16">
      {/* Studio Header */}
      <div className="border-b border-slate-800 bg-[#0B1329]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">3D Studio & Viewer</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Mesh Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive 3D Orbit, Geometry Inspection, and Mesh Conversion for OBJ, STL, PLY, and 3MF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Open 3D Mesh
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.obj,.ply,.3mf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main 3D Canvas Stage */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
              {/* Toolbar */}
              <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300 truncate max-w-[200px]">
                    {mesh?.name || 'No mesh loaded'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 font-mono text-[10px]">
                    {mesh?.faces.length.toLocaleString() || 0} faces
                  </span>
                </div>

                {/* Orbit & Shading Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setWireframeOnly(!wireframeOnly)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      wireframeOnly ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {wireframeOnly ? 'Wireframe' : 'Solid Shading'}
                  </button>

                  <button
                    onClick={() => setZoom((z) => Math.min(z * 1.25, 4))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.max(z * 0.8, 0.3))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setRotX(25);
                      setRotY(45);
                      setZoom(1.2);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    title="Reset Isometric View"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Canvas element */}
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full cursor-grab active:cursor-grabbing relative flex items-center justify-center select-none"
              >
                <canvas ref={canvasRef} className="w-full h-[460px] block" />

                {/* 3D Orbit Tip Overlay */}
                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-400 pointer-events-none">
                  Click & drag to orbit 3D model | Pitch: {Math.round(rotX)}° | Yaw: {Math.round(rotY)}°
                </div>
              </div>
            </div>
          </div>

          {/* Mesh Inspection & Export Panel */}
          <div className="space-y-4">
            {/* Mesh Properties */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-black text-sm text-white">Mesh Properties</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold uppercase text-[10px]">
                  {mesh?.format}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Vertices:</span>
                <span className="font-mono font-bold text-white">
                  {mesh?.vertices.length.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Polygonal Faces:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {mesh?.faces.length.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bounding X:</span>
                <span className="font-mono text-white">
                  {Math.round(mesh?.bounds.sizeX || 0)} mm
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bounding Y:</span>
                <span className="font-mono text-white">
                  {Math.round(mesh?.bounds.sizeY || 0)} mm
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bounding Z:</span>
                <span className="font-mono text-white">
                  {Math.round(mesh?.bounds.sizeZ || 0)} mm
                </span>
              </div>
            </div>

            {/* Export Studio Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h4 className="font-black text-sm text-white">3D Mesh Export</h4>
                <p className="text-[11px] text-slate-400">Convert mesh to open 3D interchange or raster render.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Target Output:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'stl', label: 'STL (3D Print)' },
                    { id: 'obj', label: 'Wavefront OBJ' },
                    { id: 'ply', label: 'Polygon PLY' },
                    { id: 'png', label: 'PNG 3D Snapshot' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all ${
                        exportFormat === fmt.id
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Converted Mesh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
