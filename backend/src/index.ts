import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import authRouter from './routes/auth';
import cardsRouter from './routes/cards';
import qrRouter from './routes/qr';
import attendanceRouter from './routes/attendance';
import garudRouter from './routes/garud';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static asset folders
app.use('/assets', express.static(path.join(__dirname, '../../assets')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes (mounted under both /api and root to guarantee routing across all deployment topologies)
const apiRoutes = [
  { path: 'auth', router: authRouter },
  { path: 'cards', router: cardsRouter },
  { path: 'qr', router: qrRouter },
  { path: 'attendance', router: attendanceRouter },
  { path: 'garud', router: garudRouter },
  { path: 'admin', router: adminRouter }
];

apiRoutes.forEach(({ path: routePath, router }) => {
  app.use(`/api/${routePath}`, router);
  app.use(`/${routePath}`, router);
});

// Health check
const handleHealth = (req: any, res: any) => {
  res.json({
    status: 'healthy',
    system: 'Cardzo Identity & Attendance Engine',
    database: 'Neon PostgreSQL',
    timestamp: new Date().toISOString()
  });
};
app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

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

export default app;
