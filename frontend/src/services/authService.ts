// authService.ts
// Handles all authentication HTTP calls and localStorage token management.
import { API_BASE } from './api';

export interface AuthUser {
  id: number;
  email: string;
  username?: string;
  name?: string;
  businessName?: string;
  phone?: string;
  phoneVerified?: boolean;
  role: 'buyer' | 'broker' | 'admin';
  status: 'active' | 'pending';
  license?: string;
  city?: string;
  dealerType?: 'new' | 'used' | 'both';
}

export interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  requiresVerification?: boolean;
  email?: string;
  role?: string;
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
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error || `Login failed. Please check your credentials.` };
    }

    if (data.requiresVerification) {
      return { ok: true, requiresVerification: true, email: data.email, role: data.role };
    }

    const { token, user } = data as { token: string; user: AuthUser };
    saveSession(token, user);

    return { ok: true, token, user };
  } catch {
    return { ok: false, error: 'Server unavailable. Please try again.' };
  }
}

export async function verifyLogin(
  email: string,
  role: string,
  otp: string
): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, otp }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error || 'Verification failed. Please check your code.' };
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
    const res = await fetch(`${API_BASE}/api/auth/register`, {
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

// ─── Google OAuth API calls ───────────────────────────────────────────────────

export interface GoogleLoginResult {
  ok: boolean;
  isNewUser?: boolean;
  email?: string;
  name?: string;
  credential?: string;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export async function loginWithGoogle(credential: string, role: string): Promise<GoogleLoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error || 'Google login failed.' };
    }

    if (data.isNewUser) {
      return {
        ok: true,
        isNewUser: true,
        email: data.email,
        name: data.name,
        credential: data.credential,
      };
    }

    const { token, user } = data as { token: string; user: AuthUser };
    saveSession(token, user);

    return { ok: true, token, user };
  } catch {
    return { ok: false, error: 'Server unavailable. Please try again.' };
  }
}

export async function registerBrokerWithGoogle(data: {
  email: string;
  businessName: string;
  license: string;
  city: string;
  phone: string;
  credential: string;
  dealerType: 'new' | 'used' | 'both';
  phoneOtp?: string;
}): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const body = await res.json();

    if (!res.ok) {
      return { ok: false, error: body.error || 'Google dealer registration failed.' };
    }

    const { token, user } = body as { token: string; user: AuthUser };
    saveSession(token, user);

    return { ok: true, token, user };
  } catch {
    return { ok: false, error: 'Server unavailable. Please try again.' };
  }
}

// ─── Phone OTP API calls ──────────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Failed to send OTP.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Server unavailable. Please try again.' };
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'OTP verification failed.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Server unavailable. Please try again.' };
  }
}
