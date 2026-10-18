import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  RotateCcw,
  Shield,
  Clock,
  Filter,
  ArrowUpDown,
  Share2,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { AuctionTransaction } from '../types';
import {
  formatINR,
  formatPoints,
  formatTransactionTime,
  getRoleBadgeStyle,
} from '../utils/formatters';
import { AuctionExportModal } from './AuctionExportModal';

export const AuctionHistoryView: React.FC = () => {
  const { state, role, reopenPlayer } = useAuction();

  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [rollbackPlayerId, setRollbackPlayerId] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const transactions = state?.transactions || [];
  const teams = state?.teams || [];
  const settings = state?.settings;

  // Filter & Sort Transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter((t) => {
      const matchesSearch =
        t.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.playerId.toString().includes(searchTerm) ||
        (t.teamName && t.teamName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTeam = teamFilter === 'ALL' || t.teamId === teamFilter;

      return matchesSearch && matchesTeam;
    });

    if (sortOrder === 'asc') {
      result = [...result].reverse();
    }

    return result;
  }, [transactions, searchTerm, teamFilter, sortOrder]);

  if (!state) {
    return <div className="p-8 text-slate-400">Loading auction history log...</div>;
  }

  const handleRollbackConfirm = async () => {
    if (!rollbackPlayerId) return;
    await reopenPlayer(rollbackPlayerId);
    setRollbackPlayerId(null);
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      <AuctionExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <h2 className="font-['Outfit'] font-black text-lg md:text-xl text-slate-900 flex items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-600" />
            <span>AUCTION TRANSACTION AUDIT LOG</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time chronological hammer ledger. Records price, franchise, and extra cash fees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span>Print / PDF / Excel</span>
          </button>

          <a
            href="/api/export/csv?type=history"
            download="auction_ledger.csv"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all self-start sm:self-auto"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>EXPORT CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shadow-2xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by player or team..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Team Filter */}
        <div>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="ALL">All Franchises ({teams.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Button */}
        <div>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 flex items-center justify-between font-semibold transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-['Outfit'] uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">TIME</th>
                <th className="py-3 px-4 font-bold">PLAYER</th>
                <th className="py-3 px-3 font-bold">ROLE</th>
                <th className="py-3 px-4 font-bold">WINNING TEAM</th>
                <th className="py-3 px-3 font-bold text-right">HAMMER PRICE</th>
                <th className="py-3 px-3 font-bold text-right">PENALTY ₹</th>
                {role === 'admin' && (
                  <th className="py-3 px-4 font-bold text-center">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 7 : 6} className="text-center py-12 text-slate-400">
                    No auction transactions logged yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const roleName = tx.role || (tx as any).playerRole || 'All-Rounder';
                  const roleStyle = getRoleBadgeStyle(roleName);
                  const dateStr = formatTransactionTime(tx.timestamp);
                  const hammerPrice = tx.soldPrice ?? (tx as any).points ?? (tx as any).amount ?? 0;
                  const penalty = tx.committeeCharge ?? (tx as any).committeeCash ?? 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {dateStr}
                      </td>

                      <td className="py-3 px-4 font-['Outfit'] font-bold text-slate-900">
                        {tx.playerName}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {roleName}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {tx.teamName}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPoints(hammerPrice)} pts
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        {penalty > 0 ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {formatINR(penalty)}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>

                      {role === 'admin' && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setRollbackPlayerId(tx.playerId)}
                            title="Rollback transaction and reopen player"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROLLBACK CONFIRMATION MODAL */}
      {rollbackPlayerId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-['Outfit'] font-black text-rose-600 text-lg">
              Rollback Auction Sale?
            </h3>
            <p className="text-xs text-slate-600">
              This will undo the sale, restore the team&apos;s purse and roster capacity, and return the player to the open auction pool.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRollbackPlayerId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRollbackConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
