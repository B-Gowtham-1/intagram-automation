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
} from 'lucide-react';

interface ImageCardProps {
  image: ImageItem;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
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
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, index)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDrop={(e) => onDrop?.(e, index)}
      className={`relative group bg-slate-900 border rounded-xl overflow-hidden shadow-lg transition-all flex flex-col ${
        image.isValid
          ? 'border-slate-800 hover:border-slate-700 hover:shadow-slate-900/50'
          : 'border-rose-900/80 bg-rose-950/20'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="aspect-[9/16] w-full bg-slate-950 flex items-center justify-center overflow-hidden relative select-none">
        {image.isValid ? (
          <img
            src={image.previewUrl}
            alt={image.filename}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        ) : (
          <div className="p-4 text-center text-rose-400 flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <span className="text-xs font-semibold">Unreadable</span>
          </div>
        )}

        {/* Position / Order Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-white border border-slate-700 shadow">
          <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab active:cursor-grabbing" />
          <span>#{index + 1}</span>
        </div>

        {/* 9:16 Crop Badge */}
        {image.isValid && !image.isNineSixteen && (
          <div className="absolute bottom-2 right-2 bg-amber-500/90 backdrop-blur text-[10px] font-semibold text-slate-950 px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
            <Scissors className="w-3 h-3" />
            <span>Crop</span>
          </div>
        )}
      </div>

      {/* Metadata & Controls */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
        <div>
          <div className="truncate font-semibold text-slate-200 text-xs" title={image.filename}>
            {image.filename}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>{formatBytes(image.sizeBytes)}</span>
            {image.isValid && (
              <span className="font-mono text-slate-400">
                {image.width} &times; {image.height}
              </span>
            )}
          </div>
        </div>

        {/* Validation Status */}
        <div>
          {image.isValid ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Valid</span>
                <span className="text-slate-500 font-normal">({image.aspectRatio})</span>
              </div>
              {image.isNineSixteen ? (
                <div className="text-[10px] text-emerald-500/90 font-medium">
                  Perfect 9:16 aspect ratio
                </div>
              ) : (
                <div className="text-[10px] text-amber-400/90 font-medium">
                  Will center-crop to 9:16
                </div>
              )}
            </div>
          ) : (
            <div className="text-rose-400 text-[11px] leading-snug flex items-start gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{image.validationError || 'Unable to read image.'}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(index, 'up')}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition"
              title="Move Earlier in Carousel"
            >
              <MoveUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMove(index, 'down')}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition"
              title="Move Later in Carousel"
            >
              <MoveDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(image.id)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-rose-400 hover:bg-rose-500/10 text-[11px] font-medium transition"
            title="Remove image"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};
