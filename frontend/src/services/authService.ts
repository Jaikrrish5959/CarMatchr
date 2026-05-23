// authService.ts
// Handles all authentication HTTP calls and localStorage token management.

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  businessName?: string;
  phone?: string;
  role: 'buyer' | 'broker' | 'admin';
  status: 'active' | 'pending';
  license?: string;
  city?: string;
}

export interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface RegisterResult {
  ok: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

const TOKEN_KEY = 'carmatchr_token';
const USER_KEY = 'carmatchr_user';

// ─── Token helpers ────────────────────────────────────────────────────────────

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSavedUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Sends email + password + role to the backend.
 * On success: saves JWT token and user info to localStorage.
 */
export async function login(
  email: string,
  password: string,
  roleHint?: string
): Promise<LoginResult> {
  const role = roleHint === 'broker' ? 'broker' : roleHint === 'admin' ? 'admin' : 'buyer';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error || `Login failed. Please check your credentials.` };
    }

    const { token, user } = data as { token: string; user: AuthUser };
    saveSession(token, user);

    return { ok: true, token, user };
  } catch {
    return { ok: false, error: 'Server unavailable. Please try again.' };
  }
}

/**
 * POST /api/auth/register
 * Registers a new user. On success: saves JWT token and user info to localStorage.
 */
export async function register(userData: Omit<AuthUser, 'id'> & { password: string }): Promise<RegisterResult> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error || 'Unable to register.' };
    }

    const { token, user } = data as { token: string; user: AuthUser };
    saveSession(token, user);

    return { ok: true, token, user };
  } catch {
    return { ok: false, error: 'Server unavailable. Please try again.' };
  }
}

/**
 * Returns Authorization header for authenticated requests.
 */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
