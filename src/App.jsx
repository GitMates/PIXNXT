import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ClientGallery from './pages/ClientGallery';
import SmartAlbums from './pages/smart-albums';
import MobileGallery from './pages/mobile-gallery';
import CreateCollection from './pages/CreateCollection';
import CreateFolder from './pages/CreateFolder';
import FolderView from './pages/FolderView';
import CollectionDashboard from './pages/CollectionDashboard';
import PhotoLibrary from './pages/PhotoLibrary';
import GetStarted from './pages/GetStarted';
import Starred from './pages/Starred';
import Homepage from './pages/Homepage';
import Settings from './pages/Settings';
import AccountSettings from './pages/AccountSettings';
import AuthPage from './pages/AuthPage';
import { ProtectedRoute } from './components/features/Auth';
import CollectionList from './pages/public/CollectionList';
import GalleryView from './pages/public/GalleryView';
import GalleryFavoritesHub from './pages/public/GalleryFavoritesHub';
import MobileGalleryInstall from './pages/public/MobileGalleryInstall';
import MobileGalleryClient from './pages/public/MobileGalleryClient';
import PublicAlbumPreview from './pages/smart-albums/PublicAlbumPreview';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UploadQueueProvider, UploadQueueRouteSync } from './contexts/UploadQueueContext';
import { GlobalUploadShell } from './components/features/CollectionDashboard/Upload/GlobalUploadShell';

function MobileGalleryViewRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/m/${slug}/pwa`} replace />;
}

function MobileGalleryPublicRoutes() {
  return (
    <Routes>
      <Route path="/m/:slug/pwa" element={<MobileGalleryClient />} />
      <Route path="/m/:slug/view" element={<MobileGalleryViewRedirect />} />
      <Route path="/m/:slug" element={<MobileGalleryInstall />} />
    </Routes>
  );
}

function App() {
  const host = window.location.hostname;
  const location = useLocation();
  // 1. For local development (e.g., poojz.localhost)
  const devSubdomain = host.endsWith('.localhost') && host !== 'localhost' ? host.split('.')[0] : null;
  
  // 2. For production/preview domains
  const parts = host.split('.');
  let isProductionSubdomain = false;
  if (host.endsWith('.vercel.app')) {
    // Vercel preview and main URLs have 3 parts (e.g. pixnxt.vercel.app). Only treat as subdomain if > 3 parts (e.g. pooja.pixnxt.vercel.app)
    isProductionSubdomain = parts.length > 3 && parts[0] !== 'www';
  } else {
    isProductionSubdomain = parts.length > 2 && parts[0] !== 'www' && !host.endsWith('.localhost');
  }
  const prodSubdomain = isProductionSubdomain ? parts[0] : null;

  const activeSlug = prodSubdomain || devSubdomain;

  const navigate = useNavigate();
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const redirect = new URLSearchParams(location.search).get('redirect');
    if (!redirect) return;
    const target = redirect.startsWith('/') ? redirect : `/${redirect}`;
    navigate(target, { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    const handleThemeChange = () => setThemeTick((t) => t + 1);
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    const isDark = localStorage.getItem('themeMode') === 'dark';
    if (location.pathname === '/') {
      document.body.classList.remove('dark-theme');
    } else if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [location.pathname, themeTick]);

  const hideLayout =
    location.pathname === '/auth' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/client-gallery' ||
    location.pathname.startsWith('/smart-albums') ||
    location.pathname.startsWith('/mobile-gallery') ||
    location.pathname.startsWith('/folders/') ||
    location.pathname === '/collections/create' ||
    location.pathname === '/folders/create' ||
    location.pathname === '/collections/manage' ||
    location.pathname === '/photos' ||
    location.pathname === '/collections/get-started' ||
    location.pathname.startsWith('/starred') ||
    location.pathname === '/homepage' ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/account') ||
    location.pathname === '/collections' ||
    location.pathname.startsWith('/gallery/') ||
    location.pathname.startsWith('/m/') ||
    location.pathname.startsWith('/album-preview/') ||
    /\/smart-albums\/preview\//.test(location.pathname);

  if (location.pathname.startsWith('/m/')) {
    return (
      <UploadQueueProvider>
        <UploadQueueRouteSync />
        <div className="app">
          <MobileGalleryPublicRoutes />
        </div>
      </UploadQueueProvider>
    );
  }

  if (activeSlug) {
    return (
      <UploadQueueProvider>
        <UploadQueueRouteSync />
        <div className="app">
          <Routes>
            <Route path="/" element={<CollectionList slug={activeSlug} />} />
            <Route path="/gallery/:slug/f" element={<GalleryFavoritesHub />} />
            <Route path="/gallery/:slug" element={<GalleryView />} />
            <Route path="/m/:slug/pwa" element={<MobileGalleryClient />} />
            <Route path="/m/:slug/view" element={<MobileGalleryViewRedirect />} />
            <Route path="/m/:slug" element={<MobileGalleryInstall />} />
            {/* Fallback to main app redirect if they try to access dashboard on subdomain */}
            <Route path="*" element={<Navigate to={`http${host.includes('localhost') ? '' : 's'}://${host.replace(activeSlug + '.', '')}/dashboard`} replace />} />
          </Routes>
          <GlobalUploadShell />
        </div>
      </UploadQueueProvider>
    );
  }

  return (
    <UploadQueueProvider>
      <UploadQueueRouteSync />
      <div className="app">
        {!hideLayout && <Header />}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/client-gallery" element={<ClientGallery />} />
          <Route path="/smart-albums/*" element={<ProtectedRoute><SmartAlbums /></ProtectedRoute>} />
          <Route path="/mobile-gallery/*" element={<ProtectedRoute><MobileGallery /></ProtectedRoute>} />
          <Route path="/photos" element={<ProtectedRoute><PhotoLibrary /></ProtectedRoute>} />
          <Route path="/starred" element={<ProtectedRoute><Navigate to="/starred/collections" replace /></ProtectedRoute>} />
          <Route path="/starred/:tab" element={<ProtectedRoute><Starred /></ProtectedRoute>} />
          <Route path="/homepage" element={<Homepage />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/:tab" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Navigate to="/account/profile" replace /></ProtectedRoute>} />
          <Route path="/account/:tab" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="/collections/get-started" element={<ProtectedRoute><GetStarted /></ProtectedRoute>} />
          <Route path="/collections/create" element={<ProtectedRoute><CreateCollection /></ProtectedRoute>} />
          <Route path="/folders/create" element={<ProtectedRoute><CreateFolder /></ProtectedRoute>} />
          <Route path="/folders/:folderId" element={<ProtectedRoute><FolderView /></ProtectedRoute>} />
          <Route
            path="/collections/manage"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <CollectionDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="/collections" element={<CollectionList />} />
          <Route path="/gallery/:slug/f" element={<GalleryFavoritesHub />} />
          <Route path="/gallery/:slug" element={<GalleryView />} />
          <Route path="/m/:slug/pwa" element={<MobileGalleryClient />} />
          <Route path="/m/:slug/view" element={<MobileGalleryViewRedirect />} />
          <Route path="/m/:slug" element={<MobileGalleryInstall />} />
          <Route path="/album-preview/:albumId" element={<PublicAlbumPreview />} />
          <Route path="/ref/:code" element={<ReferralRedirect />} />
        </Routes>

        {!hideLayout && <Footer />}
        <GlobalUploadShell />
      </div>
    </UploadQueueProvider>
  );
}

function ReferralRedirect() {
  const { code } = useParams();
  return <Navigate to={`/auth?mode=signup&ref=${code}`} replace />;
}

export default App;
