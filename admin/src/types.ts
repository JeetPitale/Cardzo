export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CARDHOLDER' | 'GARUD' | 'ADMIN';
  department?: string | null;
  identifierNumber?: string | null;
  avatarUrl?: string | null;
  institutionId?: string | null;
  institution?: {
    id: string;
    name: string;
    code: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  };
  createdAt?: string;
  _count?: {
    credentials?: number;
    attendanceSessions?: number;
  };
}

export interface Credential {
  id: string;
  userId: string;
  institutionId?: string | null;
  type: string;
  title: string;
  issuerName: string;
  cardholderName: string;
  identifier?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
  isScannedPhysical: boolean;
  isVerified: boolean;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  colorTheme?: string | null;
  category: string;
  isPinned: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  userId: string;
  institutionId?: string | null;
  checkInTimestamp: string;
  checkOutTimestamp?: string | null;
  checkInVerifierId?: string | null;
  checkOutVerifierId?: string | null;
  location?: string | null;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'FORCE_CLOSED';
  user: {
    id: string;
    name: string;
    department?: string | null;
    identifierNumber?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  events?: AttendanceEvent[];
}

export interface AttendanceEvent {
  id: string;
  sessionId: string;
  userId: string;
  verifierId?: string | null;
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'ADMIN_CORRECTION';
  timestamp: string;
  notes?: string | null;
  verifier?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  timestamp: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}
