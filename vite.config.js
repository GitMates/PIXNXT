import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'
import { devApiMiddleware } from './server/devApiMiddleware.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Make server-only vars (AWS_*, etc.) available to dev API middleware
  Object.assign(process.env, env)
  const r2Public = env.VITE_R2_PUBLIC_URL?.replace(/\/+$/, '')

  return {
    plugins: [
      react(),
      {
        name: 'pixnxt-dev-api',
        configureServer(server) {
          server.middlewares.use(devApiMiddleware())
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
    server: {
      allowedHosts: 'all',
      ...(r2Public ? {
        proxy: {
          '/api/r2-media': {
            target: r2Public,
            changeOrigin: true,
            rewrite: (p) => {
              // Support /api/r2-media?path=users/... and /api/r2-media/users/...
              const url = new URL(p, 'http://localhost');
              const pathQuery = url.searchParams.get('path');
              if (pathQuery) {
                url.searchParams.delete('path');
                const extra = url.searchParams.toString();
                const encoded = String(pathQuery)
                  .replace(/^\//, '')
                  .split('/')
                  .filter(Boolean)
                  .map((seg) => {
                    try {
                      return encodeURIComponent(decodeURIComponent(seg));
                    } catch {
                      return encodeURIComponent(seg);
                    }
                  })
                  .join('/');
                return `/${encoded}${extra ? `?${extra}` : ''}`;
              }

              const sub = p.replace(/^\/api\/r2-media\/?/, '');
              if (!sub) return '/';
              const qIdx = sub.indexOf('?');
              const pathPart = qIdx >= 0 ? sub.slice(0, qIdx) : sub;
              const query = qIdx >= 0 ? sub.slice(qIdx) : '';
              const encoded = pathPart
                .split('/')
                .filter(Boolean)
                .map((seg) => {
                  try {
                    return encodeURIComponent(decodeURIComponent(seg));
                  } catch {
                    return encodeURIComponent(seg);
                  }
                })
                .join('/');
              return `/${encoded}${query}`;
            },
          },
        },
      } : {}),
    },
  }
})
