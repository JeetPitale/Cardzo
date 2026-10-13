import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cardzo-super-secret-jwt-key-2026-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cardzo-refresh-secret-jwt-key-2026';

// Register a new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role = 'CARDHOLDER', department, identifierNumber, institutionId } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role.toUpperCase(),
        department,
        identifierNumber,
        institutionId: institutionId || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        identifierNumber: true,
        institutionId: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'Account registered successfully.',
      user
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Sign In with Single-Device Enforcement
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, deviceId = uuidv4(), deviceName = 'Primary Device', platform = 'web' } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { institution: true }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // ATOMIC SINGLE-DEVICE ENFORCEMENT:
    // 1. Invalidate ALL previously active sessions for this user
    await prisma.$transaction(async (tx) => {
      await tx.userSession.updateMany({
        where: {
          userId: user.id,
          isActive: true
        },
        data: {
          isActive: false,
          invalidatedAt: new Date()
        }
      });

      // 2. Upsert device entry
      await tx.device.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId: deviceId
          }
        },
        update: {
          deviceName,
          platform,
          lastActiveAt: new Date()
        },
        create: {
          userId: user.id,
          deviceId: deviceId,
          deviceName,
          platform,
          lastActiveAt: new Date()
        }
      });
    });

    // 3. Generate brand new session token & refresh token
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days session

    const newSession = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken,
        refreshToken,
        isActive: true,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        expiresAt: sessionExpiresAt
      }
    });

    // 4. Log in Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'LOGIN',
        targetType: 'SESSION',
        targetId: newSession.id,
        details: `Logged in on ${deviceName} (${platform}). Prior device sessions invalidated.`,
        ipAddress: req.ip
      }
    });

    // 5. Issue JWT access token containing userId and unique sessionToken
    const accessToken = jwt.sign(
      {
        userId: user.id,
        sessionToken: newSession.sessionToken,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Check active attendance state
    const activeAttendanceSession = await prisma.attendanceSession.findFirst({
      where: {
        userId: user.id,
        status: 'CHECKED_IN'
      },
      orderBy: { checkInTimestamp: 'desc' }
    });

    res.json({
      message: 'Authentication successful. Active session established.',
      token: accessToken,
      refreshToken: refreshToken,
      sessionToken: newSession.sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        identifierNumber: user.identifierNumber,
        avatarUrl: user.avatarUrl,
        institution: user.institution
      },
      attendanceState: {
        isCheckedIn: !!activeAttendanceSession,
        activeSession: activeAttendanceSession || null
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Explicit Logout
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.sessionToken) {
      await prisma.userSession.updateMany({
        where: { sessionToken: req.sessionToken },
        data: {
          isActive: false,
          invalidatedAt: new Date()
        }
      });

      if (req.user) {
        await prisma.auditLog.create({
          data: {
            actorId: req.user.id,
            action: 'LOGOUT',
            targetType: 'SESSION',
            details: 'Explicit user logout',
            ipAddress: req.ip
          }
        });
      }
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Logout failed.' });
  }
});

// Current User Profile & Device Status
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        institution: true,
        devices: {
          orderBy: { lastActiveAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const activeAttendanceSession = await prisma.attendanceSession.findFirst({
      where: {
        userId: user.id,
        status: 'CHECKED_IN'
      },
      orderBy: { checkInTimestamp: 'desc' }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        identifierNumber: user.identifierNumber,
        avatarUrl: user.avatarUrl,
        institution: user.institution,
        devices: user.devices
      },
      attendanceState: {
        isCheckedIn: !!activeAttendanceSession,
        activeSession: activeAttendanceSession || null
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user data.' });
  }
});

export default router;
