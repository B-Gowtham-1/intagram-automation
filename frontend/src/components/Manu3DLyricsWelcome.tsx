import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MANU_LYRICS, MANU_SONG_CONFIG } from '../data/manuLyrics';
import { Play, Pause, Volume2, VolumeX, ArrowRight, Music } from 'lucide-react';
import type { AuthUser } from '../config/authUsers';

interface Manu3DLyricsWelcomeProps {
  user: AuthUser;
  onComplete: () => void;
}

// Generate an ultra-crisp 2048x1024 canvas texture for Tamil + Thanglish typography
function createLyricTexture(tamil: string, thanglish: string, isSpecial = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Background radial soft glow
  const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 650);
  grad.addColorStop(0, isSpecial ? 'rgba(250, 204, 21, 0.28)' : 'rgba(234, 179, 8, 0.20)');
  grad.addColorStop(0.55, 'rgba(168, 85, 247, 0.10)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // TAMIL TYPOGRAPHY
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Multi-pass bloom for true 3D neon radiance
  ctx.font = "900 124px 'Mukta Malar', 'Noto Sans Tamil', sans-serif";
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 50;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(tamil, cx, cy - 55);

  ctx.shadowBlur = 18;
  ctx.fillStyle = '#FFFBEB';
  ctx.fillText(tamil, cx, cy - 55);
  ctx.restore();

  // THANGLISH SUBTITLE
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "700 52px 'Share Tech Mono', 'Orbitron', monospace";
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#FDE047';
  ctx.letterSpacing = '6px';
  ctx.fillText(thanglish.toUpperCase(), cx, cy + 85);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Spacing between lines in 3D space
const LINE_SPACING = 260;

// Perfectly synchronize camera position with audio timestamps (with 0.12s smooth anticipation)
function getCameraZForTime(t: number): number {
  const lyrics = MANU_LYRICS;
  const leadTime = t + 0.12; // 120ms audio-visual anticipation for instant perceptual hit
  const preRoll = MANU_SONG_CONFIG.startTime; // 29.5s

  if (leadTime <= lyrics[0].time) {
    const p = Math.max(0, (leadTime - preRoll) / (lyrics[0].time - preRoll));
    // Glides smoothly toward front of first line
    return 70 - p * 32; // 70 down to 38
  }

  for (let i = 0; i < lyrics.length; i++) {
    const curr = lyrics[i];
    const next = lyrics[i + 1];
    const startZ = -i * LINE_SPACING + 38; // Exactly in front of line i

    if (!next) {
      // Last line
      const p = Math.min(1, Math.max(0, (leadTime - curr.time) / curr.duration));
      return startZ - p * (LINE_SPACING * 0.8);
    }

    if (leadTime >= curr.time && leadTime < next.time) {
      const nextStartZ = -(i + 1) * LINE_SPACING + 38;
      const progress = (leadTime - curr.time) / (next.time - curr.time);
      return startZ + progress * (nextStartZ - startZ);
    }
  }

  return -lyrics.length * LINE_SPACING;
}

export const Manu3DLyricsWelcome: React.FC<Manu3DLyricsWelcomeProps> = ({
  user,
  onComplete,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Mouse coordinates for interactive 3D camera sway
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { innerWidth, innerHeight } = window;
    mouseRef.current.x = (e.clientX / innerWidth - 0.5) * 2;
    mouseRef.current.y = (e.clientY / innerHeight - 0.5) * 2;
  }, []);

  // Audio setup
  useEffect(() => {
    const audio = new Audio(MANU_SONG_CONFIG.audioSrc);
    audio.preload = 'auto';
    audioRef.current = audio;

    const startAudio = async () => {
      try {
        audio.currentTime = MANU_SONG_CONFIG.startTime;
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Audio autoplay blocked, user interaction required:', err);
        setIsPlaying(false);
      }
    };

    startAudio();

    const onTimeUpdate = () => {
      if (audio && audio.currentTime >= MANU_SONG_CONFIG.endTime) {
        audio.pause();
        onComplete();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.pause();
      audio.src = '';
    };
  }, [onComplete]);

  // Three.js 3D Fly-Through Universe
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Deep Cosmic Fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050608, 0.0014);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 4500);
    camera.position.set(0, 0, 70);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // 4. Ambient & Directional Neon Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xfacc15, 3.5, 900);
    pointLight.position.set(0, 0, 50);
    scene.add(pointLight);

    // 5. 3D Infinite Tunnel Rings
    const ringGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(32, 0.35, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
    });
    const ringCount = 45;
    for (let i = 0; i < ringCount; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = 100 - i * 75;
      ringGroup.add(ring);
    }
    scene.add(ringGroup);

    // 6. Cosmic Starfield / 3D Warp Dust
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const colorGold = new THREE.Color(0xfacc15);
    const colorViolet = new THREE.Color(0xc084fc);
    const colorCyan = new THREE.Color(0x38bdf8);

    for (let i = 0; i < starCount; i++) {
      const radius = 15 + Math.random() * 85;
      const angle = Math.random() * Math.PI * 2;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = Math.sin(angle) * radius;
      starPositions[i * 3 + 2] = 100 - Math.random() * 3500;

      const pick = Math.random();
      const c = pick > 0.55 ? colorGold : pick > 0.3 ? colorViolet : colorCyan;
      starColors[i * 3] = c.r;
      starColors[i * 3 + 1] = c.g;
      starColors[i * 3 + 2] = c.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 7. 3D Lyric Planes positioned at exact Z coordinates
    const lineMeshes: { mesh: THREE.Mesh; line: typeof MANU_LYRICS[0]; mat: THREE.MeshBasicMaterial }[] = [];
    const planeGeo = new THREE.PlaneGeometry(44, 22);

    MANU_LYRICS.forEach((line, index) => {
      const texture = createLyricTexture(line.tamil, line.thanglish, index === 0 || index === MANU_LYRICS.length - 1);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(planeGeo, mat);

      // Place line i at Z = -i * LINE_SPACING
      const targetZ = -index * LINE_SPACING;
      mesh.position.set(0, 0, targetZ);
      scene.add(mesh);

      lineMeshes.push({ mesh, line, mat });
    });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      clock.getDelta();
      const currentAudioTime = audioRef.current ? audioRef.current.currentTime : MANU_SONG_CONFIG.startTime;

      // Calculate mathematically exact Camera Z for current audio timestamp
      const targetCameraZ = getCameraZForTime(currentAudioTime);

      // Responsive, latency-free camera tracking
      camera.position.z += (targetCameraZ - camera.position.z) * 0.25;

      // Mouse interactive tilt & sway
      const targetX = mouseRef.current.x * 5;
      const targetY = -mouseRef.current.y * 3.5;
      camera.position.x += (targetX - camera.position.x) * 0.08;
      camera.position.y += (targetY - camera.position.y) * 0.08;
      camera.rotation.z = -mouseRef.current.x * 0.02;
      camera.rotation.y = -mouseRef.current.x * 0.035;
      camera.rotation.x = mouseRef.current.y * 0.025;

      // Rotate tunnel rings
      ringGroup.children.forEach((ring, idx) => {
        ring.rotation.z += 0.003 * (idx % 2 === 0 ? 1 : -1);
      });

      // Point light follows camera
      pointLight.position.set(camera.position.x, camera.position.y, camera.position.z - 20);

      // Update lyric planes: exact scale, opacity, and bloom based on distance to camera
      lineMeshes.forEach(({ mesh, line, mat }) => {
        const distToCamera = mesh.position.z - camera.position.z; // Ahead of camera is negative in world space relative to camera

        const timeDelta = currentAudioTime - line.time;
        const isActive = timeDelta >= -0.1 && timeDelta <= line.duration;

        if (isActive) {
          // ACTIVE LINE: Full brightness and crisp scale
          mat.opacity = 1.0;
          mesh.scale.set(1.08, 1.08, 1.08);
        } else if (distToCamera > -15 && distToCamera < 80) {
          // In immediate focus area
          const focusRatio = 1 - Math.abs(distToCamera - 38) / 60;
          mat.opacity = Math.max(0.4, focusRatio);
          mesh.scale.set(1.02, 1.02, 1.02);
        } else if (distToCamera >= 80) {
          // Behind camera: expand and fade out
          const pastDist = distToCamera - 80;
          const fadeRatio = Math.min(1, pastDist / 90);
          mat.opacity = Math.max(0, 1 - fadeRatio);
          mesh.scale.set(1.08 + fadeRatio * 0.6, 1.08 + fadeRatio * 0.6, 1);
        } else {
          // Ahead in the tunnel (approaching):
          const approachDist = Math.abs(distToCamera);
          if (approachDist > 650) {
            mat.opacity = 0.06;
            mesh.scale.set(0.9, 0.9, 0.9);
          } else {
            const ratio = 1 - approachDist / 650;
            mat.opacity = 0.08 + ratio * 0.75;
            mesh.scale.set(0.9 + ratio * 0.12, 0.9 + ratio * 0.12, 1);
          }
        }
      });

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      lineMeshes.forEach(({ mat }) => {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
      planeGeo.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  // Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 overflow-hidden bg-[#050608] select-none flex flex-col justify-between"
    >
      {/* Three.js WebGL 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Cyber Header */}
      <header className="relative z-30 w-full px-4 sm:px-8 py-5 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-yellow-400/20">
        {/* Track info & user badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
            <Music className="w-5 h-5 text-yellow-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white font-orbitron tracking-wider">
                {MANU_SONG_CONFIG.title}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold border border-yellow-400/40">
                3D FLY-THROUGH UNIVERSE
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              {MANU_SONG_CONFIG.artists} &bull; Movie: {MANU_SONG_CONFIG.movie}
            </p>
          </div>
        </div>

        {/* User Pill & SKIP TO STUDIO BUTTON */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/40 text-xs font-mono text-yellow-400 font-bold shadow-[0_0_12px_rgba(250,204,21,0.2)]">
            <span>🐶</span>
            <span>USER: {user.displayName}</span>
          </div>

          {/* Prominent SKIP TO STUDIO button */}
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold font-orbitron text-xs sm:text-sm tracking-widest uppercase shadow-[0_0_25px_rgba(250,204,21,0.5)] transition active:scale-95"
            title="Jump directly to the main Instagram automation studio"
          >
            <span>SKIP TO STUDIO</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </header>

      {/* Bottom Floating Minimal Bar (Without play time numbers or progress bar) */}
      <footer className="relative z-30 w-full px-4 sm:px-8 py-5 border-t border-white/10 bg-black/50 backdrop-blur-2xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.5)] transition active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={onComplete}
            className="text-xs font-mono text-yellow-400 hover:text-yellow-300 font-bold underline underline-offset-4"
          >
            Skip to Studio &rarr;
          </button>
        </div>
      </footer>
    </div>
  );
};
