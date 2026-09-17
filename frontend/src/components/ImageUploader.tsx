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
      className={`border-2 border-dashed rounded p-8 text-center transition-all cursor-pointer backdrop-blur ${
        isDragging
          ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_25px_rgba(250,204,21,0.25)] scale-[1.01]'
          : 'border-[#1e2433] hover:border-yellow-400/60 bg-[#0d0f15] hover:bg-[#11141c]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
        className="hidden"
        disabled={disabled || isProcessing}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
        <div
          className={`p-3 rounded border transition ${
            isDragging
              ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
              : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-gray-200 uppercase tracking-wide font-orbitron">
            {isProcessing ? (
              'ANALYZING MEDIA PIPELINE...'
            ) : isDragging ? (
              <span className="text-yellow-400">DROP MEDIA ASSETS NOW</span>
            ) : (
              <>
                DRAG &amp; DROP PHOTOS &amp; VIDEOS, OR{' '}
                <span className="text-yellow-400 underline decoration-yellow-400/60 underline-offset-4">
                  BROWSE FILES
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-mono">
            JPG, PNG, WEBP, MP4, MOV, WEBM &bull; AUTO 9:16 CROP &bull; MAX 50MB
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || isProcessing}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded bg-[#161a24] hover:bg-[#1f2533] text-yellow-400 border border-yellow-400/40 transition shadow-sm font-mono tracking-wider"
        >
          <ImageIcon className="w-4 h-4 text-yellow-400" />
          <span>SELECT ASSETS</span>
        </button>
      </div>
    </div>
  );
};
