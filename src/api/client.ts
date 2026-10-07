import { config } from '@/lib/config';

/** RFC 9457 problem details mapped to an Error the UI can show. */
export class ApiError extends Error {
  status: number;
  code: string;
  errors: Record<string, string>;
  correlationId: string | null;

  constructor(status: number, code: string, message: string, errors: Record<string, string> = {}, correlationId: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.correlationId = correlationId;
  }
}

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;
let unauthorizedHandler: () => void = () => {};

export function setTokenProvider(p: TokenProvider) {
  tokenProvider = p;
}

export function setUnauthorizedHandler(h: () => void) {
  unauthorizedHandler = h;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
  auth?: boolean;
  raw?: boolean;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(config.apiBaseUrl + '/api/v1' + path);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await rawRequest(path, opts);
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export async function rawRequest(path: string, opts: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Correlation-Id': newId(), ...(opts.headers || {}) };
  if (opts.auth !== false) {
    const token = await tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), { method: opts.method || 'GET', headers, body });
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the MMS server. Check your connection and try again.');
  }
  if (!res.ok) {
    let problem: { detail?: string; title?: string; code?: string; errors?: Record<string, string> } = {};
    try {
      problem = await res.json();
    } catch {
      /* not JSON */
    }
    if (res.status === 401 && opts.auth !== false) unauthorizedHandler();
    throw new ApiError(
      res.status,
      problem.code || String(res.status),
      problem.detail || problem.title || res.statusText || 'Request failed',
      problem.errors || {},
      res.headers.get('X-Correlation-Id'),
    );
  }
  return res;
}

/** Download a file (PDF / CSV) with the bearer token and save it in the browser. */
export async function download(path: string, fallbackName: string, query?: RequestOptions['query']): Promise<void> {
  const res = await rawRequest(path, { query, headers: { Accept: '*/*' } });
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: 'POST', body, headers }),
  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: 'PUT', body, headers }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const fields = Object.values(e.errors || {});
    return fields.length ? `${e.message}: ${fields.join('; ')}` : e.message;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}

export { newId };
