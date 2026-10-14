import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Require Institutional Admin role
router.use(authenticateToken, requireRole('ADMIN'));

// Analytics Dashboard
router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalGarud,
      activeAttendanceCount,
      totalCredentials,
      todayEventsCount,
      recentAuditLogs
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'CARDHOLDER' } }),
      prisma.user.count({ where: { role: 'GARUD' } }),
      prisma.attendanceSession.count({ where: { status: 'CHECKED_IN' } }),
      prisma.credential.count(),
      prisma.attendanceEvent.count({ where: { timestamp: { gte: todayStart } } }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: { actor: { select: { name: true, role: true } } }
      })
    ]);

    res.json({
      metrics: {
        totalCardholders: totalUsers,
        totalVerifiers: totalGarud,
        currentlyCheckedIn: activeAttendanceCount,
        issuedCredentials: totalCredentials,
        todayTransitions: todayEventsCount
      },
      recentAudits: recentAuditLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch analytics.' });
  }
});

// Users list with search and role filter
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role } = req.query;

    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = String(role);
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { identifierNumber: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        identifierNumber: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: { credentials: true, attendanceSessions: true }
        }
      }
    });

    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch users.' });
  }
});

// Create a single User
router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'CARDHOLDER', department, identifierNumber } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password || 'Password123!', 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role.toUpperCase(),
        department: department || 'General',
        identifierNumber: identifierNumber || null,
        institutionId: req.user!.institutionId || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        identifierNumber: true,
        avatarUrl: true,
        createdAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'USER_CREATED',
        targetType: 'USER',
        targetId: newUser.id,
        details: `Created new ${newUser.role} user: ${newUser.name} (${newUser.email})`,
        ipAddress: req.ip
      }
    });

    res.status(201).json({ message: 'User created successfully.', user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user.' });
  }
});

// Update User Details
router.patch('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, email, department, identifierNumber, role, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const data: any = {};
    if (name) data.name = name;
    if (department !== undefined) data.department = department;
    if (identifierNumber !== undefined) data.identifierNumber = identifierNumber;
    if (role && ['CARDHOLDER', 'GARUD', 'ADMIN'].includes(role)) data.role = role;

    if (email && email !== existing.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email } });
      if (emailInUse) {
        res.status(409).json({ error: 'Email is already taken by another account.' });
        return;
      }
      data.email = email;
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        identifierNumber: true,
        avatarUrl: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'USER_UPDATED',
        targetType: 'USER',
        targetId: updatedUser.id,
        details: `Updated details for ${updatedUser.name} (${updatedUser.email})`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User updated successfully.', user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user.' });
  }
});

// Delete User
router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (id === req.user!.id) {
      res.status(400).json({ error: 'You cannot delete your own administrative account.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'USER_DELETED',
        targetType: 'USER',
        targetId: id,
        details: `Deleted user: ${user.name} (${user.email})`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User and associated records deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete user.' });
  }
});

