import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Retrieve all cards for authenticated user
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cards = await prisma.credential.findMany({
      where: {
        userId,
        isArchived: false
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        institution: {
          select: { id: true, name: true, code: true, logoUrl: true, primaryColor: true }
        }
      }
    });

    res.json({ cards });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch cards.' });
  }
});

// Get single card detail
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const card = await prisma.credential.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        institution: true
      }
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }

    res.json({ card });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch card.' });
  }
});

// Scan & Save a Physical Card or Add Digital Card
router.post('/scan', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      title,
      type = 'COLLEGE_ID',
      issuerName,
      cardholderName,
      identifier,
      frontImageUrl,
      backImageUrl,
      colorTheme = 'blue',
      category = 'Identity',
      isScannedPhysical = true,
      expiresAt,
      metadata
    } = req.body;

    if (!title || !issuerName || !cardholderName) {
      res.status(400).json({ error: 'Card title, issuer name, and cardholder name are required.' });
      return;
    }

    const newCard = await prisma.credential.create({
      data: {
        userId,
        title,
        type,
        issuerName,
        cardholderName,
        identifier: identifier || null,
        frontImageUrl: frontImageUrl || null,
        backImageUrl: backImageUrl || null,
        colorTheme,
        category,
        isScannedPhysical: Boolean(isScannedPhysical),
        isVerified: false, // Scanned physical cards are NOT auto-verified
        status: 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadataJson: metadata ? JSON.stringify(metadata) : null
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'CARD_SCANNED_SAVED',
        targetType: 'CREDENTIAL',
        targetId: newCard.id,
        details: `Saved card: "${title}" (Physical scan: ${isScannedPhysical})`,
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Card saved successfully to your digital wallet.',
      card: newCard
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save card.' });
  }
});

// Toggle Pin Status
router.patch('/:id/pin', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const card = await prisma.credential.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }

    const updated = await prisma.credential.update({
      where: { id: card.id },
      data: { isPinned: !card.isPinned }
    });

    res.json({ message: 'Card pin status updated.', card: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update pin.' });
  }
});

// Delete Card Securely
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const card = await prisma.credential.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }

    await prisma.credential.delete({
      where: { id: card.id }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'CARD_DELETED',
        targetType: 'CREDENTIAL',
        targetId: card.id,
        details: `Deleted card: "${card.title}"`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Card deleted securely.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete card.' });
  }
});

export default router;
