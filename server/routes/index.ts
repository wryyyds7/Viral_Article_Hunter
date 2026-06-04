import { Router } from 'express';
import type { Request, Response } from 'express';
import http from 'http';

const router = Router();

// Python backend port (uvicorn runs on 8000 internally)
const PYTHON_PORT = parseInt(process.env.PYTHON_PORT || '8000', 10);
const PYTHON_HOST = '127.0.0.1';

// Proxy helper: forward request to Python FastAPI backend
function proxyToPython(req: Request, res: Response): void {
  const url = req.originalUrl;
  const options: http.RequestOptions = {
    hostname: PYTHON_HOST,
    port: PYTHON_PORT,
    path: url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${PYTHON_HOST}:${PYTHON_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Forward status code and headers
    res.statusCode = proxyRes.statusCode || 500;
    const headersToForward = { ...proxyRes.headers };
    // Remove transfer-encoding to avoid conflicts
    delete headersToForward['transfer-encoding'];
    res.set(headersToForward);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy] Error forwarding to Python backend: ${err.message}`);
    res.status(502).json({
      error: 'Python backend unavailable',
      detail: err.message,
    });
  });

  // Forward request body for POST/PUT/PATCH
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyStr = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyStr));
    proxyReq.write(bodyStr);
  }

  proxyReq.end();
}

// Health check - proxy to Python backend
router.get('/health', (req, res) => {
  proxyToPython(req, res);
});

// All /v1/* API routes - proxy to Python FastAPI backend
router.use('/v1', (req, res) => {
  proxyToPython(req, res);
});

// Keep the /api/hello for basic connectivity test
router.get('/api/hello', (req, res) => {
  res.json({
    message: '爆文猎人 - Express + Vite + Python FastAPI',
    timestamp: new Date().toISOString(),
    pythonBackend: `http://${PYTHON_HOST}:${PYTHON_PORT}`,
  });
});

export default router;
