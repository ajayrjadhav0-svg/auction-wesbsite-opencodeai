import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, RotateCcw } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatPoints, getRoleBadgeStyle, getStatusBadgeStyle } from '../../utils/formatters';

const FALLBACK_PLAYER = {
  id: 0,
  code: 'KPL-000',
  name: 'READY FOR AUCTION',
  role: 'All-Rounder',
  auctionOrder: 0,
  status: 'AVAILABLE' as const,
};

/**
 * Mobile live-auction showcase. Same data source and mutations as the desktop
 * LiveAuctionView — only the presentation is rebuilt for one-handed use:
 * big photo, thumb-reachable prev/next, no hover-dependent controls.
 */
export const MobileLiveAuctionView: React.FC = () => {
  const { state, role, navigatePlayer, reopenPlayer, getViewerShareUrl } = useAuction();

  const bidding = state?.bidding;
  const currentPlayer =
    state?.players?.find((p) => p.id === bidding?.currentPlayerId) || FALLBACK_PLAYER;

  const soldTeam = currentPlayer.soldToTeamId
    ? state?.teams?.find((t) => t.id === currentPlayer.soldToTeamId)
    : null;

  const roleStyle = getRoleBadgeStyle(currentPlayer.role);
  const statusStyle = getStatusBadgeStyle(currentPlayer.status);

  const openFullscreenStage = () => {
    const base = getViewerShareUrl().split('?')[0];
    window.open(`${base}?view=stage`, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Player card */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {/* Header strip */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white">
          <button
            onClick={() => navigatePlayer('prev')}
            id="mobile-btn-prev-player"
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="text-center min-w-0 px-2">
            <p className="font-['Outfit'] font-black text-sm truncate">{currentPlayer.code}</p>
            <p className="text-[10px] text-slate-400">AUCTION #{currentPlayer.auctionOrder}</p>
          </div>

          <button
            onClick={() => navigatePlayer('next')}
            id="mobile-btn-next-player"
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs min-h-[44px]"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Photo */}
        <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center py-6">
          {currentPlayer.photoUrl || currentPlayer.photo ? (
            <img
              src={currentPlayer.photoUrl || currentPlayer.photo}
              alt={currentPlayer.name}
              className="w-40 h-40 rounded-3xl object-cover border-4 border-white shadow-lg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-40 h-40 rounded-3xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-6xl">
              🏏
            </div>
          )}

          <button
            onClick={openFullscreenStage}
            title="Open fullscreen stage"
            className="absolute top-3 right-3 p-2.5 rounded-xl bg-white/90 border border-slate-200 text-slate-600 shadow-sm min-h-[44px] min-w-[44px]"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <span
            className="absolute top-3 left-3 text-[10px] font-black px-2.5 py-1 rounded-full border"
            style={{ backgroundColor: roleStyle.bg, color: roleStyle.text, borderColor: roleStyle.border }}
          >
            {currentPlayer.role}
          </span>
        </div>

        {/* Identity */}
        <div className="px-4 pb-4 -mt-1 text-center">
          <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 tracking-tight leading-tight break-words">
            {currentPlayer.name}
          </h2>
          {currentPlayer.village && (
            <p className="text-xs text-slate-500 mt-1 font-semibold">📍 {currentPlayer.village}</p>
          )}
          <span
            className="inline-block mt-2 text-[10px] font-black px-3 py-1 rounded-full border"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
          >
            {currentPlayer.status}
          </span>
        </div>

        {/* Sale result */}
        {currentPlayer.status !== 'AVAILABLE' && (
          <div
            className={`px-4 py-3 border-t ${
              currentPlayer.status === 'SOLD' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
            }`}
          >
            {currentPlayer.status === 'SOLD' ? (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Sold To</p>
                  <p className="font-bold text-sm text-slate-900 truncate">{soldTeam?.name || '—'}</p>
                </div>
                <p className="font-['Outfit'] font-black text-xl text-emerald-600 shrink-0 ml-2">
                  {formatPoints(currentPlayer.soldPrice || 0)}
                </p>
              </div>
            ) : (
              <p className="text-center font-bold text-sm text-rose-600">UNSOLD</p>
            )}

            {role === 'admin' && (
              <button
                onClick={() => reopenPlayer(currentPlayer.id)}
                id="mobile-btn-reopen-player"
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm min-h-[48px]"
              >
                <RotateCcw className="w-4 h-4" /> Reopen for Bidding
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bio strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="px-3.5 py-3 rounded-2xl bg-white border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</p>
          <p className="font-bold text-sm text-slate-900 mt-0.5">{currentPlayer.role}</p>
        </div>
        <div className="px-3.5 py-3 rounded-2xl bg-white border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Token Code</p>
          <p className="font-mono font-bold text-sm text-slate-900 mt-0.5">{currentPlayer.code}</p>
        </div>
      </div>
    </div>
  );
};
