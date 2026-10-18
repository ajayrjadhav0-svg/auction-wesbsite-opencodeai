import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  FileText,
  Download,
  Plus,
  Trash2,
  Camera,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Link2,
  Check,
  Users,
  Pencil,
} from 'lucide-react';
import { ImportPlayerRow, PlayerRole } from '../../types';
import { compressImageFile } from '../../utils/imageUtils';
import { PRESET_PLAYER_AVATARS } from '../../data/presetAvatars';
import {
  parsePlayerCsv,
  makeBlankRow,
  buildSampleCsv,
  IMPORT_FIELDS,
  DEFAULT_IMPORT_FIELDS,
  ImportFieldKey,
  ImportFieldSelection,
} from '../../utils/csvPlayers';
import { PlayerAvatar } from '../PlayerAvatar';
import { extractNameFromFilename, normalizeNameKey } from '../../utils/photoUtils';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRows: (
    rows: ImportPlayerRow[],
    replaceExisting: boolean
  ) => Promise<{ count: number; message: string } | null>;
}

const ROLE_OPTIONS: PlayerRole[] = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  onImportRows,
}) => {
  const [step, setStep] = useState<'upload' | 'edit'>('upload');
  const [csvContent, setCsvContent] = useState('');
  const [rows, setRows] = useState<ImportPlayerRow[]>([]);
  const [fields, setFields] = useState<ImportFieldSelection>(DEFAULT_IMPORT_FIELDS);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [photoEditKey, setPhotoEditKey] = useState<string | null>(null);
  const [photoUrlDraft, setPhotoUrlDraft] = useState('');
  const photoMultiInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setCsvContent('');
      setRows([]);
      setFields(DEFAULT_IMPORT_FIELDS);
      setReplaceExisting(false);
      setIsImporting(false);
      setErrorMsg('');
      setPhotoEditKey(null);
      setPhotoUrlDraft('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedFieldLabels = IMPORT_FIELDS.filter((f) => fields[f.key]).map((f) => f.label);

  const toggleField = (key: ImportFieldKey) => {
    const def = IMPORT_FIELDS.find((f) => f.key === key);
    if (def?.required) return; // Name can never be switched off
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyFieldPreset = (preset: Partial<ImportFieldSelection>) => {
    setFields({ ...DEFAULT_IMPORT_FIELDS, ...preset, name: true });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setCsvContent((event.target?.result as string) || '');
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([buildSampleCsv()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players_id_name_role_village.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParse = () => {
    setErrorMsg('');
    const parsed = parsePlayerCsv(csvContent, fields);
    if (parsed.length === 0) {
      setErrorMsg(
        'No valid player rows found. Make sure your CSV has a NAME column' +
          (selectedFieldLabels.length > 1 ? ` (importing: ${selectedFieldLabels.join(', ')})` : '') +
          '.'
      );
      return;
    }
    setRows(parsed);
    setStep('edit');
  };

  const startBlank = () => {
    setRows([makeBlankRow()]);
    setStep('edit');
  };

  const updateRow = (key: string, patch: Partial<ImportPlayerRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    if (photoEditKey === key) setPhotoEditKey(null);
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeBlankRow()]);
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = photoEditKey;
    if (!file || !key) return;
    const dataUrl = await compressImageFile(file, 400, 400, 0.82);
    updateRow(key, { photoUrl: dataUrl, photoHint: file.name });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleMatchPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    let matched = 0;
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      try {
        const fnKey = normalizeNameKey((f as File).name);
        const fnNameKey = extractNameFromFilename((f as File).name);
        const best = rows.find((r) => {
          const nk = normalizeNameKey(r.name);
          const hk = normalizeNameKey(r.photoHint || '');
          const fk = fnKey;
          if (!r.photoUrl && (hk === fk || nk === fnKey || nk === fnNameKey || (r.photoHint && hk.includes(fnKey)) || nk.includes(fnNameKey) || fnNameKey.includes(nk))) {
            return true;
          }
          return false;
        });
        if (best) {
          const dataUrl = await compressImageFile(f as File, 400, 400, 0.82);
          updateRow(best.key, { photoUrl: dataUrl, photoHint: (f as File).name });
          matched++;
        }
      } catch (err) {
        console.error(err);
      }
    }
    setErrorMsg(matched ? `Matched ${matched} of ${fileList.length} images to players.` : `Matched 0 of ${fileList.length} images. Check filenames/name hints.`);
    if (photoMultiInputRef.current) photoMultiInputRef.current.value = '';
  };

  const handleImport = async () => {
    const cleaned = rows
      .map((r) => ({ ...r, name: r.name.trim().toUpperCase() }))
      .filter((r) => r.name.length > 0);
    if (cleaned.length === 0) {
      setErrorMsg('Add at least one player with a name.');
      return;
    }
    setIsImporting(true);
    try {
      const res = await onImportRows(cleaned, replaceExisting);
      if (res) {
        onClose();
      }
    } finally {
      setIsImporting(false);
    }
  };

  const photoRow = rows.find((r) => r.key === photoEditKey) || null;
  const filledCount = rows.filter((r) => r.name.trim()).length;
  const tableMinWidth =
    300 +
    (fields.id ? 70 : 0) +
    (fields.photo ? 90 : 0) +
    (fields.role ? 150 : 0) +
    (fields.village ? 150 : 0) +
    (fields.basePrice ? 120 : 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full overflow-hidden flex flex-col max-h-[92vh] ${
          step === 'edit' ? 'max-w-4xl' : 'max-w-lg'
        }`}
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                BULK ROSTER IMPORT
              </span>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                {step === 'upload' ? 'Upload Players CSV Roster' : 'Review, Edit Rows & Add Photos'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---------------- STEP 1: UPLOAD ---------------- */}
        {step === 'upload' && (
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 hover:border-indigo-400 text-center transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs text-slate-700">
                  Click to browse a CSV file
                </span>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Columns: ID, NAME, ROLE, VILLAGE, BASE PRICE, PHOTO
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Or paste CSV data
              </label>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={'ID,NAME,ROLE,VILLAGE\n1,ROHIT SHARMA,Batsman,Mumbai\n2,JASPRIT BUMRAH,Bowler,Ahmedabad'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            {/* Which fields to import */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Choose What To Import
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyFieldPreset({})}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Everything
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFieldPreset({ id: false, village: false, basePrice: false, photo: false })}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Name + Role
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFieldPreset({ id: false, basePrice: false, photo: false })}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    + Village
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFieldPreset({ id: false, role: false, village: false, basePrice: false, photo: false })}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Name Only
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {IMPORT_FIELDS.map((def) => {
                  const on = fields[def.key];
                  return (
                    <button
                      key={def.key}
                      type="button"
                      title={def.hint}
                      onClick={() => toggleField(def.key)}
                      disabled={def.required}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        on
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-700'
                      } ${def.required ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center ${
                          on ? 'bg-white/25 border-white/70' : 'border-slate-400'
                        }`}
                      >
                        {on && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span>{def.label}</span>
                      {def.required && <span className="text-[9px] font-bold opacity-80">(required)</span>}
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] leading-relaxed text-slate-500">
                Importing:{' '}
                <strong className="text-slate-700">{selectedFieldLabels.join(', ') || 'Name'}</strong>. Any
                field you switch off is ignored from the CSV — the rest are left blank (Role defaults to
                All-Rounder, order numbers are auto-assigned).
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-600 font-semibold">{errorMsg}</div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={startBlank}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Start Blank Table</span>
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={!csvContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Parse & Review</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 2: EDIT TABLE ---------------- */}
        {step === 'edit' && (
          <>
            {/* Photo editor panel */}
            {photoRow && (
              <div className="px-6 py-4 bg-indigo-50/60 border-b border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    Photo for {photoRow.name || 'this player'}
                  </span>
                  <button
                    onClick={() => setPhotoEditKey(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Done
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {photoRow.photoUrl ? (
                      <img src={photoRow.photoUrl} alt="preview" className="w-full h-full object-cover" onError={() => updateRow(photoRow.key, { photoUrl: '' })} />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="import-row-photo-input"
                  />
                  <label
                    htmlFor="import-row-photo-input"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </label>

                  <input
                    ref={photoMultiInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMatchPhotos}
                    className="hidden"
                    id="import-photos-multi-input"
                  />
                  <label
                    htmlFor="import-photos-multi-input"
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-white"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Match Folder/Files</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={photoUrlDraft}
                        onChange={(e) => setPhotoUrlDraft(e.target.value)}
                        placeholder="Paste image URL"
                        className="pl-8 pr-2 py-2 w-52 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (photoUrlDraft.trim()) {
                          updateRow(photoRow.key, { photoUrl: photoUrlDraft.trim() });
                          setPhotoUrlDraft('');
                        }
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white"
                    >
                      Apply
                    </button>
                  </div>

                  {photoRow.photoUrl && (
                    <button
                      type="button"
                      onClick={() => updateRow(photoRow.key, { photoUrl: '' })}
                      className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Presets:</span>
                  {PRESET_PLAYER_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => updateRow(photoRow.key, { photoUrl: av.dataUri })}
                      title={av.label}
                      className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-500 shrink-0 hover:scale-110 transition-transform"
                    >
                      <img src={av.dataUri} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="px-6 py-2 text-xs text-rose-600 font-semibold bg-rose-50 border-b border-rose-100">
                {errorMsg}
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse" style={{ minWidth: tableMinWidth }}>
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                    {fields.id && <th className="px-3 py-2.5 font-black w-16">#</th>}
                    {fields.photo && <th className="px-2 py-2.5 font-black w-20">Photo</th>}
                    <th className="px-2 py-2.5 font-black">Name</th>
                    {fields.role && <th className="px-2 py-2.5 font-black w-36">Role</th>}
                    {fields.village && <th className="px-2 py-2.5 font-black w-36">Village</th>}
                    {fields.basePrice && <th className="px-2 py-2.5 font-black w-28">Base Price</th>}
                    <th className="px-2 py-2.5 font-black w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50/60">
                      {fields.id && (
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={row.srNo ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                              updateRow(row.key, {
                                srNo: val,
                                id: val,
                              });
                            }}
                            className="w-14 px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </td>
                      )}
                      {fields.photo && (
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoEditKey(row.key);
                              setPhotoUrlDraft('');
                            }}
                            className="w-11 h-11 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center hover:border-indigo-500 bg-slate-50"
                            title="Add / change photo"
                          >
                            <PlayerAvatar src={row.photoUrl} name={row.name} className="w-11 h-11 rounded-lg object-cover border-0" />
                          </button>
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.key, { name: e.target.value.toUpperCase() })}
                          placeholder="PLAYER NAME"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      {fields.role && (
                        <td className="px-2 py-2">
                          <select
                            value={row.role}
                            onChange={(e) => updateRow(row.key, { role: e.target.value as PlayerRole })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {fields.village && (
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.village}
                            onChange={(e) => updateRow(row.key, { village: e.target.value.toUpperCase() })}
                            placeholder="VILLAGE"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </td>
                      )}
                      {fields.basePrice && (
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.basePrice}
                            onChange={(e) =>
                              updateRow(row.key, { basePrice: e.target.value.replace(/[^0-9]/g, '') })
                            }
                            placeholder="500"
                            className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => moveRow(index, -1)}
                            disabled={index === 0}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRow(index, 1)}
                            disabled={index === rows.length - 1}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rows.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                  No rows. Click "Add Row" to create players manually.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 space-y-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-amber-950 block">Replace Current Player Database</span>
                  <span className="text-amber-700 text-[11px]">
                    If checked, existing roster is replaced with these {filledCount} player(s).
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={addRow}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Row</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-500 font-semibold hidden sm:flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {filledCount} ready to import
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || filledCount === 0}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isImporting ? <Upload className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    <span>{isImporting ? 'Importing...' : `Import ${filledCount} Players`}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
