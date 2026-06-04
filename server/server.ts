// ABOUTME: Express server - API routes + Vite dev middleware
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { setupVite } from './vite';
import authRouter from './routes/auth';
import articleRouter from './routes/articles';
import analysisRouter from './routes/analysis';
import rewriteRouter from './routes/rewrite';
import collectionRouter from './routes/collection';
import uploadRouter from './routes/upload';
import analyticsRouter from './routes/analytics';
import adminRouter from './routes/admin';
import settingsRouter from './routes/settings';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';
const port = parseInt(process.env.DEPLOY_RUN_PORT || process.env.PORT || '5000', 10);

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/articles', articleRouter);
app.use('/api/v1/analysis', analysisRouter);
app.use('/api/v1/rewrite', rewriteRouter);
app.use('/api/v1/collection', collectionRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/settings', settingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Vite dev middleware or static serving
async function start(): Promise<void> {
  if (isDev) {
    await setupVite(app, server);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server };
