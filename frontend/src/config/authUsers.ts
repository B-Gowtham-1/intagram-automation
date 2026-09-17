// Environment-driven Authentication Configuration
// All user credentials, names, and mascots are loaded dynamically from .env

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  mascotType: 'pig' | 'dog';
  role?: string;
}

const AUTH_STORAGE_KEY = 'zenitsu_auth_session';

export function getStoredSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.username && parsed.displayName) {
      return parsed as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

/**
 * Verify user credentials dynamically via Backend API (/api/auth/login)
 * with a fallback to Vite environment variables (.env).
 * NO credentials are hardcoded in the codebase.
 */
export async function verifyCredentials(username: string, pass: string): Promise<AuthUser | null> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanUser || !cleanPass) return null;

  // 1. Primary: Server-side validation via FastAPI reading directly from root .env
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.user) {
        return {
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.name,
          mascotType: data.user.mascot === 'dog' ? 'dog' : 'pig',
          role: data.user.id === 'user-1' ? 'SYSTEM_ADMINISTRATOR' : 'OPERATIONS_DIRECTOR',
        };
      }
    }
  } catch {
    // Backend offline or unreachable, proceed to client env fallback
  }

  // 2. Client Env Fallback (reads VITE_* injected by Vite from .env)
  const u1User = (import.meta.env.VITE_USER1_USERNAME || '').trim().toLowerCase();
  const u1Pass = (import.meta.env.VITE_USER1_PASSWORD || '').trim();
  const u1Name = import.meta.env.VITE_USER1_NAME || 'USER 1';
  const u1Mascot = (import.meta.env.VITE_USER1_MASCOT || 'pig').toLowerCase() === 'dog' ? 'dog' : 'pig';

  const u2User = (import.meta.env.VITE_USER2_USERNAME || '').trim().toLowerCase();
  const u2Pass = (import.meta.env.VITE_USER2_PASSWORD || '').trim();
  const u2Name = import.meta.env.VITE_USER2_NAME || 'USER 2';
  const u2Mascot = (import.meta.env.VITE_USER2_MASCOT || 'dog').toLowerCase() === 'dog' ? 'dog' : 'pig';

  if (u1User && cleanUser === u1User && cleanPass === u1Pass) {
    return {
      id: 'user-1',
      username: u1User,
      displayName: u1Name,
      mascotType: u1Mascot,
      role: 'SYSTEM_ADMINISTRATOR',
    };
  }

  if (u2User && cleanUser === u2User && cleanPass === u2Pass) {
    return {
      id: 'user-2',
      username: u2User,
      displayName: u2Name,
      mascotType: u2Mascot,
      role: 'OPERATIONS_DIRECTOR',
    };
  }

  return null;
}
