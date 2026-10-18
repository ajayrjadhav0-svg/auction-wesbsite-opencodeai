import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatPoints } from '../../utils/formatters';
import { PlayerAvatar } from '../PlayerAvatar';

interface MobileSquadsViewProps {
  initialTeamId?: string;
}

/** Mobile squad roster — team chips to switch, then a simple roster list. */
export const MobileSquadsView: React.FC<MobileSquadsViewProps> = ({ initialTeamId }) => {
  const { state, role, reopenPlayer } = useAuction();
  const teams = state?.teams || [];
  const players = state?.players || [];
  const maxSquad = state?.settings?.maxSquadSize ?? 15;

  const [selectedId, setSelectedId] = useState<string>(initialTeamId || teams[0]?.id || '');
  const team = teams.find((t) => t.id === selectedId) || teams[0];

  if (!team) {
    return <div className="px-4 py-10 text-center text-sm text-slate-500">No teams configured yet.</div>;
  }

  const squad = players.filter((p) => p.soldToTeamId === team.id);

  return (
    <div className="space-y-3">
      {/* Team chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition-colors min-h-[44px] ${
              t.id === team.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
              style={{ backgroundColor: t.badgeBg || t.color, color: t.badgeText || '#fff' }}
            >
              {t.shortCode}
            </span>
            <span className="max-w-[110px] truncate">{t.name}</span>
          </button>
        ))}
      </div>

      {/* Team budget header */}
      <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Squad</p>
          <p className="font-['Outfit'] font-black text-lg text-slate-900 leading-tight">
            {squad.length} <span className="text-sm text-slate-400">/ {maxSquad}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Remaining</p>
          <p className="font-['Outfit'] font-black text-lg text-emerald-600 leading-tight">
            {formatPoints(team.pointsRemaining)}
          </p>
        </div>
      </div>

      {/* Roster */}
      {squad.length === 0 ? (
        <div className="px-4 py-10 rounded-2xl bg-white border border-dashed border-slate-300 text-center text-sm text-slate-500">
          No players bought yet.
        </div>
      ) : (
        <div className="space-y-2">
          {squad.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white border border-slate-200">
              <span className="w-6 text-center font-mono text-xs text-slate-400 shrink-0">{i + 1}</span>
              <PlayerAvatar src={p.photoUrl || p.photo} name={p.name} className="w-11 h-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {p.role}
                  {p.village ? ` · ${p.village}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-['Outfit'] font-black text-sm text-emerald-600">{formatPoints(p.soldPrice || 0)}</p>
                {role === 'admin' && (
                  <button
                    onClick={() => reopenPlayer(p.id)}
                    title="Reopen player"
                    className="mt-0.5 text-[10px] font-bold text-slate-400 hover:text-amber-600 flex items-center gap-0.5 justify-end min-h-[24px]"
                  >
                    <RotateCcw className="w-3 h-3" /> Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
