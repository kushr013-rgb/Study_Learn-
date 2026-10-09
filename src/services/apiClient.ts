import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

let accessToken = '';

export function getStoredToken(): string {
  return accessToken;
}

export function setStoredToken(token?: string): void {
  accessToken = token ?? '';
}

export function clearStoredTokens(): void {
  accessToken = '';
  try {
    sessionStorage.removeItem('astraprep.token');
    localStorage.removeItem('astraprep.token');
    sessionStorage.removeItem('astraprep.refreshToken');
    localStorage.removeItem('astraprep.refreshToken');
  } catch { /* storage may be unavailable */ }
}

clearStoredTokens();

function buildUrl(path: string, query?: RequestOptions['query']): string {
  // Support both relative /api/v1 paths and absolute URLs
  const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : `${window.location.origin}${API_BASE_URL}`;
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'All') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': csrfToken(),
    },
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const data = await r.json();
      if (data?.data?.accessToken) {
        setStoredToken(data.data.accessToken);
        return true;
      }
      return false;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(method: Method, path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const isMutation = method !== 'GET';
  const token = getStoredToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (isMutation) {
    const csrf = csrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    credentials: 'include',
    signal: options.signal,
    headers,
    body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  if (response.status === 401 && retry) {
    const ok = await refreshSession();
    if (ok) return request<T>(method, path, options, false);
    clearStoredTokens();
    window.location.hash = '#/login';
    throw new ApiError('Your session has expired. Please log in again.', 401, 'SESSION_EXPIRED');
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.code,
      payload?.details,
    );
  }

  // Envelope convention: { data: T, meta?: {...} }
  return (payload?.data ?? payload) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => request<T>('POST', path, { body: formData }),
};

/** Paginated list envelope returned by collection endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
