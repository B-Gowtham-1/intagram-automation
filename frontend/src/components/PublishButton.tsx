import React from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { JobStatus } from '../types';

interface PublishButtonProps {
  status?: JobStatus;
  stageText?: string | null;
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const PublishButton: React.FC<PublishButtonProps> = ({
  stageText,
  isLoading = false,
  isSuccess = false,
  isError = false,
  disabled = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`w-full py-4 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
        isSuccess
          ? 'bg-emerald-600 text-white'
          : isError
          ? 'bg-rose-600 text-white hover:bg-rose-500'
          : disabled || isLoading
          ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700/60'
          : 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white hover:opacity-95 hover:shadow-pink-500/25 active:scale-[0.99]'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-pink-300" />
          <span className="font-medium">{stageText || 'Preparing carousel...'}</span>
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle className="w-5 h-5 text-white" />
          <span>✓ Carousel published successfully</span>
        </>
      ) : isError ? (
        <>
          <XCircle className="w-5 h-5 text-white" />
          <span>✕ Publishing failed — Retry</span>
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          <span>Publish Carousel</span>
        </>
      )}
    </button>
  );
};
