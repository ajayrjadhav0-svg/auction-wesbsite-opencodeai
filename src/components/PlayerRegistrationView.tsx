import React, { useState, useMemo, useRef } from 'react';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Share2,
  Download,
  Shield,
  ArrowRight,
  Sparkles,
  MapPin,
  Hash,
  User,
  Activity,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { PlayerRole } from '../types';
import { getRoleBadgeStyle } from '../utils/formatters';
import { compressImageFile } from '../utils/imageUtils';

interface PlayerRegistrationViewProps {
  onNavigateToAuction?: () => void;
  onNavigateToDashboard?: () => void;
  onBackToApp?: () => void;
}

export const PlayerRegistrationView: React.FC<PlayerRegistrationViewProps> = ({
  onNavigateToAuction,
  onNavigateToDashboard,
  onBackToApp,
}) => {
  const handleBack = onBackToApp || onNavigateToDashboard;
  const { state, addPlayer, showNotification, getViewerShareUrl } = useAuction();

  // Next recommended Sr No
  const nextRecommendedSrNo = useMemo(() => {
    if (!state || !state.players || state.players.length === 0) return 1;
    const maxSr = Math.max(...state.players.map((p) => p.srNo || p.id), 0);
    return maxSr + 1;
  }, [state?.players]);

  const [srNo, setSrNo] = useState<number>(nextRecommendedSrNo);
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('All-Rounder');
  const [village, setVillage] = useState('');

  // Player Photo State
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoTab, setPhotoTab] = useState<'upload' | 'url'>('upload');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredPlayer, setRegisteredPlayer] = useState<{
    id: number;
    code: string;
    name: string;
    role: PlayerRole;
    srNo: number;
    village: string;
    photoUrl?: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  // Update srNo when nextRecommended changes if user hasn't typed custom srNo
  React.useEffect(() => {
    if (!registeredPlayer) {
      setSrNo(nextRecommendedSrNo);
    }
  }, [nextRecommendedSrNo, registeredPlayer]);

  // Handle Photo File Upload with automatic compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setIsCompressingPhoto(true);
    try {
      // Compress and resize photo to 450x450 JPEG for maximum performance & lightweight payload
      const compressedDataUrl = await compressImageFile(file, 450, 450, 0.85);
      setPhotoUrl(compressedDataUrl);
      showNotification('success', 'Player photo attached and optimized!');
    } catch (err: any) {
      setPhotoUploadError('Failed to process photo: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleApplyPhotoUrl = () => {
    setPhotoUploadError(null);
    const trimmed = photoUrlInput.trim();
    if (!trimmed) {
      setPhotoUploadError('Please enter a valid image URL');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setPhotoUploadError('Photo URL must begin with http:// or https://');
      return;
    }
    setPhotoUrl(trimmed);
    setPhotoUrlInput('');
    showNotification('success', 'Player photo URL applied!');
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setPhotoUrlInput('');
    setPhotoUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validation logic: English capital letters and surname at last
  const nameValidation = useMemo(() => {
    const raw = name.trim();
    if (!raw) {
      return { isValid: false, message: 'Please enter player full name.' };
    }

    // Must only contain English uppercase letters and spaces
    const englishCapitalRegex = /^[A-Z\s]+$/;
    if (!englishCapitalRegex.test(raw)) {
      return {
        isValid: false,
        message: 'Name must ONLY contain English CAPITAL letters (A-Z) and spaces.',
      };
    }

    // Must contain Surname at last (minimum 2 words)
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      return {
        isValid: false,
        message: 'Please include your Surname at the end (e.g., ROHIT SHARMA or AJAY JADHAV).',
      };
    }

    return {
      isValid: true,
      message: 'Valid: English capital letters with Surname at end.',
    };
  }, [name]);

  // Generate self-registration link
  const registrationLink = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'register');
      url.searchParams.delete('role');
      return url.toString();
    } catch {
      return `${window.location.origin}/?view=register`;
    }
  }, []);

  const handleCopyRegistrationLink = () => {
    navigator.clipboard.writeText(registrationLink);
    setCopiedLink(true);
    showNotification('success', 'Player registration link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const tournamentName = state?.settings?.tournamentName || 'Cricket League Auction';
    const text = `🏏 *${tournamentName.toUpperCase()} - PLAYER REGISTRATION OPEN*\n\nAll players are requested to register for the official auction pool.\n\n📝 *Register yourself here:*\n${registrationLink}\n\n⚠️ *Note:* Name must be in CAPITAL ENGLISH LETTERS with SURNAME AT LAST (e.g. ROHIT SHARMA).`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically uppercase on typing
    const upper = e.target.value.toUpperCase();
    setName(upper);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameValidation.isValid) {
      showNotification('error', nameValidation.message);
      return;
    }

    if (!village.trim()) {
      showNotification('error', 'Please enter your village / hometown.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await addPlayer({
        name: name.trim(),
        role,
        village: village.trim().toUpperCase(),
        srNo: Number(srNo) || nextRecommendedSrNo,
        photoUrl: photoUrl.trim() || undefined,
        photo: photoUrl.trim() || undefined,
      });

      if (ok) {
        const nextId = (state?.players?.length || 0) + 1;
        setRegisteredPlayer({
          id: nextId,
          code: `P${nextId.toString().padStart(3, '0')}`,
          name: name.trim(),
          role,
          srNo: Number(srNo) || nextRecommendedSrNo,
          village: village.trim().toUpperCase(),
          photoUrl: photoUrl.trim() || undefined,
        });
        showNotification('success', `Player ${name.trim()} successfully registered!`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setRegisteredPlayer(null);
    setName('');
    setVillage('');
    setPhotoUrl('');
    setPhotoUrlInput('');
    setPhotoUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setRole('All-Rounder');
    setSrNo(nextRecommendedSrNo + 1);
  };

  // Direct CSV Export of players (SR no, name, role, village)
  const handleExportPlayersCSV = () => {
    if (!state || !state.players) return;
    const headers = 'SR no,name,role,village\n';
    const rows = state.players
      .map((p, idx) => {
        const sr = p.srNo || idx + 1;
        const v = (p.village || '').replace(/"/g, '""');
        const n = p.name.replace(/"/g, '""');
        return `${sr},"${n}","${p.role}","${v}"`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `${(state.settings.tournamentName || 'cricket_auction').toLowerCase().replace(/\s+/g, '_')}_players_list.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', `Exported ${filename} with SR No, Name, Role, Village`);
  };

  const roles: { role: PlayerRole; desc: string; icon: string }[] = [
    { role: 'Batsman', desc: 'Top/Middle order specialist', icon: '🏏' },
    { role: 'Bowler', desc: 'Fast / Spin attack bowler', icon: '🎯' },
    { role: 'All-Rounder', desc: 'Batting and bowling capabilities', icon: '⚡' },
    { role: 'Wicket-Keeper', desc: 'Glovework and batting', icon: '🧤' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-5 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 max-w-2xl">
            {state?.settings?.tournamentLogo && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-lg">
                <img
                  src={state.settings.tournamentLogo}
                  alt="League Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Official Player Registration</span>
              </div>
              <h1 className="font-['Outfit'] font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white">
                {state?.settings?.tournamentName || 'CRICKET LEAGUE AUCTION'}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Register yourself to enter the official auction pool. Once submitted, your profile will be loaded into the live auction database for franchise bidding.
              </p>
            </div>
          </div>

          {/* Quick Share Links & CSV Export */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {handleBack && (
              <button
                onClick={handleBack}
                id="btn-back-to-dashboard-top"
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 border border-white/10 transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Dashboard</span>
              </button>
            )}

            <button
              onClick={handleCopyRegistrationLink}
              id="btn-copy-registration-link"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-['Outfit'] flex items-center gap-2 border border-white/10 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-300" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              id="btn-share-registration-whatsapp"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleExportPlayersCSV}
              id="btn-export-players-csv-top"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 shadow-sm transition-all"
              title="Export CSV (SR no, name, role, village)"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS REGISTRATION CONFIRMATION SCREEN */}
      {registeredPlayer ? (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-6 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-black font-['Outfit'] text-emerald-600 uppercase tracking-widest">
              REGISTRATION CONFIRMED
            </span>
            <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-slate-900">
              Welcome to the Auction Pool!
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
              Your details have been recorded into the live tournament database.
            </p>
          </div>

          {/* Registered Player Card */}
          <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="font-mono text-xs font-bold text-slate-500">
                SR NO: #{registeredPlayer.srNo}
              </span>
              <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {registeredPlayer.code}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {registeredPlayer.photoUrl ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md shrink-0 bg-slate-200">
                  <img
                    src={registeredPlayer.photoUrl}
                    alt={registeredPlayer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  🏏
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  PLAYER NAME
                </span>
                <span className="font-['Outfit'] font-black text-xl text-slate-900 block truncate">
                  {registeredPlayer.name}
                </span>
                {registeredPlayer.photoUrl && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Check className="w-3 h-3" /> Photo Attached
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">ROLE</span>
                <span className="text-xs font-bold text-slate-800">{registeredPlayer.role}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">VILLAGE</span>
                <span className="text-xs font-bold text-slate-800">{registeredPlayer.village}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRegisterAnother}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Another Player</span>
            </button>

            {handleBack && (
              <button
                onClick={handleBack}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <span>Back to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {onNavigateToAuction && !handleBack && (
              <button
                onClick={onNavigateToAuction}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <span>View Live Auction</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleExportPlayersCSV}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-['Outfit'] font-bold text-xs flex items-center gap-2 transition-all border border-slate-200"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download CSV Sheet</span>
            </button>
          </div>
        </div>
      ) : (
        /* REGISTRATION FORM & LIVE PREVIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7">
            <div className="border-b border-slate-100 pb-4 mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900">
                  Player Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete all required fields accurately.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                Slot #{srNo}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Field 1: Sr No */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>SR NO (Serial / Token Number)</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Auto-suggested or enter custom
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={srNo}
                  onChange={(e) => setSrNo(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Field 2: Name with strict validation */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>NAME (English & CAPITAL with Surname at last)</span>
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. ROHIT SHARMA or AJAY KUMAR JADHAV"
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border font-['Outfit'] font-bold text-sm tracking-wide focus:bg-white focus:ring-2 focus:outline-hidden uppercase transition-all ${
                    name.length > 0
                      ? nameValidation.isValid
                        ? 'border-emerald-400 focus:ring-emerald-500'
                        : 'border-amber-400 focus:ring-amber-500'
                      : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                  required
                />

                {/* Live validation feedback */}
                {name.length > 0 ? (
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${
                      nameValidation.isValid
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : 'text-amber-700 bg-amber-50 border border-amber-200'
                    }`}
                  >
                    {nameValidation.isValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>{nameValidation.message}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Rule: English alphabet only (A-Z) in ALL CAPS with your Surname/Family name at the end.
                  </p>
                )}
              </div>

              {/* Field 3: Playing Role */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  <span>PLAYING ROLE / DISCIPLINE</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
                  {roles.map((r) => {
                    const isSelected = role === r.role;
                    const badgeStyle = getRoleBadgeStyle(r.role);
                    return (
                      <div
                        key={r.role}
                        onClick={() => setRole(r.role)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{r.icon}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                          >
                            {r.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 line-clamp-1">{r.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Field 4: Village */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>VILLAGE / HOMETOWN</span>
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value.toUpperCase())}
                  placeholder="e.g. PIMPLI, SHIRUR, WAI, SATARA, KARAD"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-['Outfit'] font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase"
                  required
                />
                <span className="text-[11px] text-slate-400 block">
                  Enter native village, town, or residential locality.
                </span>
              </div>

              {/* Field 5: Player Photo (Optional) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>PLAYER PHOTO (OPTIONAL)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    Shown on Hammer Screen
                  </span>
                </div>

                {/* Photo Input Modes */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setPhotoTab('upload')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      photoTab === 'upload'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload / Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoTab('url')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      photoTab === 'url'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Photo Web URL</span>
                  </button>
                </div>

                {photoTab === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="player-photo-input"
                    />

                    {photoUrl ? (
                      <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-xs bg-slate-200 shrink-0">
                          <img src={photoUrl} alt="Player" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Photo Attached & Optimized</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Ready for live bidding display & roster
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <label
                              htmlFor="player-photo-input"
                              className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
                            >
                              Change Photo
                            </label>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="player-photo-input"
                        className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors shadow-2xs">
                          {isCompressingPhoto ? (
                            <Sparkles className="w-5 h-5 animate-spin text-indigo-600" />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {isCompressingPhoto ? 'Optimizing photo...' : 'Click to Upload Photo or Take Selfie'}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            JPG, PNG, or WEBP from camera or gallery (auto-compressed for fast loading)
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={photoUrlInput}
                        onChange={(e) => setPhotoUrlInput(e.target.value)}
                        placeholder="https://example.com/player-photo.jpg"
                        className="flex-1 px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPhotoUrl}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs"
                      >
                        Apply URL
                      </button>
                    </div>
                    {photoUrl && (
                      <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <img src={photoUrl} alt="URL Preview" className="w-9 h-9 rounded-lg object-cover border" />
                        <span className="text-xs text-slate-600 font-medium truncate flex-1">{photoUrl}</span>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {photoUploadError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{photoUploadError}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !nameValidation.isValid || !village.trim()}
                  id="btn-submit-player-registration"
                  className={`w-full py-3.5 rounded-2xl font-['Outfit'] font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                    !nameValidation.isValid || !village.trim()
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-[0.99]'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Registering Player...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>SUBMIT PLAYER REGISTRATION</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Side Preview & Information (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Player Card Preview */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                LIVE AUCTION BADGE PREVIEW
              </span>

              <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-5 border border-slate-800 shadow-md flex flex-col justify-between min-h-[220px]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/60">
                    SR #{srNo || 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">
                    CODE: P{(srNo || 1).toString().padStart(3, '0')}
                  </span>
                </div>

                <div className="my-4 text-center space-y-2">
                  {photoUrl ? (
                    <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-indigo-400/80 shadow-lg bg-slate-800">
                      <img
                        src={photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mx-auto text-2xl shadow-inner">
                      🏏
                    </div>
                  )}
                  <h3 className="font-['Outfit'] font-black text-xl text-white tracking-wide uppercase break-words">
                    {name.trim() || 'PLAYER NAME'}
                  </h3>
                  <div className="inline-block">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeStyle(role).bg} ${getRoleBadgeStyle(role).text} ${getRoleBadgeStyle(role).border}`}
                    >
                      {role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2.5 text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Village:</span>
                  </span>
                  <span className="font-bold text-white uppercase truncate max-w-[150px]">
                    {village.trim() || 'NOT SPECIFIED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Registration Instructions Box */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-['Outfit'] font-bold text-slate-900 text-sm">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Player Registration Rules</span>
              </div>
              <ul className="space-y-1.5 text-slate-500 list-disc list-inside">
                <li>
                  <strong className="text-slate-800">English Language:</strong> Name must be written exclusively in English alphabet letters.
                </li>
                <li>
                  <strong className="text-slate-800">CAPITAL LETTERS:</strong> All letters must be in uppercase.
                </li>
                <li>
                  <strong className="text-slate-800">Surname at Last:</strong> You must enter First Name followed by Surname (e.g. <span className="font-mono text-indigo-600">ROHIT SHARMA</span>).
                </li>
                <li>
                  <strong className="text-slate-800">Village:</strong> Enter your native village or town so teams can identify local talent.
                </li>
                <li>
                  <strong className="text-slate-800">Player Photo:</strong> Optional photo or selfie for the big screen auction hammer stage.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Roster & Export Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-base text-slate-900">
            Player Registration Database ({state?.players?.length || 0} Registered)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download the official player sheet containing SR No, Name, Role, and Village.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPlayersCSV}
            id="btn-export-registered-players-csv"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV (SR No, Name, Role, Village)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
