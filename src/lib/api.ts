/**
 * Central API Client for Dr. Bhushan Parmar Medical Oncology
 * Ensures consistent credentials inclusion, proper status verification,
 * standardized JSON parsing, and unified error handling across Worker & Dev server.
 */

const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || ''
).replace(/\/$/, '');

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const url = apiUrl(path);
  const headers = new Headers(options.headers || {});

  // Default to application/json if body is not FormData or string
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...options,
    credentials: options.credentials || 'include',
    headers
  };

  const res = await fetch(url, fetchOptions);

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (
    contentType.includes('text/html') ||
    (typeof data === 'string' &&
      (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html')))
  ) {
    throw new ApiError('Backend API is not configured.', 503, data);
  }

  if (!res.ok) {
    const errorMsg =
      (typeof data === 'object' && (data?.error || data?.message)) ||
      (typeof data === 'string' && data.length < 200 && data) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(errorMsg, res.status, data);
  }

  return { ok: true, status: res.status, data: data as T };
}

export const api = {
  get: <T = any>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T = any>(path: string, body?: any, options?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  put: <T = any>(path: string, body?: any, options?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  delete: <T = any>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' })
};
