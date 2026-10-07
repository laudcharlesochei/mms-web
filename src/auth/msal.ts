import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from '@azure/msal-browser';

let instance: PublicClientApplication | null = null;
let scope = '';

export interface EntraSettings {
  clientId: string;
  tenantId: string;
  apiScope: string;
}

/** Microsoft Entra ID sign-in (Authorization Code + PKCE) via MSAL.js. */
export async function initMsal(s: EntraSettings): Promise<AuthenticationResult | null> {
  scope = s.apiScope;
  instance = new PublicClientApplication({
    auth: {
      clientId: s.clientId,
      authority: `https://login.microsoftonline.com/${s.tenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin + '/login',
    },
    cache: { cacheLocation: 'sessionStorage' },
  });
  await instance.initialize();
  const result = await instance.handleRedirectPromise();
  const account = result?.account || instance.getAllAccounts()[0];
  if (account) instance.setActiveAccount(account);
  return result;
}

export function msalAccount(): AccountInfo | null {
  return instance?.getActiveAccount() || null;
}

export async function msalLogin(): Promise<void> {
  if (!instance) throw new Error('Entra ID is not configured');
  await instance.loginRedirect({ scopes: [scope], prompt: 'select_account' });
}

export async function msalToken(): Promise<string | null> {
  if (!instance) return null;
  const account = instance.getActiveAccount();
  if (!account) return null;
  try {
    const r = await instance.acquireTokenSilent({ scopes: [scope], account });
    return r.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect({ scopes: [scope], account });
    }
    return null;
  }
}

export async function msalLogout(): Promise<void> {
  if (!instance) return;
  const account = instance.getActiveAccount();
  await instance.logoutRedirect({ account: account || undefined });
}
