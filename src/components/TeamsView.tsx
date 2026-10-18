import React from 'react';
import {
  Shield,
  Users,
  Coins,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Trophy,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { ActiveNav, Team } from '../types';
import {
  formatINR,
  formatPoints,
  getTeamStatusBadge,
} from '../utils/formatters';

interface TeamsViewProps {
  onSelectTeamForSquad: (teamId: string) => void;
  onNavigate: (nav: ActiveNav) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  onSelectTeamForSquad,
  onNavigate,
}) => {
  const { state } = useAuction();

  if (!state) {
    return <div className="p-8 text-slate-400">Loading franchise teams...</div>;
  }

  const { teams, settings } = state;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="font-['Outfit'] font-black text-lg md:text-xl text-slate-900 flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span>FRANCHISE TEAMS & SALARY PURSE</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {teams.length} Franchises • Starting Purse {formatPoints(settings.startingPoints)} pts • {settings.maxSquadSize} Player Roster Limit
          </p>
        </div>

        <button
          onClick={() => onNavigate('team-squads')}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Trophy className="w-4 h-4 text-indigo-600" />
          <span>View Squad Rosters ({settings.maxSquadSize} Slots)</span>
        </button>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map((team) => {
          const statusBadge = getTeamStatusBadge(team.status);
          const squadProgressPct = Math.min(
            100,
            Math.round((team.totalPlayers / settings.maxSquadSize) * 100)
          );

          return (
            <div
              key={team.id}
              className="rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-sm overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-sm shadow-2xs"
                    style={{ backgroundColor: team.badgeBg || team.color, color: team.badgeText || '#ffffff' }}
                  >
                    {team.shortCode}
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] font-extrabold text-sm text-slate-900 tracking-tight">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">
                        {team.totalPlayers}/{settings.maxSquadSize} Players
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] text-indigo-600 font-semibold">
                        {Math.max(0, settings.maxSquadSize - team.totalPlayers)} Slots Left
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-['Outfit'] ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                >
                  {team.status}
                </span>
              </div>

              {/* Card Body: Metrics & Progress */}
              <div className="p-4 space-y-3.5 flex-1">
                {/* Squad Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">Roster Capacity</span>
                    <span className="text-slate-900 font-mono">
                      {team.totalPlayers} / {settings.maxSquadSize} Slots
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${squadProgressPct}%`,
                        backgroundColor: team.color,
                      }}
                    />
                  </div>
                </div>

                {/* Purse Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block font-medium">
                      Points Remaining
                    </span>
                    <span
                      className={`font-mono font-bold text-sm block mt-0.5 ${
                        team.pointsRemaining < 0
                          ? 'text-rose-600'
                          : team.pointsRemaining === 0
                          ? 'text-slate-400'
                          : 'text-emerald-600'
                      }`}
                    >
                      {formatPoints(team.pointsRemaining)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block font-medium">
                      Max Safe Bid
                    </span>
                    <span className="font-mono font-bold text-sm text-indigo-600 block mt-0.5">
                      {formatPoints(team.maxSafeBid)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block font-medium">
                      Points Spent
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-800 block mt-0.5">
                      {formatPoints(team.totalPointsSpent)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block font-medium">
                      Penalty Cash
                    </span>
                    <span className="font-mono font-bold text-xs block mt-0.5">
                      {team.committeeCash > 0 ? (
                        <span className="text-rose-600 font-bold">{formatINR(team.committeeCash)}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Action */}
              <div className="p-3 bg-slate-50/50 border-t border-slate-100">
                <button
                  onClick={() => {
                    onSelectTeamForSquad(team.id);
                    onNavigate('team-squads');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <span>Open {settings.maxSquadSize}-Player Squad</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
