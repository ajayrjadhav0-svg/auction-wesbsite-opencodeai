import React from 'react';
import { Gavel, X, Trophy } from 'lucide-react';
import { formatPoints } from '../utils/formatters';

interface SoldPopupProps {
  recentSale: {
    transaction: {
      playerName: string;
      teamName: string;
      soldPrice: number;
      role?: string;
    };
    team: { name: string; shortCode: string; color: string } | null;
  };
  onClose: () => void;
}

export const SoldPopup: React.FC<SoldPopupProps> = ({ recentSale, onClose }) => {
  const { transaction, team } = recentSale;
  const teamColor = team?.color || '#10b981';
  const teamName = team?.name || transaction.teamName;
  const teamShort = team?.shortCode || (transaction.teamName || '').slice(0, 3).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                HAMMER DOWN
              </span>
              <h3 className="font-['Outfit'] font-black text-xl leading-tight">
                PLAYER SOLD!
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-center">
          <div>
            <h4 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-slate-900 tracking-tight uppercase">
              {transaction.playerName}
            </h4>
            {transaction.role && (
              <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                {transaction.role}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-['Outfit'] font-black text-sm text-white shadow-md shrink-0"
              style={{ backgroundColor: teamColor }}
            >
              {teamShort}
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Sold To
              </span>
              <span className="font-['Outfit'] font-black text-lg text-slate-900 leading-snug">
                {teamName}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Final Hammer Price
            </span>
            <span className="font-['Outfit'] font-black text-3xl text-emerald-700 font-mono tracking-tight block mt-1">
              {formatPoints(transaction.soldPrice)} pts
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Congratulations to {teamName}!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoldPopup;