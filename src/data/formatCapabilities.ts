export type FormatCategory =
  | 'documents'
  | 'images'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'cad'
  | 'bim'
  | 'structural'
  | 'mechanical'
  | 'steel'
  | 'threed'
  | 'adobe'
  | 'ml'
  | 'aimodels'
  | 'datascience'
  | 'developer'
  | 'scientific'
  | 'archives';

export type FormatStatus = 'SUPPORTED' | 'PARTIAL' | 'COMING_SOON' | 'UNSUPPORTED';
export type SecurityLevel = 'SAFE' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export interface FormatDefinition {
  extension: string;
  name: string;
  mimeType: string;
  category: FormatCategory;
  categoryLabel: string;
  description: string;
  inputSupport: boolean;
  outputSupport: boolean;
  supportedOutputs: string[];
  engine: string;
  status: FormatStatus;
  validation: string;
  securityLevel: SecurityLevel;
  maxFileSize: number;
  multipageSupport: boolean;
  previewSupport: boolean;
  conversionNotes: string;
}

export const CATEGORY_META: Record<FormatCategory, { label: string; icon: string; description: string }> = {
  documents: { label: 'Office Documents', icon: 'FileText', description: 'Word, Excel, PowerPoint, Text, and OpenDocument files' },
  images: { label: 'Raster & Vector Images', icon: 'Image', description: 'PNG, JPG, WebP, SVG, AVIF, TIFF, BMP, and GIF images' },
  pdf: { label: 'PDF & Print', icon: 'FileType', description: 'Multi-page rasterization, OCR extraction, and document layout' },
  audio: { label: 'Audio Files', icon: 'Music', description: 'Lossless & high-bitrate MP3, WAV, FLAC, M4A, OGG, and AAC' },
  video: { label: 'Video Files', icon: 'Video', description: 'MP4, WebM, MOV, MKV, AVI, audio extract, and video thumbnails' },
  cad: { label: 'CAD Blueprints', icon: 'Layers', description: 'AutoCAD DXF, DWG blueprints, layers, and vector entities' },
  bim: { label: 'BIM & Architecture', icon: 'Building', description: 'OpenBIM IFC, Revit project metadata, and building elements' },
  structural: { label: 'Structural Engineering', icon: 'Activity', description: 'STAAD.Pro, ETABS, SAP2000 analysis and framing files' },
  mechanical: { label: 'Mechanical CAD', icon: 'Cpu', description: 'STEP, IGES, SolidWorks, and boundary representation models' },
  steel: { label: 'Steel & Metal Fabrication', icon: 'Wrench', description: 'DSTV / NC beam cutting, plate holes, G-code, and mark files' },
  threed: { label: '3D Meshes & Geometry', icon: 'Box', description: 'Wavefront OBJ, STL 3D printing, PLY, 3MF, and isometric renders' },
  adobe: { label: 'Adobe Creative Suite', icon: 'Palette', description: 'Photoshop PSD, Illustrator AI, PostScript EPS, and design files' },
  ml: { label: 'Machine Learning', icon: 'Brain', description: 'SafeTensors, ONNX graphs, TFLite, and neural model architectures' },
  aimodels: { label: 'AI & Neural Models', icon: 'Sparkles', description: 'GGUF LLM models, Keras 3, PyTorch checkpoints, and HDF5' },
  datascience: { label: 'Data Science & Tabular', icon: 'Database', description: 'CSV, TSV, Apache Parquet columnar datasets, and JSON Lines' },
  developer: { label: 'Developer & Code Files', icon: 'Code', description: 'JSON, YAML, XML, SQL dumps, Markdown, and Web formats' },
  scientific: { label: 'Scientific & Technical Data', icon: 'FlaskConical', description: 'Parquet, HDF5 datasets, and mathematical data files' },
  archives: { label: 'Compressed Archives', icon: 'Package', description: 'Multi-file ZIP archives, TAR, and compressed packages' },
};
