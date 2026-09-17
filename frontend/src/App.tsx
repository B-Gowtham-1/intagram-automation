import { useState } from 'react';
import { Home } from './pages/Home';
import { LoginScreen } from './components/LoginScreen';
import { Welcome3DModal } from './components/Welcome3DModal';
import { Manu3DLyricsWelcome } from './components/Manu3DLyricsWelcome';
import { getStoredSession, saveSession, clearSession, type AuthUser } from './config/authUsers';
import { Zap, LogOut, UserCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredSession());
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [welcomePhase, setWelcomePhase] = useState<'welcome_message' | 'lyrics_3d' | null>(null);

  const handleLoginSuccess = (user: AuthUser) => {
    saveSession(user);
    setPendingUser(user);
    // Step 1: Always display 3D Welcome Message with BGM first
    setWelcomePhase('welcome_message');
  };

  const handleWelcomeMessageComplete = () => {
    if (!pendingUser) return;
    if (pendingUser.username.toLowerCase() === 'manu') {
      // For MANU: Transition into Step 2 -> 3D Lyrics Fly-Through Universe
      setWelcomePhase('lyrics_3d');
    } else {
      // For GOWTHAM: Enter studio
      setCurrentUser(pendingUser);
      setWelcomePhase(null);
    }
  };

  const handleLyricsComplete = () => {
    if (pendingUser) {
      setCurrentUser(pendingUser);
    }
    setWelcomePhase(null);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setPendingUser(null);
    setWelcomePhase(null);
  };

  return (
    <main className="min-h-screen bg-[#050608] text-gray-200 flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Step 1: 3D Welcome Message with Background Music */}
      {welcomePhase === 'welcome_message' && pendingUser && (
        <Welcome3DModal
          user={pendingUser}
          onComplete={handleWelcomeMessageComplete}
        />
      )}

      {/* Step 2: 3D Deep Fly-Through Lyrics Universe (for MANU) */}
      {welcomePhase === 'lyrics_3d' && pendingUser && (
        <Manu3DLyricsWelcome
          user={pendingUser}
          onComplete={handleLyricsComplete}
        />
      )}

      {/* Tactical Cyber Header matching gowthamlinux */}
      <header className="sticky top-0 z-50 w-full bg-[#050608]/90 backdrop-blur-md border-b border-[#1e2433]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded overflow-hidden ring-1 ring-yellow-400/50 flex-shrink-0 bg-black/80 shadow-[0_0_10px_rgba(250,204,21,0.25)]">
                <img
                  src="/zenitsu-logo.jpg"
                  alt="Zenitsu"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="flex items-center gap-1.5 font-orbitron">
                <span className="text-sm sm:text-base font-black tracking-widest text-gray-100 uppercase">
                  ZENITSU{' '}
                  <span className="text-yellow-400 font-extrabold text-xs tracking-wider">
                    // INSTAGRAM AUTOMATION
                  </span>
                </span>
              </div>
            </div>

            {/* User Session & System Status */}
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser ? (
                <>
                  {/* Logged in User Pill */}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-[#121622] border border-yellow-400/40 text-xs font-mono text-yellow-400 shadow-sm">
                    <UserCheck className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="font-bold">{currentUser.displayName}</span>
                    <span className="text-gray-500">[{currentUser.mascotType === 'pig' ? '🐷' : '🐶'}]</span>
                  </div>

                  {/* System Status Node */}
                  <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 border border-yellow-400/40 bg-yellow-400/10 text-[10px] font-bold tracking-widest text-yellow-400 font-mono rounded-sm shadow-[0_0_12px_rgba(250,204,21,0.15)]">
                    <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />
                    STATUS: STABLE_NODE
                  </span>

                  {/* Logout Action Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161a24] hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 border border-[#1e2433] hover:border-rose-500/40 transition text-xs font-mono font-bold"
                    title="Sign out of current terminal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>LOGOUT</span>
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-yellow-400/40 bg-yellow-400/10 text-[10px] font-bold tracking-widest text-yellow-400 font-mono rounded-sm shadow-[0_0_12px_rgba(250,204,21,0.15)]">
                  <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />
                  AUTH_REQUIRED
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main App Content: Gated behind authentication */}
      <div className="flex-1 relative">
        {/* Subtle cyber background lighting effect */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(250,204,21,0.035),transparent_65%)]" />
        </div>

        <div className="relative z-10">
          {currentUser ? (
            <Home />
          ) : (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          )}
        </div>
      </div>

      {/* Tactical Cyber Footer */}
      <footer className="border-t border-[#1e2433] bg-[#050608] py-6 text-center text-xs text-gray-500 font-mono">
        <div className="flex items-center justify-center gap-2">
          <span className="text-yellow-400">//</span>
          <span>ZENITSU MEDIA AUTOMATION ENGINE &bull; 9:16 CAROUSEL PIPELINE</span>
          <span className="text-yellow-400">//</span>
        </div>
      </footer>
    </main>
  );
}
