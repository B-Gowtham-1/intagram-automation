import React from 'react';
import type { ImageItem } from '../types';

interface CarouselPreviewProps {
  images: ImageItem[];
  caption: string;
  hashtags: string;
}

export const CarouselPreview: React.FC<CarouselPreviewProps> = ({
  images,
  caption,
  hashtags,
}) => {
  if (images.length === 0 && !caption && !hashtags) {
    return null;
  }

  const finalCaption = [caption.trim(), hashtags.trim()].filter(Boolean).join('\n\n');

  return (
    <div className="bg-[#0d0f15] border border-[#1e2433] rounded p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
          CAROUSEL PREVIEW TELEMETRY
        </h3>
        <span className="text-[10px] font-mono text-yellow-400">
          {images.length} SLIDES LOADED
        </span>
      </div>
      
      {images.length > 0 ? (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="flex-shrink-0 w-24 aspect-[9/16] rounded overflow-hidden border border-[#1e2433] relative bg-[#050608]"
            >
              <img
                src={img.previewUrl}
                alt={img.filename}
                className="w-full h-full object-cover"
              />
              {img.mediaType === 'VIDEO' && (
                <div className="absolute top-1 left-1 bg-purple-900/90 border border-purple-500/50 text-[9px] font-bold font-mono px-1 rounded text-purple-200 flex items-center gap-0.5">
                  ▶ {img.duration ? `${Math.round(img.duration)}s` : 'VID'}
                </div>
              )}
              <span className="absolute bottom-1 right-1 bg-black/85 text-[10px] px-1 rounded text-yellow-400 font-mono border border-yellow-400/30">
                #{String(idx + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic font-mono">// No media slides ingested yet.</p>
      )}

      {finalCaption && (
        <div className="bg-[#050608] p-3.5 rounded border border-[#1e2433] text-xs text-gray-300 whitespace-pre-wrap font-inter leading-relaxed">
          {finalCaption}
        </div>
      )}
    </div>
  );
};
