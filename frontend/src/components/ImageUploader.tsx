import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { ImageItem } from '../types';
import { processSelectedFile } from '../utils/image';

interface ImageUploaderProps {
  onImagesAdded: (items: ImageItem[]) => void;
  disabled?: boolean;
  currentCount: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesAdded,
  disabled = false,
  currentCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    const files = Array.from(fileList);
    const results: ImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const item = await processSelectedFile(files[i], currentCount + i);
      results.push(item);
    }

    onImagesAdded(results);
    setIsProcessing(false);

    // Reset input value so re-selecting same files triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isProcessing) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => {
        if (!disabled && !isProcessing) {
          fileInputRef.current?.click();
        }
      }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer backdrop-blur ${
        isDragging
          ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10 scale-[1.01]'
          : 'border-slate-800 hover:border-pink-500/50 bg-slate-900/40 hover:bg-slate-900/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        disabled={disabled || isProcessing}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
        <div
          className={`p-3 rounded-full ring-1 transition ${
            isDragging
              ? 'bg-pink-500/20 text-pink-300 ring-pink-500/40'
              : 'bg-pink-500/10 text-pink-400 ring-pink-500/20'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-200">
            {isProcessing ? (
              'Analyzing images...'
            ) : isDragging ? (
              <span className="text-pink-400 font-bold">Drop images now!</span>
            ) : (
              <>
                Drag &amp; drop images here, or{' '}
                <span className="text-pink-400 underline decoration-pink-500/40 underline-offset-4">
                  select files
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supports JPG, PNG, WEBP, HEIC &bull; Target Instagram Carousel format: 9:16 (1080 &times; 1920)
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || isProcessing}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <ImageIcon className="w-4 h-4 text-pink-400" />
          [ Select Images ]
        </button>
      </div>
    </div>
  );
};
