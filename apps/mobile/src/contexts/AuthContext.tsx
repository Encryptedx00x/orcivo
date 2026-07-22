import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

export interface AuthUser { id: string; name: string; email: string; }
export interface AuthCompany { id: string; trade_name: string; }
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  company: AuthCompany | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser, company: AuthCompany) => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('access_token');
      const userJson = await SecureStore.getItemAsync('user');
      const companyJson = await SecureStore.getItemAsync('company');
      if (token && userJson && companyJson) {
        setUser(JSON.parse(userJson));
        setCompany(JSON.parse(companyJson));
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    })();
  }, []);

  const setSession = async (accessToken: string, refreshToken: string | undefined, u: AuthUser, c: AuthCompany) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    if (refreshToken) await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(u));
    await SecureStore.setItemAsync('company', JSON.stringify(c));
    setUser(u); setCompany(c); setIsAuthenticated(true);
  };

  const login = async (email: string, password: string) => {
    const data = await api.post<{ access_token: string; refresh_token: string; user: AuthUser; company: AuthCompany }>('/auth/login', { email, password });
    await setSession(data.access_token, data.refresh_token, data.user, data.company);
  };

  const logout = async () => {
    await api.post('/auth/logout', {}).catch(() => {});
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('company');
    setUser(null); setCompany(null); setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, company, login, logout, setSession }}>
      {children}
    </AuthContext.Provider>
  );
}
