import React, { createContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';
import { API_BASE } from '../services/api';

export type UserRole = 'buyer' | 'broker' | 'admin';

export interface User {
  id: number;
  email: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'pending';
  name?: string;
  businessName?: string;
  phone?: string;
  phoneVerified?: boolean;
  license?: string;
  city?: string;
  dealerType?: 'new' | 'used' | 'both';
  state?: string;
  address?: string;
  authorizedBrands?: string;
  showroomAddress?: string;
  businessType?: 'dealer' | 'individual';
  description?: string;
  website?: string;
  mapsLink?: string;
  language?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, roleHint?: string) => Promise<{ ok: boolean; error?: string; user?: User; requiresVerification?: boolean; email?: string; role?: string }>;
  verifyLogin: (email: string, role: string, otp: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  register: (user: Omit<User, 'id'> & { password: string }) => Promise<{ ok: boolean; error?: string; user?: User }>;
  loginWithGoogle: (credential: string, role: string) => Promise<authService.GoogleLoginResult>;
  registerBrokerWithGoogle: (data: {
    email: string;
    businessName: string;
    license: string;
    city: string;
    phone: string;
    credential: string;
    dealerType: 'new' | 'used' | 'both';
    phoneOtp?: string;
  }) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateStatus: (status: 'active' | 'pending') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getSavedUser() as User | null);

  // Keep localStorage in sync whenever user state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('carmatchr_user', JSON.stringify(user));
    } else {
      authService.clearSession();
    }
  }, [user]);

  // If the stored session token is missing or no longer valid, clear it early.
  useEffect(() => {
    if (!user) return;

    const token = authService.getToken();
    if (!token) {
      setUser(null);
      authService.clearSession();
      return;
    }

    let cancelled = false;

    const validateSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/data`, {
          headers: authService.authHeaders(),
        });

        if (!cancelled && response.status === 401) {
          setUser(null);
          authService.clearSession();
        }
      } catch {
        // Keep the session if the server is temporarily unavailable.
      }
    };

    validateSession();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
    roleHint?: string
  ): Promise<{ ok: boolean; error?: string; user?: User; requiresVerification?: boolean; email?: string; role?: string }> => {
    const result = await authService.login(email, password, roleHint);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    if (result.requiresVerification) {
      return { ok: true, requiresVerification: true, email: result.email, role: result.role };
    }

    setUser(result.user as User);
    return { ok: true, user: result.user as User };
  };

  const verifyLogin = async (
    email: string,
    role: string,
    otp: string
  ): Promise<{ ok: boolean; error?: string; user?: User }> => {
    const result = await authService.verifyLogin(email, role, otp);

    if (!result.ok || !result.user) {
      return { ok: false, error: result.error };
    }

    setUser(result.user as User);
    return { ok: true, user: result.user as User };
  };

  // ─── Register ────────────────────────────────────────────────────────────────
  const register = async (
    userData: Omit<User, 'id'> & { password: string }
  ): Promise<{ ok: boolean; error?: string; user?: User }> => {
    const result = await authService.register(userData);

    if (!result.ok || !result.user) {
      return { ok: false, error: result.error };
    }

    setUser(result.user as User);
    return { ok: true, user: result.user as User };
  };

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  const loginWithGoogle = async (
    credential: string,
    role: string
  ): Promise<authService.GoogleLoginResult> => {
    const result = await authService.loginWithGoogle(credential, role);

    if (result.ok && result.user) {
      setUser(result.user as User);
    }
    return result;
  };

  const registerBrokerWithGoogle = async (
    data: {
      email: string;
      businessName: string;
      license: string;
      city: string;
      phone: string;
      credential: string;
      dealerType: 'new' | 'used' | 'both';
      phoneOtp?: string;
    }
  ): Promise<{ ok: boolean; error?: string; user?: User }> => {
    const result = await authService.registerBrokerWithGoogle(data);

    if (!result.ok || !result.user) {
      return { ok: false, error: result.error };
    }

    setUser(result.user as User);
    return { ok: true, user: result.user as User };
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    authService.clearSession();
  };

  // ─── Update user in-place (e.g. after saving phone in Settings) ──────────────
  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('carmatchr_user', JSON.stringify(updated));
  };

  // ─── Dev helper – toggle status without reloading ────────────────────────────
  const updateStatus = async (status: 'active' | 'pending') => {
    if (!user) return;
    await fetch(`${API_BASE}/api/users/${user.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authService.authHeaders(),
      },
      body: JSON.stringify({ status }),
    });
    updateUser({ status });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        verifyLogin,
        register,
        loginWithGoogle,
        registerBrokerWithGoogle,
        logout,
        updateUser,
        updateStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
