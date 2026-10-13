"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Require Institutional Admin role
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'));
// Analytics Dashboard
router.get('/analytics', async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [totalUsers, totalGarud, activeAttendanceCount, totalCredentials, todayEventsCount, recentAuditLogs] = await Promise.all([
            prisma_1.prisma.user.count({ where: { role: 'CARDHOLDER' } }),
            prisma_1.prisma.user.count({ where: { role: 'GARUD' } }),
            prisma_1.prisma.attendanceSession.count({ where: { status: 'CHECKED_IN' } }),
            prisma_1.prisma.credential.count(),
            prisma_1.prisma.attendanceEvent.count({ where: { timestamp: { gte: todayStart } } }),
            prisma_1.prisma.auditLog.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch analytics.' });
    }
});
// Users list with search and role filter
router.get('/users', async (req, res) => {
    try {
        const { search, role } = req.query;
        const where = {};
        if (role) {
            where.role = String(role);
        }
        if (search) {
            where.OR = [
                { name: { contains: String(search) } },
                { email: { contains: String(search) } },
                { identifierNumber: { contains: String(search) } }
            ];
        }
        const users = await prisma_1.prisma.user.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch users.' });
    }
});
// Update User Role (e.g. grant or revoke Garud Verifier access)
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['CARDHOLDER', 'GARUD', 'ADMIN'].includes(role)) {
            res.status(400).json({ error: 'Invalid role.' });
            return;
        }
        const id = String(req.params.id);
        const targetUser = await prisma_1.prisma.user.update({
            where: { id },
            data: { role }
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                actorId: req.user.id,
                action: 'USER_ROLE_CHANGED',
                targetType: 'USER',
                targetId: targetUser.id,
                details: `Changed role of ${targetUser.name} to ${role}`,
                ipAddress: req.ip
            }
        });
        res.json({ message: 'User role updated successfully.', user: targetUser });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update user role.' });
    }
});
// Bulk Import Users (CSV parser / JSON)
router.post('/users/bulk-import', async (req, res) => {
    try {
        const { users } = req.body; // array of { name, email, department, identifierNumber, role }
        if (!Array.isArray(users) || users.length === 0) {
            res.status(400).json({ error: 'An array of users is required.' });
            return;
        }
        let createdCount = 0;
        const defaultPasswordHash = await bcryptjs_1.default.hash('Welcome123!', 10);
        for (const item of users) {
            if (!item.email || !item.name)
                continue;
            const existing = await prisma_1.prisma.user.findUnique({ where: { email: item.email } });
            if (!existing) {
                await prisma_1.prisma.user.create({
                    data: {
                        name: item.name,
                        email: item.email,
                        passwordHash: defaultPasswordHash,
                        role: item.role || 'CARDHOLDER',
                        department: item.department || 'General',
                        identifierNumber: item.identifierNumber || null,
                        institutionId: req.user.institutionId || null
                    }
                });
                createdCount++;
            }
        }
        await prisma_1.prisma.auditLog.create({
            data: {
                actorId: req.user.id,
                action: 'BULK_USER_IMPORT',
                targetType: 'USER',
                details: `Imported ${createdCount} users from CSV/Data roster`,
                ipAddress: req.ip
            }
        });
        res.json({ message: `Successfully imported ${createdCount} users.`, createdCount });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Bulk import failed.' });
    }
});
// Issue Official Digital Credential
router.post('/credentials/issue', async (req, res) => {
    try {
        const { userId, title, type = 'COLLEGE_ID', issuerName, identifier, colorTheme = 'indigo', category = 'Institutional ID', expiresAt } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'Target user not found.' });
            return;
        }
        const credential = await prisma_1.prisma.credential.create({
            data: {
                userId,
                institutionId: req.user.institutionId || null,
                title,
                type,
                issuerName: issuerName || 'Authorized University Registrar',
                cardholderName: user.name,
                identifier: identifier || user.identifierNumber,
                status: 'ACTIVE',
                isScannedPhysical: false, // Official issued digital pass
                isVerified: true, // Officially issuer-authenticated
                colorTheme,
                category,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                actorId: req.user.id,
                action: 'CREDENTIAL_ISSUED',
                targetType: 'CREDENTIAL',
                targetId: credential.id,
                details: `Issued verified credential "${title}" to ${user.name}`,
                ipAddress: req.ip
            }
        });
        res.status(201).json({ message: 'Digital credential issued successfully.', credential });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to issue credential.' });
    }
});
// Update Credential Status (SUSPEND, REVOKE, ACTIVATE)
router.patch('/credentials/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
            res.status(400).json({ error: 'Invalid status.' });
            return;
        }
        const credId = String(req.params.id);
        const updated = await prisma_1.prisma.credential.update({
            where: { id: credId },
            data: { status }
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                actorId: req.user.id,
                action: `CREDENTIAL_${status}`,
                targetType: 'CREDENTIAL',
                targetId: updated.id,
                details: `Updated credential status to ${status}`,
                ipAddress: req.ip
            }
        });
        res.json({ message: `Credential status updated to ${status}.`, credential: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update credential status.' });
    }
});
// All Attendance Sessions (with filters)
router.get('/attendance', async (req, res) => {
    try {
        const { status, search } = req.query;
        const where = {};
        if (status) {
            where.status = String(status);
        }
        if (search) {
            where.user = {
                OR: [
                    { name: { contains: String(search) } },
                    { email: { contains: String(search) } },
                    { identifierNumber: { contains: String(search) } }
                ]
            };
        }
        const sessions = await prisma_1.prisma.attendanceSession.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch attendance records.' });
    }
});
// Admin Audited Manual Correction for Forgotten Checkout
router.post('/attendance/:id/force-checkout', async (req, res) => {
    try {
        const { reason = 'Forgotten checkout verified by campus administration.' } = req.body;
        const sessionId = String(req.params.id);
        const session = await prisma_1.prisma.attendanceSession.findUnique({
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
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const closed = await tx.attendanceSession.update({
                where: { id: sessionId },
                data: {
                    status: 'CHECKED_OUT',
                    checkOutTimestamp: new Date(),
                    checkOutVerifierId: req.user.id
                }
            });
            await tx.attendanceEvent.create({
                data: {
                    sessionId,
                    userId: session.userId,
                    verifierId: req.user.id,
                    eventType: 'ADMIN_CORRECTION',
                    notes: `Administrative manual checkout: ${reason}`
                }
            });
            await tx.auditLog.create({
                data: {
                    actorId: req.user.id,
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to force checkout.' });
    }
});
// Audit Logs
router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100,
            include: {
                actor: { select: { id: true, name: true, email: true, role: true } }
            }
        });
        res.json({ logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch audit logs.' });
    }
});
exports.default = router;
