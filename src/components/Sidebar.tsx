import React from 'react';
import {
  LayoutDashboard,
  Gavel,
  Users,
  Shield,
  Trophy,
  History,
  BarChart3,
  Settings,
  X,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { ActiveNav } from '../types';
import { useAuction } from '../context/AuctionContext';

interface SidebarProps {
  activeNav: ActiveNav;
  onSelectNav: (nav: ActiveNav) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  isOpen,
  onClose,
}) => {
  const { state, role, logoutAdmin } = useAuction();

  // Navigation items
  const navItems: { id: ActiveNav; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'DASHBOARD', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'live-auction', label: 'LIVE AUCTION', icon: <Gavel className="w-5 h-5" />, badge: 'LIVE' },
    { id: 'players', label: 'PLAYERS', icon: <Users className="w-5 h-5" /> },
    { id: 'teams', label: 'TEAMS', icon: <Shield className="w-5 h-5" /> },
    { id: 'team-squads', label: 'TEAM SQUADS', icon: <Trophy className="w-5 h-5" /> },
    { id: 'auction-history', label: 'AUCTION HISTORY', icon: <History className="w-5 h-5" /> },
    { id: 'analytics', label: 'ANALYTICS', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'register', label: 'PLAYER REGISTRATION', icon: <UserPlus className="w-5 h-5" />, badge: 'FORM' },
    { id: 'settings', label: 'SETTINGS', icon: <Settings className="w-5 h-5" /> },
  ];

  const visibleNavItems = navItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Tournament Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-black font-['Outfit'] text-xl shrink-0 overflow-hidden p-1">
              {state?.settings?.tournamentLogo ? (
                <img
                  src={state.settings.tournamentLogo}
                  alt={state.settings.tournamentName || 'League Logo'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span>🏏</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-['Outfit'] font-extrabold text-base text-slate-900 tracking-tight leading-tight truncate" title={state?.settings?.tournamentName}>
                  {state?.settings?.tournamentName || 'CRICKET LEAGUE'}
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">Live Auction Command</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Sync Status Bar & Role Pill */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${role === 'admin' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${role === 'admin' ? 'bg-indigo-600' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="text-slate-700 font-semibold">
              {role === 'admin' ? 'Admin Active' : 'Spectator (Viewer)'}
            </span>
          </div>

          {role === 'admin' && (
            <button
              onClick={() => logoutAdmin()}
              title="Exit Admin to Spectator View"
              className="text-[10px] text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Exit Admin</span>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = activeNav === item.id;
            const isAdminTab = item.id === 'admin';

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => {
                  onSelectNav(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-['Outfit'] font-semibold text-xs sm:text-sm transition-all ${
                  isActive
                    ? isAdminTab
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'bg-slate-900 text-white shadow-sm font-bold'
                    : isAdminTab
                    ? 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : isAdminTab ? 'text-indigo-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'LIVE'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
