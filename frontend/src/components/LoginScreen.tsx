import React, { useState } from 'react';
import { InteractiveMascot } from './InteractiveMascot';
import { verifyCredentials, type AuthUser } from '../config/authUsers';
import { soundCtrl } from '../utils/audio';
import { Lock, User, Eye, EyeOff, ShieldAlert, ArrowRight, Zap } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Audio click feedback
    soundCtrl.playLoginSound();

    try {
      const user = await verifyCredentials(username, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('ACCESS DENIED // INVALID USERNAME OR ACCESS KEY');
        setIsSubmitting(false);
      }
    } catch {
      setError('ACCESS DENIED // AUTHENTICATION SERVICE ERROR');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Background Cyber Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(250,204,21,0.06)_0%,transparent_70%)]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-3">
        {/* INTERACTIVE EYE-CLOSING MASCOT (Pig or Puppy) */}
        <InteractiveMascot
          username={username}
          isPasswordFocused={isPasswordFocused}
          isPasswordVisible={isPasswordVisible}
          usernameLength={username.length}
          passwordLength={password.length}
        />

        {/* Main Terminal Login Card */}
        <div className="bg-[#0d0f15] border border-[#1e2433] rounded p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
          {/* Top Status Header */}
          <div className="flex items-center justify-between border-b border-[#1e2433] pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded overflow-hidden ring-1 ring-yellow-400/50 flex-shrink-0 bg-black">
                <img
                  src="/zenitsu-logo.jpg"
                  alt="Zenitsu"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black font-orbitron tracking-wider text-gray-100 uppercase">
                  ZENITSU SECURITY GATE
                </h2>
                <span className="text-[10px] text-yellow-400 font-mono">
                  // RESTRICTED ACCESS NODE
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/30 text-[9px] font-mono text-yellow-400 font-bold">
              <Zap className="w-2.5 h-2.5 animate-pulse" />
              AUTHORIZED ACCESS
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 font-orbitron uppercase tracking-wider flex items-center justify-between">
                <span>USERNAME</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4 text-yellow-400/80" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter username..."
                  className="w-full bg-[#050608] border border-[#1e2433] rounded pl-9 pr-3 py-2.5 text-sm text-yellow-400 placeholder-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 transition font-mono tracking-wide"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 font-orbitron uppercase tracking-wider flex items-center justify-between">
                <span>ACCESS KEY / PASSWORD</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4 text-yellow-400/80" />
                </div>
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter password..."
                  className="w-full bg-[#050608] border border-[#1e2433] rounded pl-9 pr-10 py-2.5 text-sm text-yellow-400 placeholder-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 transition font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-yellow-400 transition"
                  title={isPasswordVisible ? 'Hide Password' : 'Show Password (Peek Mascot)'}
                >
                  {isPasswordVisible ? (
                    <EyeOff className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2 font-mono shadow-sm animate-shake">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !username || !password}
              className="w-full py-3.5 px-4 rounded bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold font-orbitron text-xs sm:text-sm tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(250,204,21,0.35)] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>AUTHENTICATE</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Security Footer Note */}
        <p className="text-center text-[10px] font-mono text-gray-500">
          // SYSTEM TERMINAL PROTECTED &bull; STRICT AUTHENTICATION ENFORCED
        </p>
      </div>
    </div>
  );
};
