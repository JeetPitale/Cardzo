const getInitialBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('cardzo_api_base');
    if (saved) return saved;
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl) return envUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000/api';
    }
    return '/api';
  }
  return 'http://localhost:4000/api';
};

class ApiClient {
  private token: string | null = null;
  private onSessionRevokedCallback: (() => void) | null = null;
  private baseUrl: string = getInitialBaseUrl();

  constructor() {
    this.token = typeof localStorage !== 'undefined' ? localStorage.getItem('cardzo_auth_token') : null;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string) {
    const formatted = url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
    this.baseUrl = formatted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cardzo_api_base', formatted);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('cardzo_auth_token', token);
      } else {
        localStorage.removeItem('cardzo_auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  onSessionRevoked(cb: () => void) {
    this.onSessionRevokedCallback = cb;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === 'SESSION_REVOKED') {
          if (this.onSessionRevokedCallback) {
            this.onSessionRevokedCallback();
          }
          throw new Error('Your session was revoked because you logged in on another device.');
        }
        throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err: any) {
      if (err.message === 'Load failed' || err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error(`Cannot reach backend at "${this.baseUrl}". Please verify the backend URL is deployed and accessible.`);
      }
      throw err;
    }
  }
}

export const api = new ApiClient();
