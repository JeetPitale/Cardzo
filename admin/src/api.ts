const API_BASE = 'http://localhost:4000/api';

class ApiClient {
  private token: string | null = null;
  private onSessionRevokedCallback: (() => void) | null = null;

  constructor() {
    this.token = localStorage.getItem('cardzo_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('cardzo_auth_token', token);
    } else {
      localStorage.removeItem('cardzo_auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  onSessionRevoked(cb: () => void) {
    this.onSessionRevokedCallback = cb;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
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
      throw err;
    }
  }
}

export const api = new ApiClient();
