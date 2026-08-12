// ABOUTME: Express server - Vite dev middleware + reverse proxy to Python FastAPI backend
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { setupVite } from './vite';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';
const port = parseInt(process.env.DEPLOY_RUN_PORT || process.env.PORT || '5000', 10);
const PYTHON_PORT = parseInt(process.env.PYTHON_PORT || '8000', 10);
const PYTHON_HOST = '127.0.0.1';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Reverse proxy to Python FastAPI backend ──
function proxyToPython(req: express.Request, res: express.Response): void {
  // 前端请求 /api/v1/xxx → Python 后端 /v1/xxx
  const pythonPath = req.originalUrl.replace(/^\/api/, '') || '/';
  const options: http.RequestOptions = {
    hostname: PYTHON_HOST,
    port: PYTHON_PORT,
    path: pythonPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${PYTHON_HOST}:${PYTHON_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.statusCode = proxyRes.statusCode || 500;
    const headersToForward = { ...proxyRes.headers };
    delete headersToForward['transfer-encoding'];
    res.set(headersToForward);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy] Error forwarding to Python backend: ${err.message}`);
    res.status(502).json({
      code: 502,
      message: 'Python backend unavailable',
      data: null,
    });
  });

  // Forward request body
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyStr = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyStr));
    proxyReq.write(bodyStr);
  }

  // For multipart/form-data (file uploads), pipe raw request
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    // Reset: use raw stream for file uploads
    proxyReq.destroy();
    const rawProxy = http.request({
      hostname: PYTHON_HOST,
      port: PYTHON_PORT,
      path: pythonPath,
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 500;
      const h = { ...proxyRes.headers };
      delete h['transfer-encoding'];
      res.set(h);
      proxyRes.pipe(res);
    });
    rawProxy.on('error', (err) => {
      console.error(`[Proxy] Raw proxy error: ${err.message}`);
      res.status(502).json({ code: 502, message: 'Python backend unavailable', data: null });
    });
    req.pipe(rawProxy);
    return;
  }

  proxyReq.end();
}

// All /api/* routes proxy to Python FastAPI backend
app.use('/api', (req, res) => {
  proxyToPython(req, res);
});

// Health check
app.get('/health', (_req, res) => {
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
    console.log(`   Python backend: http://${PYTHON_HOST}:${PYTHON_PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server };
