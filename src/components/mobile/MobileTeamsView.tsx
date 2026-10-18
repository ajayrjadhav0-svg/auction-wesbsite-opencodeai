import React from 'react';
import { ChevronRight, Wallet, Trophy } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatPoints, getTeamStatusBadge } from '../../utils/formatters';
import { ActiveNav } from '../../types';

interface MobileTeamsViewProps {
  onSelectTeamForSquad: (teamId: string) => void;
}

/** Mobile teams list — purse/budget cards with a tap-through to the squad. */
export const MobileTeamsView: React.FC<MobileTeamsViewProps> = ({ onSelectTeamForSquad }) => {
  const { state } = useAuction();
  const teams = state?.teams || [];
  const players = state?.players || [];

  return (
    <div className="space-y-3">
      {teams.map((team) => {
        const badge = getTeamStatusBadge(team.status);
        const squad = players.filter((p) => p.soldToTeamId === team.id);
        const pct =
          team.startingPoints > 0
            ? Math.min(100, Math.round((team.totalPointsSpent / team.startingPoints) * 100))
            : 0;

        return (
          <button
            key={team.id}
            onClick={() => onSelectTeamForSquad(team.id)}
            className="w-full text-left px-4 py-4 rounded-2xl bg-white border border-slate-200 active:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-['Outfit'] font-black text-base shrink-0"
                style={{ backgroundColor: team.badgeBg || team.color, color: team.badgeText || '#fff' }}
              >
                {team.shortCode}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-['Outfit'] font-black text-base text-slate-900 truncate">{team.name}</p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  <Trophy className="w-3 h-3 inline -mt-0.5 mr-1" />
                  {squad.length} / {state?.settings?.maxSquadSize ?? 15} players
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                {team.status}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </div>

            {/* Budget bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Spent {formatPoints(team.totalPointsSpent)}
                </span>
                <span className="font-mono text-slate-900">{formatPoints(team.pointsRemaining)} left</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
