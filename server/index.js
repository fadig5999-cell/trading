import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import marbleRoutes from './routes/marbles.js';
import salesRoutes from './routes/sales.js';
import dashboardRoutes from './routes/dashboard.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes, { uploadDir } from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Prepare database (schema + defaults + demo data on first run).
seed({ withDemo: process.env.SEED_DEMO !== 'false' });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/marbles', marbleRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- Static assets ---
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));
app.use(express.static(path.join(root, 'public')));

// SPA fallback: any non-API GET returns the app shell.
app.get(/^\/(?!api|uploads).*/, (req, res) => {
  res.sendFile(path.join(root, 'public', 'index.html'));
});

// JSON error handler.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'שגיאת שרת' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  מערכת ניהול מלאי שיש פועלת על http://localhost:${PORT}\n`);
});
