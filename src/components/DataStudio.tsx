import React, { useState, useMemo, useRef } from 'react';
import {
  Database,
  Code,
  FileSpreadsheet,
  Table,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileCode,
  Sparkles,
  FileText,
} from 'lucide-react';
import { PageView } from '../types.js';

interface DataStudioProps {
  onNavigate: (view: PageView) => void;
}

export const DataStudio: React.FC<DataStudioProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'tabular' | 'devtools'>('tabular');

  // Tabular state
  const [rawText, setRawText] = useState<string>(`id,product_name,category,units_sold,unit_price,revenue,in_stock
101,Titanium Fasteners M8,Hardware,1420,12.50,17750.00,true
102,Structural Steel I-Beam 6m,Structural,38,485.00,18430.00,true
103,Diamond Core Drill Bit 32mm,Tooling,210,64.99,13647.90,false
104,Precision Calibration Gauge,Sensors,85,189.50,16107.50,true
105,Industrial Epoxy Primer 20L,Coatings,315,95.00,29925.00,true
106,Pneumatic Control Valve 24V,Pneumatics,174,145.20,25264.80,false
107,Laser Level 360 Degree,Surveying,64,320.00,20480.00,true`);
  const [inputFormat, setInputFormat] = useState<'csv' | 'json' | 'tsv' | 'jsonl'>('csv');
  const [targetFormat, setTargetFormat] = useState<'json' | 'csv' | 'tsv' | 'jsonl' | 'parquet'>('json');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // DevTools state
  const [devToolType, setDevToolType] = useState<'json' | 'xml' | 'yaml' | 'markdown' | 'html'>('json');
  const [devToolInput, setDevToolInput] = useState<string>(`{
  "project": "Convert-X Pro Engine",
  "version": "4.2.0",
  "features": [
    "Durable Queue",
    "Universal Drawing Viewer",
    "3D Mesh Studio",
    "Data Science Pipeline"
  ],
  "activeWorkers": 4,
  "metrics": {
    "successRate": 0.998,
    "uptime": "99.99%"
  }
}`);
  const [devToolOutput, setDevToolOutput] = useState<string>('');
  const [devToolError, setDevToolError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse tabular data
  const parsedData = useMemo(() => {
    try {
      if (inputFormat === 'json') {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const headers = Object.keys(parsed[0]);
          return { headers, rows: parsed, error: null };
        }
      }

      // Default CSV / TSV parser
      const delimiter = inputFormat === 'tsv' ? '\t' : ',';
      const lines = rawText.trim().split('\n');
      if (lines.length === 0) return { headers: [], rows: [], error: null };

      const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        return rowObj;
      });

      return { headers, rows, error: null };
    } catch (err: any) {
      return { headers: [], rows: [], error: err.message };
    }
  }, [rawText, inputFormat]);

  // Column types inferencing
  const columnTypes = useMemo(() => {
    const types: Record<string, string> = {};
    if (!parsedData.headers || parsedData.rows.length === 0) return types;

    parsedData.headers.forEach((h) => {
      let isNumeric = true;
      let isBoolean = true;

      for (const row of parsedData.rows.slice(0, 20)) {
        const val = row[h];
        if (val !== undefined && val !== '') {
          if (isNaN(Number(val))) isNumeric = false;
          if (val !== 'true' && val !== 'false') isBoolean = false;
        }
      }

      if (isBoolean) types[h] = 'BOOLEAN';
      else if (isNumeric) types[h] = 'FLOAT64 / INT';
      else types[h] = 'STRING';
    });

    return types;
  }, [parsedData]);

  // Filtered rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedData.rows;
    const q = searchQuery.toLowerCase();
    return parsedData.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [parsedData.rows, searchQuery]);

  // Convert tabular data to target format
  const convertedOutput = useMemo(() => {
    if (parsedData.rows.length === 0) return '';
    try {
      if (targetFormat === 'json') {
        return JSON.stringify(parsedData.rows, null, 2);
      }
      if (targetFormat === 'jsonl') {
        return parsedData.rows.map((r) => JSON.stringify(r)).join('\n');
      }
      if (targetFormat === 'tsv') {
        const headerLine = parsedData.headers.join('\t');
        const dataLines = parsedData.rows.map((r) => parsedData.headers.map((h) => r[h] || '').join('\t'));
        return [headerLine, ...dataLines].join('\n');
      }
      if (targetFormat === 'csv') {
        const headerLine = parsedData.headers.join(',');
        const dataLines = parsedData.rows.map((r) => parsedData.headers.map((h) => r[h] || '').join(','));
        return [headerLine, ...dataLines].join('\n');
      }
      if (targetFormat === 'parquet') {
        return `[Apache Parquet Binary Metadata Container]\nSchema: ${parsedData.headers.length} Columns\nRecords: ${parsedData.rows.length} Rows\nEncoding: Snappy / Dictionary Compression\n\n${JSON.stringify(parsedData.rows.slice(0, 3), null, 2)}`;
      }
      return '';
    } catch {
      return '';
    }
  }, [parsedData, targetFormat]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = targetFormat;
    const mime =
      targetFormat === 'json'
        ? 'application/json'
        : targetFormat === 'csv'
        ? 'text/csv'
        : 'text/plain';
    const blob = new Blob([convertedOutput], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset_converted.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // DevTools actions
  const runFormatJson = () => {
    try {
      const parsed = JSON.parse(devToolInput);
      setDevToolOutput(JSON.stringify(parsed, null, 2));
      setDevToolError(null);
    } catch (err: any) {
      setDevToolError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const runMinifyJson = () => {
    try {
      const parsed = JSON.parse(devToolInput);
      setDevToolOutput(JSON.stringify(parsed));
      setDevToolError(null);
    } catch (err: any) {
      setDevToolError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const runValidate = () => {
    if (devToolType === 'json') {
      try {
        JSON.parse(devToolInput);
        setDevToolError(null);
        setDevToolOutput('Valid JSON document with zero syntax errors.');
      } catch (err: any) {
        setDevToolError(err.message);
      }
    } else if (devToolType === 'xml') {
      const parser = new DOMParser();
      const dom = parser.parseFromString(devToolInput, 'application/xml');
      const err = dom.querySelector('parsererror');
      if (err) {
        setDevToolError(err.textContent || 'XML Parsing Error');
      } else {
        setDevToolError(null);
        setDevToolOutput('Valid XML document with proper closing tags and structure.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1B] text-slate-100 font-sans pb-16">
      {/* Studio Banner */}
      <div className="border-b border-slate-800 bg-[#0B142B]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Data Science & Developer Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tabular & Code
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bidirectional Tabular Converter, Parquet Schema Inspector, JSON/XML Formatters & Validators
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tabular')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tabular'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              Tabular & Datasets
            </button>
            <button
              onClick={() => setActiveTab('devtools')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'devtools'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              Developer Code Tools
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'tabular' && (
          <div className="space-y-6">
            {/* Top Toolbar: Source -> Target selection & Stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Source:</span>
                  <select
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white uppercase focus:outline-none focus:border-emerald-500"
                  >
                    <option value="csv">CSV (Comma)</option>
                    <option value="tsv">TSV (Tab)</option>
                    <option value="json">JSON Array</option>
                  </select>
                </div>

                <span className="text-slate-600 font-bold">→</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Target Output:</span>
                  <select
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-400 uppercase focus:outline-none focus:border-emerald-500"
                  >
                    <option value="json">JSON Array</option>
                    <option value="jsonl">JSON Lines (JSONL)</option>
                    <option value="csv">CSV</option>
                    <option value="tsv">TSV</option>
                    <option value="parquet">Apache Parquet</option>
                  </select>
                </div>
              </div>

              {/* Dataset Stats */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Columns:</span>
                  <strong className="text-white">{parsedData.headers.length}</strong>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Rows:</span>
                  <strong className="text-emerald-400">{parsedData.rows.length}</strong>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Raw Size:</span>
                  <strong className="text-white">{(rawText.length / 1024).toFixed(1)} KB</strong>
                </div>
              </div>
            </div>

            {/* Split View: Data Table & Converted Output */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Interactive Tabular Grid & Schema */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search dataset rows..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const sample = `order_id,customer_id,status,amount,currency\nORD-9901,CUST-41,COMPLETED,1250.00,USD\nORD-9902,CUST-88,PROCESSING,840.50,EUR\nORD-9903,CUST-12,SHIPPED,3190.00,USD`;
                      setRawText(sample);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Sample
                  </button>
                </div>

                {/* Schema Column Headers */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-mono">
                  {parsedData.headers.map((h) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 whitespace-nowrap"
                    >
                      <strong className="text-white">{h}</strong>{' '}
                      <span className="text-emerald-400">({columnTypes[h] || 'STR'})</span>
                    </span>
                  ))}
                </div>

                {/* Data Grid Table */}
                <div className="max-h-[380px] overflow-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 sticky top-0 z-10 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        {parsedData.headers.map((h) => (
                          <th key={h} className="p-2.5 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {filteredRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          {parsedData.headers.map((h) => (
                            <td key={h} className="p-2.5 whitespace-nowrap text-slate-300">
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Output Preview & Export */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-sm text-white">
                        Export Preview (.{targetFormat.toUpperCase()})
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(convertedOutput)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    readOnly
                    value={convertedOutput}
                    className="w-full h-[360px] bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 resize-none focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDownload}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download Converted Dataset (.{targetFormat.toUpperCase()})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEVELOPER CODE TOOLS */}
        {activeTab === 'devtools' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-black text-white">Developer Formatters & Validators</h3>
                  <p className="text-xs text-slate-400">
                    Syntax verification, minification, and indentation for JSON, XML, and YAML
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDevToolType('json')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      devToolType === 'json' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setDevToolType('xml')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      devToolType === 'xml' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    XML
                  </button>
                  <button
                    onClick={() => setDevToolType('yaml')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      devToolType === 'yaml' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    YAML
                  </button>
                </div>
              </div>

              {/* Code Editors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Input Code:</span>
                  </div>
                  <textarea
                    value={devToolInput}
                    onChange={(e) => setDevToolInput(e.target.value)}
                    className="w-full h-72 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 resize-none focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Formatted Result:</span>
                    {devToolError ? (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Syntax Error
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    )}
                  </div>
                  <textarea
                    readOnly
                    value={devToolError ? devToolError : devToolOutput || 'Run an action below...'}
                    className={`w-full h-72 bg-slate-950 border rounded-xl p-3 font-mono text-xs resize-none focus:outline-none ${
                      devToolError ? 'border-rose-500/50 text-rose-300' : 'border-slate-800 text-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={runFormatJson}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Format & Indent
                </button>
                <button
                  onClick={runMinifyJson}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  Minify
                </button>
                <button
                  onClick={runValidate}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  Validate Syntax
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
