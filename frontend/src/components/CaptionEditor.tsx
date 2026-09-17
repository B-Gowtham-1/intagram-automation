import React from 'react';

interface CaptionEditorProps {
  caption: string;
  hashtags: string;
  onCaptionChange: (val: string) => void;
  onHashtagsChange: (val: string) => void;
  disabled?: boolean;
}

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
  caption,
  hashtags,
  onCaptionChange,
  onHashtagsChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4 bg-[#0d0f15] border border-[#1e2433] rounded p-5">
      <div>
        <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-2 font-orbitron">
          CAPTION (MANUAL INPUT — NO AI)
        </label>
        <textarea
          rows={4}
          disabled={disabled}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Enter your Instagram carousel caption here..."
          className="w-full bg-[#050608] border border-[#1e2433] rounded p-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 transition resize-y font-inter"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-2 font-orbitron">
          HASHTAGS
        </label>
        <input
          type="text"
          disabled={disabled}
          value={hashtags}
          onChange={(e) => onHashtagsChange(e.target.value)}
          placeholder="#naturephotography #cinematic #filmstills #carousel"
          className="w-full bg-[#050608] border border-[#1e2433] rounded px-3 py-2.5 text-sm text-yellow-400 placeholder-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 transition font-mono"
        />
        <p className="text-[11px] text-gray-400 mt-1.5 font-mono">
          // Hashtags will be appended automatically before publishing to Instagram.
        </p>
      </div>
    </div>
  );
};
