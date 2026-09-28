import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './config/database.js';
import { runMigrations } from './db/migrate.js';
import { errorHandler } from './middleware/error.middleware.js';
import { initSocketServer } from './realtime/socket.js';

import authRoutes from './routes/auth.routes.js';
import territoryRoutes from './routes/territory.routes.js';
import activityRoutes from './routes/activity.routes.js';
import challengesRoutes from './routes/challenges.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import privacyRoutes from './routes/privacy.routes.js';
import demoRoutes from './routes/demo.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Realtime WebSocket Server
const io = initSocketServer(server);

// Helper to validate allowed CORS origins
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (process.env.CLIENT_URL) {
    const configured = process.env.CLIENT_URL.split(',').map((u) => u.trim());
    if (configured.includes(origin)) return true;
  }
  return true; // For testing/demo deployment, allow incoming origin
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'GeoFit Territory Engine (Node/Express/PostgreSQL + Socket.IO)',
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/territory', territoryRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/demo', demoRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Optional: Serve static client build if deployed together
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexHtml = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      next();
    }
  });
}

// Robust Async Server Bootstrap
async function startServer() {
  try {
    initDatabase();
    await runMigrations();

    // Auto-seed initial demo data if database is fresh
    try {
      const { query } = await import('./config/database.js');
      const userRows = await query('SELECT count(*) as count FROM users');
      const count = Number(userRows[0]?.count || 0);
      if (count === 0) {
        console.log('🌱 Fresh database detected. Auto-seeding initial users and challenges...');
        const { runSeed } = await import('./db/seed.js');
        await runSeed();
      }
    } catch (seedErr) {
      console.warn('Notice during startup seed check:', seedErr.message);
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 GeoFit Express & Socket.IO Server running on http://127.0.0.1:${PORT}`);
      console.log(`📡 REST APIs ready at http://127.0.0.1:${PORT}/api`);
      console.log(`⚡ WebSocket grid channel active`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use by another process.`);
        console.error(`👉 Run 'netstat -ano | findstr :${PORT}' and terminate the conflicting process.\n`);
      } else {
        console.error('\n❌ Server listen error:', err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to bootstrap server:', err);
    process.exit(1);
  }
}

startServer();

export { app, server, io };
export default app;

