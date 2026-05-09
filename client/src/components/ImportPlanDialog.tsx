// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: ImportPlanDialog
// client/src/components/ImportPlanDialog.tsx
//
// Lets users upload an Excel or CSV file and map columns to TC fields.
// Calls POST /api/projects/:id/import-plan (multipart/form-data)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColumnMap {
  tcName:    string;
  module:    string;
  feature:   string;
  priority:  string;
  assignedTo: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ImportPlanDialogProps {
  projectId: string;
  onClose:   () => void;
  onImported: (result: { created: number; skipped: number }) => void;
}

export function ImportPlanDialog({ projectId, onClose, onImported }: ImportPlanDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string[][]>([]);
  const [headers, setHeaders]     = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({
    tcName:    '',
    module:    '',
    feature:   '',
    priority:  '',
    assignedTo: '',
  });
  const [step, setStep]       = useState<'upload' | 'map' | 'importing' | 'done'>('upload');
  const [result, setResult]   = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // ── File picker ───────────────────────────────────────────────────────────

  const handleFilePick = async (f: File) => {
    setFile(f);
    setError(null);

    // Preview first 6 rows by reading as text (CSV) or via simple text parse
    // Full XLSX parsing happens server-side
    if (f.name.endsWith('.csv')) {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
      const parsed = lines.map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      setHeaders(parsed[0] ?? []);
      setPreview(parsed.slice(1));
      autoMap(parsed[0] ?? []);
    } else {
      // For XLSX we can't read client-side without xlsx lib loaded in browser.
      // Show a placeholder header set and let user map manually.
      setHeaders([]);
      setPreview([]);
    }
    setStep('map');
  };

  function autoMap(cols: string[]) {
    const find = (hints: string[]) =>
      cols.find(c => hints.some(h => c.toLowerCase().includes(h))) ?? '';
    setColumnMap({
      tcName:    find(['tc name', 'test case', 'name', 'title']),
      module:    find(['module']),
      feature:   find(['feature']),
      priority:  find(['priority']),
      assignedTo: find(['assigned', 'owner', 'email']),
    });
  }

  // ── Import ────────────────────────────────────────────────────────────────

  const doImport = async () => {
    if (!file) return;
    setStep('importing');
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('columnMap', JSON.stringify(columnMap));

      const res = await fetch(`/api/projects/${projectId}/import-plan`, {
        method:      'POST',
        credentials: 'include',
        body:        form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({ created: data.created, skipped: data.skipped });
      setStep('done');
      onImported({ created: data.created, skipped: data.skipped });
    } catch (err: any) {
      setError(err.message);
      setStep('map');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">📥</div>
            <div>
              <div className="text-sm font-bold text-slate-800">Import Test Plan</div>
              <div className="text-[11px] text-slate-400">Upload Excel (.xlsx) or CSV file</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4">
          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3 opacity-40">📂</div>
              <div className="text-sm font-medium text-slate-600 mb-1">Click to browse or drag & drop</div>
              <div className="text-xs text-slate-400">Supports .xlsx and .csv</div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(f); }}
              />
            </div>
          )}

          {/* ── Step: Map columns ── */}
          {step === 'map' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                File: <span className="font-medium text-slate-700">{file?.name}</span>
              </div>

              {/* Column mapping */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Map columns
                </div>
                {(Object.keys(columnMap) as (keyof ColumnMap)[]).map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <label className="text-xs text-slate-600 w-24 flex-shrink-0 capitalize">
                      {field === 'tcName' ? 'TC Name' : field === 'assignedTo' ? 'Assigned To' : field}
                    </label>
                    {headers.length > 0 ? (
                      <select
                        value={columnMap[field]}
                        onChange={e => setColumnMap(prev => ({ ...prev, [field]: e.target.value }))}
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                      >
                        <option value="">— not mapped —</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={columnMap[field]}
                        onChange={e => setColumnMap(prev => ({ ...prev, [field]: e.target.value }))}
                        placeholder={`Column header name`}
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Preview table */}
              {preview.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Preview (first {preview.length} rows)
                  </div>
                  <div className="overflow-auto border border-slate-100 rounded-lg">
                    <table className="text-[10px] w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {headers.map(h => (
                            <th key={h} className="px-2 py-1.5 text-left text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b border-slate-50 last:border-0">
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[120px] truncate">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Importing ── */}
          {step === 'importing' && (
            <div className="py-10 text-center">
              <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-sm text-slate-600">Importing test cases…</div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && result && (
            <div className="py-8 text-center">
              <div className="text-4xl mb-4">✅</div>
              <div className="text-base font-bold text-slate-800 mb-1">
                {result.created} TC{result.created !== 1 ? 's' : ''} imported
              </div>
              {result.skipped > 0 && (
                <div className="text-xs text-slate-400">{result.skipped} rows skipped</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          {step === 'map' && (
            <button
              onClick={doImport}
              disabled={!columnMap.tcName}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              📥 Import
            </button>
          )}
          {step === 'upload' && (
            <button
              onClick={() => fileRef.current?.click()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
            >
              Choose File
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
