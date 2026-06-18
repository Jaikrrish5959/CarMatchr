import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api';

interface Owner {
  email: string;
}

interface AdminAuthState {
  token: string | null;
  owner: Owner | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'));
  const [owner, setOwner] = useState<Owner | null>(() => {
    const stored = localStorage.getItem('adminOwner');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    localStorage.setItem('adminToken', result.token);
    localStorage.setItem('adminOwner', JSON.stringify(result.owner));
    setToken(result.token);
    setOwner(result.owner);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminOwner');
    setToken(null);
    setOwner(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ token, owner, isAuthenticated: !!token, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
