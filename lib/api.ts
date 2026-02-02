
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeout = 15000, silent = false, ...init } = options;
  
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${BASE_URL}${sanitizedEndpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += (url.includes('?') ? '&' : '?') + searchParams.toString();
  }

  if (!silent) console.debug(`[MHS Fetch] ${init.method || 'GET'} -> ${url}`);

  const controller = new AbortController();
  const abortId = setTimeout(() => controller.abort(), timeout);

  const headers = new Headers(init.headers);
  const token = sessionStorage.getItem('mhs_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, { 
      ...init, 
      headers,
      signal: controller.signal 
    });
    clearTimeout(abortId);

    // CRITICAL: Handle .NET Identity redirects for unauthorized requests
    if (response.redirected && (response.url.includes('Account/Login') || response.url.includes('/login'))) {
       console.error(`[MHS Security Fault] Endpoint ${sanitizedEndpoint} redirected to login. Token rejected or path mismatch.`);
       if (!sanitizedEndpoint.toLowerCase().includes('login')) {
         sessionStorage.removeItem('mhs_token');
         throw new Error("Authorization Rejected: Please re-authenticate.");
       }
    }

    const text = await response.text();
    let data: any = {};
    
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { raw: text };
    }

    if (!response.ok) {
      if (!silent) {
        console.error(`[MHS Protocol Fault] Status ${response.status} at ${url}:`, data);
      }
      throw new Error(data.message || data.title || data.error || `Protocol Error ${response.status}`);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(abortId);
    if (error.name === 'AbortError') throw new Error("Sync Timeout: Enterprise API node unreachable.");
    throw error;
  }
}

export interface ApiCallOptions {
  params?: Record<string, string>;
  silent?: boolean;
}

export const api = {
  getToken: () => sessionStorage.getItem('mhs_token'),
  setToken: (token: string) => {
    if (token) sessionStorage.setItem('mhs_token', token);
  },
  removeToken: () => sessionStorage.removeItem('mhs_token'),

  get<T>(endpoint: string, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, { method: 'GET', ...options });
  },

  post<T>(endpoint: string, body?: any, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });
  },

  put<T>(endpoint: string, body?: any, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });
  },

  patch<T>(endpoint: string, body?: any, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });
  },

  delete<T>(endpoint: string, options?: ApiCallOptions): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', ...options });
  },
};
