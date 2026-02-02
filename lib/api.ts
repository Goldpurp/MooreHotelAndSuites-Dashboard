const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeout = 15000, silent = false, ...init } = options;
  
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${sanitizedEndpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    const separator = url.includes('?') ? '&' : '?';
    url + separator + searchParams.toString();
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

    // Handle standard redirects or authentication failures
    if (response.status === 401 && !endpoint.toLowerCase().includes('login')) {
       sessionStorage.removeItem('mhs_token');
       throw new Error("Session Expired: Please re-authenticate.");
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
      // Prioritize backend-provided error messages for real-world feedback
      const errorMessage = data.message || data.error || data.title || (data.errors ? Object.values(data.errors).flat().join(', ') : null) || `Error ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(abortId);
    if (error.name === 'AbortError') throw new Error("Connection Timeout: The API server is not responding.");
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