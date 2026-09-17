import React, { useState } from 'react';
import type { ImageItem } from '../types';
import { ImageCard } from './ImageCard';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ImageGridProps {
  images: ImageItem[];
  onRemove: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onEdit?: (image: ImageItem) => void;
  onClearAll?: () => void;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  onRemove,
  onMove,
  onReorder,
  onEdit,
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2433] pb-3">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-yellow-400 font-bold text-xs">// 02.B</span>
          <h3 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
            CAROUSEL SEQUENCE ({images.length} / MAX 10 SLIDES)
          </h3>
          <span className="text-[11px] text-gray-400 hidden sm:inline font-mono">
            &bull; DRAG OR USE &uarr;&darr; TO ARRANGE
          </span>
        </div>

        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-gray-400 hover:text-rose-400 transition font-mono"
          >
            [CLEAR_ALL_SLIDES]
          </button>
        )}
      </div>

      {/* Constraints Notices */}
      {!isCountValid && (
        <div className="p-3 rounded bg-yellow-400/10 border border-yellow-400/30 text-xs text-yellow-400 flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {images.length < 2
              ? `// PIPELINE WARNING: Instagram requires at least 2 slides (currently ${images.length} selected).`
              : `// PIPELINE WARNING: Instagram supports max 10 slides (currently ${images.length} selected).`}
          </span>
        </div>
      )}

      {hasInvalid && (
        <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>// CORRUPT NODE DETECTED: Remove or replace invalid slides before deployment.</span>
        </div>
      )}

      {isCountValid && !hasInvalid && (
        <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            // SEQUENCE_VERIFIED: {validCount} slides validated and queued for execution.
          </span>
        </div>
      )}

      {/* Grid of Image Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {images.map((img, idx) => (
          <ImageCard
            key={img.id}
            image={img}
            index={idx}
            total={images.length}
            onRemove={onRemove}
            onMove={onMove}
            onEdit={onEdit}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};
