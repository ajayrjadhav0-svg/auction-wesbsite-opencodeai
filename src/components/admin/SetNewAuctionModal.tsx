import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Users,
  Shield,
  Coins,
  X,
  Check,
  AlertTriangle,
  UserPlus,
  Upload,
  Settings,
  Sliders,
  CheckCircle2,
  Trophy,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { Team, TournamentSettings } from '../../types';
import { formatPoints } from '../../utils/formatters';
import { PRESET_20_TEAMS } from '../../utils/teamPresets';
import { PRESET_LEAGUE_EMBLEMS } from './EditLeagueModal';

interface SetNewAuctionModalProps {
  isOpen: boolean;
  currentSettings: TournamentSettings;
  teams: Team[];
  playerCount?: number;
  onClose: () => void;
  onLaunchNewAuction: (config: {
    tournamentName: string;
    tournamentLogo?: string;
    startingPoints: number;
    maxSquadSize: number;
    defaultReservePrice: number;
    minBidIncrement: number;
    targetTeamCount: number;
    resetMode: 'reset-available' | 'empty' | 'demo' | 'keep-current';
    customTeams: Array<{ id?: string; name: string; shortCode: string; color: string }>;
  }) => Promise<void>;
  onOpenAddPlayer?: () => void;
  onOpenCsvUpload?: () => void;
}

