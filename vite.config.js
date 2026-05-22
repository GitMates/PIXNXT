import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const r2Public = env.VITE_R2_PUBLIC_URL?.replace(/\/+$/, '')

  return {
    plugins: [react()],
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
    server: r2Public
      ? {
          proxy: {
            '/api/r2-media': {
              target: r2Public,
              changeOrigin: true,
              rewrite: (p) => {
                const sub = p.replace(/^\/api\/r2-media\/?/, '')
                if (!sub) return '/'
                const qIdx = sub.indexOf('?')
                const pathPart = qIdx >= 0 ? sub.slice(0, qIdx) : sub
                const query = qIdx >= 0 ? sub.slice(qIdx) : ''
                const encoded = pathPart
                  .split('/')
                  .filter(Boolean)
                  .map((seg) => {
                    try {
                      return encodeURIComponent(decodeURIComponent(seg))
                    } catch {
                      return encodeURIComponent(seg)
                    }
                  })
                  .join('/')
                return `/${encoded}${query}`
              },
            },
          },
        }
      : undefined,
  }
})
