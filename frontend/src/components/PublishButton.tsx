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
      className={`w-full py-4 px-6 rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-orbitron tracking-widest uppercase ${
        isSuccess
          ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          : isError
          ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
          : disabled || isLoading
          ? 'bg-[#121620] text-gray-600 cursor-not-allowed border border-[#1e2433]'
          : 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] active:scale-[0.99]'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
          <span className="font-mono text-yellow-400 font-bold">{stageText || 'EXECUTING PIPELINE...'}</span>
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle className="w-5 h-5 text-black" />
          <span>✓ CAROUSEL DEPLOYED SUCCESSFULLY</span>
        </>
      ) : isError ? (
        <>
          <XCircle className="w-5 h-5 text-white" />
          <span>✕ DEPLOYMENT FAILED — RETRY</span>
        </>
      ) : (
        <>
          <Send className="w-4 h-4 stroke-[2.5]" />
          <span>POST ON INSTA</span>
        </>
      )}
    </button>
  );
};
