import { Platform } from 'react-native';
import { User, CardCredential, DynamicQrToken } from '../types';

// Live Cardzo Backend connected to Neon PostgreSQL on Vercel
const DEFAULT_HOST = 'https://cardzo-xi.vercel.app/api';

class MobileApiService {
  private token: string | null = null;
  private onRevokedCallback: (() => void) | null = null;
  private baseUrl: string = DEFAULT_HOST;

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
  }

  setToken(t: string | null) {
    this.token = t;
  }

  getToken(): string | null {
    return this.token;
  }

  onSessionRevoked(cb: () => void) {
    this.onRevokedCallback = cb;
  }

  async request<T = any>(endpoint: string, options: any = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.code === 'SESSION_REVOKED' && this.onRevokedCallback) {
        this.onRevokedCallback();
      }
      throw new Error(data.error || data.message || `Request failed: ${res.status}`);
    }

    return data;
  }

  async login(email: string, pass: string, deviceId: string, deviceName: string, platform: string = 'android') {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: pass,
        deviceId,
        deviceName,
        platform
      })
    });
    this.token = data.token;
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    this.token = null;
  }

  async getCards(): Promise<CardCredential[]> {
    const data = await this.request('/cards');
    return data.cards || [];
  }

  async generateDynamicQr(credentialId?: string): Promise<DynamicQrToken> {
    return await this.request('/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ credentialId })
    });
  }

  async scanCard(cardData: Partial<CardCredential>) {
    return await this.request('/cards/scan', {
      method: 'POST',
      body: JSON.stringify(cardData)
    });
  }

  async verifyGarudToken(token: string, location: string) {
    return await this.request('/garud/verify', {
      method: 'POST',
      body: JSON.stringify({ token, location })
    });
  }

  async getCurrentAttendance() {
    return await this.request('/attendance/current');
  }

  async getAttendanceHistory() {
    return await this.request('/attendance/history');
  }
}

export const mobileApi = new MobileApiService();
