import React from 'react';
import { Users, Gavel, Trophy, Wallet, ChevronRight, Activity } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatPoints, getTeamStatusBadge } from '../../utils/formatters';
import { ActiveNav } from '../../types';

interface MobileDashboardProps {
  onNavigate: (nav: ActiveNav) => void;
  onSelectTeamForSquad: (teamId: string) => void;
}

/** Mobile-first dashboard: stacked cards, no tables, thumb-sized targets. */
export const MobileDashboardView: React.FC<MobileDashboardProps> = ({ onNavigate, onSelectTeamForSquad }) => {
  const { state } = useAuction();
  const summary = state?.summary;
  const teams = state?.teams || [];
  const transactions = state?.transactions || [];
  const recent = transactions.slice(-5).reverse();

  const stats = [
    { label: 'Players Sold', value: `${summary?.playersSold ?? 0}`, sub: `of ${summary?.totalPlayers ?? 0}`, icon: <Gavel className="w-5 h-5" />, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Available', value: `${summary?.playersAvailable ?? 0}`, sub: 'in pool', icon: <Users className="w-5 h-5" />, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Points Spent', value: formatPoints(summary?.totalAuctionPointsSpent ?? 0), sub: 'total', icon: <Wallet className="w-5 h-5" />, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Teams', value: `${teams.length}`, sub: 'competing', icon: <Trophy className="w-5 h-5" />, tone: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Live CTA */}
      <button
        onClick={() => onNavigate('live-auction')}
        className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg active:scale-[0.99] transition-transform min-h-[64px]"
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <span className="font-['Outfit'] font-black text-base tracking-tight">LIVE AUCTION</span>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>

      {/* Progress */}
      {typeof summary?.auctionProgressPct === 'number' && (
        <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" /> Auction Progress
            </span>
            <span className="font-mono text-slate-900">{summary.auctionProgressPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, summary.auctionProgressPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-3.5 rounded-2xl bg-white border border-slate-200">
            <span className={`inline-flex p-2 rounded-xl ${s.tone} mb-2`}>{s.icon}</span>
            <p className="font-['Outfit'] font-black text-2xl text-slate-900 leading-none">{s.value}</p>
            <p className="text-[11px] font-semibold text-slate-600 mt-1">{s.label}</p>
            <p className="text-[10px] text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Teams */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-['Outfit'] font-black text-sm text-slate-900 uppercase tracking-tight">Teams</h2>
          <button onClick={() => onNavigate('teams')} className="text-xs font-bold text-indigo-600 px-2 py-1">
            View all
          </button>
        </div>
        <div className="space-y-2">
          {teams.map((team) => {
            const badge = getTeamStatusBadge(team.status);
            return (
              <button
                key={team.id}
                onClick={() => onSelectTeamForSquad(team.id)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white border border-slate-200 text-left active:bg-slate-50 min-h-[60px]"
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-sm shrink-0"
                  style={{ backgroundColor: team.badgeBg || team.color, color: team.badgeText || '#fff' }}
                >
                  {team.shortCode}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 truncate">{team.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {team.totalPlayers} players · {formatPoints(team.pointsRemaining)} left
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}>{team.status}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent sales */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-['Outfit'] font-black text-sm text-slate-900 uppercase tracking-tight">Recent Sales</h2>
          <button onClick={() => onNavigate('auction-history')} className="text-xs font-bold text-indigo-600 px-2 py-1">
            History
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-6 rounded-2xl bg-white border border-dashed border-slate-300 text-center text-sm text-slate-500">
            No players sold yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-white border border-slate-200">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{t.playerName}</p>
                  <p className="text-[11px] text-slate-500 truncate">→ {t.teamName}</p>
                </div>
                <span className="font-['Outfit'] font-black text-sm text-emerald-600 shrink-0 ml-2">
                  {formatPoints(t.soldPrice)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
