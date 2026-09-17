import React from 'react';
import type { ImageItem } from '../types';
import { formatBytes } from '../utils/image';
import {
  Trash2,
  MoveUp,
  MoveDown,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Scissors,
  Sliders,
  Play,
  Film,
} from 'lucide-react';

interface ImageCardProps {
  image: ImageItem;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onEdit?: (image: ImageItem) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  index,
  total,
  onRemove,
  onMove,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const isVideo = image.mediaType === 'VIDEO';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, index)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDrop={(e) => onDrop?.(e, index)}
      className={`relative group bg-[#0d0f15] border rounded overflow-hidden shadow-lg transition-all flex flex-col ${
        image.isValid
          ? 'border-[#1e2433] hover:border-yellow-400/50 hover:shadow-[0_0_15px_rgba(250,204,21,0.12)]'
          : 'border-rose-900/80 bg-rose-950/20'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="aspect-[9/16] w-full bg-[#050608] flex items-center justify-center overflow-hidden relative select-none">
        {image.isValid ? (
          <>
            <img
              src={image.previewUrl}
              alt={image.filename}
              className="object-cover w-full h-full"
              loading="lazy"
            />
            {isVideo && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded bg-black/80 border border-yellow-400/60 text-yellow-400 flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <Play className="w-4 h-4 fill-yellow-400 translate-x-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 text-center text-rose-400 flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <span className="text-xs font-semibold font-mono">NODE_ERROR</span>
          </div>
        )}

        {/* Position / Order Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#080a0f]/90 backdrop-blur text-xs font-mono font-bold px-2 py-1 rounded text-yellow-400 border border-yellow-400/40 shadow">
          <GripVertical className="w-3.5 h-3.5 text-gray-400 cursor-grab active:cursor-grabbing" />
          <span>#{String(index + 1).padStart(2, '0')}</span>
        </div>

        {/* Video / Type Badge */}
        {isVideo ? (
          <div className="absolute top-2 right-2 bg-[#12151f]/95 border border-purple-500/50 backdrop-blur text-[10px] font-mono font-bold text-purple-300 px-2 py-0.5 rounded flex items-center gap-1 shadow">
            <Film className="w-3 h-3 text-purple-400" />
            <span>VIDEO</span>
            {image.duration ? (
              <span className="font-mono ml-0.5 text-yellow-400">{Math.round(image.duration)}s</span>
            ) : null}
            {image.rotation ? (
              <span className="font-mono bg-black/50 px-1 rounded text-yellow-400">{image.rotation}°</span>
            ) : null}
          </div>
        ) : (
          /* Active rotation tag */
          image.rotation ? (
            <div className="absolute top-2 right-2 bg-yellow-400 text-black font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shadow">
              {image.rotation}°
            </div>
          ) : null
        )}

        {/* 9:16 Crop Badge */}
        {image.isValid && !image.isNineSixteen && (
          <div className="absolute bottom-2 right-2 bg-yellow-400/90 backdrop-blur text-[10px] font-mono font-bold text-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
            <Scissors className="w-3 h-3" />
            <span>9:16 CROP</span>
          </div>
        )}

        {/* Fit mode badge */}
        {image.fitMode === 'contain' && (
          <div className="absolute bottom-2 left-2 bg-cyan-400 text-black font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shadow">
            FIT
          </div>
        )}
      </div>

      {/* Metadata & Controls */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
        <div>
          <div className="truncate font-semibold text-gray-200 text-xs font-mono" title={image.filename}>
            {image.filename}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-between font-mono">
            <span>{formatBytes(image.sizeBytes)}</span>
            {image.isValid && (
              <span className="text-yellow-400/80">
                {image.width} &times; {image.height}
              </span>
            )}
          </div>
        </div>

        {/* Validation Status */}
        <div>
          {image.isValid ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>VALID {isVideo ? 'VIDEO' : 'IMAGE'}</span>
                <span className="text-gray-500">({image.aspectRatio})</span>
              </div>
              {isVideo ? (
                <div className="text-[10px] text-purple-400 font-mono">
                  &gt; INSTAGRAM_STREAM_READY
                </div>
              ) : image.isNineSixteen ? (
                <div className="text-[10px] text-emerald-400/80 font-mono">
                  &gt; {image.fitMode === 'contain' ? 'FITTED_BARS' : 'PERFECT_9:16'}
                </div>
              ) : (
                <div className="text-[10px] text-yellow-400/80 font-mono">
                  &gt; AUTO_CENTER_CROP
                </div>
              )}
            </div>
          ) : (
            <div className="text-rose-400 text-[11px] leading-snug flex items-start gap-1 font-mono">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{image.validationError || 'UNREADABLE_NODE'}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#1e2433] flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(index, 'up')}
              className="p-1.5 rounded bg-[#161a24] text-gray-300 hover:text-yellow-400 hover:bg-[#1e2433] disabled:opacity-25 disabled:cursor-not-allowed transition touch-manipulation"
              title="Move Earlier in Carousel"
            >
              <MoveUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMove(index, 'down')}
              className="p-1.5 rounded bg-[#161a24] text-gray-300 hover:text-yellow-400 hover:bg-[#1e2433] disabled:opacity-25 disabled:cursor-not-allowed transition touch-manipulation"
              title="Move Later in Carousel"
            >
              <MoveDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {onEdit && image.isValid && (
              <button
                type="button"
                onClick={() => onEdit(image)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#161a24] hover:bg-yellow-400 hover:text-black text-yellow-400 text-[11px] font-bold border border-yellow-400/40 transition active:scale-95 touch-manipulation font-mono tracking-wider"
                title="Edit rotation, fit, and crop alignment"
              >
                <Sliders className="w-3 h-3" />
                <span>EDIT</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRemove(image.id)}
              className="p-1.5 rounded text-rose-400 hover:bg-rose-500/20 transition touch-manipulation"
              title="Remove slide"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