export const SetNewAuctionModal: React.FC<SetNewAuctionModalProps> = ({
  isOpen,
  currentSettings,
  teams,
  playerCount = 0,
  onClose,
  onLaunchNewAuction,
  onOpenAddPlayer,
  onOpenCsvUpload,
}) => {
  // Wizard tab
  const [wizardTab, setWizardTab] = useState<'tournament' | 'teams' | 'players'>('tournament');

  // Step 1: Tournament & Quotas & Branding
  const [tournamentName, setTournamentName] = useState(
    currentSettings.tournamentName || 'Premier Cricket League 2026'
  );
  const [tournamentLogo, setTournamentLogo] = useState<string>(
    currentSettings.tournamentLogo || ''
  );
  const [startingPoints, setStartingPoints] = useState(currentSettings.startingPoints || 100000);
  const [maxSquadSize, setMaxSquadSize] = useState(currentSettings.maxSquadSize || 15);
  const [minSquadSize, setMinSquadSize] = useState(11);
  const [defaultReservePrice, setDefaultReservePrice] = useState(
    currentSettings.defaultReservePrice || 500
  );
  const [resetMode, setResetMode] = useState<'reset-available' | 'empty' | 'demo' | 'keep-current'>('reset-available');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Teams Configuration
  const [targetTeamCount, setTargetTeamCount] = useState<number>(teams.length || 6);
  const [teamList, setTeamList] = useState<Array<{ id: string; name: string; shortCode: string; color: string }>>(() => {
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      shortCode: t.shortCode || (t as any).short || t.name.slice(0, 3).toUpperCase(),
      color: t.color || '#4f46e5',
    }));
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize form state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setTournamentName(currentSettings.tournamentName || 'Premier Cricket League 2026');
      setTournamentLogo(currentSettings.tournamentLogo || '');
      setStartingPoints(currentSettings.startingPoints || 100000);
      setMaxSquadSize(currentSettings.maxSquadSize || 15);
      setDefaultReservePrice(currentSettings.defaultReservePrice || 500);
      setTargetTeamCount(teams.length || 6);
      setTeamList(
        teams.map((t) => ({
          id: t.id,
          name: t.name,
          shortCode: t.shortCode || (t as any).short || t.name.slice(0, 3).toUpperCase(),
          color: t.color || '#4f46e5',
        }))
      );
      setWizardTab('tournament');
      setIsSubmitting(false);
    }
  }, [isOpen, currentSettings, teams]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setTournamentLogo(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sync team list count when targetTeamCount changes (1 to 20 teams)
  const handleTeamCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setTargetTeamCount(validCount);

    if (validCount > teamList.length) {
      const needed = validCount - teamList.length;
      const additions = [];
      for (let i = 0; i < needed; i++) {
        const teamIndex = teamList.length + i;
        const p = PRESET_20_TEAMS[teamIndex % PRESET_20_TEAMS.length];
        additions.push({
          id: `T${teamIndex + 1}`,
          name: teamIndex < PRESET_20_TEAMS.length ? p.name : `${p.name} ${teamIndex + 1}`,
          shortCode: teamIndex < PRESET_20_TEAMS.length ? p.short : `${p.short}${teamIndex + 1}`,
          color: p.color,
        });
      }
      setTeamList([...teamList, ...additions]);
    } else if (validCount < teamList.length) {
      setTeamList(teamList.slice(0, validCount));
    }
  };

  const handleTeamNameChange = (index: number, newName: string) => {
    const updated = [...teamList];
    updated[index].name = newName;
    if (!updated[index].shortCode || updated[index].shortCode.length <= 3) {
      updated[index].shortCode = newName.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
    }
    setTeamList(updated);
  };

  const handleTeamColorChange = (index: number, newColor: string) => {
    const updated = [...teamList];
    updated[index].color = newColor;
    setTeamList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentName.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onLaunchNewAuction({
        tournamentName: tournamentName.trim(),
        tournamentLogo: tournamentLogo.trim() || undefined,
        startingPoints: Math.max(1000, Number(startingPoints) || 100000),
        maxSquadSize: Math.max(5, Number(maxSquadSize) || 15),
        defaultReservePrice: Math.max(100, Number(defaultReservePrice) || 500),
        minBidIncrement: 500,
        targetTeamCount: Number(targetTeamCount),
        resetMode,
        customTeams: teamList.map((t, idx) => ({
          id: t.id,
          name: t.name.trim() || `Team ${idx + 1}`,
          shortCode: (t.shortCode || t.name.slice(0, 3)).trim().toUpperCase(),
          color: t.color || '#4f46e5',
        })),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                AUCTION SETUP & CONFIGURATION WIZARD
              </span>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Initialize Brand-New Auction Event
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setWizardTab('tournament')}
            className={`pb-3 pt-2 px-3 text-xs font-bold font-['Outfit'] border-b-2 flex items-center gap-2 transition-all ${
              wizardTab === 'tournament'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Event & Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setWizardTab('teams')}
            className={`pb-3 pt-2 px-3 text-xs font-bold font-['Outfit'] border-b-2 flex items-center gap-2 transition-all ${
              wizardTab === 'teams'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>2. Team Configuration</span>
          </button>

          <button
            type="button"
            onClick={() => setWizardTab('players')}
            className={`pb-3 pt-2 px-3 text-xs font-bold font-['Outfit'] border-b-2 flex items-center gap-2 transition-all ${
              wizardTab === 'players'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>3. Player Pool & Mode</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: TOURNAMENT & QUOTAS */}
          {wizardTab === 'tournament' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tournament / League Title
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="e.g., Premier Cricket League 2026"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Tournament / League Logo */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    League Logo / Official Emblem
                  </label>
                  {tournamentLogo && (
                    <button
                      type="button"
                      onClick={() => setTournamentLogo('')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Current Preview */}
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {tournamentLogo ? (
                      <img
                        src={tournamentLogo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xl">🏏</span>
                    )}
                  </div>

                  {/* Preset Emblem Quick Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-1">
                    {PRESET_LEAGUE_EMBLEMS.map((emblem) => (
                      <button
                        key={emblem.id}
                        type="button"
                        onClick={() => setTournamentLogo(emblem.dataUri)}
                        title={emblem.label}
                        className={`w-9 h-9 rounded-xl border p-1 shrink-0 transition-all flex items-center justify-center ${
                          tournamentLogo === emblem.dataUri
                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-100'
                        }`}
                      >
                        <img
                          src={emblem.dataUri}
                          alt={emblem.label}
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}

                    {/* Upload File button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-700 shrink-0 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upload</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Starting Points Purse */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Starting Purse / Points (Per Team)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={5000}
                    value={startingPoints}
                    onChange={(e) => setStartingPoints(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">
                    Points
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Standard: 100,000 points per franchise team.
                </span>
              </div>

              {/* Player Quotas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Max Squad Size (Slots)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={maxSquadSize}
                    onChange={(e) => setMaxSquadSize(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                  <span className="text-[11px] text-slate-400 block">
                    Maximum roster capacity per team (e.g. 15)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Min Reserve / Bid (Points)
                  </label>
                  <input
                    type="number"
                    step={100}
                    value={defaultReservePrice}
                    onChange={(e) => setDefaultReservePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                  <span className="text-[11px] text-slate-400 block">
                    Opening reserve price & minimum bid step
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWizardTab('teams')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs"
                >
                  Next: Configure Teams →
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TEAMS CONFIGURATION */}
          {wizardTab === 'teams' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Total Number of Teams
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Select quick size or customize below
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                  {targetTeamCount} Teams Configured
                </span>
              </div>

              {/* Quick Count Selectors & Flexible Range (1 to 20 Teams) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Choose Any Number (1 - 20):</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTeamCountChange(targetTeamCount - 1)}
                      disabled={targetTeamCount <= 1}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm disabled:opacity-40"
                    >
                      -
                    </button>
                    <select
                      value={targetTeamCount}
                      onChange={(e) => handleTeamCountChange(Number(e.target.value))}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((cnt) => (
                        <option key={cnt} value={cnt}>
                          {cnt} Teams {cnt % 2 === 0 ? '(Even)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleTeamCountChange(targetTeamCount + 1)}
                      disabled={targetTeamCount >= 20}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick Even Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((count) => {
                    const isSelected = targetTeamCount === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleTeamCountChange(count)}
                        className={`px-2.5 py-1.5 rounded-xl font-['Outfit'] font-bold text-xs border transition-all shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {count} Teams
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Team Names & Colors */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Franchise Names & Colors
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {teamList.map((team, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <input
                        type="color"
                        value={team.color}
                        onChange={(e) => handleTeamColorChange(idx, e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        title="Choose team color"
                      />
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                        placeholder={`Team ${idx + 1} Name`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        maxLength={4}
                        value={team.shortCode}
                        onChange={(e) => {
                          const updated = [...teamList];
                          updated[idx].shortCode = e.target.value.toUpperCase();
                          setTeamList(updated);
                        }}
                        placeholder="CODE"
                        className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center text-slate-800 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardTab('tournament')}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardTab('players')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs"
                >
                  Next: Player Pool →
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PLAYER POOL & MODE */}
          {wizardTab === 'players' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span className="font-['Outfit'] font-black text-xs uppercase tracking-wider text-indigo-900">
                    Player Pool Registration & Import
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Register custom players or bulk import an entire roster spreadsheet:
                </p>

                <div className="flex items-center gap-3 pt-1">
                  {onOpenAddPlayer && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAddPlayer();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-indigo-700 font-bold text-xs shadow-2xs flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register Single Player</span>
                    </button>
                  )}

                  {onOpenCsvUpload && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCsvUpload();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-emerald-700 font-bold text-xs shadow-2xs flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Bulk Upload CSV/Excel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Auction State & Bidding Mode */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Auction Session Initialization Mode
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                    {playerCount} Players in Pool
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between text-xs transition-all ${
                      resetMode === 'reset-available'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Fresh Pre-Auction</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="resetMode"
                      value="reset-available"
                      checked={resetMode === 'reset-available'}
                      onChange={() => setResetMode('reset-available')}
                      className="sr-only"
                    />
                    <span className="text-[11px] text-slate-600">
                      Keep {playerCount} registered players. Reset all bids & sales to 0 (all AVAILABLE). Restore full starting purse ({startingPoints.toLocaleString()} pts) for all {targetTeamCount} teams.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between text-xs transition-all ${
                      resetMode === 'empty'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>Blank Slate (Empty Pool)</span>
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="resetMode"
                      value="empty"
                      checked={resetMode === 'empty'}
                      onChange={() => setResetMode('empty')}
                      className="sr-only"
                    />
                    <span className="text-[11px] text-slate-600">
                      Clear all players to 0. Start totally clean with new teams and purses ready for a new CSV roster upload or registrations.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between text-xs transition-all ${
                      resetMode === 'keep-current'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Keep Current Sales</span>
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="resetMode"
                      value="keep-current"
                      checked={resetMode === 'keep-current'}
                      onChange={() => setResetMode('keep-current')}
                      className="sr-only"
                    />
                    <span className="text-[11px] text-slate-600">
                      Update rules & franchise titles without modifying existing player assignments, prices, or team transactions.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between text-xs transition-all ${
                      resetMode === 'demo'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Demo Sample Season</span>
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="resetMode"
                      value="demo"
                      checked={resetMode === 'demo'}
                      onChange={() => setResetMode('demo')}
                      className="sr-only"
                    />
                    <span className="text-[11px] text-slate-600">
                      Load a populated sample tournament with pre-assigned squad sales and bidding transactions for test demonstrations.
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardTab('teams')}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  ← Back to Teams
                </button>
              </div>
            </div>
          )}

          {/* Submit Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-black text-sm shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Launching Auction...' : 'Launch New Auction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
