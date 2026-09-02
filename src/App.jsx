import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import {
  applyAppearanceTheme,
  getThemeMode,
  THEME_CHANGE_EVENT,
} from './lib/appearanceTheme';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ClientGallery from './pages/ClientGallery';
import SmartAlbums from './pages/smart-albums';
import MobileGallery from './pages/mobile-gallery';
import GuestDelivery from './pages/guest-delivery';
import PixnxtPortal from './pages/portal';
import CreateCollection from './pages/CreateCollection';
import CreateFolder from './pages/CreateFolder';
import FolderView from './pages/FolderView';
import CollectionDashboard from './pages/CollectionDashboard';
import CollectionShare from './pages/CollectionShare';
import PhotoLibrary from './pages/PhotoLibrary';
import GetStarted from './pages/GetStarted';
import Starred from './pages/Starred';
import Showcase from './pages/Showcase';
import Settings from './pages/Settings';
import AccountSettings from './pages/AccountSettings';
import AuthPage from './pages/AuthPage';
import PresetEditor from './pages/PresetEditor';
import { ProtectedRoute } from './components/features/Auth';
import CollectionList from './pages/public/CollectionList';
import GalleryView from './pages/public/GalleryView';
import GalleryFavoritesHub from './pages/public/GalleryFavoritesHub';
import GallerySelectionDetail from './pages/public/GallerySelectionDetail';
import PublicFavoritesView from './pages/public/PublicFavoritesView';
import GalleryDownloadReady from './pages/public/GalleryDownloadReady';
import MobileGalleryInstall from './pages/public/MobileGalleryInstall';
import MobileGalleryClient from './pages/public/MobileGalleryClient';
import EventGuestRegister from './pages/public/EventGuestRegister';
import EventGuestGallery from './pages/public/EventGuestGallery';
import PublicAlbumPreview from './pages/smart-albums/PublicAlbumPreview';
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UploadQueueProvider, UploadQueueRouteSync } from './contexts/uploadQueue';
import { GlobalUploadShell } from './components/features/CollectionDashboard/Upload/GlobalUploadShell';
import PrintStoreApp from './printstore/PrintStoreApp';
import LabApp from './printstore/lab/LabApp';
import PhotographerApp from './printstore/photographer/PhotographerApp';
import StoreDashboard from './pages/StoreDashboard';
import RekognitionTest from './pages/dev/RekognitionTest';
import WatermarkEditor from './pages/WatermarkEditor';
import EmailTemplateEditor from './pages/EmailTemplateEditor';
import { CustomDomainGalleryApp } from './components/CustomDomainGalleryApp';
import { isPlatformHost, normalizeHost } from './lib/customDomain';
import { hasAuthCallbackInUrl } from './services/auth.service';

function MobileGalleryViewRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/m/${slug}/pwa`} replace />;
}

function ShowcasePortfolioRoute() {
  const { slug } = useParams();
  return <CollectionList slug={slug} />;
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

function RedirectToGuestRegister() {
  const { slug } = useParams();
  return <Navigate to={`/e/${encodeURIComponent(slug || '')}/register`} replace />;
}

function GuestDeliveryPublicRoutes() {
  return (
    <Routes>
      <Route path="/e/:slug/register" element={<EventGuestRegister />} />
      <Route path="/e/:slug" element={<RedirectToGuestRegister />} />
      <Route path="/e/:slug/g/:token" element={<EventGuestGallery />} />
      <Route
        path="/e/*"
        element={
          <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>Link not found</h1>
            <p style={{ color: '#666' }}>This guest delivery link is invalid or incomplete.</p>
          </div>
        }
      />
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
  const normalizedHost = normalizeHost(host);
  const isCustomDomainHost = !isPlatformHost(normalizedHost);

  const navigate = useNavigate();
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const redirect = new URLSearchParams(location.search).get('redirect');
    if (!redirect) return;
    const target = redirect.startsWith('/') ? redirect : `/${redirect}`;
    navigate(target, { replace: true });
  }, [location.search, navigate]);

  // Email confirmation / OAuth callbacks must land on /auth so the session is handled.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (location.pathname === '/auth' || location.pathname === '/auth/google/callback') return;
    if (!hasAuthCallbackInUrl()) return;
    navigate(`/auth${location.search}${window.location.hash}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const handleThemeChange = () => setThemeTick((t) => t + 1);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  useEffect(() => {
    applyAppearanceTheme(getThemeMode(), location.pathname);
  }, [location.pathname, themeTick]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getThemeMode() === 'auto') setThemeTick((t) => t + 1);
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const hideLayout =
    location.pathname === '/auth' ||
    location.pathname === '/auth/google/callback' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/client-gallery' ||
    location.pathname === '/client_gallery' ||
    location.pathname === '/clientgallery' ||
    location.pathname.startsWith('/album-proofer') ||
    location.pathname.startsWith('/smart-albums') ||
    location.pathname.startsWith('/mobile-gallery') ||
    location.pathname.startsWith('/guest-delivery') ||
    location.pathname.startsWith('/portal') ||
    location.pathname.startsWith('/folders/') ||
    location.pathname.startsWith('/deliveries') ||
    location.pathname.startsWith('/collections') ||
    location.pathname === '/folders/create' ||
    location.pathname === '/photos' ||
    location.pathname.startsWith('/starred') ||
    location.pathname === '/showcase' ||
    location.pathname === '/homepage' ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/account') ||
    location.pathname.startsWith('/gallery/') ||
    location.pathname.startsWith('/download/') ||
    location.pathname.startsWith('/m/') ||
    location.pathname.startsWith('/e/') ||
    location.pathname.startsWith('/album-preview/') ||
    location.pathname.startsWith('/p/') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/printstore') ||
    location.pathname.startsWith('/store') ||
    location.pathname.startsWith('/lab') ||
    location.pathname.startsWith('/photographer') ||
    location.pathname.startsWith('/dev/') ||
    /\/album-proofer\/preview\//.test(location.pathname) ||
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

  if (location.pathname.startsWith('/e/')) {
    return (
      <div className="app app--guest-register">
        <GuestDeliveryPublicRoutes />
      </div>
    );
  }

  // Photographer custom domains (gallery.studio.com, www.studio.com, studio.com)
  // must win over the "first label is a PIXNXT slug" heuristic. Otherwise
  // gallery.studio.com is treated as slug "gallery" and never looks up the domain.
  if (isCustomDomainHost) {
    return (
      <UploadQueueProvider>
        <UploadQueueRouteSync />
        <div className="app">
          <CustomDomainGalleryApp hostname={normalizedHost} />
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
            <Route path="/gallery/:slug/f/:listId" element={<PublicFavoritesView />} />
            <Route path="/gallery/:slug/choose" element={<GalleryFavoritesHub />} />
            <Route path="/gallery/:slug/choose/:listId" element={<GallerySelectionDetail />} />
            <Route path="/g/:slug/choose" element={<GalleryFavoritesHub />} />
            <Route path="/g/:slug/choose/:listId" element={<GallerySelectionDetail />} />
            <Route path="/gallery/:slug" element={<GalleryView />} />
            <Route path="/download/:token" element={<GalleryDownloadReady />} />
            <Route path="/m/:slug/pwa" element={<MobileGalleryClient />} />
            <Route path="/m/:slug/view" element={<MobileGalleryViewRedirect />} />
            <Route path="/m/:slug" element={<MobileGalleryInstall />} />
            <Route path="/album-preview/:albumId" element={<PublicAlbumPreview />} />
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

        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/google/callback" element={<AuthPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/client-gallery" element={<ProtectedRoute><ClientGallery /></ProtectedRoute>} />
          <Route path="/client_gallery" element={<Navigate to="/client-gallery" replace />} />
          <Route path="/clientgallery" element={<Navigate to="/client-gallery" replace />} />
          <Route path="/album-proofer/*" element={<ProtectedRoute><SmartAlbums /></ProtectedRoute>} />
          <Route
            path="/smart-albums/*"
            element={<Navigate to={location.pathname.replace(/^\/smart-albums/, '/album-proofer') + location.search} replace />}
          />
          <Route path="/smart-albums" element={<Navigate to="/album-proofer" replace />} />
          <Route path="/mobile-gallery/*" element={<ProtectedRoute><MobileGallery /></ProtectedRoute>} />
          <Route path="/guest-delivery/*" element={<ProtectedRoute><GuestDelivery /></ProtectedRoute>} />
          <Route path="/portal/*" element={<ProtectedRoute><PixnxtPortal /></ProtectedRoute>} />
          <Route path="/photos" element={<ProtectedRoute><PhotoLibrary /></ProtectedRoute>} />
          <Route path="/starred" element={<ProtectedRoute><Navigate to="/starred/deliveries" replace /></ProtectedRoute>} />
          <Route path="/starred/collections" element={<ProtectedRoute><Navigate to="/starred/deliveries" replace /></ProtectedRoute>} />
          <Route path="/starred/:tab" element={<ProtectedRoute><Starred /></ProtectedRoute>} />
          <Route path="/showcase" element={<ProtectedRoute><Showcase /></ProtectedRoute>} />
          <Route path="/homepage" element={<Navigate to="/showcase" replace />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/:tab" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/presets/:id" element={<ProtectedRoute><PresetEditor /></ProtectedRoute>} />
          <Route path="/settings/watermark/create" element={<ProtectedRoute><WatermarkEditor /></ProtectedRoute>} />
          <Route path="/settings/watermark/:id" element={<ProtectedRoute><WatermarkEditor /></ProtectedRoute>} />
          <Route path="/settings/email-templates/create" element={<ProtectedRoute><EmailTemplateEditor /></ProtectedRoute>} />
          <Route path="/settings/email-templates/:id/edit" element={<ProtectedRoute><EmailTemplateEditor /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Navigate to="/account/profile" replace /></ProtectedRoute>} />
          <Route path="/account/:tab" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="/deliveries/get-started" element={<ProtectedRoute><GetStarted /></ProtectedRoute>} />
          <Route path="/deliveries/create" element={<ProtectedRoute><CreateCollection /></ProtectedRoute>} />
          <Route path="/folders/create" element={<ProtectedRoute><CreateFolder /></ProtectedRoute>} />
          <Route path="/folders/:folderId" element={<ProtectedRoute><FolderView /></ProtectedRoute>} />
          <Route
            path="/deliveries/manage"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <CollectionDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveries/manage/share"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <CollectionShare />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="/p/:slug" element={<ShowcasePortfolioRoute />} />
          <Route path="/deliveries" element={<CollectionList />} />
          <Route
            path="/collections/*"
            element={
              <Navigate
                to={location.pathname.replace(/^\/collections/, '/deliveries') + location.search}
                replace
              />
            }
          />
          <Route path="/collections" element={<Navigate to="/deliveries" replace />} />
          <Route path="/gallery/:slug/f" element={<GalleryFavoritesHub />} />
          <Route path="/gallery/:slug/f/:listId" element={<PublicFavoritesView />} />
          <Route path="/gallery/:slug/choose" element={<GalleryFavoritesHub />} />
          <Route path="/gallery/:slug/choose/:listId" element={<GallerySelectionDetail />} />
          <Route path="/g/:slug/choose" element={<GalleryFavoritesHub />} />
          <Route path="/g/:slug/choose/:listId" element={<GallerySelectionDetail />} />
          <Route path="/gallery/:slug" element={<GalleryView />} />
          <Route path="/download/:token" element={<GalleryDownloadReady />} />
          <Route path="/m/:slug/pwa" element={<MobileGalleryClient />} />
          <Route path="/m/:slug/view" element={<MobileGalleryViewRedirect />} />
          <Route path="/m/:slug" element={<MobileGalleryInstall />} />
          <Route path="/album-preview/:albumId" element={<PublicAlbumPreview />} />
          <Route path="/ref/:code" element={<ReferralRedirect />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUserManagement />} />
          </Route>
          <Route path="/printstore" element={<ErrorBoundary><PrintStoreApp /></ErrorBoundary>} />
          <Route path="/store/orders" element={<ProtectedRoute><StoreDashboard /></ProtectedRoute>} />
          <Route path="/lab/*" element={<LabApp />} />
          <Route path="/photographer" element={<PhotographerApp />} />
          <Route path="/dev/rekognition" element={<ProtectedRoute><RekognitionTest /></ProtectedRoute>} />
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
