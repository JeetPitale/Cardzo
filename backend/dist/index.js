"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const cards_1 = __importDefault(require("./routes/cards"));
const qr_1 = __importDefault(require("./routes/qr"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const garud_1 = __importDefault(require("./routes/garud"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Enable CORS
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Body parser
app.use(express_1.default.json({ limit: '25mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '25mb' }));
// Static asset folders
app.use('/assets', express_1.default.static(path_1.default.join(__dirname, '../../assets')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/cards', cards_1.default);
app.use('/api/qr', qr_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/garud', garud_1.default);
app.use('/api/admin', admin_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        system: 'Cardzo Identity & Attendance Engine',
        timestamp: new Date().toISOString()
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});
// Start Server (only listen when run standalone, Vercel uses exported handler)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Cardzo Backend API running on http://localhost:${PORT}`);
        console.log(`📡 Ready for Cardholder mobile app, Garud scanner, and Admin portal.`);
    });
}
exports.default = app;
