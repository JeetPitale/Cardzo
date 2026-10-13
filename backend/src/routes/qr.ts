import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const QR_TOKEN_SECRET = process.env.QR_TOKEN_SECRET || 'cardzo-dynamic-qr-token-secret-salt-2026';
const QR_TOKEN_EXPIRY_SECONDS = parseInt(process.env.QR_TOKEN_EXPIRY_SECONDS || '45', 10);

// Request a new dynamic short-lived QR token
router.post('/generate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { credentialId } = req.body;

    // Verify user exists and check active attendance state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        institution: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const currentAttendance = await prisma.attendanceSession.findFirst({
      where: {
        userId,
        status: 'CHECKED_IN'
      },
      orderBy: { checkInTimestamp: 'desc' }
    });

    // Generate cryptographically unpredictable token
    const randomNonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const rawPayload = `${userId}:${credentialId || 'general'}:${timestamp}:${randomNonce}:${QR_TOKEN_SECRET}`;
    const tokenHash = 'CRDZ-' + crypto.createHash('sha256').update(rawPayload).digest('hex').substring(0, 32);

    const expiresAt = new Date(timestamp + QR_TOKEN_EXPIRY_SECONDS * 1000);

    // Save token in DB
    const qrTokenRecord = await prisma.qrToken.create({
      data: {
        token: tokenHash,
        userId,
        credentialId: credentialId || null,
        expiresAt,
        isConsumed: false
      }
    });

    res.json({
      token: tokenHash,
      expiresAt: expiresAt.toISOString(),
      validitySeconds: QR_TOKEN_EXPIRY_SECONDS,
      serverTime: new Date().toISOString(),
      attendanceState: {
        status: currentAttendance ? 'CHECKED_IN' : 'CHECKED_OUT',
        checkedInSince: currentAttendance?.checkInTimestamp || null,
        location: currentAttendance?.location || null
      },
      cardholder: {
        name: user.name,
        department: user.department,
        identifierNumber: user.identifierNumber,
        institutionName: user.institution?.name || 'Authorized Campus'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate dynamic QR token.' });
  }
});

// Check status of a token (for cardholder client countdown)
router.get('/status/:token', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token);
    const record = await prisma.qrToken.findUnique({
      where: { token }
    });

    if (!record) {
      res.status(404).json({ error: 'Token not found.' });
      return;
    }

    const isExpired = new Date() > record.expiresAt;

    res.json({
      token: record.token,
      isExpired,
      isConsumed: record.isConsumed,
      consumedAt: record.consumedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check token status.' });
  }
});

export default router;
