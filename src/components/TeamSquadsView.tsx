import React, { useState } from 'react';
import {
  Trophy,
  Shield,
  Users,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Printer,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { Team, Player } from '../types';
import {
  formatINR,
  formatPoints,
  getRoleBadgeStyle,
  getTeamStatusBadge,
} from '../utils/formatters';
import { AuctionExportModal } from './AuctionExportModal';

interface TeamSquadsViewProps {
  initialTeamId?: string;
}

export const TeamSquadsView: React.FC<TeamSquadsViewProps> = ({
  initialTeamId,
}) => {
  const { state } = useAuction();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const teams = state?.teams || [];
  const defaultId = initialTeamId || teams[0]?.id || '';
  const [selectedTeamId, setSelectedTeamId] = useState<string>(defaultId);

  if (!state || teams.length === 0) {
    return <div className="p-8 text-slate-400">Loading team squads...</div>;
  }

  const { players, settings } = state;
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  // Squad players for current team
  const squadPlayers = players.filter((p) => p.soldToTeamId === currentTeam.id);

  const statusBadge = getTeamStatusBadge(currentTeam.status);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <AuctionExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Team Tabs Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {teams.map((team) => {
          const isSelected = team.id === currentTeam.id;
          return (
            <button
              key={team.id}
              id={`tab-squad-${team.id}`}
              onClick={() => setSelectedTeamId(team.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-['Outfit'] font-bold shrink-0 flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
              }`}
            >
              <div
                className="w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shrink-0 shadow-2xs"
                style={{ backgroundColor: team.badgeBg || team.color, color: team.badgeText || '#ffffff' }}
              >
                {team.shortCode}
              </div>
              <span>{team.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {team.totalPlayers}/{settings.maxSquadSize}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Team Header Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-['Outfit'] font-black text-xl shadow-xs shrink-0"
              style={{ backgroundColor: currentTeam.badgeBg || currentTeam.color, color: currentTeam.badgeText || '#ffffff' }}
            >
              {currentTeam.shortCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Outfit'] font-black text-xl md:text-2xl text-slate-900 tracking-tight">
                  {currentTeam.name}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                >
                  {currentTeam.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Purse: {formatPoints(settings.startingPoints)} pts • Max Squad Limit: {settings.maxSquadSize} Players
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Remaining Points</span>
              <span
                className={`font-mono font-bold text-sm ${
                  currentTeam.pointsRemaining < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatPoints(currentTeam.pointsRemaining)}
              </span>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Max Safe Bid</span>
              <span className="font-mono font-bold text-sm text-indigo-600">
                {formatPoints(currentTeam.maxSafeBid)}
              </span>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Penalty Cash</span>
              <span className="font-mono font-bold text-sm text-slate-800">
                {currentTeam.committeeCash > 0 ? (
                  <span className="text-rose-600 font-bold">{formatINR(currentTeam.committeeCash)}</span>
                ) : (
                  '₹0'
                )}
              </span>
            </div>

            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>Share / Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print Squad</span>
            </button>
          </div>
        </div>
      </div>

      {/* SQUAD SLOTS (15 SLOTS DISPLAY) */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-indigo-600" />
            <h3 className="font-['Outfit'] font-black text-sm text-slate-900">
              OFFICIAL ROSTER ({squadPlayers.length} / {settings.maxSquadSize} SQUAD SLOTS FILLED)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {settings.maxSquadSize - squadPlayers.length} Empty Slots Remaining
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-['Outfit'] uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">SLOT #</th>
                <th className="py-3 px-4 font-bold">PLAYER NAME</th>
                <th className="py-3 px-3 font-bold">ROLE</th>
                <th className="py-3 px-4 font-bold text-right">POINTS ALLOCATED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {Array.from({ length: settings.maxSquadSize }).map((_, index) => {
                const slotNumber = index + 1;
                const player = squadPlayers[index];

                if (player) {
                  const roleStyle = getRoleBadgeStyle(player.role);
                  return (
                    <tr key={player.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">
                        #{slotNumber}
                      </td>
                      <td className="py-3 px-4 font-['Outfit'] font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {(player.photoUrl || player.photo) ? (
                            <img
                              src={player.photoUrl || player.photo}
                              alt=""
                              className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] shrink-0 font-bold border border-indigo-100">
                              🏏
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-indigo-600 text-xs">{player.code}</span>
                              <span className="text-slate-900">{player.name}</span>
                            </div>
                            {player.village && (
                              <span className="text-[10px] text-slate-400 font-normal block">
                                📍 {player.village}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {player.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatPoints(player.soldPrice)} pts
                      </td>
                    </tr>
                  );
                }

                // Empty Slot Row
                return (
                  <tr key={`empty-${index}`} className="bg-slate-50/40 text-slate-400">
                    <td className="py-3 px-4 font-mono font-semibold">#{slotNumber}</td>
                    <td className="py-3 px-4 italic text-slate-400">Available Squad Slot</td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
