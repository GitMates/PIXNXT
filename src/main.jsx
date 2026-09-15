import './lib/threeCompat.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { migrateStripInlineDataFromAlbumLocalStorage } from './lib/albumLocalStorage'
import { installGlobalCrashHooks } from './lib/crashLogger'

migrateStripInlineDataFromAlbumLocalStorage()
installGlobalCrashHooks()

// After a deploy, an already-open tab still references chunk hashes that no
// longer exist; the SPA fallback answers with index.html and the dynamic import
// fails with a MIME error. Reload once to pick up the current build.
window.addEventListener('vite:preloadError', () => {
  const key = 'pixnxt:preload-reload-at'
  const last = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - last < 10000) return
  sessionStorage.setItem(key, String(Date.now()))
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
