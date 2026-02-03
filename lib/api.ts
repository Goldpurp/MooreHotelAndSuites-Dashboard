// API Utility audited for enterprise-grade synchronization
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://api.moorehotelandsuites.com';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeout = 15000, silent = false, ...init } = options;
  
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let finalUrl = `${base}${sanitizedEndpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + searchParams.toString();
  }

  const controller = new AbortController();
  const abortId = setTimeout(() => controller.abort(), timeout);

  const headers = new Headers(init.headers);
  const token = sessionStorage.getItem('mhs_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(finalUrl, { 
      ...init, 
      headers,
      signal: controller.signal
    });
    clearTimeout(abortId);

    // Identity Redirection Check
    if (response.redirected || (response.url && response.url.includes('Account/Login'))) {
       if (!endpoint.toLowerCase().includes('login')) {
         sessionStorage.removeItem('mhs_token');
         throw new Error("Authorization Required: Session expired.");
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
      const errorMessage = 
        data.message || 
        data.error || 
        data.title || 
        (data.errors ? Object.values(data.errors).flat().join(', ') : null) || 
        `Server Error (${response.status})`;
      
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(abortId);
    if (error.name === 'AbortError') throw new Error("Connection Timeout: Enterprise node is not responding.");
    throw error;
  }
}

export const api = {
  getToken: () => sessionStorage.getItem('mhs_token'),
  setToken: (token: string) => { if (token) sessionStorage.setItem('mhs_token', token); },
  removeToken: () => sessionStorage.removeItem('mhs_token'),
  get: <T>(e: string, o?: any) => request<T>(e, { method: 'GET', ...o }),
  post: <T>(e: string, b?: any, o?: any) => request<T>(e, { method: 'POST', body: b ? JSON.stringify(b) : undefined, ...o }),
  put: <T>(e: string, b?: any, o?: any) => request<T>(e, { method: 'PUT', body: b ? JSON.stringify(b) : undefined, ...o }),
  patch: <T>(e: string, b?: any, o?: any) => request<T>(e, { method: 'PATCH', body: b ? JSON.stringify(b) : undefined, ...o }),
  delete: <T>(e: string, o?: any) => request<T>(e, { method: 'DELETE', ...o }),
};