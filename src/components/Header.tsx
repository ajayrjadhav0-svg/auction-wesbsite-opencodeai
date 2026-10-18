import React, { useState } from 'react';
import { Menu, Gavel, RefreshCw, Shield, Share2, Check, Settings, Printer } from 'lucide-react';
import { ActiveNav } from '../types';
import { useAuction } from '../context/AuctionContext';
import { formatINR } from '../utils/formatters';
import { AuctionExportModal } from './AuctionExportModal';
import { ViewModeSwitcher } from './ViewModeSwitcher';

interface HeaderProps {
  activeNav: ActiveNav;
  onToggleSidebar: () => void;
  onSelectNav: (nav: ActiveNav) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNav,
  onToggleSidebar,
  onSelectNav,
}) => {
  const { state, refreshState, role, getViewerShareUrl, notification, clearNotification, showNotification } = useAuction();
  const summary = state?.summary;
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleCopyLink = () => {
    const link = getViewerShareUrl();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showNotification('success', 'Viewer share link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile menu toggle + Page title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onToggleSidebar}
          id="btn-sidebar-toggle"
          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-950 lg:hidden border border-slate-200 shrink-0"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          {state?.settings?.tournamentLogo && (
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-2xs">
              <img
                src={state.settings.tournamentLogo}
                alt="League Logo"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] font-black text-sm md:text-base text-slate-900 uppercase tracking-tight truncate max-w-[140px] sm:max-w-[280px] lg:max-w-none">
                {state?.settings?.tournamentName || 'MY CRICKET LEAGUE AUCTION'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {state?.teams?.length || 0} Teams • {state?.players?.length || 0} Registered Players • {formatINR(state?.settings?.startingPoints || 100000)} Points Purse
            </p>
          </div>
        </div>
      </div>

      {/* Right: Quick Metrics & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View Mode: Mobile / Desktop / Auto */}
        <ViewModeSwitcher variant="compact" />

        {/* Share Viewer Link Button */}
        <button
          id="btn-header-share-link"
          onClick={handleCopyLink}
          title="Copy Spectator Viewer Link to Share"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
          <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Share Link'}</span>
        </button>

        {/* Export/Print Auction Report */}
        <button
          id="btn-header-export-pdf"
          onClick={() => setIsExportModalOpen(true)}
          title="Generate PDF report of squads and budgets"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Export PDF/Print</span>
        </button>


        {/* Committee Cash Tracker */}
        {summary && summary.totalCommitteeCash > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="text-slate-500 font-medium">Extra Cash:</span>
            <span className="font-mono font-bold text-emerald-700">
              {formatINR(summary.totalCommitteeCash)}
            </span>
          </div>
        )}

        {/* Sync Button */}
        <button
          id="btn-header-sync"
          onClick={() => refreshState()}
          title="Refresh State from Database"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600" />
        </button>

        {/* Live Auction Quick Jump */}
        {activeNav !== 'live-auction' && (
          <button
            id="btn-header-live-auction"
            onClick={() => onSelectNav('live-auction')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs shadow-xs active:scale-95 transition-all"
          >
            <Gavel className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">LIVE AUCTION</span>
          </button>
        )}

        {/* Admin Portal Button (when in admin session) */}
        {role === 'admin' && (
          <button
            id="btn-header-admin-portal"
            onClick={() => onSelectNav('admin')}
            title="Admin Panel Controls"
            className="p-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 shadow-2xs flex items-center gap-1.5 font-bold font-['Outfit'] text-xs transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          id="btn-header-settings"
          onClick={() => onSelectNav('settings')}
          title="Tournament Rules & System Overview"
          className="hidden sm:block p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Notification Banner Overlay */}
      {notification && (
        <div
          onClick={clearNotification}
          className={`fixed top-16 right-4 z-50 max-w-[calc(100vw-2rem)] px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-bounce cursor-pointer ${
            notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}
      <AuctionExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </header>
  );
};
