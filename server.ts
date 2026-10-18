import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';

async function startServer() {
  const app = express();
  // Render and other hosts assign the port dynamically; fall back to 3000 locally.
  const PORT = Number(process.env.PORT) || 3000;

  // Gzip JSON state polls, JS bundles and HTML — big win for mobile viewers
  app.use(compression());

  // JSON and URL-encoded body parser with generous limits for logos and exports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', tournament: 'RBPL 2026' });
  });

  app.use('/api', apiRouter);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RBPL 2026 Auction Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
