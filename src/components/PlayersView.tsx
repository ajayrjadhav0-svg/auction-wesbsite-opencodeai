import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Gavel,
  CheckCircle,
  Filter,
  Download,
  Shield,
  Eye,
  Share2,
  Camera,
  Upload,
  Sparkles,
  Crop,
  AlertTriangle,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { Player, PlayerRole, PlayerStatus, ActiveNav } from '../types';
import {
  formatPoints,
  getRoleBadgeStyle,
  getStatusBadgeStyle,
} from '../utils/formatters';
import { PlayerAvatar } from './PlayerAvatar';
import { EditPlayerModal } from './admin/EditPlayerModal';
import { ImageCropModal } from './ImageCropModal';
import { AuctionExportModal } from './AuctionExportModal';
import { compressImageFile } from '../utils/imageUtils';
import { PRESET_PLAYER_AVATARS, getDefaultAvatarForRole } from '../data/presetAvatars';

interface PlayersViewProps {
  onNavigateToAuction?: (playerId?: number) => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({
  onNavigateToAuction,
}) => {
  const {
    state,
    role,
    addPlayer,
    updatePlayer,
    deletePlayer,
    reopenPlayer,
    navigatePlayer,
    showNotification,
  } = useAuction();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
  const [confirmEditPlayer, setConfirmEditPlayer] = useState<Player | null>(null);
  const [rowCropPlayer, setRowCropPlayer] = useState<Player | null>(null);

  const getTeamName = (teamId?: string | null) =>
    state?.teams.find((t) => t.id === teamId)?.name || '';

  // Photo Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageTarget, setCropImageTarget] = useState('');

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<PlayerRole>('All-Rounder');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formVillage, setFormVillage] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formStatus, setFormStatus] = useState<PlayerStatus>('AVAILABLE');
  const [formSoldToTeamId, setFormSoldToTeamId] = useState<string>('');
  const [formSoldPrice, setFormSoldPrice] = useState<number>(0);
  const [isCompressingModalPhoto, setIsCompressingModalPhoto] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const players = state?.players || [];
  const teams = state?.teams || [];
  const settings = state?.settings;

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [players, searchTerm, roleFilter, statusFilter]);

  if (!state || !settings) {
    return <div className="p-8 text-slate-400">Loading players database...</div>;
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormName('');
    setFormRole('All-Rounder');
    setFormOrder(players.length + 1);
    setFormVillage('');
    setFormPhotoUrl('');
    setFormStatus('AVAILABLE');
    setFormSoldToTeamId('');
    setFormSoldPrice(0);
    setIsAddModalOpen(true);
  };

  // Modal Photo File Change
  const handleModalPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingModalPhoto(true);
    try {
      const compressed = await compressImageFile(file, 500, 500, 0.88);
      setFormPhotoUrl(compressed);
      setCropImageTarget(compressed);
      setIsCropModalOpen(true);
    } catch {
      // Fallback
    } finally {
      setIsCompressingModalPhoto(false);
    }
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const ok = await addPlayer({
      name: formName.trim().toUpperCase(),
      role: formRole,
      auctionOrder: Number(formOrder),
      village: formVillage.trim().toUpperCase(),
      photoUrl: formPhotoUrl.trim() || undefined,
      photo: formPhotoUrl.trim() || undefined,
      status: formStatus,
      soldToTeamId: formStatus === 'SOLD' ? (formSoldToTeamId || null) : null,
      soldPrice: formStatus === 'SOLD' ? Number(formSoldPrice) || 0 : 0,
    });
    if (ok) setIsAddModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEditModal = (player: Player) => {
    setEditingPlayer(player);
    setFormName(player.name);
    setFormRole(player.role);
    setFormOrder(player.auctionOrder);
    setFormVillage(player.village || '');
    setFormPhotoUrl(player.photoUrl || player.photo || '');
    setFormStatus(player.status || 'AVAILABLE');
    setFormSoldToTeamId(player.soldToTeamId || '');
    setFormSoldPrice(player.soldPrice || 0);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    const ok = await updatePlayer(editingPlayer.id, {
      name: formName.trim().toUpperCase(),
      role: formRole,
      auctionOrder: Number(formOrder),
      village: formVillage.trim().toUpperCase(),
      photoUrl: formPhotoUrl.trim() || undefined,
      photo: formPhotoUrl.trim() || undefined,
      status: formStatus,
      soldToTeamId: formStatus === 'SOLD' ? (formSoldToTeamId || null) : null,
      soldPrice: formStatus === 'SOLD' ? Number(formSoldPrice) || 0 : 0,
    });
    if (ok) setEditingPlayer(null);
  };

  // Submit Delete
  const handleDeleteConfirm = async () => {
    if (!deletingPlayer) return;
    const ok = await deletePlayer(deletingPlayer.id);
    if (ok) setDeletingPlayer(null);
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <h2 className="font-['Outfit'] font-black text-lg md:text-xl text-slate-900 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>PLAYER DATABASE ({players.length} TOTAL)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered roster for {settings.tournamentName}. Filter by role or status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExportModalOpen(true)}
            id="btn-players-export-modal"
            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Print / Share</span>
          </button>

          <a
            href="/api/export/csv"
            download="players_roster.csv"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-700" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          {role === 'admin' && (
            <button
              id="btn-add-player-modal"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ADD PLAYER</span>
            </button>
          )}
        </div>
      </div>

      <AuctionExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shadow-2xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        >
          <option value="ALL">All Roles / Disciplines</option>
          <option value="Batsman">Batsman</option>
          <option value="Bowler">Bowler</option>
          <option value="All-Rounder">All-Rounder</option>
          <option value="Wicketkeeper">Wicketkeeper</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        >
          <option value="ALL">All Auction Statuses</option>
          <option value="AVAILABLE">AVAILABLE (In Pool)</option>
          <option value="SOLD">SOLD</option>
          <option value="UNSOLD">UNSOLD</option>
        </select>
      </div>

      {/* Players Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-['Outfit'] uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-bold"># ORDER</th>
                <th className="py-3.5 px-4 font-bold">CODE</th>
                <th className="py-3.5 px-4 font-bold">NAME</th>
                <th className="py-3.5 px-3 font-bold">ROLE</th>
                <th className="py-3.5 px-3 font-bold text-center">STATUS</th>
                <th className="py-3.5 px-3 font-bold">TEAM</th>
                <th className="py-3.5 px-4 font-bold text-right">SOLD PRICE</th>
                {role === 'admin' && (
                  <th className="py-3.5 px-4 font-bold text-center">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 8 : 7} className="text-center py-12 text-slate-400">
                    No players found matching current filter query.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const roleStyle = getRoleBadgeStyle(player.role);
                  const statusStyle = getStatusBadgeStyle(player.status);
                  const team = teams.find((t) => t.id === player.soldToTeamId);

                  return (
                    <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">
                        {player.auctionOrder}
                      </td>

                      <td className="py-3 px-4 font-mono font-black text-indigo-600">
                        {player.code}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {(player.photoUrl || player.photo) ? (
                            <PlayerAvatar
                              src={player.photoUrl || player.photo}
                              name={player.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0 font-bold border border-indigo-100">
                              🏏
                            </div>
                          )}
                          <div>
                            <span className="font-['Outfit'] font-bold text-slate-900 block leading-tight">
                              {player.name}
                            </span>
                            {player.village && (
                              <span className="text-[10px] text-slate-400 block">
                                📍 {player.village}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {player.role}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {player.status}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {team ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                            <span className="font-semibold text-slate-800">{team.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {player.soldPrice > 0 ? (
                          <span>{formatPoints(player.soldPrice)} pts</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {role === 'admin' && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Put on hammer button */}
                            <button
                              onClick={() => {
                                navigatePlayer(undefined, player.id);
                                if (onNavigateToAuction) onNavigateToAuction(player.id);
                              }}
                              title="Send Player to Auction Stage Hammer"
                              className="p-2.5 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                            >
                              <Gavel className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>

                            {/* Crop / Edit Photo Button */}
                            <button
                              onClick={() => {
                                setRowCropPlayer(player);
                                setCropImageTarget(player.photoUrl || player.photo || '');
                                setIsCropModalOpen(true);
                              }}
                              title="Crop & Adjust Player Photo"
                              className="p-2.5 sm:p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                            >
                              <Crop className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>

                            {/* Reopen / undo button if sold/unsold */}
                            {player.status !== 'AVAILABLE' && (
                              <button
                                onClick={() => reopenPlayer(player.id)}
                                title="Reopen player for bidding"
                                className="p-2.5 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition-colors"
                              >
                                <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => {
                                if (player.status === 'SOLD') {
                                  setConfirmEditPlayer(player);
                                } else {
                                  handleOpenEditModal(player);
                                }
                              }}
                              title={
                                player.status === 'SOLD'
                                  ? 'Edit sold player (confirmation required)'
                                  : 'Edit details'
                              }
                              className="p-2.5 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeletingPlayer(player)}
                              title="Delete player"
                              className="p-2.5 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
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

      {/* ADD / EDIT PLAYER MODAL (Admin Only) */}
      {(isAddModalOpen || editingPlayer) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">
                  ADMINISTRATOR PORTAL
                </span>
                <h3 className="font-['Outfit'] font-black text-slate-900 text-lg sm:text-xl">
                  {editingPlayer ? `Edit Player: ${editingPlayer.name}` : 'Add New Player'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingPlayer(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <Trash2 className="w-4 h-4 hidden" />
                <span className="text-xl font-bold leading-none">&times;</span>
              </button>
            </div>

            <form
              onSubmit={editingPlayer ? handleEditSubmit : handleAddSubmit}
              className="space-y-4 text-xs"
            >
              {/* Full Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                  Player Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.toUpperCase())}
                  placeholder="e.g. VIRAT SHARMA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-['Outfit'] font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                />
              </div>

              {/* Playing Role & Sequence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                    Playing Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as PlayerRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                    Queue Sequence (#)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Village / Hometown */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                  Village / Hometown
                </label>
                <input
                  type="text"
                  value={formVillage}
                  onChange={(e) => setFormVillage(e.target.value.toUpperCase())}
                  placeholder="e.g. PIMPLI, SHIRUR, SATARA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                />
              </div>

              {/* Auction Status Controls (Admin) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Auction Status & Allocation
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['AVAILABLE', 'SOLD', 'UNSOLD'] as PlayerStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 px-2 rounded-xl font-['Outfit'] font-bold text-xs border transition-all ${
                        formStatus === st
                          ? st === 'SOLD'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'UNSOLD'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {formStatus === 'SOLD' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-slate-600 font-bold text-[10px] uppercase mb-1">
                        Assigned Franchise Team
                      </label>
                      <select
                        value={formSoldToTeamId}
                        onChange={(e) => setFormSoldToTeamId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Team --</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.short})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold text-[10px] uppercase mb-1">
                        Sold Price (Points)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={formSoldPrice}
                        onChange={(e) => setFormSoldPrice(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Photo & Crop Section */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  Player Photo & Crop Studio
                </label>
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleModalPhotoChange}
                  className="hidden"
                  id="modal-player-photo"
                />

                {formPhotoUrl ? (
                  <div className="flex items-center gap-3.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <img
                      src={formPhotoUrl}
                      alt="Player Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-xs shrink-0 bg-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Photo Ready
                      </span>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        High-resolution badge ready for live projector
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* Crop / Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setCropImageTarget(formPhotoUrl);
                            setIsCropModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Crop className="w-3 h-3" />
                          <span>Crop & Adjust</span>
                        </button>

                        <label
                          htmlFor="modal-player-photo"
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors"
                        >
                          Upload New
                        </label>

                        <button
                          type="button"
                          onClick={() => setFormPhotoUrl('')}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label
                      htmlFor="modal-player-photo"
                      className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl cursor-pointer text-slate-600 transition-colors"
                    >
                      <Camera className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-xs">
                        {isCompressingModalPhoto ? 'Compressing photo...' : 'Click to Upload Player Photo'}
                      </span>
                    </label>

                    {/* Quick Preset Avatars Picker */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase">
                        Or Pick Avatar:
                      </span>
                      {PRESET_PLAYER_AVATARS.slice(0, 6).map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            setFormPhotoUrl(av.dataUri);
                          }}
                          className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-500 shrink-0 shadow-2xs hover:scale-110 transition-transform"
                          title={av.label}
                        >
                          <img src={av.dataUri} alt={av.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>

                    <input
                      type="url"
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingPlayer(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  {editingPlayer ? 'Update Player Record' : 'Save New Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE CROP MODAL */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageTarget || formPhotoUrl}
        onClose={() => {
          setIsCropModalOpen(false);
          setRowCropPlayer(null);
        }}
        onCropComplete={async (croppedDataUrl) => {
          if (rowCropPlayer) {
            await updatePlayer(rowCropPlayer.id, {
              photoUrl: croppedDataUrl,
              photo: croppedDataUrl,
            });
            showNotification('success', `Photo cropped & updated for ${rowCropPlayer.name}!`);
            setRowCropPlayer(null);
          }
          setFormPhotoUrl(croppedDataUrl);
          setIsCropModalOpen(false);
        }}
        title={rowCropPlayer ? `Crop Photo - ${rowCropPlayer.name}` : 'Crop & Center Player Photo'}
      />

      {/* EDIT SOLD PLAYER CONFIRMATION MODAL */}
      {confirmEditPlayer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-['Outfit'] font-black text-amber-600 text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Edit Sold Player?
            </h3>
            <p className="text-xs text-slate-600">
              <strong className="text-slate-900">{confirmEditPlayer.name}</strong> has already been
              SOLD
              {getTeamName(confirmEditPlayer.soldToTeamId)
                ? ` to ${getTeamName(confirmEditPlayer.soldToTeamId)}`
                : ''}
              . Changing this player's data can change the team's purse and auction results.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEditPlayer(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenEditModal(confirmEditPlayer);
                  setConfirmEditPlayer(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
              >
                Continue to Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPlayer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-['Outfit'] font-black text-rose-600 text-lg">
              Delete Player?
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently remove{' '}
              <strong className="text-slate-900">{deletingPlayer.name}</strong> ({deletingPlayer.code})?
            </p>
            {deletingPlayer.status === 'SOLD' && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                Warning: this player is already SOLD
                {getTeamName(deletingPlayer.soldToTeamId) ? ` to ${getTeamName(deletingPlayer.soldToTeamId)}` : ''}.
                Deleting will also remove the sale record and change the team's purse.
              </p>
            )}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPlayer(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
