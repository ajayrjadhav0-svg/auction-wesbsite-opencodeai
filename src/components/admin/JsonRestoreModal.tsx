import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, RefreshCw } from 'lucide-react';

interface JsonRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (data: any) => Promise<boolean>;
}

export const JsonRestoreModal: React.FC<JsonRestoreModalProps> = ({
  isOpen,
  onClose,
  onRestore,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setErrorMsg('');
  };

  const handleRestore = async () => {
    if (!file) return;
    setErrorMsg('');
    setIsRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const ok = await onRestore(data);
      if (ok) {
        onClose();
        setFile(null);
      }
    } catch (err: any) {
      setErrorMsg('Invalid JSON file: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                RESTORE BACKUP
              </span>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Import JSON Backup
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Warning */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This will replace <strong>all current data</strong> (players, teams, settings,
                transactions).
              </span>
            </div>
            <span className="text-xs text-amber-700">
              Export a backup of current data first if you want to keep it.
            </span>
          </div>

          {/* File picker */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Select Backup File (.json)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center space-y-2 p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 text-center transition-colors bg-slate-50"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">
                {file ? file.name : 'Click to browse backup file'}
              </span>
              <span className="text-[11px] text-slate-500">Exported myauctionkpl.json</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-rose-600 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isRestoring}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring || !file}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-['Outfit'] font-bold text-xs shadow-md flex items-center gap-2 transition-all"
            >
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>Restore Database</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
