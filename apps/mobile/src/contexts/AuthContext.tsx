import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, onSessionExpired } from '../services/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}
export interface AuthCompany {
  id: string;
  trade_name: string;
}
export interface CompanyMembership {
  company_id: string;
  trade_name: string;
  role: 'OWNER' | 'ADMIN' | 'TECNICO';
  active?: boolean;
}
interface PendingCompanySelection {
  selection_token: string;
  companies: CompanyMembership[];
}
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  company: AuthCompany | null;
  pendingCompanySelection: PendingCompanySelection | null;
  login: (email: string, password: string) => Promise<void>;
  selectCompany: (companyId: string) => Promise<void>;
  listCompanies: () => Promise<CompanyMembership[]>;
  switchCompany: (companyId: string) => Promise<void>;
  createCompany: (tradeName: string) => Promise<CompanyMembership>;
  acceptExistingInvite: (token: string) => Promise<{ company?: AuthCompany }>;
  cancelCompanySelection: () => void;
  logout: () => Promise<void>;
  setSession: (
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
    company: AuthCompany,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [pendingCompanySelection, setPendingCompanySelection] =
    useState<PendingCompanySelection | null>(null);

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

  const setSession = async (
    accessToken: string,
    refreshToken: string | undefined,
    u: AuthUser,
    c: AuthCompany,
  ) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    if (refreshToken) await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(u));
    await SecureStore.setItemAsync('company', JSON.stringify(c));
    setUser(u);
    setCompany(c);
    setPendingCompanySelection(null);
    setIsAuthenticated(true);
  };

  const login = async (email: string, password: string) => {
    const data = await api.post<
      | {
          access_token: string;
          refresh_token: string;
          user: AuthUser;
          company: AuthCompany;
        }
      | {
          requires_company_selection: true;
          selection_token: string;
          companies: CompanyMembership[];
        }
    >('/auth/login', { email, password });
    if ('requires_company_selection' in data) {
      setPendingCompanySelection({
        selection_token: data.selection_token,
        companies: data.companies,
      });
      return;
    }
    await setSession(data.access_token, data.refresh_token, data.user, data.company);
  };

  const selectCompany = async (companyId: string) => {
    if (!pendingCompanySelection) throw new Error('Seleção de empresa indisponível.');
    const data = await api.post<{
      access_token: string;
      refresh_token: string;
      user: AuthUser;
      company: AuthCompany;
    }>('/auth/select-company', {
      selection_token: pendingCompanySelection.selection_token,
      company_id: companyId,
    });
    await setSession(data.access_token, data.refresh_token, data.user, data.company);
  };

  const listCompanies = () => api.get<CompanyMembership[]>('/companies');

  const switchCompany = async (companyId: string) => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) throw new Error('Sessão expirada.');
    const data = await api.post<{
      access_token: string;
      refresh_token: string;
      user: AuthUser;
      company: AuthCompany;
    }>('/auth/switch-company', { company_id: companyId, refresh_token: refreshToken });
    await setSession(data.access_token, data.refresh_token, data.user, data.company);
  };

  const createCompany = (tradeName: string) =>
    api.post<CompanyMembership>('/companies', { trade_name: tradeName });

  const acceptExistingInvite = (token: string) =>
    api.post<{ company?: AuthCompany }>('/invites/accept-existing', { token });

  const clearSession = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('company');
    setUser(null);
    setCompany(null);
    setPendingCompanySelection(null);
    setIsAuthenticated(false);
  };

  const logout = async () => {
    await api.post('/auth/logout', {}).catch(() => {});
    await clearSession();
  };

  // Refresh token refused (revoked or past 30 days): back to the login screen.
  useEffect(() => {
    onSessionExpired(() => void clearSession());
    return () => onSessionExpired(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        company,
        pendingCompanySelection,
        login,
        selectCompany,
        listCompanies,
        switchCompany,
        createCompany,
        acceptExistingInvite,
        cancelCompanySelection: () => setPendingCompanySelection(null),
        logout,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
