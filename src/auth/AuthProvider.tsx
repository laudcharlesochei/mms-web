import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setTokenProvider, setUnauthorizedHandler } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { LoginResponse, Me, PublicConfig, Role } from '@/api/types';
import { config as runtime } from '@/lib/config';
import { initMsal, msalAccount, msalLogin, msalLogout, msalToken } from './msal';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'error';

interface Tokens {
  access: string;
  refresh: string;
  accessExp: number;
  refreshExp: number;
}

export interface AuthContextValue {
  status: Status;
  me: Me | null;
  publicConfig: PublicConfig | null;
  notice: string | null;
  loginLocal: (email: string, password: string) => Promise<{ mfaRequired: boolean; challengeToken?: string }>;
  verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  completeLogin: (r: LoginResponse) => Promise<void>;
  loginEntra: () => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKENS_KEY = 'mms.tokens';

function loadTokens(): Tokens | null {
  try {
    const raw = sessionStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(t: Tokens | null) {
  try {
    if (t) sessionStorage.setItem(TOKENS_KEY, JSON.stringify(t));
    else sessionStorage.removeItem(TOKENS_KEY);
  } catch {
    /* storage unavailable */
  }
}

function toTokens(r: LoginResponse): Tokens {
  return {
    access: r.accessToken || '',
    refresh: r.refreshToken || '',
    accessExp: r.accessExpiresAt ? Date.parse(r.accessExpiresAt) : Date.now() + 15 * 60_000,
    refreshExp: r.refreshExpiresAt ? Date.parse(r.refreshExpiresAt) : Date.now() + 30 * 60_000,
  };
}

/**
 * Holds the session (FR-01, FR-04). Local accounts: short-lived access token refreshed while the
 * user is active; signed out after the idle timeout. Entra ID: MSAL.js with silent token renewal.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tokens = useRef<Tokens | null>(loadTokens());
  const refreshing = useRef<Promise<string | null> | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const mode = useRef<'local' | 'entra' | 'dev'>('local');

  const clearSession = useCallback(
    (reason?: string) => {
      tokens.current = null;
      saveTokens(null);
      setMe(null);
      setStatus('signedOut');
      qc.clear();
      if (reason) setNotice(reason);
    },
    [qc],
  );

  // ---- token provider for the API client
  useEffect(() => {
    setTokenProvider(async () => {
      if (mode.current === 'entra') return msalToken();
      const t = tokens.current;
      if (!t) return null;
      if (t.accessExp - Date.now() > 60_000) return t.access;
      if (!t.refresh || t.refreshExp < Date.now()) return null;
      if (!refreshing.current) {
        refreshing.current = api
          .post<LoginResponse>('/auth/refresh', { refreshToken: t.refresh })
          .then((r) => {
            tokens.current = toTokens(r);
            saveTokens(tokens.current);
            return tokens.current.access;
          })
          .catch(() => {
            clearSession('Your session expired. Please sign in again.');
            return null;
          })
          .finally(() => {
            refreshing.current = null;
          });
      }
      return refreshing.current;
    });
    setUnauthorizedHandler(() => clearSession('Your session expired. Please sign in again.'));
  }, [clearSession]);

  const loadMe = useCallback(async () => {
    const m = await endpoints.me();
    setMe(m);
    setStatus('signedIn');
  }, []);

  // ---- start-up
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await endpoints.config();
        if (cancelled) return;
        setPublicConfig(cfg);
        mode.current = cfg.authMode;
        if (cfg.authMode === 'entra') {
          const clientId = runtime.entraClientId || cfg.entraClientId || '';
          const tenantId = runtime.entraTenantId || cfg.entraTenantId || '';
          const apiScope = runtime.entraApiScope || cfg.entraApiScope || '';
          if (!clientId || !tenantId || !apiScope) {
            setNotice('Entra ID is not configured for this site (client id, tenant id, API scope).');
            setStatus('signedOut');
            return;
          }
          const result = await initMsal({ clientId, tenantId, apiScope });
          if (msalAccount()) {
            if (result) await api.post('/auth/session').catch(() => undefined);
            await loadMe();
          } else {
            setStatus('signedOut');
          }
          return;
        }
        if (tokens.current && tokens.current.refreshExp > Date.now()) {
          await loadMe();
        } else {
          clearSession();
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setNotice(`Cannot reach the MMS server at ${runtime.apiBaseUrl}. Check that the API app is running, that API_BASE_URL `
            + 'on the web app points to it, and that CORS_ALLOWED_ORIGIN on the API app is exactly this site\'s address.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, clearSession]);

  // ---- idle timeout (FR-04)
  useEffect(() => {
    if (status !== 'signedIn') return;
    const mark = () => {
      lastActivity.current = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const idleMs = (publicConfig?.idleTimeoutMinutes || 30) * 60_000;
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > idleMs) {
        void logoutRef.current('You were signed out after ' + Math.round(idleMs / 60_000) + ' minutes of inactivity.');
      }
    }, 20_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      window.clearInterval(timer);
    };
  }, [status, publicConfig]);

  const completeLogin = useCallback(
    async (r: LoginResponse) => {
      tokens.current = toTokens(r);
      saveTokens(tokens.current);
      lastActivity.current = Date.now();
      setNotice(r.mfaSetupRequired ? 'Your account must use two-step verification. Set it up under My account.' : null);
      await loadMe();
    },
    [loadMe],
  );

  const loginLocal = useCallback(
    async (email: string, password: string) => {
      const r = await api.post<LoginResponse>('/auth/login', { email, password });
      if (r.mfaRequired) return { mfaRequired: true, challengeToken: r.challengeToken || undefined };
      await completeLogin(r);
      return { mfaRequired: false };
    },
    [completeLogin],
  );

  const verifyMfa = useCallback(
    async (challengeToken: string, code: string) => {
      const r = await api.post<LoginResponse>('/auth/login/mfa', { challengeToken, code });
      await completeLogin(r);
    },
    [completeLogin],
  );

  const logout = useCallback(
    async (reason?: string) => {
      try {
        await api.post('/auth/logout');
      } catch {
        /* best effort */
      }
      if (mode.current === 'entra') {
        clearSession(reason);
        await msalLogout();
        return;
      }
      clearSession(reason);
    },
    [clearSession],
  );
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      publicConfig,
      notice,
      loginLocal,
      verifyMfa,
      completeLogin,
      loginEntra: msalLogin,
      logout,
      refreshMe: loadMe,
      hasRole: (...roles: Role[]) => !!me && roles.some((r) => me.roles.includes(r)),
    }),
    [status, me, publicConfig, notice, loginLocal, verifyMfa, completeLogin, logout, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
