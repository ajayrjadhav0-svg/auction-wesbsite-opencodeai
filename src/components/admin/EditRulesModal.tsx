import React, { useEffect, useState } from 'react';
import { Settings2, X, Save, IndianRupee, Users, AlertTriangle } from 'lucide-react';
import { TournamentSettings } from '../../types';

interface EditRulesModalProps {
  isOpen: boolean;
  settings: TournamentSettings;
  onClose: () => void;
  onSave: (updates: Partial<TournamentSettings>) => Promise<void> | void;
}

interface FormState {
  tournamentName: string;
  startingPoints: string;
  auctionBudget: string;
  maxSquadSize: string;
  maxAuctionPlayers: string;
  iconPlayersCount: string;
  iconCostPerPlayer: string;
  freePoints: string;
  extraPointsAllowed: boolean;
  extraPointsPenaltyRate: string;
  minBidIncrement: string;
  defaultReservePrice: string;
}

const toNum = (v: string, fallback = 0) => {
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? fallback : n;
};

/**
 * Full tournament-rules editor. Lets an admin change every auction parameter
 * that was previously only settable through the "New Auction" wizard.
 */
export const EditRulesModal: React.FC<EditRulesModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && settings) {
      setForm({
        tournamentName: settings.tournamentName || '',
        startingPoints: String(settings.startingPoints ?? 100000),
        auctionBudget: String(settings.auctionBudget ?? settings.startingPoints ?? 100000),
        maxSquadSize: String(settings.maxSquadSize ?? 15),
        maxAuctionPlayers: String(settings.maxAuctionPlayers ?? settings.maxSquadSize ?? 15),
        iconPlayersCount: String(settings.iconPlayersCount ?? 0),
        iconCostPerPlayer: String(settings.iconCostPerPlayer ?? 0),
        freePoints: String(settings.freePoints ?? 0),
        extraPointsAllowed: settings.extraPointsAllowed ?? true,
        extraPointsPenaltyRate: String(settings.extraPointsPenaltyRate ?? 1),
        minBidIncrement: String(settings.minBidIncrement ?? 500),
        defaultReservePrice: String(settings.defaultReservePrice ?? 500),
      });
    }
  }, [isOpen, settings]);

  if (!isOpen || !form) return null;

  const set = (patch: Partial<FormState>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        tournamentName: form.tournamentName.trim() || settings.tournamentName,
        startingPoints: toNum(form.startingPoints, 100000),
        auctionBudget: toNum(form.auctionBudget, 100000),
        maxSquadSize: Math.max(1, toNum(form.maxSquadSize, 15)),
        maxAuctionPlayers: Math.max(1, toNum(form.maxAuctionPlayers, 15)),
        iconPlayersCount: Math.max(0, toNum(form.iconPlayersCount, 0)),
        iconCostPerPlayer: Math.max(0, toNum(form.iconCostPerPlayer, 0)),
        freePoints: Math.max(0, toNum(form.freePoints, 0)),
        extraPointsAllowed: form.extraPointsAllowed,
        extraPointsPenaltyRate: Math.max(0, toNum(form.extraPointsPenaltyRate, 1)),
        minBidIncrement: Math.max(1, toNum(form.minBidIncrement, 500)),
        defaultReservePrice: Math.max(0, toNum(form.defaultReservePrice, 500)),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof FormState,
    opts: { numeric?: boolean; hint?: string } = {}
  ) => (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={opts.numeric ? 'text' : 'text'}
        inputMode={opts.numeric ? 'numeric' : 'text'}
        value={form[key] as string}
        onChange={(e) =>
          set({ [key]: opts.numeric ? e.target.value.replace(/[^0-9]/g, '') : e.target.value } as any)
        }
        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />
      {opts.hint && <p className="text-[10px] text-slate-400">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                ADMIN · FULL CONTROL
              </span>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Edit Tournament Rules & Parameters
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Identity & Squads</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {field('Tournament Name', 'tournamentName')}
            </div>
            {field('Squad Size Limit (players)', 'maxSquadSize', { numeric: true })}
            {field('Max Auction Players', 'maxAuctionPlayers', { numeric: true })}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pt-1">
            <IndianRupee className="w-4 h-4 text-indigo-600" />
            <span>Purse & Points</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Starting Purse (points per team)', 'startingPoints', { numeric: true })}
            {field('Auction Budget', 'auctionBudget', { numeric: true })}
            {field('Free Points Threshold', 'freePoints', { numeric: true, hint: 'Bids above this may incur penalty cash.' })}
            {field('Penalty Rate (₹ per point over)', 'extraPointsPenaltyRate', { numeric: true })}
            {field('Min Bid Increment', 'minBidIncrement', { numeric: true })}
            {field('Default Reserve Price', 'defaultReservePrice', { numeric: true })}
            {field('Icon Players Count', 'iconPlayersCount', { numeric: true })}
            {field('Icon Cost Per Player', 'iconCostPerPlayer', { numeric: true })}
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.extraPointsAllowed}
              onChange={(e) => set({ extraPointsAllowed: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Allow Extra Points / Over-Budget Bids</span>
              <span className="text-slate-500 text-[11px]">
                When enabled, teams may exceed the free-points threshold and pay the penalty rate.
              </span>
            </div>
          </label>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Changing the purse or squad size recalculates every team's remaining points and status
              immediately.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Rules'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
