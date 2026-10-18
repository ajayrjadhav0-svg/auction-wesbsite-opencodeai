import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Trophy,
  Upload,
  Link,
  Trash2,
  Check,
  Sparkles,
  Shield,
  Image as ImageIcon,
} from 'lucide-react';

interface EditLeagueModalProps {
  isOpen: boolean;
  currentName: string;
  currentLogo?: string;
  onClose: () => void;
  onSave: (name: string, logo: string | undefined) => Promise<void>;
}

// Preset League Emblems (SVG Data URIs or clean SVG symbols)
export const PRESET_LEAGUE_EMBLEMS = [
  {
    id: 'trophy',
    label: 'Gold Trophy',
    icon: '🏆',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="%231e1b4b" stroke="%23fbbf24" stroke-width="4"/><text x="50" y="62" font-size="44" text-anchor="middle">🏆</text></svg>',
  },
  {
    id: 'cricket',
    label: 'Cricket Ball & Bat',
    icon: '🏏',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23ef4444"/><stop offset="100%" stop-color="%23991b1b"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="%230f172a" stroke="%23ef4444" stroke-width="4"/><text x="50" y="62" font-size="44" text-anchor="middle">🏏</text></svg>',
  },
  {
    id: 'shield',
    label: 'Royal Shield',
    icon: '🛡️',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%23312e81" stroke="%23818cf8" stroke-width="4"/><text x="50" y="62" font-size="44" text-anchor="middle">🛡️</text></svg>',
  },
  {
    id: 'lion',
    label: 'Imperial Lion',
    icon: '🦁',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%2378350f" stroke="%23f59e0b" stroke-width="4"/><text x="50" y="62" font-size="44" text-anchor="middle">🦁</text></svg>',
  },
  {
    id: 'lightning',
    label: 'Velocity Strike',
    icon: '⚡',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%230284c7" stroke="%2338bdf8" stroke-width="4"/><text x="50" y="62" font-size="44" text-anchor="middle">⚡</text></svg>',
  },
  {
    id: 'star',
    label: 'Champion Star',
    icon: '🌟',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%23581c87" stroke="%23c084fc" stroke-width="4"/><text x="50" y="62" font-size="44" text-anchor="middle">🌟</text></svg>',
  },
];

export const EditLeagueModal: React.FC<EditLeagueModalProps> = ({
  isOpen,
  currentName,
  currentLogo,
  onClose,
  onSave,
}) => {
  const [leagueName, setLeagueName] = useState(currentName || '');
  const [leagueLogo, setLeagueLogo] = useState<string>(currentLogo || '');
  const [logoMode, setLogoMode] = useState<'upload' | 'url' | 'presets'>('presets');
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize with latest settings when modal is opened
  useEffect(() => {
    if (isOpen) {
      setLeagueName(currentName || '');
      setLeagueLogo(currentLogo || '');
      setUrlInput('');
      setUploadError(null);
      setIsSaving(false);
    }
  }, [isOpen, currentName, currentLogo]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image size exceeds 3MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result;
      if (typeof result === 'string') {
        setLeagueLogo(result);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setLeagueLogo(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleRemoveLogo = () => {
    setLeagueLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueName.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(leagueName.trim(), leagueLogo.trim() || undefined);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                League Name & Logo
              </h3>
              <p className="text-xs text-indigo-200 font-medium">
                Customize league branding across dashboards, broadcast & portals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* League Title Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              League / Tournament Name
            </label>
            <input
              type="text"
              required
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="e.g. KPL Premier League 2026"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-slate-900 bg-white shadow-2xs"
            />
            <p className="text-[11px] text-slate-500">
              Shown in navigation headers, live broadcast screens, and player self-registration.
            </p>
          </div>

          {/* Current Logo Preview & Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Live Logo Preview</span>
              </span>
              {leagueLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              {/* Circular Avatar Preview */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden p-1">
                  {leagueLogo ? (
                    <img
                      src={leagueLogo}
                      alt="League Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl">🏏</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Nav Icon</span>
              </div>

              {/* Dark Card Preview */}
              <div className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden p-1 shrink-0">
                  {leagueLogo ? (
                    <img
                      src={leagueLogo}
                      alt="League Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xl">🏏</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black font-['Outfit'] text-white truncate">
                    {leagueName || 'CRICKET LEAGUE'}
                  </div>
                  <div className="text-[10px] text-indigo-300 font-semibold">
                    Live Auction Broadcast
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Source Selector Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Logo Method
              </label>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setLogoMode('presets')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    logoMode === 'presets'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    logoMode === 'upload'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    logoMode === 'url'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {/* TAB 1: PRESETS */}
            {logoMode === 'presets' && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESET_LEAGUE_EMBLEMS.map((preset) => {
                    const isSelected = leagueLogo === preset.dataUri;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => setLeagueLogo(preset.dataUri)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-1 shadow-2xs">
                          <img
                            src={preset.dataUri}
                            alt={preset.label}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 line-clamp-1">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500">
                  Pick any pre-designed tournament emblem or switch to Upload to use your custom club logo.
                </p>
              </div>
            )}

            {/* TAB 2: FILE UPLOAD */}
            {logoMode === 'upload' && (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 hover:bg-indigo-50/70 cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-900 block">
                      Click to upload League Logo
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Supports PNG, JPG, WebP, SVG (Max 3MB)
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {uploadError && (
                  <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>
                )}
              </div>
            )}

            {/* TAB 3: IMAGE URL */}
            {logoMode === 'url' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Paste any web link ending in .png, .jpg, .svg, or .webp.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !leagueName.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <span>Saving Branding...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save League Branding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
