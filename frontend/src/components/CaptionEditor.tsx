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
    <div className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Caption (Manual Input — No AI)
        </label>
        <textarea
          rows={4}
          disabled={disabled}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Enter your Instagram caption here..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500/80 focus:ring-1 focus:ring-pink-500/80 transition resize-y"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Hashtags
        </label>
        <input
          type="text"
          disabled={disabled}
          value={hashtags}
          onChange={(e) => onHashtagsChange(e.target.value)}
          placeholder="#photography #style #lifestyle"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500/80 focus:ring-1 focus:ring-pink-500/80 transition"
        />
        <p className="text-[11px] text-slate-500 mt-1.5">
          Hashtags will be automatically appended to the caption before publishing.
        </p>
      </div>
    </div>
  );
};
