export interface RuntimeConfig {
  apiBaseUrl: string;
  entraClientId?: string;
  entraTenantId?: string;
  entraApiScope?: string;
}

declare global {
  interface Window {
    __MMS_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const fromWindow = (typeof window !== 'undefined' && window.__MMS_CONFIG__) || {};

export const config: RuntimeConfig = {
  apiBaseUrl: (fromWindow.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, ''),
  entraClientId: fromWindow.entraClientId || import.meta.env.VITE_ENTRA_CLIENT_ID || '',
  entraTenantId: fromWindow.entraTenantId || import.meta.env.VITE_ENTRA_TENANT_ID || '',
  entraApiScope: fromWindow.entraApiScope || import.meta.env.VITE_ENTRA_API_SCOPE || '',
};
