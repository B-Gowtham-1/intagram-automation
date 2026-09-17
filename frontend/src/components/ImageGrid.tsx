import React, { useState } from 'react';
import type { ImageItem } from '../types';
import { ImageCard } from './ImageCard';
import { Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ImageGridProps {
  images: ImageItem[];
  onRemove: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onClearAll?: () => void;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  onRemove,
  onMove,
  onReorder,
  onClearAll,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  if (images.length === 0) {
    return null;
  }

  const validCount = images.filter((img) => img.isValid).length;
  const hasInvalid = images.some((img) => !img.isValid);
  const isCountValid = images.length >= 2 && images.length <= 10;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent or default drag image
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    onReorder(draggedIdx, targetIndex);
    setDraggedIdx(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Carousel Order ({images.length} of max 10)
          </h3>
          <span className="text-xs text-slate-500">
            &bull; Drag cards or use &uarr;&darr; buttons to reorder
          </span>
        </div>

        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-rose-400 transition"
          >
            Clear all images
          </button>
        )}
      </div>

      {/* Constraints Notices */}
      {!isCountValid && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {images.length < 2
              ? `Instagram Carousels require at least 2 images (currently ${images.length} selected).`
              : `Instagram Carousels support a maximum of 10 images (currently ${images.length} selected).`}
          </span>
        </div>
      )}

      {hasInvalid && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Some images have validation errors and cannot be published. Please remove or replace them.</span>
        </div>
      )}

      {isCountValid && !hasInvalid && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            {validCount} images validated and ready in specified carousel sequence.
          </span>
        </div>
      )}

      {/* Grid of Image Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img, idx) => (
          <ImageCard
            key={img.id}
            image={img}
            index={idx}
            total={images.length}
            onRemove={onRemove}
            onMove={onMove}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};
