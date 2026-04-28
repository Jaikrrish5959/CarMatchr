import React, { createContext, useState, useEffect } from 'react';

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
  login: (email: string, password: string, roleHint?: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  register: (user: User) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => void;
  updateStatus: (status: 'active' | 'pending') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Basic persistence using localStorage for demo
    const saved = localStorage.getItem('carmatchr_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('carmatchr_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('carmatchr_user');
    }
  }, [user]);

  const register = async (userData: User) => {
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
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Server unavailable. Please try again.' };
    }
  };

  const login = async (email: string, password: string, roleHint?: string) => {
    const role: UserRole = roleHint === 'broker' ? 'broker' : roleHint === 'admin' ? 'admin' : 'buyer';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || `No ${role} account found for this email.` };
      }
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Server unavailable. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('carmatchr_user');
  };
  
  // This is a DEV mock function since we don't have the Admin panel yet
  const updateStatus = async (status: 'active' | 'pending') => {
    if (!user) return;
    await fetch(`/api/users/${user.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setUser({ ...user, status });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
