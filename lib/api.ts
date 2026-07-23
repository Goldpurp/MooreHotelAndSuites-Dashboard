import { appConfig } from '../config/environment';

const TOKEN_KEY = 'mhs_token';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
}

export interface ApiCallOptions {
  params?: Record<string, string>;
  silent?: boolean;
}

function joinApiUrl(endpoint: string): string {
  const base = appConfig.apiBaseUrl.replace(/\/+$/, '');
  let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Both frontends use a base ending in /api. Keep compatibility with older
  // dashboard call sites that already include /api without producing /api/api.
  if (base.toLowerCase().endsWith('/api') && path.toLowerCase().startsWith('/api/')) {
    path = path.slice(4);
  } else if (base.toLowerCase().endsWith('/api') && path.toLowerCase() === '/api') {
    path = '';
  }

  return `${base}${path}`;
}

function readMessage(payload: unknown, status: number): string {
  if (status >= 500) return 'The hotel service is temporarily unavailable. Please try again shortly.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (!payload || typeof payload !== 'object') return `Request failed (${status}).`;

  const data = payload as Record<string, unknown>;
  if (data.errors && typeof data.errors === 'object') {
    const errors = Object.values(data.errors as Record<string, unknown>)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));
    if (errors.length) return errors.join(' | ');
  }

  for (const key of ['detail', 'message', 'error', 'title']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return `Request failed (${status}).`;
}

function endSession(reason: 'expired' | 'suspended'): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('mhs:session-ended', { detail: { reason } }));
  } catch {
    // The in-memory UI will still return to login after the request rejects.
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeout = appConfig.requestTimeoutMs, silent = false, ...init } = options;
  let finalUrl = joinApiUrl(endpoint);
  if (params) {
    const query = new URLSearchParams(params).toString();
    if (query) finalUrl += `${finalUrl.includes('?') ? '&' : '?'}${query}`;
  }

  if (!silent && import.meta.env.DEV) {
    console.debug(`[Moore API] ${init.method || 'GET'} ${endpoint.split('?')[0]}`);
  }

  const controller = new AbortController();
  const abortId = window.setTimeout(() => controller.abort(), timeout);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Moore-App-Environment', appConfig.environment);

  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(finalUrl, {
      ...init,
      headers,
      signal: controller.signal,
      cache: token ? 'no-store' : init.cache,
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });

    const apiEnvironment = response.headers.get('X-Moore-API-Environment')?.trim().toLowerCase();
    if (apiEnvironment && apiEnvironment !== appConfig.environment) {
      throw new Error(
        `Environment mismatch: this ${appConfig.environment} dashboard reached the ${apiEnvironment} API.`,
      );
    }

    const payload = response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);

    if (response.status === 401) {
      const hadSession = Boolean(token);
      if (hadSession) endSession('expired');
      throw new Error(hadSession ? 'Your session has expired. Please sign in again.' : readMessage(payload, 401));
    }

    const errorCode =
      payload && typeof payload === 'object'
        ? String((payload as Record<string, unknown>).errorCode ?? '')
        : '';
    if (response.status === 403 && ['ACCOUNT_SUSPENDED', 'SESSION_REVOKED'].includes(errorCode)) {
      endSession(errorCode === 'ACCOUNT_SUSPENDED' ? 'suspended' : 'expired');
    }

    if (!response.ok) throw new Error(readMessage(payload, response.status));
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Connection timed out. Check that the correct API profile is running.');
    }
    if (error instanceof Error) throw error;
    throw new Error('The request could not be completed.');
  } finally {
    window.clearTimeout(abortId);
  }
}

export const api = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
  },
  removeToken: () => sessionStorage.removeItem(TOKEN_KEY),

  get<T>(endpoint: string, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, { method: 'GET', ...options });
  },
  post<T>(endpoint: string, body?: unknown, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body === undefined || body === null ? undefined : JSON.stringify(body),
      ...options,
    });
  },
  put<T>(endpoint: string, body?: unknown, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body === undefined || body === null ? undefined : JSON.stringify(body),
      ...options,
    });
  },
  patch<T>(endpoint: string, body?: unknown, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body === undefined || body === null ? undefined : JSON.stringify(body),
      ...options,
    });
  },
  delete<T>(endpoint: string, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', ...options });
  },
  postForm<T>(endpoint: string, formData: FormData, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body: formData, ...options });
  },
  putForm<T>(endpoint: string, formData: FormData, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body: formData, ...options });
  },
};
