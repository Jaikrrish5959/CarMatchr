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
  emailVerified?: boolean;
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
  pushNotifications?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  newRequirementAlerts?: boolean;
  offerUpdates?: boolean;
  buyerMessages?: boolean;
  foundingYear?: number;
  isGoogleUser?: boolean;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  marketingConsent?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, roleHint?: string) => Promise<{ ok: boolean; error?: string; user?: User; requiresVerification?: boolean; requiresEmailVerification?: boolean; email?: string; role?: string }>;
  verifyLogin: (email: string, role: string, otp: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  verifyEmailLogin: (email: string, role: string, otp: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  register: (user: Omit<User, 'id'> & { password: string }) => Promise<{ ok: boolean; error?: string; user?: User }>;
  loginWithGoogle: (credential: string, role: string) => Promise<authService.GoogleLoginResult>;
  registerBrokerWithGoogle: (data: {
    email: string;
    businessName: string;
    license: string;
    city: string;
    state: string;
    phone: string;
    credential: string;
    dealerType: 'new' | 'used' | 'both';
    phoneOtp?: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingConsent?: boolean;
  }) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateStatus: (status: 'active' | 'pending') => Promise<void>;
  sendPhoneLoginOtp: (phone: string, role: string) => Promise<{ ok: boolean; error?: string }>;
  verifyPhoneLoginOtp: (phone: string, role: string, otp: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  forgotPassword: (email: string, role: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (email: string, role: string, otp: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
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

  // Sync user language preferences with LanguageProvider
  useEffect(() => {
    if (user && user.language) {
      const event = new CustomEvent('carmatchr_login_sync', { detail: { language: user.language } });
      window.dispatchEvent(event);
    }
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.langName) {
        updateUser({ language: detail.langName });
      }
    };
    window.addEventListener('carmatchr_user_lang_changed', handler);
    return () => window.removeEventListener('carmatchr_user_lang_changed', handler);
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
  ): Promise<{ ok: boolean; error?: string; user?: User; requiresVerification?: boolean; requiresEmailVerification?: boolean; email?: string; role?: string }> => {
    const result = await authService.login(email, password, roleHint);

    if (!result.ok) {
      // Check if backend sent 403 with requiresEmailVerification
      if ((result as any).requiresEmailVerification) {
        return { ok: false, requiresEmailVerification: true, email: (result as any).email, role: (result as any).role, error: result.error };
      }
      return { ok: false, error: result.error };
    }

    if (result.requiresVerification) {
      return { ok: true, requiresVerification: true, email: result.email, role: result.role };
    }

    setUser(result.user as User);
    return { ok: true, user: result.user as User };
  };

  const verifyEmailLogin = async (
    email: string,
    role: string,
    otp: string
  ): Promise<{ ok: boolean; error?: string; user?: User }> => {
    const result = await authService.verifyEmailLogin(email, role, otp);
    if (!result.ok || !result.user) {
      return { ok: false, error: result.error };
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
      state: string;
      phone: string;
      credential: string;
      dealerType: 'new' | 'used' | 'both';
      phoneOtp?: string;
      termsAccepted: boolean;
      privacyAccepted: boolean;
      marketingConsent?: boolean;
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

  const sendPhoneLoginOtp = async (phone: string, role: string) => {
    return await authService.sendPhoneLoginOtp(phone, role);
  };

  const verifyPhoneLoginOtp = async (phone: string, role: string, otp: string) => {
    const result = await authService.verifyPhoneLoginOtp(phone, role, otp);
    if (result.ok && result.user) {
      setUser(result.user as User);
      return { ok: true, user: result.user as User };
    }
    return { ok: false, error: result.error };
  };

  const forgotPassword = async (email: string, role: string) => {
    return await authService.forgotPassword(email, role);
  };

  const resetPassword = async (email: string, role: string, otp: string, newPassword: string) => {
    return await authService.resetPassword(email, role, otp, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        verifyLogin,
        verifyEmailLogin,
        register,
        loginWithGoogle,
        registerBrokerWithGoogle,
        logout,
        updateUser,
        updateStatus,
        sendPhoneLoginOtp,
        verifyPhoneLoginOtp,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
