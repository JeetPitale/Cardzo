export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CARDHOLDER' | 'GARUD' | 'ADMIN';
  department?: string | null;
  identifierNumber?: string | null;
  avatarUrl?: string | null;
  institution?: {
    name: string;
    code: string;
  };
}

export interface CardCredential {
  id: string;
  title: string;
  type: string;
  issuerName: string;
  cardholderName: string;
  identifier?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
  isScannedPhysical: boolean;
  isVerified: boolean;
  colorTheme?: string | null;
  category: string;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  expiresAt?: string | null;
}

export interface DynamicQrToken {
  token: string;
  expiresAt: string;
  validitySeconds: number;
}
