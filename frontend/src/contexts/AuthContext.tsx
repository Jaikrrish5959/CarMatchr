import React, { createContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';

export type UserRole = 'buyer' | 'broker' | 'admin';

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'pending';
  name?: string;
  businessName?: string;
  phone?: string;
  license?: string;
  city?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, roleHint?: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  register: (user: User & { password: string }) => Promise<{ ok: boolean; error?: string; user?: User }>;
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

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
    roleHint?: string
  ): Promise<{ ok: boolean; error?: string; user?: User }> => {
    // authService.login → POST /api/auth/login → gets { token, user } back
    // → saves token & user to localStorage
    const result = await authService.login(email, password, roleHint);

    if (!result.ok || !result.user) {
      return { ok: false, error: result.error };
    }

    setUser(result.user as User);
    return { ok: true, user: result.user as User };
  };

  // ─── Register ────────────────────────────────────────────────────────────────
  const register = async (
    userData: User & { password: string }
  ): Promise<{ ok: boolean; error?: string; user?: User }> => {
    const result = await authService.register(userData);

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
    await fetch(`/api/users/${user.id}/status`, {
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
        register,
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
