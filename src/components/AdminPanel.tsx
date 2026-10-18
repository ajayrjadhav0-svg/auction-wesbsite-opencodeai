import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Gavel,
  Upload,
  Sparkles,
  Users,
  Share2,
  Copy,
  Check,
  Plus,
  Edit2,
  RotateCcw,
  AlertTriangle,
  Search,
  Eye,
  IndianRupee,
  Layers,
  ChevronRight,
  X,
  Clock,
  UserCheck,
  UserPlus,
  RefreshCw,
  Trophy,
  Download,
  Trash2,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { formatINR, formatPoints, getRoleBadgeStyle } from '../utils/formatters';
import { ActiveNav, Player, PlayerRole, Team } from '../types';

import { ConfirmSaleModal } from './admin/ConfirmSaleModal';
import { SetNewAuctionModal } from './admin/SetNewAuctionModal';
import { EditTeamModal } from './admin/EditTeamModal';
import { TeamSquadModal } from './admin/TeamSquadModal';
import { AddNewPlayerModal } from './admin/AddNewPlayerModal';
import { CsvUploadModal } from './admin/CsvUploadModal';
import { AdminAccessGate } from './admin/AdminAccessGate';
import { TotpSetupCard } from './admin/TotpSetupCard';
import { AuctionExportModal } from './AuctionExportModal';
import { EditLeagueModal } from './admin/EditLeagueModal';
import { EditRulesModal } from './admin/EditRulesModal';
import { PRESET_20_TEAMS } from '../utils/teamPresets';