// Update User Role (e.g. grant or revoke Garud Verifier access)
router.patch('/users/:id/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    if (!['CARDHOLDER', 'GARUD', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid role.' });
      return;
    }

    const id = String(req.params.id);
    const targetUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'USER_ROLE_CHANGED',
        targetType: 'USER',
        targetId: targetUser.id,
        details: `Changed role of ${targetUser.name} to ${role}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User role updated successfully.', user: targetUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user role.' });
  }
});

// Bulk Import Users (CSV parser / JSON)
router.post('/users/bulk-import', async (req: Request, res: Response): Promise<void> => {
  try {
    const { users } = req.body; // array of { name, email, department, identifierNumber, role }
    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({ error: 'An array of users is required.' });
      return;
    }

    let createdCount = 0;
    const defaultPasswordHash = await bcrypt.hash('Welcome123!', 10);

    for (const item of users) {
      if (!item.email || !item.name) continue;
      const existing = await prisma.user.findUnique({ where: { email: item.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            name: item.name,
            email: item.email,
            passwordHash: defaultPasswordHash,
            role: item.role || 'CARDHOLDER',
            department: item.department || 'General',
            identifierNumber: item.identifierNumber || null,
            institutionId: req.user!.institutionId || null
          }
        });
        createdCount++;
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'BULK_USER_IMPORT',
        targetType: 'USER',
        details: `Imported ${createdCount} users from CSV/Data roster`,
        ipAddress: req.ip
      }
    });

    res.json({ message: `Successfully imported ${createdCount} users.`, createdCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Bulk import failed.' });
  }
});

// List All Credentials across the institution
router.get('/credentials', async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials = await prisma.credential.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true, identifierNumber: true }
        },
        institution: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    res.json({ credentials });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch credentials.' });
  }
});

// Issue Official Digital Credential
router.post('/credentials/issue', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      title,
      type = 'COLLEGE_ID',
      issuerName,
      identifier,
      colorTheme = 'indigo',
      category = 'Institutional ID',
      expiresAt
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Target user not found.' });
      return;
    }

    const credential = await prisma.credential.create({
      data: {
        userId,
        institutionId: req.user!.institutionId || null,
        title,
        type,
        issuerName: issuerName || 'Authorized University Registrar',
        cardholderName: user.name,
        identifier: identifier || user.identifierNumber,
        status: 'ACTIVE',
        isScannedPhysical: false, // Official issued digital pass
        isVerified: true,         // Officially issuer-authenticated
        colorTheme,
        category,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'CREDENTIAL_ISSUED',
        targetType: 'CREDENTIAL',
        targetId: credential.id,
        details: `Issued verified credential "${title}" to ${user.name}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json({ message: 'Digital credential issued successfully.', credential });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to issue credential.' });
  }
});

// Update Credential Status (SUSPEND, REVOKE, ACTIVATE)
router.patch('/credentials/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }

    const credId = String(req.params.id);
    const updated = await prisma.credential.update({
      where: { id: credId },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: `CREDENTIAL_${status}`,
        targetType: 'CREDENTIAL',
        targetId: updated.id,
        details: `Updated credential status to ${status}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: `Credential status updated to ${status}.`, credential: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update credential status.' });
  }
});

// Delete Credential permanently as Admin
router.delete('/credentials/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const cred = await prisma.credential.findUnique({ where: { id } });

    if (!cred) {
      res.status(404).json({ error: 'Credential not found.' });
      return;
    }

    await prisma.credential.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'CREDENTIAL_DELETED',
        targetType: 'CREDENTIAL',
        targetId: id,
        details: `Permanently deleted credential "${cred.title}" for ${cred.cardholderName}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Credential deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete credential.' });
  }
});

// All Attendance Sessions (with filters)
router.get('/attendance', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { identifierNumber: { contains: String(search), mode: 'insensitive' } }
        ]
      };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      orderBy: { checkInTimestamp: 'desc' },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, department: true, identifierNumber: true, email: true }
        },
        events: {
          include: {
            verifier: { select: { id: true, name: true } }
          }
        }
      }
    });

    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch attendance records.' });
  }
});

// Admin Audited Manual Correction for Forgotten Checkout
router.post('/attendance/:id/force-checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason = 'Forgotten checkout verified by campus administration.' } = req.body;
    const sessionId = String(req.params.id);

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session) {
      res.status(404).json({ error: 'Attendance session not found.' });
      return;
    }

    if (session.status !== 'CHECKED_IN') {
      res.status(400).json({ error: 'This session is already checked out.' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const closed = await tx.attendanceSession.update({
        where: { id: sessionId },
        data: {
          status: 'CHECKED_OUT',
          checkOutTimestamp: new Date(),
          checkOutVerifierId: req.user!.id
        }
      });

      await tx.attendanceEvent.create({
        data: {
          sessionId,
          userId: session.userId,
          verifierId: req.user!.id,
          eventType: 'ADMIN_CORRECTION',
          notes: `Administrative manual checkout: ${reason}`
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'ADMIN_FORCE_CHECKOUT',
          targetType: 'ATTENDANCE_SESSION',
          targetId: sessionId,
          details: `Manual checkout for ${session.user.name}. Reason: ${reason}`,
          ipAddress: req.ip
        }
      });

      return closed;
    });

    res.json({
      message: 'Audited manual checkout executed successfully.',
      session: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to force checkout.' });
  }
});

// Audit Logs
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs.' });
  }
});

export default router;
