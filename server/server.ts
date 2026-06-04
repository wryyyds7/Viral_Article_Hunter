// ABOUTME: Express server with Vite integration
// ABOUTME: Handles API routes and serves frontend in dev/prod modes
// ABOUTME: Also starts Python FastAPI backend as a child process

import { createServer, type Server } from 'http';
import express from 'express';
import router from './routes/index';
import { setupVite } from './vite';
import { spawn, type ChildProcess } from 'child_process';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';
const port = parseInt(process.env.PORT || '5000', 10);
const hostname = process.env.HOSTNAME || 'localhost';
const pythonPort = parseInt(process.env.PYTHON_PORT || '8000', 10);
const app = express();
const server = createServer(app);

// Python backend process
let pythonProcess: ChildProcess | null = null;

/**
 * Start Python FastAPI backend as a child process
 */
function startPythonBackend(): void {
  console.log(`🐍 Starting Python backend on port ${pythonPort}...`);

  pythonProcess = spawn('uvicorn', [
    'app.main:app',
    '--host', '0.0.0.0',
    '--port', String(pythonPort),
    ...(isDev ? ['--reload'] : ['--workers', '2']),
  ], {
    cwd: `${process.cwd()}/backend`,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PYTHON_PORT: String(pythonPort) },
  });

  pythonProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python] ${msg}`);
  });

  pythonProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[Python] ${msg}`);
  });

  pythonProcess.on('error', (err) => {
    console.error(`[Python] Failed to start: ${err.message}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`[Python] Process exited with code ${code}`);
    pythonProcess = null;
  });

  // Graceful shutdown
  const cleanup = () => {
    if (pythonProcess) {
      console.log('[Python] Shutting down...');
      pythonProcess.kill('SIGTERM');
      pythonProcess = null;
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

async function startServer(): Promise<Server> {
  // Start Python backend first
  startPythonBackend();

  // Wait for Python backend to be ready
  console.log('⏳ Waiting for Python backend to be ready...');
  const maxRetries = 30;
  const http = await import('http');
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${pythonPort}/health`, (res) => {
          res.resume();
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status: ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      console.log('✅ Python backend is ready!');
      break;
    } catch {
      if (i === maxRetries - 1) {
        console.log('⚠️ Python backend not ready after 30s, starting server anyway...');
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // 请求日志（仅开发环境）
  if (isDev) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${ms}ms`);
      });
      next();
    });
  }

  // 添加请求体解析
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 注册 API 路由（代理到 Python 后端）
  app.use(router);

  // 集成 Vite（开发模式）或静态文件服务（生产模式）
  await setupVite(app);

  // 全局错误处理
  app.use((err: Error, req: express.Request, res: express.Response) => {
    console.error('Server error:', err);
    const status = 'status' in err ? (err as { status?: number }).status ?? 500 : 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
  });

  server.once('error', err => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`\n✨ Server running at http://${hostname}:${port}`);
    console.log(`📝 Environment: ${isDev ? 'development' : 'production'}`);
    console.log(`🐍 Python backend: http://127.0.0.1:${pythonPort}\n`);
  });

  return server;
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
