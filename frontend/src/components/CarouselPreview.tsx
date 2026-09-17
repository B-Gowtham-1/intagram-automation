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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200">Carousel Preview</h3>
      
      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="flex-shrink-0 w-24 aspect-[9/16] rounded-lg overflow-hidden border border-slate-800 relative bg-slate-950"
            >
              <img
                src={img.previewUrl}
                alt={img.filename}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] px-1 rounded text-white">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No images selected yet.</p>
      )}

      {finalCaption && (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300 whitespace-pre-wrap font-sans">
          {finalCaption}
        </div>
      )}
    </div>
  );
};
