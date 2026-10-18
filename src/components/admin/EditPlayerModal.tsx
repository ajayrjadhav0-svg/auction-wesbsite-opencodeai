import React, { useState, useEffect, useRef } from 'react';
import {
  Edit2,
  X,
  Camera,
  Crop,
  Upload,
  Trash2,
  Sparkles,
  Check,
  Shield,
  MapPin,
  Coins,
} from 'lucide-react';
import { Player, PlayerRole, PlayerStatus } from '../../types';
import { useAuction } from '../../context/AuctionContext';
import { compressImageFile } from '../../utils/imageUtils';
import { ImageCropModal } from '../ImageCropModal';
import { PRESET_PLAYER_AVATARS } from '../../data/presetAvatars';

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onSuccess?: () => void;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  isOpen,
  onClose,
  player,
  onSuccess,
}) => {
  const { state, updatePlayer, showNotification } = useAuction();
  const teams = state?.teams || [];

  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('All-Rounder');
  const [order, setOrder] = useState<number>(1);
  const [srNo, setSrNo] = useState<number>(1);
  const [village, setVillage] = useState('');
  const [basePrice, setBasePrice] = useState<number>(500);
  const [status, setStatus] = useState<PlayerStatus>('AVAILABLE');
  const [soldToTeamId, setSoldToTeamId] = useState<string>('');
  const [soldPrice, setSoldPrice] = useState<number>(0);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropTargetImage, setCropTargetImage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or player changes
  useEffect(() => {
    if (player && isOpen) {
      setName(player.name || '');
      setRole(player.role || 'All-Rounder');
      setOrder(player.auctionOrder || player.id || 1);
      setSrNo(player.srNo || player.auctionOrder || player.id || 1);
      setVillage(player.village || '');
      setBasePrice(player.basePrice || state?.settings?.defaultReservePrice || 500);
      setStatus(player.status || 'AVAILABLE');
      setSoldToTeamId(player.soldToTeamId || '');
      setSoldPrice(player.soldPrice || 0);
      setPhotoUrl(player.photoUrl || player.photo || '');
    }
  }, [player, isOpen, state?.settings?.defaultReservePrice]);

  if (!isOpen || !player) return null;

  // Handle Photo File Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPhoto(true);
    try {
      const dataUrl = await compressImageFile(file, 450, 450, 0.85);
      setPhotoUrl(dataUrl);
      // Automatically prompt crop studio for precise framing
      setCropTargetImage(dataUrl);
      setIsCropModalOpen(true);
      showNotification('success', 'Photo loaded! Adjust crop framing below.');
    } catch {
      showNotification('error', 'Failed to process image file.');
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('error', 'Player name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<Player> = {
        name: name.trim().toUpperCase(),
        role,
        auctionOrder: Number(order) || 1,
        srNo: Number(srNo) || Number(order) || 1,
        village: village.trim().toUpperCase(),
        basePrice: Number(basePrice) || 500,
        status,
        soldToTeamId: status === 'SOLD' ? (soldToTeamId || null) : null,
        soldPrice: status === 'SOLD' ? Number(soldPrice) : 0,
        photoUrl: photoUrl.trim() || undefined,
        photo: photoUrl.trim() || undefined,
      };

      const success = await updatePlayer(player.id, updates);
      if (success) {
        showNotification('success', `Player ${updates.name} updated successfully!`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in overflow-y-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 sm:p-7 space-y-5 my-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">
                  ADMINISTRATIVE PLAYER EDITOR
                </span>
                <h3 className="font-['Outfit'] font-black text-slate-900 text-lg sm:text-xl">
                  Edit Player: {player.name} ({player.code})
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Player Photo & Crop Studio Section */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Player Photo & Crop Studio</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Optimized for Big Screen Projector
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="edit-modal-photo-upload"
              />

              {photoUrl ? (
                <div className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="relative group shrink-0">
                    <img
                      src={photoUrl}
                      alt="Current"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-sm bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCropTargetImage(photoUrl);
                        setIsCropModalOpen(true);
                      }}
                      className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-[10px] font-bold"
                    >
                      <Crop className="w-4 h-4 mb-0.5" />
                      <span>Crop</span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Photo Loaded & Ready</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Use the crop tool to center face, zoom, or rotate for projector clarity.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {/* Direct Crop Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setCropTargetImage(photoUrl);
                          setIsCropModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Crop & Adjust Photo</span>
                      </button>

                      <label
                        htmlFor="edit-modal-photo-upload"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Change Photo
                      </label>

                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label
                    htmlFor="edit-modal-photo-upload"
                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 rounded-2xl cursor-pointer text-slate-600 transition-all text-center group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-['Outfit'] font-bold text-xs text-slate-800 block">
                        {isCompressingPhoto ? 'Processing photo...' : 'Click to Upload Player Photo or Take Selfie'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        JPG, PNG, WebP (auto-opens Crop Studio for perfect framing)
                      </span>
                    </div>
                  </label>

                  {/* Preset Avatars Row */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase">
                      Or Preset:
                    </span>
                    {PRESET_PLAYER_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(av.dataUri);
                          setCropTargetImage(av.dataUri);
                        }}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-500 shrink-0 shadow-2xs hover:scale-110 transition-transform"
                        title={av.label}
                      >
                        <img src={av.dataUri} alt={av.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field 1: Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Player Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="e.g. VIRAT SHARMA"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-['Outfit'] font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
              />
            </div>

            {/* Field 2 & 3: Role & Sequence */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                  Playing Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PlayerRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket-Keeper">Wicket-Keeper</option>
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
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                  Token SR No
                </label>
                <input
                  type="number"
                  min="1"
                  value={srNo}
                  onChange={(e) => setSrNo(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Field 4 & 5: Village & Base Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                  Village / Hometown
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value.toUpperCase())}
                  placeholder="e.g. PIMPLI, SHIRUR, SATARA"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                  Reserve / Base Price (pts)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Field 6: Auction Status & Allocation */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Auction Status & Allocation
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['AVAILABLE', 'SOLD', 'UNSOLD'] as PlayerStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-2 rounded-xl font-['Outfit'] font-bold text-xs border transition-all ${
                      status === st
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

              {status === 'SOLD' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-slate-600 font-bold text-[10px] uppercase mb-1">
                      Assigned Franchise Team
                    </label>
                    <select
                      value={soldToTeamId}
                      onChange={(e) => setSoldToTeamId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose Team --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.shortCode || t.short})
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
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-['Outfit'] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Changes...' : 'Save Player Record'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Crop Studio */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropTargetImage || photoUrl}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={(croppedDataUrl) => {
          setPhotoUrl(croppedDataUrl);
          setIsCropModalOpen(false);
          showNotification('success', 'Photo cropped and framed successfully!');
        }}
        title={`Crop & Frame Photo - ${name || player.name}`}
      />
    </>
  );
};
