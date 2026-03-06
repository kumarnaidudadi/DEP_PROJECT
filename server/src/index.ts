// Must be set before any imports that establish SSL connections
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load environment variables before any other imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import express from 'express';
import cors from 'cors';
import prisma from './prisma';
import authRoutes from './routes/auth';
import formRoutes from './routes/forms';
import path from 'path';

const app = express();
const port = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/applications', formRoutes); // Alias for backward compat

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'DEP Project Server is running' });
});

// ─── Start Server ─────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
});
