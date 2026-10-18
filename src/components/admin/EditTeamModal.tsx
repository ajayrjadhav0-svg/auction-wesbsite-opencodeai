import React, { useState, useEffect } from 'react';
import { Shield, X, Check, Trash2 } from 'lucide-react';
import { Team } from '../../types';

interface EditTeamModalProps {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
  onSave: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  onDelete?: (teamId: string) => Promise<boolean>;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  team,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (team && isOpen) {
      setName(team.name || '');
      setShortCode(team.shortCode || '');
      setColor(team.color || '#2563eb');
      setIsSubmitting(false);
    }
  }, [team, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !name.trim()) return;
    setIsSubmitting(true);
    try {
      const ok = await onSave(team.id, {
        name: name.trim().toUpperCase(),
        shortCode: shortCode.trim().toUpperCase() || name.slice(0, 3).toUpperCase(),
        color,
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !team) return;
    if (window.confirm(`Are you sure you want to delete ${team.name}? Any assigned players will return to AVAILABLE pool.`)) {
      setIsSubmitting(true);
      try {
        const ok = await onDelete(team.id);
        if (ok) onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-sm text-white shadow-2xs"
              style={{ backgroundColor: color }}
            >
              {shortCode || team.shortCode}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                FRANCHISE MANAGEMENT
              </span>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Rename & Edit Franchise
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Franchise Team Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., MUMBAI TITANS"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-['Outfit'] font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Short Code
              </label>
              <input
                type="text"
                maxLength={4}
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                placeholder="e.g., MT"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Franchise Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-1"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs uppercase"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
