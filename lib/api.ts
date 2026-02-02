// ===============================
// API BASE URL
// ===============================

// Fallback to the production API if the environment variable is missing
const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  'https://api.moorehotelandsuites.com';


// ===============================
// ENVIRONMENT FLAGS
// ===============================

// CHANGE: Detect development mode once and reuse
// This prevents logs from appearing in production
const IS_DEV = import.meta.env.MODE === 'development';


// ===============================
// TYPES
// ===============================

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
}


// ===============================
// CORE REQUEST FUNCTION
// ===============================

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    params,
    timeout = 15000,
    silent = false,
    ...init
  } = options;

  // ===============================
  // URL BUILDING
  // ===============================

  const base = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  const sanitizedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  let finalUrl = `${base}${sanitizedEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl = finalUrl + separator + searchParams.toString();
  }

  // ===============================
  // LOGGING (DEV ONLY)
  // ===============================

  // CHANGE: Logs now appear ONLY in development
  // and can still be silenced per request
  if (IS_DEV && !silent) {
    console.debug(
      `[MHS Fetch] ${init.method || 'GET'} -> ${finalUrl}`
    );
  }

  // ===============================
  // TIMEOUT HANDLING
  // ===============================

  const controller = new AbortController();
  const abortId = setTimeout(() => controller.abort(), timeout);

  // ===============================
  // HEADERS
  // ===============================

  const headers = new Headers(init.headers);

  const token = sessionStorage.getItem('mhs_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // CHANGE: Ensure JSON header only when needed
  if (
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(finalUrl, {
      ...init,
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(abortId);

    // ===============================
    // SECURITY REDIRECT DETECTION
    // ===============================

    // CHANGE: Explicit detection of .NET Identity redirect
    if (
      response.redirected ||
      (response.url && response.url.includes('Account/Login'))
    ) {
      if (IS_DEV) {
        console.error(
          `[MHS Security] Unauthorized redirect detected: ${response.url}`
        );
      }

      if (!endpoint.toLowerCase().includes('login')) {
        sessionStorage.removeItem('mhs_token');
        throw new Error(
          'Authorization Required: Your session has expired or is invalid.'
        );
      }
    }

    // ===============================
    // RESPONSE PARSING
    // ===============================

    const text = await response.text();
    let data: any = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // CHANGE: Graceful fallback for non-JSON responses
      data = { raw: text };
    }

    // ===============================
    // ERROR HANDLING
    // ===============================

    if (!response.ok) {
      if (IS_DEV && !silent) {
        console.error(
          `[MHS Protocol Fault] Status ${response.status} at ${finalUrl}:`,
          data
        );
      }

      // CHANGE: Explicit redirect-based 404 detection
      if (
        response.status === 404 &&
        response.url.includes('Account/Login')
      ) {
        throw new Error('Access Denied: Please log in again.');
      }

      const errorMessage =
        data.message ||
        data.error ||
        data.title ||
        (data.errors
          ? Object.values(data.errors).flat().join(', ')
          : null) ||
        `Server Error (${response.status})`;

      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(abortId);

    // CHANGE: Clear timeout error message
    if (error.name === 'AbortError') {
      throw new Error(
        'Connection Timeout: The API server is not responding.'
      );
    }

    throw error;
  }
}


// ===============================
// PUBLIC API WRAPPER
// ===============================

export interface ApiCallOptions {
  params?: Record<string, string>;
  silent?: boolean;
}

export const api = {
  // ===============================
  // TOKEN HELPERS
  // ===============================

  getToken: () => sessionStorage.getItem('mhs_token'),

  setToken: (token: string) => {
    if (token) sessionStorage.setItem('mhs_token', token);
  },

  removeToken: () => sessionStorage.removeItem('mhs_token'),

  // ===============================
  // HTTP METHODS
  // ===============================

  get<T>(
    endpoint: string,
    options?: ApiCallOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      method: 'GET',
      ...options,
    });
  },

  post<T>(
    endpoint: string,
    body?: any,
    options?: ApiCallOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  put<T>(
    endpoint: string,
    body?: any,
    options?: ApiCallOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  patch<T>(
    endpoint: string,
    body?: any,
    options?: ApiCallOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  delete<T>(
    endpoint: string,
    options?: ApiCallOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  },
};
