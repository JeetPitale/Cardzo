"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Garud Verification Engine - Atomic Scan & State Machine Transition
router.post('/verify', auth_1.authenticateToken, (0, auth_1.requireRole)('GARUD', 'ADMIN'), async (req, res) => {
    try {
        const verifierId = req.user.id;
        const { token, location = 'Main Campus Entry Gate' } = req.body;
        if (!token) {
            res.status(400).json({
                success: false,
                status: 'INVALID_TOKEN',
                message: 'No QR token provided.'
            });
            return;
        }
        // 1. Fetch QR token record
        const qrRecord = await prisma_1.prisma.qrToken.findUnique({
            where: { token },
            include: {
                user: {
                    include: { institution: true }
                },
                credential: true
            }
        });
        if (!qrRecord) {
            res.status(400).json({
                success: false,
                status: 'INVALID_TOKEN',
                message: 'Unrecognized or forged QR code.'
            });
            return;
        }
        // 2. Check Expiration
        if (new Date() > qrRecord.expiresAt) {
            res.status(400).json({
                success: false,
                status: 'QR_EXPIRED',
                message: 'QR Code has expired. Cardholder must present a fresh pass.',
                cardholderName: qrRecord.user.name
            });
            return;
        }
        // 3. Check Consumption (Replay prevention)
        if (qrRecord.isConsumed) {
            res.status(400).json({
                success: false,
                status: 'ALREADY_USED',
                message: 'This QR code was already consumed. Replay rejected.',
                cardholderName: qrRecord.user.name,
                consumedAt: qrRecord.consumedAt
            });
            return;
        }
        // 4. Check Credential Status if bound to credential
        if (qrRecord.credential && qrRecord.credential.status !== 'ACTIVE') {
            res.status(400).json({
                success: false,
                status: `CREDENTIAL_${qrRecord.credential.status}`,
                message: `Cardholder credential is ${qrRecord.credential.status.toLowerCase()}. Access denied.`,
                cardholderName: qrRecord.user.name
            });
            return;
        }
        const cardholder = qrRecord.user;
        // 5. ATOMIC STATE TRANSITION TRANSACTION
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Mark token consumed immediately
            await tx.qrToken.update({
                where: { id: qrRecord.id },
                data: {
                    isConsumed: true,
                    consumedAt: new Date(),
                    consumedByVerifierId: verifierId
                }
            });
            // Find active check-in session
            const existingSession = await tx.attendanceSession.findFirst({
                where: {
                    userId: cardholder.id,
                    status: 'CHECKED_IN'
                },
                orderBy: { checkInTimestamp: 'desc' }
            });
            if (!existingSession) {
                // STATE A -> STATE B: CHECK-IN
                const newSession = await tx.attendanceSession.create({
                    data: {
                        userId: cardholder.id,
                        institutionId: cardholder.institutionId,
                        checkInTimestamp: new Date(),
                        checkInVerifierId: verifierId,
                        location,
                        status: 'CHECKED_IN'
                    }
                });
                const event = await tx.attendanceEvent.create({
                    data: {
                        sessionId: newSession.id,
                        userId: cardholder.id,
                        verifierId: verifierId,
                        eventType: 'CHECK_IN',
                        qrTokenId: qrRecord.id,
                        notes: `Checked in at ${location}`
                    }
                });
                await tx.auditLog.create({
                    data: {
                        actorId: verifierId,
                        action: 'VERIFIED_CHECK_IN',
                        targetType: 'ATTENDANCE_SESSION',
                        targetId: newSession.id,
                        details: `Cardholder ${cardholder.name} checked in at ${location}`,
                        ipAddress: req.ip
                    }
                });
                return {
                    action: 'CHECK_IN',
                    status: 'CHECK_IN_SUCCESS',
                    message: 'Check-In Successful',
                    session: newSession,
                    event
                };
            }
            else {
                // STATE B -> STATE A: CHECK-OUT
                const updatedSession = await tx.attendanceSession.update({
                    where: { id: existingSession.id },
                    data: {
                        status: 'CHECKED_OUT',
                        checkOutTimestamp: new Date(),
                        checkOutVerifierId: verifierId
                    }
                });
                const event = await tx.attendanceEvent.create({
                    data: {
                        sessionId: updatedSession.id,
                        userId: cardholder.id,
                        verifierId: verifierId,
                        eventType: 'CHECK_OUT',
                        qrTokenId: qrRecord.id,
                        notes: `Checked out at ${location}`
                    }
                });
                await tx.auditLog.create({
                    data: {
                        actorId: verifierId,
                        action: 'VERIFIED_CHECK_OUT',
                        targetType: 'ATTENDANCE_SESSION',
                        targetId: updatedSession.id,
                        details: `Cardholder ${cardholder.name} checked out at ${location}`,
                        ipAddress: req.ip
                    }
                });
                return {
                    action: 'CHECK_OUT',
                    status: 'CHECK_OUT_SUCCESS',
                    message: 'Check-Out Successful',
                    session: updatedSession,
                    event
                };
            }
        });
        res.json({
            success: true,
            status: result.status,
            action: result.action,
            message: result.message,
            timestamp: new Date().toISOString(),
            cardholder: {
                id: cardholder.id,
                name: cardholder.name,
                department: cardholder.department,
                identifierNumber: cardholder.identifierNumber,
                avatarUrl: cardholder.avatarUrl,
                institutionName: cardholder.institution?.name || 'Campus Member'
            },
            credential: qrRecord.credential ? {
                title: qrRecord.credential.title,
                type: qrRecord.credential.type,
                isVerified: qrRecord.credential.isVerified,
                isScannedPhysical: qrRecord.credential.isScannedPhysical
            } : null,
            session: result.session
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            status: 'VERIFICATION_FAILED',
            error: err.message || 'Verification transaction failed.'
        });
    }
});
// Verifier's recent activity stream
router.get('/activity', auth_1.authenticateToken, (0, auth_1.requireRole)('GARUD', 'ADMIN'), async (req, res) => {
    try {
        const verifierId = req.user.id;
        const recentEvents = await prisma_1.prisma.attendanceEvent.findMany({
            where: { verifierId },
            orderBy: { timestamp: 'desc' },
            take: 25,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        department: true,
                        identifierNumber: true,
                        avatarUrl: true
                    }
                },
                session: true
            }
        });
        res.json({ events: recentEvents });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch verifier activity.' });
    }
});
exports.default = router;
