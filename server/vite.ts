// ABOUTME: Vite integration for Express server
import type { Application } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer, type InlineConfig } from 'vite';
import viteConfig from '../vite.config';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';

export async function setupVite(app: Application, server: import('http').Server): Promise<void> {
  const config = viteConfig as InlineConfig;
  const serverConfig = typeof config.server === 'object' && config.server ? config.server : {};
  const hmrConfig = typeof serverConfig.hmr === 'object' && serverConfig.hmr ? serverConfig.hmr : {};

  const vite = await createViteServer({
    ...config,
    server: {
      ...serverConfig,
      middlewareMode: true,
      hmr: {
        ...hmrConfig,
        server,
      },
    },
    appType: 'spa',
  });

  app.use(vite.middlewares);
  console.log('🚀 Vite dev server initialized');
}

export function setupStaticServer(app: Application): void {
  const distPath = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist folder not found. Please run "pnpm build" first.');
    process.exit(1);
  }
  const express = require('express');
  app.use(express.static(distPath));
  app.get('*', (_req: import('express').Request, res: import('express').Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
