import React, { useMemo, useState } from 'react';
import { Search, History } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatPoints, formatTransactionTime } from '../../utils/formatters';

/** Mobile auction ledger — a vertical feed instead of the desktop table. */
export const MobileHistoryView: React.FC = () => {
  const { state } = useAuction();
  const transactions = state?.transactions || [];
  const teams = state?.teams || [];

  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...transactions]
      .reverse()
      .filter((t) => {
        if (teamFilter !== 'ALL' && t.teamId !== teamFilter) return false;
        if (!q) return true;
        return (
          (t.playerName || '').toLowerCase().includes(q) ||
          (t.teamName || '').toLowerCase().includes(q)
        );
      });
  }, [transactions, search, teamFilter]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player or team…"
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[48px]"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        <button
          onClick={() => setTeamFilter('ALL')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border min-h-[40px] ${
            teamFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          All Teams
        </button>
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setTeamFilter(t.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border min-h-[40px] ${
              teamFilter === t.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {t.shortCode}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 rounded-2xl bg-white border border-dashed border-slate-300 text-center">
          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const team = teams.find((x) => x.id === t.teamId);
            return (
              <div key={t.id} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white border border-slate-200">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-xs shrink-0"
                  style={{ backgroundColor: team?.badgeBg || team?.color || '#4f46e5', color: team?.badgeText || '#fff' }}
                >
                  {team?.shortCode || '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 truncate">{t.playerName}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formatTransactionTime(t.timestamp)} · {t.teamName}
                  </p>
                </div>
                <span className="font-['Outfit'] font-black text-sm text-emerald-600 shrink-0">
                  {formatPoints(t.soldPrice)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
