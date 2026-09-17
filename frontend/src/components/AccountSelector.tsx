import React from 'react';
import type { AccountItem } from '../types';
import { CheckCircle2, Radio } from 'lucide-react';

interface AccountSelectorProps {
  accounts: AccountItem[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  disabled?: boolean;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-yellow-400 font-bold text-xs">// 01.</span>
          <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
            SELECT TARGET INSTAGRAM ACCOUNT
          </h2>
        </div>
        <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
          [WEBHOOK_ROUTING: ACTIVE]
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {accounts.map((acc, index) => {
          const isSelected = acc.id === selectedAccountId;

          return (
            <button
              key={acc.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAccount(acc.id)}
              className={`text-left p-3.5 rounded border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-yellow-400 bg-[#12151d] shadow-[0_0_18px_rgba(250,204,21,0.18)] ring-1 ring-yellow-400/50'
                  : 'border-[#1e2433] bg-[#0d0f15] hover:border-yellow-400/40 hover:bg-[#11141c]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99] touch-manipulation'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded border flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                        : 'border-[#262e40] bg-[#080a0f] text-gray-400'
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-gray-100 uppercase tracking-wide truncate font-orbitron">
                      {acc.name}
                    </div>
                    <div className="text-[11px] font-mono text-yellow-400 font-medium truncate">
                      {acc.handle}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="p-1 rounded bg-yellow-400 text-black shadow flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-3.5 h-3.5 rounded border border-[#2a3449] flex-shrink-0" />
                )}
              </div>

              <div className="text-[11px] text-gray-400 line-clamp-2 mt-2 font-inter">
                {acc.description}
              </div>

              {isSelected && (
                <div className="mt-2.5 pt-2 border-t border-yellow-400/20 flex items-center justify-between text-[10px] text-yellow-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-yellow-400 animate-pulse" />
                    TARGET_ACTIVE
                  </span>
                  <span className="text-gray-400">PRIORITY 1</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
