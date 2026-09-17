import React, { useMemo } from 'react';

interface InteractiveMascotProps {
  username: string;
  isPasswordFocused: boolean;
  isPasswordVisible: boolean;
  usernameLength: number;
  passwordLength?: number;
}

export const InteractiveMascot: React.FC<InteractiveMascotProps> = ({
  username,
  isPasswordFocused,
  isPasswordVisible,
  usernameLength,
  passwordLength = 0,
}) => {
  const normalized = username.trim().toLowerCase();

  // Determine active mascot dynamically from embedded configuration
  const mascotType: 'pig' | 'dog' = useMemo(() => {
    const user2Key = (import.meta.env.VITE_USER2_USERNAME || 'manu').toLowerCase();
    const user2Mascot = (import.meta.env.VITE_USER2_MASCOT || 'dog').toLowerCase() === 'pig' ? 'pig' : 'dog';
    const user1Mascot = (import.meta.env.VITE_USER1_MASCOT || 'pig').toLowerCase() === 'dog' ? 'dog' : 'pig';

    if (user2Key && normalized.includes(user2Key)) {
      return user2Mascot;
    }
    return user1Mascot;
  }, [normalized]);

  // Mascot is covering eyes if password field is focused OR has any characters typed in it!
  const isPasswordActive = isPasswordFocused || passwordLength > 0;
  const isCoveringEyes = isPasswordActive && !isPasswordVisible;
  const isPeeking = isPasswordActive && isPasswordVisible;

  // Calculate eye look angle based on username text length (ranges from -6px to +6px)
  const eyeOffsetX = useMemo(() => {
    if (isPasswordActive) return 0;
    const clampedLen = Math.min(usernameLength, 20);
    return -5 + (clampedLen / 20) * 10;
  }, [usernameLength, isPasswordActive]);

  const eyeOffsetY = useMemo(() => {
    return isPasswordActive ? 0 : 3; // Look down toward input field
  }, [isPasswordActive]);

  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none select-none -mb-2 z-20">
      {/* Dynamic Mascot Badge (Neutral & Secure - No credentials shown) */}
      <div className="mb-1.5 px-3 py-0.5 rounded-full bg-[#121622] border border-yellow-400/40 text-[10px] font-mono text-yellow-400 font-bold shadow-[0_0_12px_rgba(250,204,21,0.2)] flex items-center gap-1.5 animate-pulse">
        <span>{mascotType === 'pig' ? '🐷' : '🐶'}</span>
        <span>{mascotType === 'pig' ? 'CUTE PIG MASCOT' : 'CUTE PUPPY MASCOT'}</span>
      </div>

      {/* 3D Mascot Stage */}
      <div className="relative w-44 h-36 flex items-center justify-center">
        {mascotType === 'pig' ? (
          /* ========================================================
             3D CUTE PIG MASCOT
             ======================================================== */
          <svg
            viewBox="0 0 160 140"
            className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(244,114,182,0.35)]"
          >
            <defs>
              {/* 3D Head Spherical Gradient */}
              <radialGradient id="pig3DHead" cx="38%" cy="32%" r="65%" fx="35%" fy="26%">
                <stop offset="0%" stopColor="#FCE7F3" />
                <stop offset="25%" stopColor="#F9A8D4" />
                <stop offset="70%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#BE185D" />
              </radialGradient>

              {/* 3D Snout Gradient */}
              <radialGradient id="pig3DSnout" cx="42%" cy="30%" r="60%">
                <stop offset="0%" stopColor="#FDF2F8" />
                <stop offset="35%" stopColor="#F472B6" />
                <stop offset="85%" stopColor="#DB2777" />
                <stop offset="100%" stopColor="#9D174D" />
              </radialGradient>

              {/* 3D Ears Gradient */}
              <linearGradient id="pig3DEarLeft" x1="20%" y1="10%" x2="50%" y2="60%">
                <stop offset="0%" stopColor="#F472B6" />
                <stop offset="70%" stopColor="#DB2777" />
                <stop offset="100%" stopColor="#9D174D" />
              </linearGradient>
              <linearGradient id="pig3DEarRight" x1="80%" y1="10%" x2="50%" y2="60%">
                <stop offset="0%" stopColor="#F472B6" />
                <stop offset="70%" stopColor="#DB2777" />
                <stop offset="100%" stopColor="#9D174D" />
              </linearGradient>

              {/* 3D Trotter Paw Gradient */}
              <radialGradient id="pig3DTrotter" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FDF2F8" />
                <stop offset="30%" stopColor="#F472B6" />
                <stop offset="75%" stopColor="#DB2777" />
                <stop offset="100%" stopColor="#831843" />
              </radialGradient>

              {/* Paw Drop Shadow */}
              <filter id="pawShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#4c0519" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Left Ear */}
            <g className="transition-transform duration-300">
              <path
                d="M 28 35 Q 12 8 36 14 Q 48 24 40 45 Z"
                fill="url(#pig3DEarLeft)"
                stroke="#9D174D"
                strokeWidth="2"
              />
              <path
                d="M 29 32 Q 20 18 33 20 Q 40 27 36 38 Z"
                fill="#FDF2F8"
                opacity="0.85"
              />
            </g>

            {/* Right Ear */}
            <g className="transition-transform duration-300">
              <path
                d="M 132 35 Q 148 8 124 14 Q 112 24 120 45 Z"
                fill="url(#pig3DEarRight)"
                stroke="#9D174D"
                strokeWidth="2"
              />
              <path
                d="M 131 32 Q 140 18 127 20 Q 120 27 124 38 Z"
                fill="#FDF2F8"
                opacity="0.85"
              />
            </g>

            {/* 3D Head Sphere */}
            <ellipse
              cx="80"
              cy="70"
              rx="55"
              ry="48"
              fill="url(#pig3DHead)"
              stroke="#9D174D"
              strokeWidth="2.5"
            />

            {/* Top 3D Specular Highlight */}
            <ellipse cx="68" cy="38" rx="22" ry="9" fill="#FFFFFF" opacity="0.35" transform="rotate(-10 68 38)" />

            {/* Rosy 3D Cheeks */}
            <ellipse cx="44" cy="78" rx="10" ry="6.5" fill="#F43F5E" opacity="0.4" />
            <ellipse cx="116" cy="78" rx="10" ry="6.5" fill="#F43F5E" opacity="0.4" />

            {/* ==================== LEFT EYE ==================== */}
            {isCoveringEyes ? (
              /* Eyes Tightly Closed When Password Active */
              <g className="transition-all duration-200">
                <path
                  d="M 47 62 Q 57 52 67 62"
                  stroke="#831843"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path d="M 45 64 L 41 61" stroke="#831843" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 69 64 L 73 61" stroke="#831843" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : isPeeking ? (
              /* Left Eye Open & Curious in Peek Mode */
              <g className="transition-all duration-200">
                <ellipse cx="57" cy="60" rx="9.5" ry="11.5" fill="#FFFFFF" stroke="#BE185D" strokeWidth="1" />
                <ellipse cx="58" cy="63" rx="6" ry="6.5" fill="#1E1B4B" />
                <circle cx="56" cy="61" r="2.5" fill="#FFFFFF" />
                <circle cx="61" cy="64" r="1.2" fill="#FFFFFF" />
              </g>
            ) : (
              /* Left Eye Normal (Tracking cursor) */
              <g className="transition-transform duration-150">
                <ellipse cx="57" cy="60" rx="9.5" ry="11.5" fill="#FFFFFF" stroke="#BE185D" strokeWidth="1" />
                <ellipse cx={57 + eyeOffsetX} cy={60 + eyeOffsetY} rx="6" ry="6.5" fill="#1E1B4B" />
                <circle cx={55 + eyeOffsetX} cy={58 + eyeOffsetY} r="2.5" fill="#FFFFFF" />
                <circle cx={59 + eyeOffsetX} cy={61 + eyeOffsetY} r="1.2" fill="#FFFFFF" />
              </g>
            )}

            {/* ==================== RIGHT EYE ==================== */}
            {isCoveringEyes || isPeeking ? (
              /* Right Eye Firmly Closed (stays closed during peek too) */
              <g className="transition-all duration-200">
                <path
                  d="M 93 62 Q 103 52 113 62"
                  stroke="#831843"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path d="M 91 64 L 87 61" stroke="#831843" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 115 64 L 119 61" stroke="#831843" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : (
              /* Right Eye Normal (Tracking cursor) */
              <g className="transition-transform duration-150">
                <ellipse cx="103" cy="60" rx="9.5" ry="11.5" fill="#FFFFFF" stroke="#BE185D" strokeWidth="1" />
                <ellipse cx={103 + eyeOffsetX} cy={60 + eyeOffsetY} rx="6" ry="6.5" fill="#1E1B4B" />
                <circle cx={101 + eyeOffsetX} cy={58 + eyeOffsetY} r="2.5" fill="#FFFFFF" />
                <circle cx={105 + eyeOffsetX} cy={61 + eyeOffsetY} r="1.2" fill="#FFFFFF" />
              </g>
            )}

            {/* 3D Snout */}
            <g>
              <ellipse
                cx="80"
                cy="82"
                rx="21"
                ry="15"
                fill="url(#pig3DSnout)"
                stroke="#9D174D"
                strokeWidth="2.2"
              />
              <ellipse cx="78" cy="74" rx="12" ry="4" fill="#FFFFFF" opacity="0.45" />
              {/* Nostrils */}
              <ellipse cx="73" cy="83" rx="3.5" ry="5.5" fill="#701A75" />
              <ellipse cx="87" cy="83" rx="3.5" ry="5.5" fill="#701A75" />
            </g>

            {/* Cute Smile */}
            <path
              d="M 72 102 Q 80 108 88 102"
              stroke="#9D174D"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* ==================== LEFT TROTTER / PAW ==================== */}
            {/* When covering eyes: moves all the way up directly over the left eye! */}
            <g
              filter="url(#pawShadow)"
              className="transition-all duration-300 ease-out"
              style={{
                transform: isCoveringEyes
                  ? 'translate(15px, -55px) rotate(-6deg)'
                  : isPeeking
                  ? 'translate(8px, -20px) rotate(-14deg)'
                  : 'translate(0px, 0px)',
                transformOrigin: '42px 115px',
              }}
            >
              <ellipse
                cx="42"
                cy="115"
                rx="18"
                ry="14"
                fill="url(#pig3DTrotter)"
                stroke="#831843"
                strokeWidth="2.5"
              />
              {/* Cleft in trotter */}
              <path d="M 42 108 L 42 122" stroke="#831843" strokeWidth="2.5" strokeLinecap="round" />
              {/* Highlight shine on trotter */}
              <ellipse cx="38" cy="111" rx="5" ry="2.5" fill="#FFFFFF" opacity="0.4" />
            </g>

            {/* ==================== RIGHT TROTTER / PAW ==================== */}
            {/* Stays covering right eye firmly when covering or peeking */}
            <g
              filter="url(#pawShadow)"
              className="transition-all duration-300 ease-out"
              style={{
                transform: isCoveringEyes || isPeeking
                  ? 'translate(-15px, -55px) rotate(6deg)'
                  : 'translate(0px, 0px)',
                transformOrigin: '118px 115px',
              }}
            >
              <ellipse
                cx="118"
                cy="115"
                rx="18"
                ry="14"
                fill="url(#pig3DTrotter)"
                stroke="#831843"
                strokeWidth="2.5"
              />
              {/* Cleft in trotter */}
              <path d="M 118 108 L 118 122" stroke="#831843" strokeWidth="2.5" strokeLinecap="round" />
              {/* Highlight shine on trotter */}
              <ellipse cx="114" cy="111" rx="5" ry="2.5" fill="#FFFFFF" opacity="0.4" />
            </g>
          </svg>
        ) : (
          /* ========================================================
             3D CUTE DOG (PUPPY) MASCOT
             ======================================================== */
          <svg
            viewBox="0 0 160 140"
            className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(234,179,8,0.35)]"
          >
            <defs>
              {/* 3D Dog Head Spherical Gradient */}
              <radialGradient id="dog3DHead" cx="38%" cy="32%" r="65%" fx="35%" fy="26%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="35%" stopColor="#FBBF24" />
                <stop offset="75%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#78350F" />
              </radialGradient>

              {/* 3D Dog Ears Gradient */}
              <linearGradient id="dog3DEarLeft" x1="30%" y1="10%" x2="50%" y2="80%">
                <stop offset="0%" stopColor="#B45309" />
                <stop offset="70%" stopColor="#78350F" />
                <stop offset="100%" stopColor="#451A03" />
              </linearGradient>
              <linearGradient id="dog3DEarRight" x1="70%" y1="10%" x2="50%" y2="80%">
                <stop offset="0%" stopColor="#B45309" />
                <stop offset="70%" stopColor="#78350F" />
                <stop offset="100%" stopColor="#451A03" />
              </linearGradient>

              {/* 3D Dog Muzzle */}
              <radialGradient id="dog3DMuzzle" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="75%" stopColor="#FEF08A" />
                <stop offset="100%" stopColor="#FCD34D" />
              </radialGradient>

              {/* 3D Dog Paw */}
              <radialGradient id="dog3DPaw" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="85%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#78350F" />
              </radialGradient>

              {/* Dog Paw Shadow */}
              <filter id="dogPawShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#291305" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Floppy Left Ear */}
            <path
              d="M 32 30 Q 8 55 18 88 Q 28 98 38 72 Z"
              fill="url(#dog3DEarLeft)"
              stroke="#451A03"
              strokeWidth="2.2"
            />
            {/* Floppy Right Ear */}
            <path
              d="M 128 30 Q 152 55 142 88 Q 132 98 122 72 Z"
              fill="url(#dog3DEarRight)"
              stroke="#451A03"
              strokeWidth="2.2"
            />

            {/* 3D Puppy Head */}
            <ellipse
              cx="80"
              cy="70"
              rx="54"
              ry="47"
              fill="url(#dog3DHead)"
              stroke="#78350F"
              strokeWidth="2.5"
            />

            {/* 3D Specular Highlight on Head */}
            <ellipse cx="68" cy="38" rx="20" ry="8" fill="#FFFFFF" opacity="0.35" transform="rotate(-10 68 38)" />

            {/* Puppy 3D Muzzle */}
            <ellipse cx="80" cy="80" rx="30" ry="24" fill="url(#dog3DMuzzle)" stroke="#D97706" strokeWidth="1.5" />

            {/* Cheeks */}
            <circle cx="48" cy="78" r="7" fill="#F59E0B" opacity="0.35" />
            <circle cx="112" cy="78" r="7" fill="#F59E0B" opacity="0.35" />

            {/* ==================== LEFT PUPPY EYE ==================== */}
            {isCoveringEyes ? (
              /* Puppy Eyes Firmly Closed When Password Active */
              <g className="transition-all duration-200">
                <path
                  d="M 47 62 Q 57 52 67 62"
                  stroke="#451A03"
                  strokeWidth="3.8"
                  fill="none"
                  strokeLinecap="round"
                />
                <path d="M 45 64 L 41 61" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 69 64 L 73 61" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : isPeeking ? (
              /* Puppy Left Eye Open in Peek Mode */
              <g className="transition-all duration-200">
                <ellipse cx="57" cy="60" rx="9.5" ry="11.5" fill="#FFFFFF" stroke="#78350F" strokeWidth="1" />
                <ellipse cx="58" cy="63" rx="6.2" ry="6.8" fill="#381E11" />
                <circle cx="56" cy="61" r="2.5" fill="#FFFFFF" />
                <circle cx="61" cy="64" r="1.2" fill="#FFFFFF" />
              </g>
            ) : (
              /* Puppy Left Eye Normal (Tracking cursor) */
              <g className="transition-transform duration-150">
                <ellipse cx="57" cy="60" rx="9.5" ry="11.5" fill="#FFFFFF" stroke="#78350F" strokeWidth="1" />
                <ellipse cx={57 + eyeOffsetX} cy={60 + eyeOffsetY} rx="6.2" ry="6.8" fill="#381E11" />
                <circle cx={55 + eyeOffsetX} cy={58 + eyeOffsetY} r="2.5" fill="#FFFFFF" />
                <circle cx={59 + eyeOffsetX} cy={61 + eyeOffsetY} r="1.2" fill="#FFFFFF" />
              </g>
            )}

            {/* ==================== RIGHT PUPPY EYE ==================== */}
            {isCoveringEyes || isPeeking ? (
              /* Puppy Right Eye Firmly Closed */
              <g className="transition-all duration-200">
                <path
                  d="M 93 62 Q 103 52 113 62"
                  stroke="#451A03"
                  strokeWidth="3.8"
                  fill="none"
                  strokeLinecap="round"
                />
                <path d="M 91 64 L 87 61" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 115 64 L 119 61" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : (
              /* Puppy Right Eye Normal (Tracking cursor) */
              <g className="transition-transform duration-150">
                <ellipse cx="103" cy="60" rx="9.5" ry="11.5" fill="#FFFFFF" stroke="#78350F" strokeWidth="1" />
                <ellipse cx={103 + eyeOffsetX} cy={60 + eyeOffsetY} rx="6.2" ry="6.8" fill="#381E11" />
                <circle cx={101 + eyeOffsetX} cy={58 + eyeOffsetY} r="2.5" fill="#FFFFFF" />
                <circle cx={105 + eyeOffsetX} cy={61 + eyeOffsetY} r="1.2" fill="#FFFFFF" />
              </g>
            )}

            {/* 3D Button Nose with Gloss Highlight */}
            <ellipse cx="80" cy="76" rx="9.5" ry="7" fill="#1C1917" />
            <circle cx="78" cy="74" r="2" fill="#FFFFFF" />

            {/* Puppy Smile & Cute Pink Tongue */}
            <path
              d="M 73 84 Q 80 88 87 84"
              stroke="#1C1917"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 77 86 Q 80 95 83 86 Z"
              fill="#F43F5E"
            />

            {/* ==================== LEFT PUPPY PAW ==================== */}
            <g
              filter="url(#dogPawShadow)"
              className="transition-all duration-300 ease-out"
              style={{
                transform: isCoveringEyes
                  ? 'translate(16px, -55px) rotate(-8deg)'
                  : isPeeking
                  ? 'translate(8px, -20px) rotate(-14deg)'
                  : 'translate(0px, 0px)',
                transformOrigin: '40px 115px',
              }}
            >
              <ellipse
                cx="40"
                cy="115"
                rx="18"
                ry="15"
                fill="url(#dog3DPaw)"
                stroke="#78350F"
                strokeWidth="2.5"
              />
              {/* Cute paw pads */}
              <circle cx="34" cy="111" r="3.2" fill="#451A03" />
              <circle cx="40" cy="107" r="3.2" fill="#451A03" />
              <circle cx="46" cy="111" r="3.2" fill="#451A03" />
              <ellipse cx="40" cy="118" rx="5" ry="3.5" fill="#451A03" />
            </g>

            {/* ==================== RIGHT PUPPY PAW ==================== */}
            <g
              filter="url(#dogPawShadow)"
              className="transition-all duration-300 ease-out"
              style={{
                transform: isCoveringEyes || isPeeking
                  ? 'translate(-16px, -55px) rotate(8deg)'
                  : 'translate(0px, 0px)',
                transformOrigin: '120px 115px',
              }}
            >
              <ellipse
                cx="120"
                cy="115"
                rx="18"
                ry="15"
                fill="url(#dog3DPaw)"
                stroke="#78350F"
                strokeWidth="2.5"
              />
              {/* Cute paw pads */}
              <circle cx="114" cy="111" r="3.2" fill="#451A03" />
              <circle cx="120" cy="107" r="3.2" fill="#451A03" />
              <circle cx="126" cy="111" r="3.2" fill="#451A03" />
              <ellipse cx="120" cy="118" rx="5" ry="3.5" fill="#451A03" />
            </g>
          </svg>
        )}
      </div>

      {/* Playful Dynamic Status Bubble */}
      <div className="text-[11px] font-mono mt-1 px-3 py-0.5 rounded bg-[#0a0c12] border border-[#1e2433]">
        {isCoveringEyes ? (
          <span className="text-yellow-400 font-bold flex items-center gap-1">
            🙈 <span>Eyes tightly shut! Not looking at your password!</span>
          </span>
        ) : isPeeking ? (
          <span className="text-pink-400 font-bold flex items-center gap-1">
            👀 <span>Just peeking with one eye!</span>
          </span>
        ) : usernameLength > 0 ? (
          <span className="text-cyan-400 flex items-center gap-1">
            👀 <span>Watching you type username...</span>
          </span>
        ) : (
          <span className="text-gray-400 flex items-center gap-1">
            ✨ <span>Enter credentials to authenticate</span>
          </span>
        )}
      </div>
    </div>
  );
};
