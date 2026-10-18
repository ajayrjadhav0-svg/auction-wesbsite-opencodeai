import React from 'react';
import { Gavel, AlertTriangle, Shield, Check, X, IndianRupee } from 'lucide-react';
import { Player, Team, TournamentSettings } from '../../types';
import { formatINR, formatPoints, getRoleBadgeStyle } from '../../utils/formatters';

interface ConfirmSaleModalProps {
  isOpen: boolean;
  player: Player | null;
  team: Team | null;
  amount: number;
  settings: TournamentSettings;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmSaleModal: React.FC<ConfirmSaleModalProps> = ({
  isOpen,
  player,
  team,
  amount,
  settings,
  isSubmitting = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !player || !team) return null;

  const roleStyle = getRoleBadgeStyle(player.role);
  const remainingPointsAfter = team.pointsRemaining - amount;
  const isOverBudget = remainingPointsAfter < 0;
  const isOverFreePoints = settings.freePoints > 0 && (team.totalPointsSpent + amount > settings.freePoints);

  // Extra cash fee estimation if over free points
  let penaltyEstimate = 0;
  if (isOverFreePoints) {
    const excess = (team.totalPointsSpent + amount) - settings.freePoints;
    penaltyEstimate = excess * (settings.extraPointsPenaltyRate || 1);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                FINAL CONFIRMATION REQUIRED
              </span>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Confirm Player Sale & Hammer Down
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Player Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-slate-500">{player.code}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                >
                  {player.role}
                </span>
              </div>
              <h4 className="font-['Outfit'] font-black text-xl text-slate-900">
                {player.name}
              </h4>
            </div>
          </div>

          {/* Sold Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Winning Team */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sold To Franchise
              </span>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-sm text-white shadow-2xs shrink-0"
                  style={{ backgroundColor: team.color }}
                >
                  {team.shortCode}
                </div>
                <div>
                  <h5 className="font-['Outfit'] font-extrabold text-sm text-slate-900 leading-snug">
                    {team.name}
                  </h5>
                  <span className="text-[10px] font-mono text-slate-500">
                    Squad: {team.totalPlayers + 1} / {settings.maxSquadSize}
                  </span>
                </div>
              </div>
            </div>

            {/* Hammer Price */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Final Hammer Price
              </span>
              <div className="mt-2">
                <span className="font-['Outfit'] font-black text-2xl text-emerald-700 font-mono tracking-tight block">
                  {formatPoints(amount)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Auction Points
                </span>
              </div>
            </div>
          </div>

          {/* Team Purse Impact Analysis */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Purse Impact for {team.name}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Current Purse:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatPoints(team.pointsRemaining)} pts
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">After Sale:</span>
                <span
                  className={`font-mono font-bold ${
                    remainingPointsAfter < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatPoints(remainingPointsAfter)} pts
                </span>
              </div>
            </div>

            {isOverBudget && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Notice: This bid exceeds the team's remaining points purse.</span>
              </div>
            )}

            {penaltyEstimate > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <IndianRupee className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Triggers extra cash charge: ~{formatINR(penaltyEstimate)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-['Outfit'] font-bold text-xs transition-colors"
          >
            Cancel & Change
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-['Outfit'] font-black text-sm shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            <span>{isSubmitting ? 'Confirming Sale...' : 'YES, CONFIRM SALE & HAMMER DOWN'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
