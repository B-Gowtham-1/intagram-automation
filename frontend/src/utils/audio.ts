// Audio utility for login chimes and 3D welcome song playback

class SoundController {
  private audioCtx: AudioContext | null = null;
  private bgAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Synthesized Cyber Power-Up Chord (Web Audio fallback)
  public playSynthesizedChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      // Frequencies for a heroic cyber chord (C4, E4, G4, B4, D5)
      const freqs = [261.63, 329.63, 392.0, 493.88, 587.33];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + 2.0);
      });
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  // Play audio file with fallback
  public async playLoginSound() {
    if (this.isMuted) return;
    try {
      const audio = new Audio('/audio/login.mp3');
      audio.volume = 0.7;
      await audio.play();
    } catch {
      // If login.mp3 does not exist or fails, use synthesized sound
      this.playSynthesizedChime();
    }
  }

  // Play 3D Welcome Song
  public async playWelcomeSong(): Promise<void> {
    if (this.isMuted) return;
    try {
      if (this.bgAudio) {
        this.bgAudio.pause();
        this.bgAudio = null;
      }
      const audio = new Audio('/audio/welcome.mp3');
      audio.volume = 0.85;
      audio.loop = false;
      this.bgAudio = audio;
      await audio.play();
    } catch {
      // If file not yet placed, play synthesized victory arpeggio
      this.playSynthesizedChime();
    }
  }

  public stopWelcomeSong() {
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
        this.bgAudio = null;
      } catch {}
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.bgAudio) {
      this.bgAudio.pause();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundCtrl = new SoundController();
