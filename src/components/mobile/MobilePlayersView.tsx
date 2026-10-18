import React, { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatPoints, getStatusBadgeStyle } from '../../utils/formatters';
import { PlayerAvatar } from '../PlayerAvatar';

/**
 * Mobile player pool. Card list rather than the desktop table — the desktop
 * table needs horizontal scrolling on a phone, this does not. Read-only:
 * admin editing lives on the desktop layout / admin panel.
 */
export const MobilePlayersView: React.FC = () => {
  const { state } = useAuction();
  const players = state?.players || [];
  const teams = state?.teams || [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.village || '').toLowerCase().includes(q)
      );
    });
  }, [players, search, statusFilter]);

  const statusFilters = [
    { value: 'ALL', label: 'All' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'UNSOLD', label: 'Unsold' },
  ];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code or village…"
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[48px]"
        />
      </div>

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors min-h-[40px] ${
              statusFilter === f.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] font-semibold text-slate-500 px-1">
        {filtered.length} of {players.length} players
      </p>

      {/* Card list */}
      {filtered.length === 0 ? (
        <div className="px-4 py-10 rounded-2xl bg-white border border-dashed border-slate-300 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No players match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const badge = getStatusBadgeStyle(p.status);
            const soldTeam = p.soldToTeamId ? teams.find((t) => t.id === p.soldToTeamId) : null;
            return (
              <div key={p.id} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white border border-slate-200">
                <PlayerAvatar src={p.photoUrl || p.photo} name={p.name} className="w-12 h-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {p.code}
                    {p.village ? ` · ${p.village}` : ''}
                  </p>
                  {p.status === 'SOLD' && soldTeam && (
                    <p className="text-[11px] text-emerald-600 font-semibold truncate">
                      {soldTeam.shortCode} · {formatPoints(p.soldPrice || 0)}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                  {p.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
