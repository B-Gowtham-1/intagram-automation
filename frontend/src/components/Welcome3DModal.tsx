import React, { useEffect, useState } from 'react';
import type { AuthUser } from '../config/authUsers';
import { soundCtrl } from '../utils/audio';
import { Zap, Volume2, VolumeX, ArrowRight, ShieldCheck } from 'lucide-react';

interface Welcome3DModalProps {
  user: AuthUser;
  onComplete: () => void;
}

export const Welcome3DModal: React.FC<Welcome3DModalProps> = ({ user, onComplete }) => {
  const [isMuted, setIsMuted] = useState(soundCtrl.getMuted());
  const [stage, setStage] = useState<'intro' | 'active' | 'exit'>('intro');

  useEffect(() => {
    // Start audio immediately on render
    soundCtrl.playWelcomeSong();

    // Stage transitions
    const t1 = setTimeout(() => setStage('active'), 80);
    // Auto transition to main dashboard after 3.8s
    const t2 = setTimeout(() => {
      setStage('exit');
      setTimeout(() => {
        soundCtrl.stopWelcomeSong();
        onComplete();
      }, 500);
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      soundCtrl.stopWelcomeSong();
    };
  }, [onComplete]);

  const handleMuteToggle = () => {
    const next = soundCtrl.toggleMute();
    setIsMuted(next);
  };

  const handleManualContinue = () => {
    setStage('exit');
    setTimeout(() => {
      soundCtrl.stopWelcomeSong();
      onComplete();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#050608] transition-opacity duration-500 overflow-hidden ${
        stage === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ perspective: '1200px' }}
    >
      {/* Background Lighting & Shockwave Rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Radial Gold Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-[radial-gradient(circle,rgba(250,204,21,0.18)_0%,transparent_70%)] animate-pulse" />

        {/* Shockwave Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full border border-yellow-400/20 animate-ping opacity-25" />

        {/* Floating Sparks */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] animate-bounce"
            style={{
              top: `${15 + (i * 7) % 70}%`,
              left: `${10 + (i * 8) % 80}%`,
              animationDuration: `${1.2 + (i % 3) * 0.5}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Audio Toggle Control */}
      <button
        type="button"
        onClick={handleMuteToggle}
        className="absolute top-5 right-5 z-20 p-2.5 rounded bg-[#121622] border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400 hover:text-black transition shadow-[0_0_15px_rgba(250,204,21,0.2)] font-mono text-xs flex items-center gap-1.5"
        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-yellow-400" />}
        <span className="hidden sm:inline">{isMuted ? 'AUDIO: MUTED' : 'AUDIO: ON'}</span>
      </button>

      {/* 3D Scene Container */}
      <div
        className={`relative z-10 text-center px-4 max-w-2xl mx-auto space-y-6 transform transition-all duration-700 ease-out ${
          stage === 'active'
            ? 'scale-100 rotate-x-0 translate-z-0 opacity-100'
            : 'scale-75 rotate-x-12 -translate-z-32 opacity-0'
        }`}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121622] border border-yellow-400/50 text-xs font-mono font-bold text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.25)]">
          <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
          <span>SECURITY NODE VERIFIED // {user.role}</span>
        </div>

        {/* Mascot Avatar Icon */}
        <div className="text-4xl sm:text-5xl animate-bounce">
          {user.mascotType === 'pig' ? '🐷' : '🐶'}
        </div>

        {/* 3D EXTRUDED NAME TYPOGRAPHY */}
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-mono tracking-widest text-gray-400 uppercase">
            // TERMINAL ACCESS GRANTED
          </div>

          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black font-orbitron tracking-widest uppercase leading-tight select-none"
            style={{
              color: '#FFFFFF',
              textShadow: `
                0 1px 0 #EAB308,
                0 2px 0 #CA8A04,
                0 3px 0 #A16207,
                0 4px 0 #713F12,
                0 5px 0 #451A03,
                0 0 20px rgba(250, 204, 21, 0.6),
                0 0 40px rgba(250, 204, 21, 0.4)
              `,
              transform: 'translateZ(40px)',
            }}
          >
            WELCOME,
            <br />
            <span className="text-yellow-400">{user.displayName}</span>
          </h1>

          <p className="text-xs sm:text-sm font-mono text-gray-300 max-w-md mx-auto pt-2">
            INITIALIZING 9:16 INSTAGRAM CAROUSEL &amp; VIDEO PIPELINE...
          </p>
        </div>

        {/* Skip / Continue CTA */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleManualContinue}
            className="inline-flex items-center gap-2 px-6 py-3 rounded bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold font-orbitron text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(250,204,21,0.5)] transition active:scale-95"
          >
            <span>ENTER STUDIO</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Security watermark */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-gray-500 pt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>SESSION ENCRYPTED &bull; ZERO TRUST VERIFIED</span>
        </div>
      </div>
    </div>
  );
};
