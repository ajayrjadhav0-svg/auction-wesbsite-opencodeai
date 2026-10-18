import React, { useState, useMemo } from 'react';
import {
  Gavel,
  Shield,
  Clock,
  ArrowRight,
  TrendingUp,
  User,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Crop,
  Edit2,
  Camera,
  Lock,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { formatINR, formatPoints, formatTransactionTime, getRoleBadgeStyle, getTeamStatusBadge } from '../utils/formatters';
import { ActiveNav, Player, Team } from '../types';
import { ImageCropModal } from './ImageCropModal';
import { EditPlayerModal } from './admin/EditPlayerModal';

interface DashboardViewProps {
  onNavigate: (nav: ActiveNav) => void;
  onSelectTeamForSquad?: (teamId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectTeamForSquad,
}) => {
  const { state, role, updatePlayer, showNotification } = useAuction();

  // State for Player Status Tabs
  const [activeTab, setActiveTab] = useState<'sold' | 'unsold' | 'pool'>('sold');
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');

  // Admin Crop and Edit Player Modal States
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropTargetImage, setCropTargetImage] = useState<string>('');
  const [cropTargetPlayerId, setCropTargetPlayerId] = useState<number | null>(null);
  const [isEditPlayerModalOpen, setIsEditPlayerModalOpen] = useState(false);
  const [editingTargetPlayer, setEditingTargetPlayer] = useState<Player | null>(null);
  const [confirmSoldEdit, setConfirmSoldEdit] = useState(false);

  // Memoized player classifications
  const { soldPlayers, unsoldPlayers, poolPlayers } = useMemo(() => {
    if (!state) return { soldPlayers: [], unsoldPlayers: [], poolPlayers: [] };

    const sold = state.players.filter((p) => p.status === 'SOLD');
    const unsold = state.players.filter((p) => p.status === 'UNSOLD');
    const pool = state.players.filter((p) => p.status === 'AVAILABLE');

    return { soldPlayers: sold, unsoldPlayers: unsold, poolPlayers: pool };
  }, [state?.players]);

  // Filtered players based on active tab & search
  const filteredTabPlayers = useMemo(() => {
    let list: Player[] = [];
    if (activeTab === 'sold') list = soldPlayers;
    else if (activeTab === 'unsold') list = unsoldPlayers;
    else list = poolPlayers;

    if (!playerSearchQuery.trim()) return list;

    const query = playerSearchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query)
    );
  }, [activeTab, soldPlayers, unsoldPlayers, poolPlayers, playerSearchQuery]);

  // Memoized, resilient transaction list ensuring newest-first ordering and auto-backfill for sold players
  const effectiveTransactions = useMemo(() => {
    if (!state) return [];
    const list = [...(state.transactions || [])];

    // If transactions are present, ensure newest transactions are first
    if (list.length > 0) {
      return list.sort((a, b) => {
        if (b.auctionOrder !== undefined && a.auctionOrder !== undefined && b.auctionOrder !== a.auctionOrder) {
          return b.auctionOrder - a.auctionOrder;
        }
        // Fallback by transaction ID timestamp (e.g., tx-1789812901713-60)
        const timeA = parseInt(a.id.split('-')[1] || '0', 10);
        const timeB = parseInt(b.id.split('-')[1] || '0', 10);
        if (timeA && timeB && timeA !== timeB) return timeB - timeA;
        return 0;
      });
    }

    // Resilient fallback: if transactions array is empty but there are sold players in roster, synthesize them
    if (state.players) {
      const sold = state.players.filter((p) => p.status === 'SOLD');
      return sold.map((p, idx) => {
        const team = state.teams.find((t) => t.id === p.soldToTeamId);
        return {
          id: `synth-${p.id}`,
          timestamp: p.soldAt || 'Recent',
          auctionOrder: p.auctionOrder || idx + 1,
          playerId: p.id,
          playerName: p.name,
          role: p.role,
          teamId: p.soldToTeamId || '',
          teamName: team?.name || 'Franchise Team',
          soldPrice: p.soldPrice || 0,
          committeeCharge: 0,
        };
      }).reverse();
    }

    return [];
  }, [state?.transactions, state?.players, state?.teams]);

  if (!state) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 font-medium">
        Loading Cricket League Auction Dashboard...
      </div>
    );
  }

  const { summary, teams, bidding, players, settings, transactions } = state;

  // Active Player on the Hammer
  const currentPlayer =
    players.find((p) => p.id === bidding.currentPlayerId) || players[0] || null;

  // Leading Bidding Team
  const leadingTeam = teams.find((t) => t.id === bidding.selectedTeamId);
  const currentBidAmount = bidding.currentBid || (currentPlayer?.soldPrice > 0 ? currentPlayer.soldPrice : (settings.defaultReservePrice || 500));

  // Recent transactions for Auction History feed (last 10)
  const recentTransactions = effectiveTransactions.slice(0, 10);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* LAYER 1. ACTIVE AUCTION HAMMER WINDOW (HIGHEST PRIORITY)                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-6">
        {/* LAYER 1: ACTIVE AUCTION HAMMER WINDOW */}
        <div className="order-1 w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          {/* Top Status Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="font-['Outfit'] font-black tracking-widest text-xs text-rose-400 uppercase">
                ACTIVE AUCTION • UNDER THE HAMMER
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-mono font-bold">
                Order #{currentPlayer?.auctionOrder || 1}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold border border-indigo-400/30">
                {currentPlayer?.code || 'P001'}
              </span>
            </div>
          </div>

          {/* Active Player Card Body */}
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 lg:gap-10">
              {/* Player Avatar / Photo - Projector High Visibility */}
              <div className="relative shrink-0 group">
                <div className="w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 xl:w-[26rem] xl:h-[26rem] rounded-3xl bg-slate-950 border-4 border-indigo-500 ring-4 ring-indigo-500/20 shadow-xl flex items-center justify-center text-indigo-700 overflow-hidden aspect-square">
                  {currentPlayer?.photoUrl ? (
                    <img
                      src={currentPlayer.photoUrl}
                      alt={currentPlayer.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <User className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-52 lg:h-52 text-indigo-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Gavel className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0 w-full text-center sm:text-left space-y-3">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black border font-['Outfit'] uppercase tracking-wider ${
                      currentPlayer ? getRoleBadgeStyle(currentPlayer.role).bg : 'bg-slate-100'
                    } ${
                      currentPlayer ? getRoleBadgeStyle(currentPlayer.role).text : 'text-slate-700'
                    } ${
                      currentPlayer ? getRoleBadgeStyle(currentPlayer.role).border : 'border-slate-200'
                    }`}
                  >
                    {currentPlayer?.role || 'All-Rounder'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-bold">
                    Reserve: {formatPoints(currentPlayer?.basePrice || 500)} pts
                  </span>
                  {currentPlayer?.village && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 uppercase">
                      📍 {currentPlayer.village}
                    </span>
                  )}
                </div>

                <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-950 tracking-tight uppercase leading-tight drop-shadow-xs break-words">
                  {currentPlayer?.name || 'Ready for Next Player'}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 truncate">
                  <span>Status:</span>
                  <span
                    className={`font-black uppercase ${
                      currentPlayer?.status === 'SOLD'
                        ? 'text-emerald-600'
                        : currentPlayer?.status === 'UNSOLD'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {currentPlayer?.status || 'AVAILABLE'}
                  </span>
                  {currentPlayer?.status === 'SOLD' && currentPlayer.soldToTeamId && (
                    <span className="text-slate-700 font-semibold truncate">
                      (Sold to{' '}
                      {teams.find((t) => t.id === currentPlayer.soldToTeamId)?.name || 'Team'})
                    </span>
                  )}
                </p>

                {/* Admin Quick Action Toolbar for Active Player */}
                {role === 'admin' && currentPlayer && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCropTargetImage(currentPlayer.photoUrl || '');
                        setCropTargetPlayerId(currentPlayer.id);
                        setIsCropModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      title="Crop and frame this player's photo"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Crop Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentPlayer.status === 'SOLD') {
                          setConfirmSoldEdit(true);
                        } else {
                          setEditingTargetPlayer(currentPlayer);
                          setIsEditPlayerModalOpen(true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      title={
                        currentPlayer.status === 'SOLD'
                          ? 'Edit sold player (confirmation required)'
                          : 'Edit player form'
                      }
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Player Form</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Indicators: Current Highest Bid & Leading Team */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-5">
              {/* Current Highest Bid */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-700 font-['Outfit']">
                  CURRENT HIGHEST BID
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-['Outfit'] font-black text-2xl sm:text-3xl text-indigo-950">
                    {formatPoints(currentBidAmount)}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 uppercase">Points</span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  Min bid increment: 500 points
                </div>
              </div>

              {/* Leading Bidding Team */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-600 font-['Outfit']">
                  LEADING BIDDING TEAM
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {leadingTeam ? (
                    <>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs shrink-0"
                        style={{ backgroundColor: leadingTeam.color }}
                      >
                        {leadingTeam.short}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-['Outfit'] font-black text-sm text-slate-900 truncate">
                          {leadingTeam.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono block truncate">
                          Rem: {formatPoints(leadingTeam.pointsRemaining)} pts
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 py-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500">
                        Awaiting Opening Bid
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                  {leadingTeam ? 'Holding hammer offer' : 'Floor price ready'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Live sync connected</span>
            </div>

            <button
              onClick={() => onNavigate('live-auction')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>{role === 'admin' ? 'Open Live Desk' : 'Spectate Stage'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LAYER 3: TEAMS SUMMARY TABLE                                             */}
        {/* ========================================================================= */}
        <div className="order-3 w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h3 className="font-['Outfit'] font-black text-sm uppercase tracking-wider text-slate-900">
                  Teams Summary Table
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-indigo-700 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200">
                Purse: {formatPoints(settings.startingPoints)} pts
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Financial budget, purse expenditure, and current squad quotas:
            </p>

            {/* Responsive Table */}
            <div className="overflow-x-auto max-h-[330px] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs min-w-[440px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-['Outfit']">
                    <th className="py-2.5 px-3">Team Name</th>
                    <th className="py-2.5 px-2 text-center">Squad</th>
                    <th className="py-2.5 px-2 text-right">Spent</th>
                    <th className="py-2.5 px-3 text-right">Remaining</th>
                    <th className="py-2.5 px-2 text-right">Max Bid</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((team) => {
                    const statusBadge = getTeamStatusBadge(team.status);
                    const slotsUsed = team.totalPlayers;
                    const isFull = slotsUsed >= settings.maxSquadSize;

                    return (
                      <tr
                        key={team.id}
                        onClick={() => onSelectTeamForSquad?.(team.id)}
                        className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                        title={`Click to view ${team.name} in squad matrix`}
                      >
                        {/* Team Name */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-[10px] shadow-2xs shrink-0"
                              style={{ backgroundColor: team.color }}
                            >
                              {team.short}
                            </div>
                            <span className="font-bold text-slate-900 text-xs font-['Outfit'] truncate max-w-[105px] group-hover:text-indigo-600 transition-colors">
                              {team.name}
                            </span>
                          </div>
                        </td>

                        {/* Squad Count */}
                        <td className="py-2 px-2 text-center font-mono text-xs">
                          <span className={`font-bold ${isFull ? 'text-indigo-600' : 'text-slate-900'}`}>
                            {slotsUsed}
                          </span>
                          <span className="text-slate-400 text-[10px]">/{settings.maxSquadSize}</span>
                        </td>

                        {/* Spent Amount */}
                        <td className="py-2 px-2 text-right font-mono text-slate-600 text-xs font-semibold">
                          {formatPoints(team.totalPointsSpent)}
                        </td>

                        {/* Remaining Purse */}
                        <td className="py-2 px-3 text-right font-mono">
                          <span
                            className={`font-black text-xs ${
                              team.pointsRemaining < 0
                                ? 'text-rose-600'
                                : team.pointsRemaining === 0
                                ? 'text-slate-400'
                                : 'text-emerald-600'
                            }`}
                          >
                            {formatPoints(team.pointsRemaining)}
                          </span>
                        </td>

                        {/* Max Safe Bid */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-indigo-600 text-xs">
                          {formatPoints(team.maxSafeBid)}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border font-['Outfit'] uppercase ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                          >
                            {team.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-mono">
              Total Spent: <strong className="text-slate-800">{formatPoints(summary.totalAuctionPointsSpent)} pts</strong>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {teams.length} Franchises Competing
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LAYER 2: AUCTION HISTORY FEED                                            */}
        {/* ========================================================================= */}
        <div className="order-2 w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="font-['Outfit'] font-black text-sm uppercase tracking-wider text-slate-900">
                  Auction History Feed
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                {effectiveTransactions.length} Total
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Chronological log of recent hammer bids:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400 sm:col-span-2 lg:col-span-3">
                  <Gavel className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No transactions recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live bids and confirmed sales will stream here automatically.
                  </p>
                </div>
              ) : (
                recentTransactions.map((tx) => {
                  const team = teams.find((t) => t.id === tx.teamId);
                  const roleName = tx.role || (tx as any).playerRole || 'All-Rounder';
                  const roleBadge = getRoleBadgeStyle(roleName);
                  const hammerPrice = tx.soldPrice ?? (tx as any).amount ?? (tx as any).points ?? 0;
                  const formattedTime = formatTransactionTime(tx.timestamp);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onNavigate('auction-history')}
                      className="p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/90 transition-colors flex items-center justify-between gap-2.5 cursor-pointer group"
                      title="View in Auction Transaction Audit Log"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-['Outfit'] font-bold text-xs text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {tx.playerName}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                          >
                            {roleName.slice(0, 3)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: team?.color || '#6366f1' }}
                          />
                          <span className="font-semibold text-slate-700 truncate text-[11px]">
                            {tx.teamName || team?.name || 'Franchise Team'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-['Outfit'] font-black text-xs text-indigo-900 block">
                          {formatPoints(hammerPrice)} pts
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formattedTime}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Activity feed</span>
            <button
              onClick={() => onNavigate('auction-history')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 4: PLAYER STATUS BREAKDOWN                                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="font-['Outfit'] font-black text-xl text-slate-900 tracking-tight">
                Player Status Breakdown
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking of sold players, unsold players, and remaining draft pool
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={playerSearchQuery}
              onChange={(e) => setPlayerSearchQuery(e.target.value)}
              placeholder="Search player name or code..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sold')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-['Outfit'] flex items-center gap-2 transition-all ${
              activeTab === 'sold'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sold Players ({soldPlayers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('unsold')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-['Outfit'] flex items-center gap-2 transition-all ${
              activeTab === 'unsold'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Unsold Players ({unsoldPlayers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pool')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-['Outfit'] flex items-center gap-2 transition-all ${
              activeTab === 'pool'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Remaining Pool ({poolPlayers.length})</span>
          </button>
        </div>

        {/* Players Tab Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 font-['Outfit']">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Player Name</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-right">Base Price</th>
                {activeTab === 'sold' && (
                  <>
                    <th className="py-3 px-4">Winning Team</th>
                    <th className="py-3 px-4 text-right">Sold Price</th>
                  </>
                )}
                {activeTab !== 'sold' && (
                  <th className="py-3 px-4 text-center">Status</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTabPlayers.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'sold' ? 6 : 5} className="py-8 text-center text-slate-400">
                    No players found for this category.
                  </td>
                </tr>
              ) : (
                filteredTabPlayers.map((player) => {
                  const roleBadge = getRoleBadgeStyle(player.role);
                  const soldTeam = teams.find((t) => t.id === player.soldToTeamId);

                  return (
                    <tr key={player.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {player.code}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 font-['Outfit'] text-sm">
                        {player.name}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border font-['Outfit'] ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                        >
                          {player.role}
                        </span>
                      </td>

                      {/* Base Price */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 font-medium">
                        {formatPoints(player.basePrice || 500)} pts
                      </td>

                      {/* Sold Specific: Winning Team & Price */}
                      {activeTab === 'sold' && (
                        <>
                          <td className="py-3 px-4">
                            {soldTeam ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: soldTeam.color }}
                                />
                                <span className="font-bold text-slate-800 font-['Outfit']">
                                  {soldTeam.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                            {formatPoints(player.soldPrice)} pts
                          </td>
                        </>
                      )}

                      {/* Unsold & Pool Specific: Status */}
                      {activeTab !== 'sold' && (
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold font-['Outfit'] uppercase ${
                              player.status === 'UNSOLD'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {player.status === 'UNSOLD' ? 'Passed / Unsold' : 'In Draft Pool'}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT SOLD PLAYER CONFIRMATION MODAL */}
      {confirmSoldEdit && currentPlayer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-['Outfit'] font-black text-amber-600 text-lg flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Edit Sold Player?
            </h3>
            <p className="text-xs text-slate-600">
              <strong className="text-slate-900">{currentPlayer.name}</strong> has already been SOLD
              {currentPlayer.soldToTeamId
                ? ` to ${teams.find((t) => t.id === currentPlayer.soldToTeamId)?.name || 'a team'}`
                : ''}
              . Changing this player's data can change the team's purse and auction results.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSoldEdit(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTargetPlayer(currentPlayer);
                  setIsEditPlayerModalOpen(true);
                  setConfirmSoldEdit(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
              >
                Continue to Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLAYER MODAL (Admin) */}
      <EditPlayerModal
        isOpen={isEditPlayerModalOpen}
        player={editingTargetPlayer}
        onClose={() => {
          setIsEditPlayerModalOpen(false);
          setEditingTargetPlayer(null);
        }}
        onSuccess={() => {
          setIsEditPlayerModalOpen(false);
          setEditingTargetPlayer(null);
        }}
      />

      {/* IMAGE CROP MODAL (Admin) */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropTargetImage}
        onClose={() => {
          setIsCropModalOpen(false);
          setCropTargetPlayerId(null);
        }}
        onCropComplete={async (croppedDataUrl) => {
          if (cropTargetPlayerId) {
            await updatePlayer(cropTargetPlayerId, {
              photoUrl: croppedDataUrl,
              photo: croppedDataUrl,
            });
            showNotification('success', 'Photo cropped & updated!');
          }
          setIsCropModalOpen(false);
          setCropTargetPlayerId(null);
        }}
      />
    </div>
  );
};
