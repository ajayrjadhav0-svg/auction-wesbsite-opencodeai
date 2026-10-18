import React, { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Monitor,
  Home,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import {
  formatPoints,
  getRoleBadgeStyle,
  getStatusBadgeStyle,
} from '../utils/formatters';
import { getDefaultAvatarForRole } from '../data/presetAvatars';

/**
 * FULLSCREEN "STAGE" PRESENTATION VIEW.
 *
 * This is the view you open on a big projector, a laptop, or a phone when the
 * admin puts a player on the auction hammer. Everything scales with the screen
 * using CSS vmin / vh / clamp() units, so the exact same URL looks great on:
 *   - a phone (portrait, ~390px wide)
 *   - a laptop (1440px wide)
 *   - a 1080p / 4K projector (1920px+ wide)
 *
 * It auto-syncs with the server through the normal context polling (2.5s), so
 * viewers see the current player, live bids into the hammer, sold/unsold status.
 */
export const LiveAuctionStage: React.FC = () => {
  const { state, navigatePlayer, role, getViewerShareUrl } = useAuction();

  // Keyboard arrow / presenter-clicker navigation (Left/Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        navigatePlayer('prev');
      } else if (e.key === 'ArrowRight') {
        navigatePlayer('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigatePlayer]);

  if (!state) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-400 text-xl">
        Loading live auction stage...
      </div>
    );
  }

  const { players, teams, bidding, settings } = state;

  const currentPlayer =
    players.find((p) => p.id === bidding.currentPlayerId) || players[0] || {
      id: 1,
      code: 'P001',
      name: 'READY FOR AUCTION',
      role: 'All-Rounder',
      auctionOrder: 1,
      status: 'AVAILABLE',
      soldToTeamId: null,
      soldPrice: 0,
    };

  const roleStyle = getRoleBadgeStyle(currentPlayer.role);
  const statusStyle = getStatusBadgeStyle(currentPlayer.status);
  const soldTeam = teams.find((t) => t.id === currentPlayer.soldToTeamId);
  const isLive = state.bidding.isActive;

  const exitStage = () => {
    try {
      window.location.href = new URL(window.location.href).origin + '/';
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-950 text-white relative flex flex-col select-none">
      {/* Ambient glow / gradient backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(99,102,241,0.28) 0%, rgba(2,6,23,0) 60%), radial-gradient(100% 80% at 50% 110%, rgba(16,185,129,0.14) 0%, rgba(2,6,23,0) 55%)',
        }}
      />

      {/* ── TOP STRIP ─────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-[2vw] py-[1.4vh] border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-[1.5vmin] min-w-0">
          <div className="hidden sm:flex items-center justify-center w-[4.5vmin] h-[4.5vmin] min-w-[28px] min-h-[28px] max-w-[64px] max-h-[64px] rounded-xl bg-indigo-600/90 text-white shadow-lg">
            <Monitor className="w-[3vmin] min-w-[14px]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[clamp(0.55rem,1.4vmin,1.05rem)] font-black uppercase tracking-[0.18em] text-slate-400 truncate">
                <Radio className={`w-[1.6vmin] min-w-[11px] ${isLive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                {isLive
                  ? 'Live Auction'
                  : currentPlayer.status === 'SOLD'
                  ? 'Player Sold'
                  : currentPlayer.status === 'UNSOLD'
                  ? 'Player Unsold'
                  : 'Stage Standby'}
              </span>
              <span className={`hidden md:inline-flex text-[clamp(0.5rem,1.2vmin,0.9rem)] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                {currentPlayer.status}
              </span>
            </div>
            <h1 className="font-['Outfit'] font-black text-[clamp(1rem,3vmin,2.6rem)] leading-none tracking-tight truncate">
              {settings?.tournamentName || 'LIVE AUCTION'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-[1.5vmin] shrink-0">
          <span className="font-mono font-black text-amber-300 text-[clamp(0.8rem,2.2vmin,1.8rem)] px-[1.6vmin] py-[0.5vmin] rounded-xl bg-amber-400/15 border border-amber-400/30">
            {currentPlayer.code}
          </span>
          <span className="text-[clamp(0.6rem,1.6vmin,1.15rem)] font-extrabold text-slate-300 tracking-wider uppercase hidden sm:inline">
            Auction #{currentPlayer.auctionOrder || 1}
          </span>
          <button
            onClick={exitStage}
            title="Exit fullscreen stage"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors text-[clamp(0.55rem,1.5vmin,1rem)] font-bold"
          >
            <Home className="w-[1.6vmin] min-w-[12px]" />
            <span className="hidden md:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* ── PLAYER HALF (fills the whole middle) ─────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[2vmin] px-[3vw] py-[1.5vh] min-h-0">
        {/* Photo / avatar — scales with the smaller of width & height */}
        <div
          className="rounded-[3vmin] overflow-hidden border-[0.5vmin] border-indigo-500 shadow-2xl ring-[1.2vmin] ring-indigo-500/15 bg-slate-900 flex items-center justify-center shrink-0"
          style={{ width: 'min(64vmin, 58vh)', height: 'min(64vmin, 58vh)', maxWidth: '94vw' }}
        >
          {currentPlayer.photoUrl || currentPlayer.photo ? (
            <img
              src={currentPlayer.photoUrl || currentPlayer.photo}
              alt={currentPlayer.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = getDefaultAvatarForRole(currentPlayer.role);
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/30 via-slate-800 to-indigo-900/40 flex flex-col items-center justify-center gap-[1.5vmin]">
              <span className="text-[min(22vmin,20vh)] leading-none">🏏</span>
              <span
                className={`text-[clamp(0.65rem,1.9vmin,1.5rem)] font-black font-['Outfit'] tracking-widest uppercase px-[2vmin] py-[0.6vmin] rounded-full border bg-white/10 ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
              >
                {currentPlayer.role}
              </span>
            </div>
          )}
        </div>

        {/* Name — giant, self-scaling */}
        <h2 className="font-['Outfit'] font-black text-slate-50 tracking-tight uppercase leading-none text-center max-w-[95vw] px-2">
          <span className="text-[clamp(2.1rem,7.4vmin,8.5rem)] break-words drop-shadow-[0_0.45vmin_1.2vmin_rgba(0,0,0,0.8)]">
            {currentPlayer.name}
          </span>
        </h2>

        {/* Role + Village badges */}
        <div className="flex flex-wrap items-center justify-center gap-[1.6vmin]">
          <span
            className={`text-[clamp(0.7rem,2vmin,1.6rem)] font-black px-[2.4vmin] py-[0.8vmin] rounded-[1.2vmin] border tracking-wide uppercase inline-flex items-center gap-2 shadow-lg ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
          >
            {currentPlayer.role}
          </span>
          {currentPlayer.village && (
            <span className="text-[clamp(0.7rem,2vmin,1.6rem)] font-black px-[2.4vmin] py-[0.8vmin] rounded-[1.2vmin] bg-amber-400/15 text-amber-200 border border-amber-400/40 tracking-wide uppercase inline-flex items-center gap-2 shadow-lg">
              📍 {currentPlayer.village}
            </span>
          )}
        </div>

        {/* Sale result — stays on screen until the admin loads the next player */}
        {currentPlayer.status !== 'AVAILABLE' ? (
          <div className="flex flex-col items-center gap-[1.4vmin] mt-[0.5vmin] w-full">
            <span
              className={`inline-flex items-center gap-[1.5vmin] px-[3.5vmin] py-[0.7vmin] rounded-full text-white font-['Outfit'] font-black uppercase tracking-[0.35em] text-[clamp(0.9rem,2.8vmin,2.4rem)] shadow-2xl ${
                soldTeam ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            >
              {soldTeam ? 'SOLD' : 'UNSOLD'}
            </span>

            {soldTeam && (
              <div className="text-[clamp(0.9rem,2.8vmin,2.4rem)] font-black flex items-center gap-[1.5vmin] flex-wrap justify-center">
                <span className="text-slate-300 font-semibold">to</span>
                <span
                  className="inline-flex items-center gap-[1vmin] px-[2vmin] py-[0.5vmin] rounded-[1.2vmin] text-white shadow-lg"
                  style={{ backgroundColor: soldTeam.color }}
                >
                  <span className="font-mono opacity-90 text-[0.7em]">{soldTeam.shortCode}</span>
                  <span>{soldTeam.name}</span>
                </span>
                <span className="text-slate-300 font-semibold">for</span>
                <span className="font-mono text-emerald-300">{formatPoints(currentPlayer.soldPrice)} pts</span>
              </div>
            )}
          </div>
        ) : isLive ? (
          <div className="flex items-center gap-[1.5vmin] text-[clamp(0.7rem,1.9vmin,1.4rem)] font-bold text-slate-300 uppercase tracking-widest">
            <span className="w-[1.6vmin] min-w-[10px] h-[1.6vmin] min-h-[10px] rounded-full bg-emerald-400 animate-pulse" />
            On the stage — bids open
          </div>
        ) : null}
      </main>

      {/* ── FLOATING PREV / NEXT (works with presenter clickers) ─── */}
      <button
        onClick={() => navigatePlayer('prev')}
        title="Previous player (Left Arrow)"
        aria-label="Previous player"
        className="absolute left-[1.5vw] top-1/2 -translate-y-1/2 z-20 p-[1.6vmin] rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-sm transition-all active:scale-90"
        style={{ minWidth: 40, minHeight: 40 }}
      >
        <ChevronLeft className="w-[4vmin] min-w-[20px]" />
      </button>
      <button
        onClick={() => navigatePlayer('next')}
        title="Next player (Right Arrow)"
        aria-label="Next player"
        className="absolute right-[1.5vw] top-1/2 -translate-y-1/2 z-20 p-[1.6vmin] rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-sm transition-all active:scale-90"
        style={{ minWidth: 40, minHeight: 40 }}
      >
        <ChevronRight className="w-[4vmin] min-w-[20px]" />
      </button>

      {/* ── BOTTOM STRIP ─────────────────────────────────────────── */}
      <footer className="relative z-10 flex items-center justify-between gap-3 px-[2vw] py-[1.2vh] border-t border-white/10 bg-slate-950/60 backdrop-blur-md">
        <span className="text-[clamp(0.5rem,1.3vmin,0.95rem)] text-slate-500 font-semibold tracking-wide truncate">
          ← / → keys or clicker to change player · {role === 'admin' ? 'Admin console active' : 'Viewers only'}
        </span>
        <button
          onClick={() => {
            try {
              const link = new URL(getViewerShareUrl());
              link.searchParams.set('view', 'stage');
              navigator.clipboard.writeText(link.toString());
            } catch {
              /* clipboard may be unavailable */
            }
          }}
          className="text-[clamp(0.5rem,1.3vmin,0.95rem)] font-bold text-indigo-300 hover:text-white transition-colors"
        >
          Copy this stage link ⧉
        </button>
      </footer>
    </div>
  );
};