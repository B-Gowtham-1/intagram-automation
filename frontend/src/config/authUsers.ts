// Authentication Configuration
// User credentials, names, and mascots are embedded directly into the codebase.

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  mascotType: 'pig' | 'dog';
  role?: string;
}

export const EMBEDDED_USERS = {
  user1: {
    id: 'user-1',
    username: 'gowtham',
    pass: '1317',
    name: 'GOWTHAM',
    mascot: 'pig' as const,
    role: 'SYSTEM_ADMINISTRATOR',
  },
  user2: {
    id: 'user-2',
    username: 'manu',
    pass: '1317',
    name: 'MANU',
    mascot: 'dog' as const,
    role: 'OPERATIONS_DIRECTOR',
  },
};

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
 * Verify user credentials directly via in-code embedded authentication,
 * with optional backend validation when available.
 * Does not depend on .env credentials.
 */
export async function verifyCredentials(username: string, pass: string): Promise<AuthUser | null> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanUser || !cleanPass) return null;

  // 1. Try Server-side validation via FastAPI
  try {
    const apiBase = (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : '') + '/api';
    const response = await fetch(`${apiBase}/auth/login`, {
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
    // Backend offline or unreachable, proceed to embedded code verification
  }

  // 2. Embedded In-Code Authentication (works without .env)
  const u1User = (import.meta.env.VITE_USER1_USERNAME || EMBEDDED_USERS.user1.username).trim().toLowerCase();
  const u1Pass = (import.meta.env.VITE_USER1_PASSWORD || EMBEDDED_USERS.user1.pass).trim();
  const u1Name = import.meta.env.VITE_USER1_NAME || EMBEDDED_USERS.user1.name;
  const u1Mascot = ((import.meta.env.VITE_USER1_MASCOT || EMBEDDED_USERS.user1.mascot).toLowerCase() === 'dog' ? 'dog' : 'pig') as 'pig' | 'dog';

  const u2User = (import.meta.env.VITE_USER2_USERNAME || EMBEDDED_USERS.user2.username).trim().toLowerCase();
  const u2Pass = (import.meta.env.VITE_USER2_PASSWORD || EMBEDDED_USERS.user2.pass).trim();
  const u2Name = import.meta.env.VITE_USER2_NAME || EMBEDDED_USERS.user2.name;
  const u2Mascot = ((import.meta.env.VITE_USER2_MASCOT || EMBEDDED_USERS.user2.mascot).toLowerCase() === 'pig' ? 'pig' : 'dog') as 'pig' | 'dog';

  if (cleanUser === u1User && cleanPass === u1Pass) {
    return {
      id: EMBEDDED_USERS.user1.id,
      username: u1User,
      displayName: u1Name,
      mascotType: u1Mascot,
      role: EMBEDDED_USERS.user1.role,
    };
  }

  if (cleanUser === u2User && cleanPass === u2Pass) {
    return {
      id: EMBEDDED_USERS.user2.id,
      username: u2User,
      displayName: u2Name,
      mascotType: u2Mascot,
      role: EMBEDDED_USERS.user2.role,
    };
  }

  return null;
}
