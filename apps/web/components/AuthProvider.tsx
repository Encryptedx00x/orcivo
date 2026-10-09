'use client';
import { createContext, useContext, type ReactNode } from 'react';

export interface AuthUser {
  /** Immutable authenticated-user identifier, when supplied by the session endpoint. */
  id?: string;
  name: string;
}

export interface AuthCompany {
  trade_name: string;
  plan_code: string;
}

export interface AuthState {
  user: AuthUser | null;
  company: AuthCompany | null;
}

const AuthContext = createContext<AuthState>({ user: null, company: null });

export function AuthProvider({
  value,
  children,
}: {
  value: AuthState;
  children: ReactNode;
}): React.JSX.Element {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
