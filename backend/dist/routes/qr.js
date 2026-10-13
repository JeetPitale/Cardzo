"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const QR_TOKEN_SECRET = process.env.QR_TOKEN_SECRET || 'cardzo-dynamic-qr-token-secret-salt-2026';
const QR_TOKEN_EXPIRY_SECONDS = parseInt(process.env.QR_TOKEN_EXPIRY_SECONDS || '45', 10);
// Request a new dynamic short-lived QR token
router.post('/generate', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { credentialId } = req.body;
        // Verify user exists and check active attendance state
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                institution: true
            }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        const currentAttendance = await prisma_1.prisma.attendanceSession.findFirst({
            where: {
                userId,
                status: 'CHECKED_IN'
            },
            orderBy: { checkInTimestamp: 'desc' }
        });
        // Generate cryptographically unpredictable token
        const randomNonce = crypto_1.default.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const rawPayload = `${userId}:${credentialId || 'general'}:${timestamp}:${randomNonce}:${QR_TOKEN_SECRET}`;
        const tokenHash = 'CRDZ-' + crypto_1.default.createHash('sha256').update(rawPayload).digest('hex').substring(0, 32);
        const expiresAt = new Date(timestamp + QR_TOKEN_EXPIRY_SECONDS * 1000);
        // Save token in DB
        const qrTokenRecord = await prisma_1.prisma.qrToken.create({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to generate dynamic QR token.' });
    }
});
// Check status of a token (for cardholder client countdown)
router.get('/status/:token', auth_1.authenticateToken, async (req, res) => {
    try {
        const token = String(req.params.token);
        const record = await prisma_1.prisma.qrToken.findUnique({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to check token status.' });
    }
});
exports.default = router;
