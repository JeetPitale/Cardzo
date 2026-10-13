import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId?: string | null;
  department?: string | null;
  identifierNumber?: string | null;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'cardzo-super-secret-jwt-key-2026-production';

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      sessionToken: string;
    };

    // Check single-device session active state in database
    const session = await prisma.userSession.findUnique({
      where: { sessionToken: decoded.sessionToken },
      include: { user: true }
    });

    if (!session || !session.isActive) {
      res.status(401).json({
        code: 'SESSION_REVOKED',
        error: 'Active session revoked',
        message: 'Your session has been invalidated because this account signed in on another device.'
      });
      return;
    }

    if (new Date() > session.expiresAt) {
      res.status(401).json({
        code: 'SESSION_EXPIRED',
        error: 'Session expired',
        message: 'Your session has expired. Please log in again.'
      });
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      institutionId: session.user.institutionId,
      department: session.user.department,
      identifierNumber: session.user.identifierNumber,
      sessionId: session.id
    };
    req.sessionToken = session.sessionToken;

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}