interface AdminPanelProps {
  onSelectNav: (nav: ActiveNav) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSelectNav }) => {
  const {
    state,
    role,
    setRole,
    updateSettings,
    addTeam,
    updateTeam,
    deleteTeam,
    selectAuctionPlayer,
    sellPlayer,
    markUnsold,
    reopenPlayer,
    resetAuction,
    createNewAuction,
    clearAllPlayers,
    importPlayerRows,
    addPlayer,
    getViewerShareUrl,
    showNotification,
  } = useAuction();

  // Top quick state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRegLink, setCopiedRegLink] = useState(false);
  const [copiedStageLink, setCopiedStageLink] = useState(false);

  const handleClearAllPlayersClick = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to ERASE all player records from the database?\n\nThis will remove all players so you can upload your clean CSV (ID, Name, Role, Village).'
    );
    if (!confirmed) return;
    await clearAllPlayers();
  };

  // Unified Auction & Hammer Desk State
  const [playerInput, setPlayerInput] = useState<string>('');
  const [selectedSellTeamId, setSelectedSellTeamId] = useState<string>('');
  const [sellAmountInput, setSellAmountInput] = useState<number>(500);

  // Modals state
  const [isConfirmSaleOpen, setIsConfirmSaleOpen] = useState(false);
  const [isSetNewAuctionOpen, setIsSetNewAuctionOpen] = useState(false);
  const [isEditLeagueOpen, setIsEditLeagueOpen] = useState(false);
  const [isEditRulesOpen, setIsEditRulesOpen] = useState(false);
  const [isAddNewPlayerOpen, setIsAddNewPlayerOpen] = useState(false);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToViewSquad, setTeamToViewSquad] = useState<Team | null>(null);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Available & Unsold players search/filter state
  const [availableSearch, setAvailableSearch] = useState('');
  const [availableRoleFilter, setAvailableRoleFilter] = useState('ALL');
  const [unsoldSearch, setUnsoldSearch] = useState('');

  // Synchronize Player input and bid with current bidding player when bidding changes
  useEffect(() => {
    if (state?.bidding?.currentPlayerId) {
      setPlayerInput(String(state.bidding.currentPlayerId));
      setSellAmountInput(state.bidding.currentBid || state?.settings?.defaultReservePrice || 500);
    }
  }, [state?.bidding?.currentPlayerId, state?.bidding?.currentBid, state?.settings?.defaultReservePrice]);

  // Set default team for sell
  useEffect(() => {
    if (state?.teams && state.teams.length > 0 && !selectedSellTeamId) {
      setSelectedSellTeamId(state.teams[0].id);
    }
  }, [state?.teams, selectedSellTeamId]);

  const players = state?.players || [];
  const teams = state?.teams || [];

  // Resolve currently auctioned player on stage
  const currentStagePlayer = state?.bidding?.currentPlayerId
    ? players.find((p) => p.id === state.bidding.currentPlayerId)
    : undefined;

  // Resolve player in the unified auction desk (by input or falling back to current stage player)
  const resolvedPlayer = useMemo(() => {
    if (!playerInput.trim()) return currentStagePlayer || null;
    const clean = playerInput.trim().toUpperCase();
    const byId = players.find((p) => String(p.id) === clean);
    if (byId) return byId;
    const byCode = players.find((p) => p.code.toUpperCase() === clean);
    if (byCode) return byCode;
    const byName = players.find((p) => p.name.toUpperCase().includes(clean));
    return byName || currentStagePlayer || null;
  }, [playerInput, players, currentStagePlayer]);

  // Resolve selected team to sell to
  const resolvedSellTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedSellTeamId) || teams[0] || null;
  }, [selectedSellTeamId, teams]);

  // Filtered Available Players
  const availablePlayers = useMemo(() => {
    return players.filter((p) => {
      if (p.status !== 'AVAILABLE') return false;
      if (availableRoleFilter !== 'ALL' && p.role !== availableRoleFilter) return false;
      if (availableSearch.trim()) {
        const query = availableSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [players, availableSearch, availableRoleFilter]);

  // Unsold Players
  const unsoldPlayers = useMemo(() => {
    return players.filter((p) => {
      if (p.status !== 'UNSOLD') return false;
      if (unsoldSearch.trim()) {
        const query = unsoldSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [players, unsoldSearch]);

  if (!state) return null;

  // Handlers
  const handleCopyViewerLink = () => {
    const link = getViewerShareUrl();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showNotification('success', 'Viewer link copied! Anyone can view live.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Fullscreen responsive STAGE view: same URL auto-scales on phones,
  // laptops and the big projector screen.
  const buildStageUrl = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'stage');
      url.searchParams.set('role', 'viewer');
      return url.toString();
    } catch {
      return `${window.location.origin}/?view=stage&role=viewer`;
    }
  };

  const handleOpenStage = () => {
    window.open(buildStageUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleCopyStageLink = () => {
    navigator.clipboard.writeText(buildStageUrl());
    setCopiedStageLink(true);
    showNotification('success', 'Stage link copied! Open it on the projector or phones.');
    setTimeout(() => setCopiedStageLink(false), 3000);
  };

  const handleCopyRegistrationLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'register');
      url.searchParams.delete('role');
      navigator.clipboard.writeText(url.toString());
    } catch {
      navigator.clipboard.writeText(`${window.location.origin}/?view=register`);
    }
    setCopiedRegLink(true);
    showNotification('success', 'Player self-registration link copied to clipboard!');
    setTimeout(() => setCopiedRegLink(false), 3000);
  };

  const handleExportPlayersRegistrationCSV = () => {
    if (!state?.players) return;
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
    showNotification('success', 'Exported Players CSV (SR No, Name, Role, Village)');
  };

  const handleEnterPlayerToHammer = async (playerToEnter?: Player) => {
    const target = playerToEnter || resolvedPlayer;
    if (!target) {
      showNotification('error', 'Please enter or select a valid Player first.');
      return;
    }
    const success = await selectAuctionPlayer(target.id);
    if (success) {
      setPlayerInput(String(target.id));
      setSellAmountInput(target.soldPrice > 0 ? target.soldPrice : state.settings.defaultReservePrice || 500);
      showNotification('success', `Now on Auction Block: ${target.name} (${target.code})`);
    }
  };

  const handleInitiateSell = () => {
    if (!resolvedPlayer) {
      showNotification('error', 'Please select a player to sell.');
      return;
    }
    if (!resolvedSellTeam) {
      showNotification('error', 'Please select a franchise team.');
      return;
    }
    if (!sellAmountInput || sellAmountInput <= 0) {
      showNotification('error', 'Sold amount must be greater than 0.');
      return;
    }
    // Open confirmation modal
    setIsConfirmSaleOpen(true);
  };

  const handleConfirmSaleFinal = async () => {
    if (!resolvedPlayer || !resolvedSellTeam) return;
    setIsSubmittingSale(true);
    try {
      const ok = await sellPlayer(
        resolvedPlayer.id,
        resolvedSellTeam.id,
        sellAmountInput,
        true // admin direct confirmation
      );
      if (ok) {
        setIsConfirmSaleOpen(false);
      }
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const handleMarkUnsoldDirect = async () => {
    if (!resolvedPlayer) {
      showNotification('error', 'No player selected to mark unsold.');
      return;
    }
    await markUnsold(resolvedPlayer.id);
  };

  // Flexible Team Count Adjuster (1 to 20 teams)
  const handleSetTeamCount = async (targetCount: number) => {
    const target = Math.max(1, Math.min(20, targetCount));
    const currentCount = state.teams.length;
    if (target === currentCount) return;

    if (target > currentCount) {
      const needed = target - currentCount;
      for (let i = 0; i < needed; i++) {
        const teamIndex = currentCount + i;
        const p = PRESET_20_TEAMS[teamIndex % PRESET_20_TEAMS.length];
        await addTeam({
          name: teamIndex < PRESET_20_TEAMS.length ? p.name : `${p.name} ${teamIndex + 1}`,
          shortCode: teamIndex < PRESET_20_TEAMS.length ? p.short : `${p.short}${teamIndex + 1}`,
          color: p.color,
          badgeBg: p.badgeBg,
          badgeText: p.badgeText,
          startingPoints: state.settings.startingPoints,
          auctionBudget: state.settings.auctionBudget,
        });
      }
      showNotification('success', `Added ${needed} new franchise team(s). Total: ${target} teams.`);
    } else {
      // Reducing team count: check from end
      const teamsToRemove = state.teams.slice(target);
      const teamsWithPlayers = teamsToRemove.filter((t) => {
        const squad = state.players.filter((p) => p.soldToTeamId === t.id);
        return squad.length > 0;
      });

      if (teamsWithPlayers.length > 0) {
        showNotification(
          'error',
          `Cannot remove team(s) [${teamsWithPlayers.map((t) => t.name).join(', ')}] because they have purchased players. Please reopen or reassign their players first.`
        );
        return;
      }

      for (const t of teamsToRemove) {
        await deleteTeam(t.id);
      }
      showNotification('success', `Updated team count to ${target} teams.`);
    }
  };

  // Stepper for squad size
  const handleSquadSizeChange = async (delta: number) => {
    const newSize = Math.max(5, Math.min(30, (state.settings.maxSquadSize || 15) + delta));
    await updateSettings({
      maxSquadSize: newSize,
      maxAuctionPlayers: newSize - (state.settings.iconPlayersCount || 2),
    });
    showNotification('success', `Squad size limit set to ${newSize} players per team.`);
  };

  // Guard: Admin panel is strictly for authenticated administrators only
  if (role !== 'admin') {
    return (
      <AdminAccessGate
        onReturnToDashboard={() => onSelectNav('dashboard')}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* QUICK STATUS BAR & STAGE SHORTCUT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {state.settings.tournamentLogo ? (
              <img
                src={state.settings.tournamentLogo}
                alt="League Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-xl">🏆</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="font-['Outfit'] font-black text-lg text-slate-900 tracking-tight">
                {state.settings.tournamentName || 'Cricket League Auction'}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500">
              Live Auction Desk & Hammer Console • Real-time hammer control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-top-edit-league-branding"
            onClick={() => setIsEditLeagueOpen(true)}
            className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>League Name & Logo</span>
          </button>
          <button
            onClick={handleOpenStage}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            title="Open the fullscreen auto-scaling stage (projector / laptop / phone)"
          >
            <span>Open Big Stage</span>
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelectNav('dashboard')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* 1. UNIFIED LIVE AUCTION & HAMMER DESK (MERGED STEP 1 & STEP 2) */}
      <div className="bg-white rounded-3xl border-2 border-indigo-500/30 p-6 shadow-md relative overflow-hidden space-y-5">
        {/* Console Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  LIVE AUCTION & HAMMER DESK
                </span>
                <span className="text-[10px] font-bold text-slate-400">•</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  SINGLE CONSOLE
                </span>
              </div>
              <h2 className="font-['Outfit'] font-black text-slate-900 text-lg md:text-xl mt-0.5">
                Player Auction, Bidding & Hammer Console
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentStagePlayer ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="truncate max-w-[200px] sm:max-w-none">
                  ON STAGE: {currentStagePlayer.name} ({currentStagePlayer.code})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Stage Ready</span>
              </div>
            )}
            <button
              onClick={handleOpenStage}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Open on the big projector screen (auto-scales on any screen size)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{currentStagePlayer ? 'Show on Big Stage' : 'Open Big Stage'}</span>
            </button>
          </div>
        </div>

        {/* Unified 2-Column Command Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: PLAYER SELECTION & PREVIEW */}
          <div className="lg:col-span-5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Player Search / ID Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Player ID, Code or Name
                  </label>
                  {resolvedPlayer && (
                    <span className="text-[11px] font-mono font-bold text-indigo-600">
                      #{resolvedPlayer.code}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-auction-player"
                    type="text"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    placeholder="e.g. 5, P005, or Virat..."
                    className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                  />
                  {playerInput && (
                    <button
                      onClick={() => setPlayerInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Resolved Player Card */}
              {resolvedPlayer ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-slate-50 border border-indigo-200/80 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {resolvedPlayer.photoUrl ? (
                        <img
                          src={resolvedPlayer.photoUrl}
                          alt={resolvedPlayer.name}
                          className="w-12 h-12 rounded-xl object-cover border border-indigo-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-['Outfit'] font-black text-lg flex items-center justify-center shadow-xs">
                          {resolvedPlayer.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-indigo-700">
                            {resolvedPlayer.code}
                          </span>
                          {resolvedPlayer.village && (
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                              • {resolvedPlayer.village}
                            </span>
                          )}
                        </div>
                        <h4 className="font-['Outfit'] font-black text-base md:text-lg text-slate-900 leading-tight">
                          {resolvedPlayer.name}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        resolvedPlayer.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : resolvedPlayer.status === 'SOLD'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {resolvedPlayer.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-indigo-100/70 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-white font-bold text-slate-700 border border-indigo-100">
                        {resolvedPlayer.role}
                      </span>
                      {resolvedPlayer.matchesPlayed ? (
                        <span className="text-slate-500 text-[11px]">
                          {resolvedPlayer.matchesPlayed} Matches
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Base Price</span>
                      <span className="font-mono font-black text-indigo-700">
                        {formatPoints(state.settings.defaultReservePrice || 500)} pts
                      </span>
                    </div>
                  </div>

                  {/* Stage status indicator & Load to Stage shortcut */}
                  <div className="flex items-center justify-between bg-white/90 px-3 py-2 rounded-xl border border-indigo-100 text-xs">
                    <div className="flex items-center gap-2">
                      {currentStagePlayer?.id === resolvedPlayer.id ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold text-emerald-700">On Live Auction Stage</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-slate-600">Selected in Console</span>
                        </>
                      )}
                    </div>
                    <button
                      id="btn-admin-load-to-stage"
                      type="button"
                      onClick={() => handleEnterPlayerToHammer(resolvedPlayer)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-['Outfit'] transition-all flex items-center gap-1.5 cursor-pointer ${
                        currentStagePlayer?.id === resolvedPlayer.id
                          ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                      }`}
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>{currentStagePlayer?.id === resolvedPlayer.id ? 'Reload Stage' : 'Load to Stage'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                  <Gavel className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No player selected</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Type a Player ID, code or name above, or click <span className="font-bold text-indigo-600">Hammer</span> or <span className="font-bold text-slate-700">Select</span> in the pool below.
                  </p>
                </div>
              )}
            </div>

            {/* Stage Quick Action Button */}
            <button
              id="btn-admin-enter-player-hammer"
              type="button"
              onClick={() => handleEnterPlayerToHammer()}
              disabled={!resolvedPlayer}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-['Outfit'] font-black text-xs md:text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Gavel className="w-4 h-4" />
              <span>
                {currentStagePlayer?.id === resolvedPlayer?.id
                  ? 'PLAYER IS LIVE ON AUCTION STAGE'
                  : 'ENTER / LOAD SELECTED PLAYER TO HAMMER STAGE'}
              </span>
            </button>
          </div>

          {/* RIGHT: FRANCHISE TEAM, BID AMOUNT & HAMMER SALE */}
          <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* 1. Winning Franchise Team */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Select Winning Franchise Team
                  </label>
                  {resolvedSellTeam && (
                    <span className="text-xs text-slate-600">
                      Purse:{' '}
                      <strong className="text-emerald-600 font-mono">
                        {formatPoints(resolvedSellTeam.pointsRemaining)} pts
                      </strong>
                      {' '}• Squad:{' '}
                      <strong>{resolvedSellTeam.totalPlayers}/{state.settings.maxSquadSize}</strong>
                    </span>
                  )}
                </div>
                <select
                  id="select-sell-team"
                  value={selectedSellTeamId}
                  onChange={(e) => setSelectedSellTeamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs md:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {state.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.shortCode}) • Purse: {formatPoints(t.pointsRemaining)} pts • Squad: {t.totalPlayers}/{state.settings.maxSquadSize}
                    </option>
                  ))}
                </select>

                {/* Visual Quick Click Team Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                  {state.teams.map((t) => {
                    const isSelected = t.id === selectedSellTeamId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedSellTeamId(t.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <span>{t.shortCode}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Sold Amount & Quick Increment Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Sold Hammer Amount (Points)
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {formatPoints(sellAmountInput)} Points
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="input-sell-amount"
                    type="number"
                    step={state.settings.minBidIncrement || 500}
                    value={sellAmountInput}
                    onChange={(e) => setSellAmountInput(Math.max(0, Number(e.target.value)))}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-black text-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSellAmountInput((prev) => prev + 500)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold font-mono transition-colors cursor-pointer"
                  >
                    +500
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellAmountInput((prev) => prev + 1000)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold font-mono transition-colors cursor-pointer"
                  >
                    +1K
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellAmountInput((prev) => prev + 5000)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold font-mono transition-colors cursor-pointer"
                  >
                    +5K
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellAmountInput((prev) => prev + 10000)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold font-mono transition-colors cursor-pointer"
                  >
                    +10K
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Action Buttons (SELL PLAYER / MARK UNSOLD) */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <button
                id="btn-admin-sell-player"
                type="button"
                onClick={handleInitiateSell}
                className="sm:col-span-8 w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-['Outfit'] font-black text-base md:text-lg shadow-lg hover:shadow-xl active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Gavel className="w-6 h-6 text-emerald-200" />
                <span>SELL PLAYER (HAMMER DOWN)</span>
              </button>

              <button
                id="btn-admin-mark-unsold"
                type="button"
                onClick={handleMarkUnsoldDirect}
                className="sm:col-span-4 w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-['Outfit'] font-black text-xs md:text-sm shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-200" />
                <span>MARK AS UNSOLD</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FRANCHISE TEAMS, PURSES & SQUADS (SINGLE SCREEN) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                LEAGUE FRANCHISES & SQUADS
              </span>
              <h3 className="font-['Outfit'] font-black text-slate-900 text-lg">
                Franchise Purses & Team Squads ({state.teams.length} Teams)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Click name to edit franchise:</span>
            <button
              onClick={() => {
                const uniqueId = `team-${Date.now()}`;
                addTeam({
                  name: `FRANCHISE ${state.teams.length + 1}`,
                  shortCode: `F${state.teams.length + 1}`,
                  color: '#4f46e5',
                  startingPoints: state.settings.startingPoints,
                  auctionBudget: state.settings.auctionBudget,
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Team</span>
            </button>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {state.teams.map((team) => {
            const isFull = team.totalPlayers >= state.settings.maxSquadSize;
            const isOverPoints = team.pointsRemaining < 0;

            return (
              <div
                key={team.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Bar with Badge, Name and Edit Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-xs text-white shadow-2xs shrink-0"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.shortCode}
                      </div>
                      <h4
                        onClick={() => setTeamToEdit(team)}
                        className="font-['Outfit'] font-black text-sm text-slate-900 truncate hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                        title="Click to rename team"
                      >
                        <span>{team.name}</span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                      </h4>
                    </div>

                    <button
                      onClick={() => setTeamToEdit(team)}
                      title="Edit Franchise Name & Color"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Purse Details */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Remaining Purse</span>
                      <span
                        className={`font-mono font-black text-sm ${
                          isOverPoints ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatPoints(team.pointsRemaining)} pts
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Max Safe Bid</span>
                      <span className="font-mono font-black text-sm text-indigo-700">
                        {formatPoints(team.maxSafeBid)} pts
                      </span>
                    </div>
                  </div>

                  {/* Squad Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Squad Fill</span>
                      <span>
                        {team.totalPlayers} / {state.settings.maxSquadSize} Slots
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (team.totalPlayers / state.settings.maxSquadSize) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {team.committeeCash > 0 && (
                    <div className="mt-2 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      <span>Penalty: {formatINR(team.committeeCash)}</span>
                    </div>
                  )}
                </div>

                {/* View Squad Roster Button */}
                <button
                  onClick={() => setTeamToViewSquad(team)}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-['Outfit'] font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Squad ({team.totalPlayers} Players)</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. LIVE AUDIT FEED & PLAYER POOLS (AVAILABLE & UNSOLD) ON SINGLE SCREEN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 1: LIVE PLAYER SOLD FEED */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col max-h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-['Outfit'] font-black text-slate-900 text-sm uppercase tracking-wider">
                Live Sold Feed ({state.transactions.length})
              </h3>
            </div>
            <button
              onClick={() => onSelectNav('auction-history')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5"
            >
              Full Ledger <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
            {state.transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                No players sold yet. Hammer sales will appear here in real time.
              </div>
            ) : (
              state.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="font-mono text-slate-500">#{tx.auctionOrder}</span>
                      <span className="truncate">{tx.playerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-indigo-600">{tx.teamName}</span>
                      <span>•</span>
                      <span>{tx.role}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatPoints(tx.soldPrice)} pts
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => reopenPlayer(tx.playerId)}
                    title="Undo / Rollback sale"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 2: AVAILABLE PLAYERS POOL */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col max-h-[560px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
            <h3 className="font-['Outfit'] font-black text-slate-900 text-sm uppercase tracking-wider">
              Available Players ({availablePlayers.length})
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={availableSearch}
                onChange={(e) => setAvailableSearch(e.target.value)}
                placeholder="Search..."
                className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none w-28"
              />
              <select
                value={availableRoleFilter}
                onChange={(e) => setAvailableRoleFilter(e.target.value)}
                className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket-Keeper">WK</option>
              </select>
            </div>
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {availablePlayers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                No available players match your filter.
              </div>
            ) : (
              availablePlayers.map((player) => {
                const roleStyle = getRoleBadgeStyle(player.role);
                return (
                  <div
                    key={player.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-300 transition-all flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[11px]">{player.code}</span>
                        <span className="font-['Outfit'] font-black text-slate-900 truncate">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {player.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Put on Hammer */}
                      <button
                        onClick={() => handleEnterPlayerToHammer(player)}
                        title="Load onto Auction Hammer floor"
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-['Outfit'] font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Gavel className="w-3 h-3" />
                        <span>Hammer</span>
                      </button>

                      {/* Fill in Auction Desk */}
                      <button
                        onClick={() => {
                          setPlayerInput(String(player.id));
                          setSellAmountInput(state.settings.defaultReservePrice || 500);
                          showNotification('info', `Selected ${player.name} in auction desk.`);
                        }}
                        title="Select in Live Auction Desk"
                        className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 3: UNSOLD PLAYERS POOL */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col max-h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h3 className="font-['Outfit'] font-black text-slate-900 text-sm uppercase tracking-wider">
              Unsold ({unsoldPlayers.length})
            </h3>
            <input
              type="text"
              value={unsoldSearch}
              onChange={(e) => setUnsoldSearch(e.target.value)}
              placeholder="Search..."
              className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none w-24"
            />
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {unsoldPlayers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                No unsold players.
              </div>
            ) : (
              unsoldPlayers.map((player) => (
                <div
                  key={player.id}
                  className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-slate-500 text-[10px]">{player.code}</span>
                    <h5 className="font-['Outfit'] font-bold text-slate-900 truncate">
                      {player.name}
                    </h5>
                    <span className="text-[10px] text-slate-500">{player.role}</span>
                  </div>

                  <button
                    onClick={() => handleEnterPlayerToHammer(player)}
                    title="Re-open to Auction Hammer"
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-Auction</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PLAYER FOR REGISTRATION LINK & CSV ROSTER PANEL (AT BOTTOM)            */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-5 border border-indigo-800/60 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">
              PLAYER FOR REGISTRATION LINK & CSV ROSTER
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-emerald-300">
              {state.players.length} Total Players
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Share the public self-registration link. Form validates English CAPITAL letters with Surname at last, Role & Village.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Registration Link */}
          <button
            onClick={handleCopyRegistrationLink}
            id="btn-admin-banner-copy-reg-link"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 border border-white/10 transition-all"
          >
            {copiedRegLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-300" />}
            <span>{copiedRegLink ? 'Link Copied!' : 'Copy Reg Link'}</span>
          </button>

          {/* Open Registration Portal */}
          <button
            onClick={() => onSelectNav('register')}
            id="btn-admin-banner-open-reg"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Open Registration Form</span>
          </button>

          {/* Upload CSV (ID, Name, Role, Village) */}
          <button
            onClick={() => setIsCsvUploadOpen(true)}
            id="btn-admin-banner-upload-csv"
            title="Upload CSV of players containing ID, Name, Role, Village"
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Players CSV</span>
          </button>

          {/* Erase All Players */}
          <button
            onClick={handleClearAllPlayersClick}
            id="btn-admin-banner-erase-players"
            title="Erase all player records to start fresh"
            className="px-3.5 py-2 rounded-xl bg-rose-800/80 hover:bg-rose-700 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 border border-rose-600/50 shadow-sm transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-300" />
            <span>Erase All Players</span>
          </button>

          {/* Export CSV (SR No, Name, Role, Village) */}
          <button
            onClick={handleExportPlayersRegistrationCSV}
            id="btn-admin-banner-export-csv"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 border border-white/10 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ADMIN AUCTION DIRECTOR & TOURNAMENT PARAMETERS BAR (AT BOTTOM)          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {state.settings.tournamentLogo ? (
                <img
                  src={state.settings.tournamentLogo}
                  alt="League Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-2xl">🏆</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                  ADMIN AUCTION DIRECTOR
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  TOURNAMENT CONTROLS & SQUAD CONFIGURATION
                </span>
              </div>
              <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 tracking-tight">
                {state.settings.tournamentName || 'My Cricket League Auction'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Edit League Branding */}
            <button
              id="btn-admin-edit-league-branding"
              onClick={() => setIsEditLeagueOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-2 transition-all"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Edit League & Logo</span>
            </button>

            {/* Edit Tournament Rules */}
            <button
              id="btn-admin-edit-rules"
              onClick={() => setIsEditRulesOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-2 transition-colors"
            >
              <Edit2 className="w-4 h-4 text-indigo-600" />
              <span>Edit Rules</span>
            </button>

            {/* Set New Auction Button */}
            <button
              id="btn-admin-set-new-auction"
              onClick={() => setIsSetNewAuctionOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-black text-xs shadow-sm hover:shadow active:scale-98 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Set New Auction</span>
            </button>

            {/* Add New Player */}
            <button
              id="btn-admin-add-player"
              onClick={() => setIsAddNewPlayerOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Player</span>
            </button>

            {/* Upload CSV */}
            <button
              id="btn-admin-upload-csv"
              onClick={() => setIsCsvUploadOpen(true)}
              title="Upload CSV of players containing ID, Name, Role, Village"
              className="px-3.5 py-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Upload CSV (ID, Name, Role, Village)</span>
            </button>

            {/* Erase All Players */}
            <button
              id="btn-admin-erase-all-players"
              onClick={handleClearAllPlayersClick}
              title="Erase all player records to start fresh"
              className="px-3.5 py-2.5 rounded-2xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Erase All Players</span>
            </button>

            {/* Player Self-Registration Link */}
            <button
              id="btn-admin-player-reg-link"
              onClick={handleCopyRegistrationLink}
              title="Copy player self-registration link"
              className="px-3.5 py-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              {copiedRegLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{copiedRegLink ? 'Reg Link Copied!' : 'Player Reg Link'}</span>
            </button>

            {/* Export Players CSV (SR No, Name, Role, Village) */}
            <button
              id="btn-admin-export-players-csv"
              onClick={handleExportPlayersRegistrationCSV}
              title="Export CSV (SR no, name, role, village)"
              className="px-3.5 py-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Players CSV</span>
            </button>

            {/* Export Reports (PDF / Excel) */}
            <button
              id="btn-admin-export-reports"
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Suite</span>
            </button>

            {/* Share Viewer Link */}
            <button
              id="btn-admin-share-viewer"
              onClick={handleCopyViewerLink}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Link Copied!' : 'Viewer Link'}</span>
            </button>

            {/* Copy Stage Link */}
            <button
              id="btn-admin-copy-stage"
              onClick={handleCopyStageLink}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Copy the responsive stage link (projector / laptop / phone)"
            >
              {copiedStageLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedStageLink ? 'Stage Link Copied!' : 'Copy Stage Link'}</span>
            </button>

            {/* Full Stage Shortcut */}
            <button
              onClick={handleOpenStage}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Open the fullscreen stage on the projector"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Open Stage (Projector)</span>
            </button>
          </div>
        </div>

        {/* AUCTION PARAMETERS & SQUAD RULES BAR */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Number of Teams Selector (1 to 20 Teams) */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Franchise Teams
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-600">1-20</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <span className="font-['Outfit'] font-black text-lg text-slate-900">
                  {state.teams.length}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Teams</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSetTeamCount(state.teams.length - 1)}
                  disabled={state.teams.length <= 1}
                  title="Decrease team count (Min 1)"
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-xs disabled:opacity-40"
                >
                  -
                </button>
                <button
                  onClick={() => handleSetTeamCount(state.teams.length + 1)}
                  disabled={state.teams.length >= 20}
                  title="Increase team count (Max 20)"
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-xs disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            {/* Direct selector for any number from 1 to 20 */}
            <div className="mt-1.5 flex items-center gap-1">
              <select
                value={state.teams.length}
                onChange={(e) => handleSetTeamCount(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((cnt) => (
                  <option key={cnt} value={cnt}>
                    {cnt} Teams {cnt % 2 === 0 ? '(Even)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick chips for even numbers */}
            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {[2, 4, 6, 8, 10, 12, 16, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => handleSetTeamCount(num)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 transition-colors ${
                    state.teams.length === num
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {num}T
                </button>
              ))}
            </div>
          </div>

          {/* Squad Size per Team Stepper */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Squad Limit
            </span>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <span className="font-['Outfit'] font-black text-lg text-slate-900">
                  {state.settings.maxSquadSize}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Slots/Team</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSquadSizeChange(-1)}
                  title="Decrease squad limit"
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-xs"
                >
                  -
                </button>
                <button
                  onClick={() => handleSquadSizeChange(1)}
                  title="Increase squad limit"
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-xs"
                >
                  +
                </button>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Total Roster Capacity: {state.teams.length * state.settings.maxSquadSize}
            </span>
          </div>

          {/* Available in Pool */}
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Available Players
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-['Outfit'] font-black text-lg text-emerald-700 font-mono">
                {state.summary.playersAvailable}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">in Pool</span>
            </div>
            <span className="text-[10px] text-emerald-600 block mt-1">
              Ready for hammer
            </span>
          </div>

          {/* Sold Players */}
          <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block">
              Sold Players
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-['Outfit'] font-black text-lg text-sky-700 font-mono">
                {state.summary.playersSold}
              </span>
              <span className="text-[11px] text-sky-600 font-medium">Acquired</span>
            </div>
            <span className="text-[10px] text-sky-600 block mt-1">
              Progress: {state.summary.auctionProgressPct}%
            </span>
          </div>

          {/* Unsold Players */}
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Unsold Pool
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-['Outfit'] font-black text-lg text-amber-700 font-mono">
                {state.summary.playersUnsold}
              </span>
              <span className="text-[11px] text-amber-600 font-medium">Passed</span>
            </div>
            <span className="text-[10px] text-amber-600 block mt-1">
              Eligible for re-auction
            </span>
          </div>

          {/* Total Registered */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Registered
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-['Outfit'] font-black text-lg text-slate-900 font-mono">
                {state.summary.totalPlayers}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Players</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Purse: {formatPoints(state.settings.startingPoints)} pts
            </span>
          </div>
        </div>
      </div>

      {/* ACCOUNT SECURITY — authenticator-app (TOTP) two-step verification */}
      <TotpSetupCard />

      {/* MODALS */}
      {/* 1. Mandatory Confirmation Modal on Sell Player */}
      <ConfirmSaleModal
        isOpen={isConfirmSaleOpen}
        player={resolvedPlayer}
        team={resolvedSellTeam}
        amount={sellAmountInput}
        settings={state.settings}
        isSubmitting={isSubmittingSale}
        onConfirm={handleConfirmSaleFinal}
        onCancel={() => setIsConfirmSaleOpen(false)}
      />

      {/* 2. Set New Auction & Tournament Wizard Modal */}
      <SetNewAuctionModal
        isOpen={isSetNewAuctionOpen}
        currentSettings={state.settings}
        teams={state.teams}
        playerCount={state.players.length}
        onClose={() => setIsSetNewAuctionOpen(false)}
        onOpenAddPlayer={() => setIsAddNewPlayerOpen(true)}
        onOpenCsvUpload={() => setIsCsvUploadOpen(true)}
        onLaunchNewAuction={async ({ tournamentName, tournamentLogo, startingPoints, maxSquadSize, defaultReservePrice, minBidIncrement, resetMode, customTeams }) => {
          await createNewAuction({
            tournamentName,
            tournamentLogo,
            startingPoints,
            maxSquadSize,
            defaultReservePrice,
            minBidIncrement,
            playerPoolMode: resetMode,
            teams: customTeams,
          });
        }}
      />

      {/* 3. Rename / Edit Team Modal */}
      <EditTeamModal
        isOpen={!!teamToEdit}
        team={teamToEdit}
        onClose={() => setTeamToEdit(null)}
        onSave={async (teamId, updates) => {
          const ok = await updateTeam(teamId, updates);
          return ok;
        }}
        onDelete={state.teams.length > 2 ? async (teamId) => {
          const ok = await deleteTeam(teamId);
          return ok;
        } : undefined}
      />

      {/* 4. Team Squad Roster Modal */}
      <TeamSquadModal
        isOpen={!!teamToViewSquad}
        team={teamToViewSquad}
        players={state.players}
        settings={state.settings}
        onClose={() => setTeamToViewSquad(null)}
        onReopenPlayer={async (playerId) => {
          const ok = await reopenPlayer(playerId);
          return ok;
        }}
      />

      {/* 5. Add New Player Modal */}
      <AddNewPlayerModal
        isOpen={isAddNewPlayerOpen}
        onClose={() => setIsAddNewPlayerOpen(false)}
        onAddPlayer={async ({ name, role, village, photoUrl, loadDirectlyToAuction }) => {
          try {
            const ok = await addPlayer({
              name,
              role,
              village,
              photoUrl,
              photo: photoUrl,
            });
            if (ok) {
              // Retrieve the newly added player to load to hammer if requested
              const latestPlayers = state?.players || [];
              const newlyAdded = latestPlayers[latestPlayers.length - 1];
              if (loadDirectlyToAuction && newlyAdded) {
                await selectAuctionPlayer(newlyAdded.id);
                setPlayerInput(String(newlyAdded.id));
              }
              showNotification('success', `Added ${name} to player pool!`);
              return true;
            }
            return false;
          } catch (err) {
            showNotification('error', 'Failed to add player.');
            return false;
          }
        }}
      />

      {/* 6. Upload CSV Modal */}
      <CsvUploadModal
        isOpen={isCsvUploadOpen}
        onClose={() => setIsCsvUploadOpen(false)}
        onImportRows={async (rows, replaceExisting) => {
          return await importPlayerRows(rows, replaceExisting);
        }}
      />

      {/* 7. Data Export Suite Modal */}
      <AuctionExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* 8. Edit League Name & Logo Modal */}
      <EditLeagueModal
        isOpen={isEditLeagueOpen}
        currentName={state.settings.tournamentName}
        currentLogo={state.settings.tournamentLogo}
        onClose={() => setIsEditLeagueOpen(false)}
        onSave={async (name, logo) => {
          await updateSettings({
            tournamentName: name,
            tournamentLogo: logo,
          });
          showNotification('success', `League branding updated to "${name}"!`);
        }}
      />

      {/* 9. Edit Tournament Rules & Parameters Modal */}
      <EditRulesModal
        isOpen={isEditRulesOpen}
        settings={state.settings}
        onClose={() => setIsEditRulesOpen(false)}
        onSave={async (updates) => {
          await updateSettings(updates);
        }}
      />
    </div>
  );
};
