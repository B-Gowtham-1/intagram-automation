import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { ImageItem } from '../types';
import { transformImageCanvas } from '../utils/image';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Check,
  X,
  Sliders,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Loader2,
  Volume2,
  VolumeX,
  Film,
} from 'lucide-react';

interface MediaEditorModalProps {
  image: ImageItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: ImageItem) => void;
}

export const MediaEditorModal: React.FC<MediaEditorModalProps> = ({
  image,
  isOpen,
  onClose,
  onSave,
}) => {
  const isVideo = image.mediaType === 'VIDEO';
  const [rotation, setRotation] = useState<number>(image.rotation || 0);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>(image.fitMode || 'cover');
  const [alignment, setAlignment] = useState<'center' | 'top' | 'bottom' | 'left' | 'right'>(
    image.alignment || 'center'
  );
  const [isMuted, setIsMuted] = useState<boolean>(image.isMuted ?? false);
  const [isApplying, setIsApplying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoSrc = useMemo(() => {
    if (isVideo && image.file) {
      return URL.createObjectURL(image.file);
    }
    return '';
  }, [isVideo, image.file]);

  useEffect(() => {
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  if (!isOpen) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      if (isVideo) {
        // Capture frame from video element to update card poster preview
        let newPreview = image.previewUrl;
        if (videoRef.current) {
          try {
            const v = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1920;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((rotation * Math.PI) / 180);

              const isRotated = rotation % 180 !== 0;
              const effW = isRotated ? v.videoHeight || 1080 : v.videoWidth || 1920;
              const effH = isRotated ? v.videoWidth || 1920 : v.videoHeight || 1080;

              let scale = 1;
              if (fitMode === 'cover') {
                scale = Math.max(canvas.width / effW, canvas.height / effH);
              } else {
                scale = Math.min(canvas.width / effW, canvas.height / effH);
              }

              const drawW = (v.videoWidth || 1080) * scale;
              const drawH = (v.videoHeight || 1920) * scale;
              ctx.drawImage(v, -drawW / 2, -drawH / 2, drawW, drawH);
              ctx.restore();

              newPreview = canvas.toDataURL('image/jpeg', 0.85);
            }
          } catch {
            // Keep existing preview if canvas extraction is blocked
          }
        }

        onSave({
          ...image,
          previewUrl: newPreview,
          rotation,
          fitMode,
          alignment,
          isMuted,
          isNineSixteen: true,
        });
      } else {
        const { file: newFile, previewUrl: newPreview } = await transformImageCanvas(image.file, {
          rotation,
          fitMode,
          alignment,
        });

        onSave({
          ...image,
          file: newFile,
          previewUrl: newPreview,
          rotation,
          fitMode,
          alignment,
          isNineSixteen: true,
        });
      }
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  // Determine alignment options based on effective orientation
  const isRotatedSideways = rotation % 180 !== 0;
  const effW = isRotatedSideways ? image.height : image.width;
  const effH = isRotatedSideways ? image.width : image.height;
  const isWiderThanNineSixteen = effW / (effH || 1) > 9 / 16;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0d0f15] border border-[#1e2433] rounded w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col my-auto max-h-[95vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#1e2433] flex items-center justify-between bg-[#080a0f]">
          <div className="flex items-center gap-2">
            {isVideo ? (
              <Film className="w-4 h-4 text-purple-400" />
            ) : (
              <Sliders className="w-4 h-4 text-yellow-400" />
            )}
            <h3 className="text-xs sm:text-sm font-bold text-gray-100 font-orbitron uppercase tracking-wider">
              EDIT {isVideo ? 'VIDEO' : 'SLIDE'} #{String(image.orderIndex + 1).padStart(2, '0')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-yellow-400 hover:bg-[#161a24] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Preview Canvas */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col items-center justify-center space-y-4 overflow-y-auto">
          {/* 9:16 Canvas Box */}
          <div className="w-48 sm:w-52 aspect-[9/16] bg-[#050608] rounded overflow-hidden relative border border-[#1e2433] shadow-inner flex items-center justify-center">
            {isVideo ? (
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                playsInline
                loop
                autoPlay
                muted={isMuted}
                className={`w-full h-full transition-transform duration-200 ${
                  fitMode === 'contain'
                    ? 'object-contain'
                    : alignment === 'top' || alignment === 'left'
                    ? 'object-cover object-top'
                    : alignment === 'bottom' || alignment === 'right'
                    ? 'object-cover object-bottom'
                    : 'object-cover object-center'
                }`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              />
            ) : fitMode === 'contain' ? (
              <img
                src={image.previewUrl}
                alt="preview"
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              />
            ) : (
              <img
                src={image.previewUrl}
                alt="preview"
                className={`w-full h-full object-cover transition-transform duration-200 ${
                  alignment === 'top' || alignment === 'left'
                    ? 'object-top'
                    : alignment === 'bottom' || alignment === 'right'
                    ? 'object-bottom'
                    : 'object-center'
                }`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              />
            )}

            {/* 9:16 Guides & Badges */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/85 text-[10px] font-mono text-yellow-400 border border-yellow-400/30 backdrop-blur pointer-events-none">
              9:16 PREVIEW
            </div>
            {rotation > 0 && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-yellow-400 text-black text-[10px] font-mono font-bold backdrop-blur pointer-events-none">
                {rotation}°
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="w-full space-y-3 bg-[#080a0f] p-3.5 rounded border border-[#1e2433]">
            {/* Rotate Button & Mute Toggle */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-300 font-orbitron uppercase">ORIENTATION</span>
              <div className="flex items-center gap-1.5">
                {isVideo && (
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold font-mono border transition active:scale-95 ${
                      isMuted
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-[#161a24] text-emerald-400 border-[#1e2433] hover:border-emerald-500/50'
                    }`}
                    title={isMuted ? 'Unmute video audio' : 'Mute video audio'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRotate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161a24] hover:bg-[#202636] text-xs font-bold font-mono text-yellow-400 border border-yellow-400/40 transition active:scale-95 touch-manipulation"
                >
                  <RotateCw className="w-3.5 h-3.5 text-yellow-400" />
                  <span>ROTATE 90° ({rotation}°)</span>
                </button>
              </div>
            </div>

            {/* Fit vs Fill Mode */}
            <div className="space-y-1.5 pt-2 border-t border-[#1e2433]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 font-orbitron uppercase">FRAMING SIZE</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {fitMode === 'cover' ? 'FILLS 9:16' : 'NO CROP'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`py-2 px-3 rounded text-xs font-bold font-mono border flex items-center justify-center gap-1.5 transition ${
                    fitMode === 'cover'
                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.15)]'
                      : 'border-[#1e2433] bg-[#0d0f15] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>COVER (FILL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`py-2 px-3 rounded text-xs font-bold font-mono border flex items-center justify-center gap-1.5 transition ${
                    fitMode === 'contain'
                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.15)]'
                      : 'border-[#1e2433] bg-[#0d0f15] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>CONTAIN (FIT)</span>
                </button>
              </div>
            </div>

            {/* Alignment Options (Only active in cover/crop mode) */}
            {fitMode === 'cover' && (
              <div className="space-y-1.5 pt-2 border-t border-[#1e2433]">
                <span className="text-xs font-bold text-gray-300 font-orbitron uppercase">
                  CROP ALIGNMENT ({isWiderThanNineSixteen ? 'HORIZONTAL' : 'VERTICAL'})
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {isWiderThanNineSixteen ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setAlignment('left')}
                        className={`py-1.5 px-2 rounded text-xs font-bold font-mono border text-center transition ${
                          alignment === 'left'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                            : 'border-[#1e2433] bg-[#0d0f15] text-gray-400'
                        }`}
                      >
                        LEFT
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment('center')}
                        className={`py-1.5 px-2 rounded text-xs font-bold font-mono border text-center transition ${
                          alignment === 'center'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                            : 'border-[#1e2433] bg-[#0d0f15] text-gray-400'
                        }`}
                      >
                        CENTER
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment('right')}
                        className={`py-1.5 px-2 rounded text-xs font-bold font-mono border text-center transition ${
                          alignment === 'right'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                            : 'border-[#1e2433] bg-[#0d0f15] text-gray-400'
                        }`}
                      >
                        RIGHT
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setAlignment('top')}
                        className={`py-1.5 px-2 rounded text-xs font-bold font-mono border flex items-center justify-center gap-1 transition ${
                          alignment === 'top'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                            : 'border-[#1e2433] bg-[#0d0f15] text-gray-400'
                        }`}
                      >
                        <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                        <span>TOP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment('center')}
                        className={`py-1.5 px-2 rounded text-xs font-bold font-mono border flex items-center justify-center gap-1 transition ${
                          alignment === 'center'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                            : 'border-[#1e2433] bg-[#0d0f15] text-gray-400'
                        }`}
                      >
                        <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                        <span>CENTER</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment('bottom')}
                        className={`py-1.5 px-2 rounded text-xs font-bold font-mono border flex items-center justify-center gap-1 transition ${
                          alignment === 'bottom'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                            : 'border-[#1e2433] bg-[#0d0f15] text-gray-400'
                        }`}
                      >
                        <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
                        <span>BOTTOM</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1e2433] bg-[#080a0f] flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isApplying}
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-bold font-mono text-gray-400 hover:text-white hover:bg-[#161a24] transition border border-[#1e2433]"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={handleApply}
            className="px-5 py-2 rounded bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-extrabold font-orbitron tracking-wider flex items-center gap-1.5 transition disabled:opacity-50 shadow-[0_0_15px_rgba(250,204,21,0.25)]"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>SAVE SLIDE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
