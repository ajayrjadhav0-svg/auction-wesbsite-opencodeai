import React, { useState } from 'react';
import {
  LayoutDashboard,
  Gavel,
  Users,
  Shield,
  Trophy,
  History,
  MoreHorizontal,
  BarChart3,
  UserPlus,
  Settings,
  X,
  LogOut,
  RefreshCw,
  Check,
  Share2,
  Monitor,
  Smartphone,
  Sparkles,
  Printer,
} from 'lucide-react';
import { ActiveNav } from '../../types';
import { useAuction } from '../../context/AuctionContext';
import { useViewMode, ViewPreference } from '../../context/ViewModeContext';
import { AuctionExportModal } from '../AuctionExportModal';

interface MobileShellProps {
  activeNav: ActiveNav;
  onSelectNav: (nav: ActiveNav) => void;
  children: React.ReactNode;
}

/** Screens reachable from the 5-slot bottom bar. Everything else lives in "More". */
type BottomItem =
  | { id: ActiveNav; label: string; icon: React.ReactNode }
  | { id: 'more'; label: string; icon: React.ReactNode };

const BOTTOM_ITEMS: BottomItem[] = [
  { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'live-auction', label: 'Auction', icon: <Gavel className="w-5 h-5" /> },
  { id: 'players', label: 'Players', icon: <Users className="w-5 h-5" /> },
  { id: 'team-squads', label: 'Squads', icon: <Trophy className="w-5 h-5" /> },
  { id: 'more', label: 'More', icon: <MoreHorizontal className="w-5 h-5" /> },
];

const MORE_ITEMS: { id: ActiveNav; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'teams', label: 'Teams & Budget', icon: <Shield className="w-4 h-4" /> },
  { id: 'auction-history', label: 'Auction History', icon: <History className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'register', label: 'Player Registration', icon: <UserPlus className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings & Rules', icon: <Settings className="w-4 h-4" /> },
  { id: 'admin', label: 'Admin Panel', icon: <Settings className="w-4 h-4" />, adminOnly: true },
];

const VIEW_OPTIONS: { value: ViewPreference; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: 'auto', label: 'Auto', icon: <Sparkles className="w-4 h-4" />, hint: 'Follow screen size' },
  { value: 'mobile', label: 'Mobile', icon: <Smartphone className="w-4 h-4" />, hint: 'Simpler touch layout' },
  { value: 'desktop', label: 'Desktop', icon: <Monitor className="w-4 h-4" />, hint: 'Full dense layout' },
];

/**
 * Mobile-first chrome: compact sticky top bar, a 5-slot bottom tab bar, and a
 * "More" sheet for the remaining screens plus the view-mode preference.
 *
 * Deliberately NOT responsive — this only ever renders when the visitor has
 * chosen (or auto-detected) the mobile layout. The desktop layout is Sidebar +
 * Header, rendered separately.
 */
export const MobileShell: React.FC<MobileShellProps> = ({ activeNav, onSelectNav, children }) => {
  const { state, role, refreshState, getViewerShareUrl, logoutAdmin, notification, clearNotification, showNotification } =
    useAuction();
  const { preference, setPreference } = useViewMode();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const isMoreActive =
    activeNav === 'teams' ||
    activeNav === 'auction-history' ||
    activeNav === 'analytics' ||
    activeNav === 'register' ||
    activeNav === 'settings' ||
    activeNav === 'admin';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getViewerShareUrl());
    setCopied(true);
    showNotification('success', 'Viewer share link copied');
    setTimeout(() => setCopied(false), 2500);
  };

  const go = (nav: ActiveNav) => {
    onSelectNav(nav);
    setIsMoreOpen(false);
  };

  const title = (() => {
    switch (activeNav) {
      case 'live-auction':
        return 'Live Auction';
      case 'team-squads':
        return 'Team Squads';
      case 'auction-history':
        return 'History';
      case 'register':
        return 'Registration';
      case 'admin':
        return 'Admin';
      default:
        return activeNav.charAt(0).toUpperCase() + activeNav.slice(1).replace('-', ' ');
    }
  })();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-['Inter'] selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {state?.settings?.tournamentLogo ? (
            <img
              src={state.settings.tournamentLogo}
              alt=""
              className="w-8 h-8 rounded-lg object-contain bg-indigo-50 border border-indigo-100 shrink-0 p-0.5"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shrink-0">
              <span className="text-base">🏏</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-['Outfit'] font-black text-[13px] leading-tight tracking-tight truncate uppercase">
              {title}
            </h1>
            <p className="text-[10px] text-slate-500 leading-tight truncate">
              {state?.settings?.tournamentName || 'Cricket League'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopyLink}
            title="Copy spectator link"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => refreshState()}
            title="Refresh"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </header>

      {/* ── Scrolling content ──────────────────────────────────────────── */}
      <main className="flex-1 p-3 pb-24 overflow-x-hidden">{children}</main>

      {/* ── Bottom tab bar ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {BOTTOM_ITEMS.map((item) => {
            const isActive = item.id === 'more' ? isMoreActive : activeNav === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => (item.id === 'more' ? setIsMoreOpen(true) : onSelectNav(item.id))}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[52px] transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                <span className={isActive ? 'relative' : ''}>
                  {item.icon}
                  {item.id === 'live-auction' && (
                    <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  )}
                </span>
                <span className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
                {isActive && <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-indigo-600" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── "More" sheet ───────────────────────────────────────────────── */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsMoreOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl border-t border-slate-200 max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="sticky top-0 bg-white px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-slate-300" />
              <h2 className="font-['Outfit'] font-black text-sm text-slate-900 pt-1">More</h2>
              <button onClick={() => setIsMoreOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 space-y-1">
              {MORE_ITEMS.filter((i) => !i.adminOnly || role === 'admin').map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3.5 rounded-xl text-sm font-semibold transition-colors min-h-[48px] ${
                    activeNav === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={activeNav === item.id ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* PDF / Print report */}
            <div className="px-3 pb-1">
              <button
                id="mobile-btn-export-pdf"
                onClick={() => {
                  setIsMoreOpen(false);
                  setIsExportOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold transition-colors min-h-[48px]"
              >
                <Printer className="w-4 h-4" />
                Export PDF / Print Report
              </button>
            </div>

            {/* View mode preference */}
            <div className="px-4 py-3 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">View Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {VIEW_OPTIONS.map((opt) => {
                  const isActive = preference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPreference(opt.value)}
                      aria-pressed={isActive}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-colors min-h-[48px] ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                      <span className={`text-[9px] font-medium ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {role === 'admin' && (
              <div className="px-4 py-3 border-t border-slate-100">
                <button
                  onClick={() => logoutAdmin()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm min-h-[48px]"
                >
                  <LogOut className="w-4 h-4" />
                  Exit Admin
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification banner */}
      {notification && (
        <button
          onClick={clearNotification}
          className={`fixed top-14 left-3 right-3 z-40 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 text-left ${
            notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {notification.message}
        </button>
      )}

      {/* PDF / Print report — same export modal the desktop header uses */}
      <AuctionExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};
