import React, { useState } from 'react';
import type { PublicMediaLinkItem } from '../services/api';
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  X,
  Film,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { formatBytes } from '../utils/image';

interface PublicLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: PublicMediaLinkItem[];
}

export const PublicLinksModal: React.FC<PublicLinksModalProps> = ({
  isOpen,
  onClose,
  links,
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen) return null;

  const handleCopySingle = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyAll = () => {
    const text = links.map((item) => item.public_url).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(
      links.map((item) => ({
        slide: item.order_index,
        type: item.media_type,
        url: item.public_url,
        dimensions: `${item.width}x${item.height}`,
      })),
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0d0f15] border border-[#1e2433] rounded w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e2433] flex items-center justify-between bg-[#080a0f]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2 font-orbitron tracking-wide uppercase">
                <span>PUBLIC MEDIA ENDPOINTS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/40 font-bold">
                  {links.length} {links.length === 1 ? 'NODE' : 'NODES'} ONLINE
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                9:16 transcode complete &bull; Supabase Storage CDN direct HTTPS links
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:text-yellow-400 hover:bg-[#161a24] transition touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Copy Actions Bar */}
        <div className="px-5 py-3 bg-[#080a0f]/60 border-b border-[#1e2433] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-300 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>DIRECT ACCESS READY:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold font-mono tracking-wider transition active:scale-95 touch-manipulation shadow-[0_0_12px_rgba(250,204,21,0.25)]"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>{copiedAll ? 'ALL COPIED!' : 'COPY ALL URLS'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161a24] hover:bg-[#202636] text-yellow-400 border border-yellow-400/40 text-xs font-bold font-mono tracking-wider transition active:scale-95 touch-manipulation"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'JSON COPIED!' : 'COPY JSON'}</span>
            </button>
          </div>
        </div>

        {/* Links List */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          {links.map((item, idx) => {
            const isVideo = item.media_type === 'VIDEO';
            const isCopied = copiedIdx === idx;

            return (
              <div
                key={idx}
                className="p-3.5 rounded bg-[#050608] border border-[#1e2433] hover:border-yellow-400/40 transition space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold font-mono text-xs text-yellow-400 px-2 py-0.5 rounded bg-[#121622] border border-yellow-400/30">
                      #{String(item.order_index).padStart(2, '0')}
                    </span>

                    {isVideo ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <Film className="w-3 h-3" /> VIDEO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        <ImageIcon className="w-3 h-3" /> IMAGE
                      </span>
                    )}

                    <span className="text-xs font-semibold text-gray-200 truncate font-mono" title={item.filename}>
                      {item.filename}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400 flex items-center gap-2 flex-shrink-0 font-mono">
                    <span className="text-yellow-400/80">{item.width}&times;{item.height}</span>
                    <span>&bull;</span>
                    <span>{formatBytes(item.size_bytes)}</span>
                  </div>
                </div>

                {/* URL Display & Action Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={item.public_url}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-[#090b10] border border-[#1e2433] rounded px-3 py-1.5 text-xs font-mono text-yellow-400 select-all focus:outline-none focus:border-yellow-400"
                  />

                  <button
                    type="button"
                    onClick={() => handleCopySingle(item.public_url, idx)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold font-mono transition active:scale-95 touch-manipulation ${
                      isCopied
                        ? 'bg-emerald-500 text-black'
                        : 'bg-[#161a24] hover:bg-yellow-400 hover:text-black text-yellow-400 border border-yellow-400/40'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                  </button>

                  <a
                    href={item.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-[#161a24] hover:bg-[#202636] text-gray-300 hover:text-yellow-400 border border-[#1e2433] transition"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e2433] bg-[#080a0f] flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500 font-mono">
            // PUBLIC CDN REPLICATED &bull; ZERO EXPIRATION
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-extrabold font-orbitron tracking-wider transition touch-manipulation"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
