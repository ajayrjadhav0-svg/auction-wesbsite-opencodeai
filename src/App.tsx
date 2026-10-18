import React, { useState, useEffect } from 'react';
import { ActiveNav } from './types';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { ViewModeProvider, useViewMode } from './context/ViewModeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LiveAuctionView } from './components/LiveAuctionView';
import { LiveAuctionStage } from './components/LiveAuctionStage';
import { PlayersView } from './components/PlayersView';
import { TeamsView } from './components/TeamsView';
import { TeamSquadsView } from './components/TeamSquadsView';
import { AuctionHistoryView } from './components/AuctionHistoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { AdminPanel } from './components/AdminPanel';
import { AdminAccessGate } from './components/admin/AdminAccessGate';
import { PlayerRegistrationView } from './components/PlayerRegistrationView';
import { MobileShell } from './components/mobile/MobileShell';
import { MobileViewRouter } from './components/mobile/MobileViewRouter';
import {
  LayoutDashboard,
  Gavel,
  Users,
  Trophy,
  History,
  BarChart3,
} from 'lucide-react';

const NAV_STORAGE_KEY = 'cricket_auction_active_nav';

function AuctionAppContent() {
  const { state, role } = useAuction();
  // Which layout to render: 'mobile' (purpose-built) or 'desktop' (sidebar +
  // header). Resolved from the visitor's stored preference, or auto-detected.
  const { layout } = useViewMode();

  const [activeNav, setActiveNav] = useState<ActiveNav>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'register') return 'register';
      if (view === 'admin') return 'admin';
      if (view === 'live-auction') return 'live-auction';
      if (view === 'players') return 'players';
      if (view === 'teams') return 'teams';
      if (view === 'team-squads') return 'team-squads';
      if (view === 'auction-history') return 'auction-history';
      if (view === 'analytics') return 'analytics';
      if (view === 'settings') return 'settings';

      // Fall back to the last view the user was on. This keeps the admin on
      // the admin console (and viewers where they were) even if the page gets
      // reloaded — e.g. when the server rewrites its database file in dev mode
      // or the user refreshes the browser.
      const saved = localStorage.getItem(NAV_STORAGE_KEY);
      if (saved) return saved as ActiveNav;
    } catch {
      // Fallback
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSquadTeamId, setSelectedSquadTeamId] = useState<string>('');

  // Remember the active view so it survives reloads / dev-server refreshes.
  useEffect(() => {
    try {
      localStorage.setItem(NAV_STORAGE_KEY, activeNav);
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, [activeNav]);

  useEffect(() => {
    if (state?.settings?.tournamentName) {
      document.title = `${state.settings.tournamentName} - Live Cricket Auction`;
    }
  }, [state?.settings?.tournamentName]);

  // Fullscreen STAGE view for projector / laptop / phone displays.
  // ?view=stage renders only the auto-scaling auction stage, no app chrome,
  // so one URL works on a 4K projector, a laptop and a mobile phone.
  const isStageView = (() => {
    try {
      return new URLSearchParams(window.location.search).get('view') === 'stage';
    } catch {
      return false;
    }
  })();

  if (isStageView) {
    return <LiveAuctionStage />;
  }

  const defaultTeamId = state?.teams[0]?.id || 'mumbai-titans';

  const handleSelectTeamForSquad = (teamId: string) => {
    setSelectedSquadTeamId(teamId);
    setActiveNav('team-squads');
  };

  const handleNavigateToAuction = () => {
    setActiveNav('live-auction');
  };

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────
  // A separate, purpose-built mobile design rather than a squeezed desktop
  // one. Shares all auction state/mutations with desktop via useAuction().
  if (layout === 'mobile') {
    return (
      <MobileShell activeNav={activeNav} onSelectNav={setActiveNav}>
        <MobileViewRouter
          activeNav={activeNav}
          onSelectNav={setActiveNav}
          onSelectTeamForSquad={handleSelectTeamForSquad}
          selectedSquadTeamId={selectedSquadTeamId}
          defaultTeamId={defaultTeamId}
        />
      </MobileShell>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-['Inter'] selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Sidebar (persistent on lg+, drawer below) */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          activeNav={activeNav}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectNav={setActiveNav}
        />

        {/* View Router */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 pb-20 lg:pb-8 max-w-7xl w-full mx-auto">
          {activeNav === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveNav}
              onSelectTeamForSquad={handleSelectTeamForSquad}
            />
          )}

          {activeNav === 'live-auction' && <LiveAuctionView />}

          {activeNav === 'register' && (
            <PlayerRegistrationView onBackToApp={() => setActiveNav('dashboard')} />
          )}

          {activeNav === 'admin' &&
            (role === 'admin' ? (
              <AdminPanel onSelectNav={setActiveNav} />
            ) : (
              <AdminAccessGate
                onUnlockSuccess={() => setActiveNav('admin')}
                onReturnToDashboard={() => setActiveNav('dashboard')}
              />
            ))}

          {activeNav === 'players' && (
            <PlayersView onNavigateToAuction={handleNavigateToAuction} />
          )}

          {activeNav === 'teams' && (
            <TeamsView
              onNavigate={setActiveNav}
              onSelectTeamForSquad={handleSelectTeamForSquad}
            />
          )}

          {activeNav === 'team-squads' && (
            <TeamSquadsView initialTeamId={selectedSquadTeamId || defaultTeamId} />
          )}

          {activeNav === 'auction-history' && <AuctionHistoryView />}

          {activeNav === 'analytics' && <AnalyticsView />}

          {activeNav === 'settings' && <SettingsView onSelectNav={setActiveNav} />}
        </main>

        {/* Bottom Quick Navigation Bar (desktop layout on narrow screens only) */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden flex items-center justify-around py-2 px-1 shadow-md overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveNav('dashboard')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-['Outfit'] font-bold whitespace-nowrap shrink-0 ${
              activeNav === 'dashboard' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveNav('live-auction')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-['Outfit'] font-bold whitespace-nowrap shrink-0 ${
              activeNav === 'live-auction' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <Gavel className="w-4 h-4 text-amber-500" />
              <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
            <span>Auction</span>
          </button>

          <button
            onClick={() => setActiveNav('players')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-['Outfit'] font-bold whitespace-nowrap shrink-0 ${
              activeNav === 'players' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Players</span>
          </button>

          <button
            onClick={() => setActiveNav('team-squads')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-['Outfit'] font-bold whitespace-nowrap shrink-0 ${
              activeNav === 'team-squads' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Squads</span>
          </button>

          <button
            onClick={() => setActiveNav('auction-history')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-['Outfit'] font-bold whitespace-nowrap shrink-0 ${
              activeNav === 'auction-history' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveNav('analytics')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-['Outfit'] font-bold whitespace-nowrap shrink-0 ${
              activeNav === 'analytics' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuctionProvider>
      <ViewModeProvider>
        <AuctionAppContent />
      </ViewModeProvider>
    </AuctionProvider>
  );
}
