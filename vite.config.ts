import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only: serve the Vercel functions in /api through the Vite dev server so
// `npm run dev` works without `vercel dev`. In production Vercel runs them.
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\/+|\/+$/g, '');
        if (!/^[\w-]+$/.test(name)) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod[req.method ?? 'GET'];
          if (typeof handler !== 'function') { res.statusCode = 405; res.end(); return; }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(`[dev-api] ${(e as Error).stack ?? e}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: false,
  }
});
