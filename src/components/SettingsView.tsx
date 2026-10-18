import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Share2,
  Lock,
  ArrowRight,
  Trophy,
  Edit2,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { ActiveNav } from '../types';
import { formatPoints } from '../utils/formatters';
import { AdminLoginModal } from './admin/AdminLoginModal';
import { EditLeagueModal } from './admin/EditLeagueModal';
import { EditRulesModal } from './admin/EditRulesModal';

interface SettingsViewProps {
  onSelectNav?: (nav: ActiveNav) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSelectNav }) => {
  const { state, role, logoutAdmin, getViewerShareUrl, showNotification, updateSettings } = useAuction();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEditLeagueOpen, setIsEditLeagueOpen] = useState(false);
  const [isEditRulesOpen, setIsEditRulesOpen] = useState(false);

  if (!state) {
    return <div className="p-8 text-slate-400">Loading settings...</div>;
  }

  const { settings } = state;

  const handleCopyLink = () => {
    const link = getViewerShareUrl();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showNotification('success', 'Viewer share link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Outfit'] font-black text-lg md:text-xl text-slate-900 flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>TOURNAMENT RULES & SYSTEM OVERVIEW</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time auction configuration, live spectator link generator, and system status.
          </p>
        </div>

        {/* Share Link Button */}
        <button
          onClick={handleCopyLink}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-auto"
        >
          <Share2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>{copiedLink ? 'Link Copied!' : 'Copy Viewer Link'}</span>
        </button>
      </div>

      {/* LEAGUE BRANDING & LOGO CARD */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs">
            {settings.tournamentLogo ? (
              <img
                src={settings.tournamentLogo}
                alt="League Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-3xl">🏆</span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-indigo-600 block font-black uppercase tracking-wider">
              Official League Branding
            </span>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 mt-0.5">
              {settings.tournamentName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Official emblem displayed on header, broadcast desk, and player registration portal.
            </p>
          </div>
        </div>

        {role === 'admin' ? (
          <button
            id="btn-settings-edit-branding"
            onClick={() => setIsEditLeagueOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-bold text-xs flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto shrink-0"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Edit League & Logo</span>
          </button>
        ) : (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin to Edit Branding</span>
          </button>
        )}
      </div>

      {/* RULES SPECIFICATION CARD */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-['Outfit'] font-bold text-sm text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>ACTIVE TOURNAMENT RULES & PARAMETERS</span>
          </h3>
          {role === 'admin' ? (
            <button
              id="btn-settings-edit-rules"
              onClick={() => setIsEditRulesOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Rules</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-semibold">Spectator View</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-semibold uppercase">Tournament Title</span>
            <span className="font-['Outfit'] font-bold text-base text-slate-900 mt-1 block">
              {settings.tournamentName}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-semibold uppercase">Total Starting Purse</span>
            <span className="font-mono font-bold text-base text-indigo-600 mt-1 block">
              {formatPoints(settings.startingPoints)} pts
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-semibold uppercase">Squad Size Limit</span>
            <span className="font-mono font-bold text-base text-slate-900 mt-1 block">
              {settings.maxSquadSize} Players Max
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-semibold uppercase">Free Points Threshold</span>
            <span className="font-mono font-bold text-base text-emerald-600 mt-1 block">
              {formatPoints(settings.freePoints || 70000)} pts
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-semibold uppercase">Over-Limit Fee / Penalty Rate</span>
            <span className="font-['Outfit'] font-bold text-sm text-rose-600 mt-1 block">
              ₹{settings.extraPointsPenaltyRate || 1} per point over free budget
            </span>
          </div>
        </div>
      </div>

      {/* HIDDEN ADMIN ACCESS SECTION (Only in Settings) */}
      {role === 'admin' ? (
        <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-['Outfit'] font-black text-base md:text-lg text-white">
                  ADMINISTRATOR CONTROL PANEL
                </h3>
                <p className="text-xs text-indigo-200">
                  Full auction management, team purses, roster editing, and live floor control.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onSelectNav && (
                <button
                  onClick={() => onSelectNav('admin')}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 font-['Outfit'] font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span>OPEN ADMIN PANEL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => logoutAdmin()}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                Exit Admin
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700" />
                <h3 className="font-['Outfit'] font-bold text-sm text-slate-900">
                  Administrator Access
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Admin panel is private and hidden from public viewers. Enter your auction admin passcode to access administrative controls.
              </p>
            </div>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-auto shrink-0"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Unlock Admin Panel</span>
            </button>
          </div>
        </div>
      )}

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          if (onSelectNav) onSelectNav('admin');
        }}
      />

      <EditLeagueModal
        isOpen={isEditLeagueOpen}
        currentName={settings.tournamentName}
        currentLogo={settings.tournamentLogo}
        onClose={() => setIsEditLeagueOpen(false)}
        onSave={async (name, logo) => {
          await updateSettings({
            tournamentName: name,
            tournamentLogo: logo,
          });
          showNotification('success', `League branding updated to "${name}"!`);
        }}
      />

      <EditRulesModal
        isOpen={isEditRulesOpen}
        settings={settings}
        onClose={() => setIsEditRulesOpen(false)}
        onSave={async (updates) => {
          await updateSettings(updates);
        }}
      />
    </div>
  );
};
