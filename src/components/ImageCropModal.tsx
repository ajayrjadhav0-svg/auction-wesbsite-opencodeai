import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Move,
  Upload,
  Camera,
} from 'lucide-react';
import { PRESET_PLAYER_AVATARS } from '../data/presetAvatars';
import { compressImageFile } from '../utils/imageUtils';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  title?: string;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  title = 'Crop & Adjust Player Photo',
}) => {
  const [activeImageSrc, setActiveImageSrc] = useState<string>(imageSrc || '');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspectShape, setAspectShape] = useState<'square' | 'circle'>('circle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset controls whenever modal opens or imageSrc changes
  useEffect(() => {
    if (isOpen) {
      setActiveImageSrc(imageSrc || (PRESET_PLAYER_AVATARS[0]?.dataUri ?? ''));
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Handle local file upload inside the crop studio
  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const dataUrl = await compressImageFile(file, 600, 600, 0.9);
      setActiveImageSrc(dataUrl);
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setPan({ x: 0, y: 0 });
    } catch (err) {
      console.error('Error uploading photo into crop studio', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Drag / Pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile / tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Execute Canvas Crop
  const handleApplyCrop = useCallback(() => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
      const outputSize = 450; // Output 450x450 high-res image
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      const img = imgRef.current;
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;

      // Fill white background for transparent images
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);

      // Translate to canvas center
      ctx.translate(outputSize / 2, outputSize / 2);

      // Apply rotation & flip
      ctx.rotate((rotation * Math.PI) / 180);
      if (flipH) {
        ctx.scale(-1, 1);
      }

      // Calculate scale mapping from display box (280px viewfinder) to output (450px)
      const viewfinderSize = 260;
      const displayScale = outputSize / viewfinderSize;

      // Base scaling to cover the frame
      const minDimension = Math.min(naturalW, naturalH);
      const baseScale = (outputSize / minDimension) * zoom;

      // Render image with pan offsets applied
      const drawW = naturalW * baseScale;
      const drawH = naturalH * baseScale;
      const offsetX = pan.x * displayScale;
      const offsetY = pan.y * displayScale;

      ctx.drawImage(img, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onCropComplete(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error('Failed to crop image', err);
    } finally {
      setIsProcessing(false);
    }
  }, [zoom, rotation, flipH, pan, onCropComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block">
                ADMIN PHOTO STUDIO
              </span>
              <h3 className="font-['Outfit'] font-extrabold text-base sm:text-lg text-white leading-tight">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="p-4 sm:p-6 bg-slate-900 flex flex-col items-center justify-center select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] rounded-3xl overflow-hidden bg-slate-950 border-4 border-indigo-500/80 shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            {/* Viewfinder Guide Overlay */}
            <div
              className={`absolute inset-0 pointer-events-none z-10 border-2 border-dashed border-white/60 transition-all ${
                aspectShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
              }`}
            />
            {/* Rule of thirds grid lines */}
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 opacity-25 border border-white/20">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* Target Image being manipulated */}
            <img
              ref={imgRef}
              src={activeImageSrc || undefined}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${
                  flipH ? -1 : 1
                })`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: 'none',
              }}
              className="w-auto h-[260px] object-cover pointer-events-none"
            />

            {/* Drag helper hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white/80 font-bold flex items-center gap-1.5 pointer-events-none">
              <Move className="w-3 h-3 text-indigo-400" />
              <span>Drag to center face</span>
            </div>
          </div>

          {/* Quick upload or change photo controls */}
          <div className="w-full max-w-sm mt-3 pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLocalUpload}
              className="hidden"
              id="crop-modal-upload-input"
            />
            <label
              htmlFor="crop-modal-upload-input"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-['Outfit'] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Upload className="w-3 h-3" />
              <span>{isUploading ? 'Loading...' : 'Upload New Photo'}</span>
            </label>

            {/* Preset avatars in crop modal */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">Avatar:</span>
              {PRESET_PLAYER_AVATARS.slice(0, 5).map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setActiveImageSrc(av.dataUri);
                    setZoom(1);
                    setRotation(0);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="w-6 h-6 rounded-md overflow-hidden border border-slate-700 hover:border-indigo-400 shrink-0 hover:scale-110 transition-transform"
                  title={av.label}
                >
                  <img src={av.dataUri} alt={av.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editing Controls Toolbar */}
        <div className="p-4 sm:p-5 bg-white space-y-4 text-xs">
          {/* Zoom Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>Zoom Scale: {Math.round(zoom * 100)}%</span>
              </span>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="text-[11px] text-slate-400 hover:text-indigo-600 underline font-semibold"
              >
                Reset Zoom
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.15))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, prev + 0.15))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Rotation & Aspect Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                title="Rotate 90 degrees CCW"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rotate Left</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                title="Rotate 90 degrees CW"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate Right</span>
              </button>
              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className={`p-1.5 rounded-xl border font-bold text-xs flex items-center transition-colors ${
                  flipH
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title="Mirror Horizontal"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAspectShape('circle')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  aspectShape === 'circle'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Circular
              </button>
              <button
                type="button"
                onClick={() => setAspectShape('square')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  aspectShape === 'square'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Square
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setFlipH(false);
                setPan({ x: 0, y: 0 });
              }}
              className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApplyCrop}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold font-['Outfit'] flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
