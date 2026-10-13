"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const JWT_SECRET = process.env.JWT_SECRET || 'cardzo-super-secret-jwt-key-2026-production';
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Authentication required. No token provided.' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check single-device session active state in database
        const session = await prisma_1.prisma.userSession.findUnique({
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
    }
    catch (err) {
        res.status(403).json({ error: 'Invalid or expired authentication token.' });
    }
}
function requireRole(...allowedRoles) {
    return (req, res, next) => {
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
