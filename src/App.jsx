import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ClientGallery from './pages/ClientGallery';
import CreateCollection from './pages/CreateCollection';
import CollectionDashboard from './pages/CollectionDashboard';
import PhotoLibrary from './pages/PhotoLibrary';
import GetStarted from './pages/GetStarted';
import Starred from './pages/Starred';
import Homepage from './pages/Homepage';
import Settings from './pages/Settings';
import AuthPage from './pages/AuthPage';
import { ProtectedRoute } from './components/features/Auth';
import CollectionList from './pages/public/CollectionList';
import GalleryView from './pages/public/GalleryView';
import GalleryFavoritesHub from './pages/public/GalleryFavoritesHub';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const redirect = new URLSearchParams(location.search).get('redirect');
    if (!redirect) return;
    const target = redirect.startsWith('/') ? redirect : `/${redirect}`;
    navigate(target, { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    // Listen for cross-component theme updates
    const handleThemeChange = () => setThemeTick(t => t + 1);
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

  const hideLayout = location.pathname === '/auth' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/client-gallery' ||
    location.pathname === '/collections/create' ||
    location.pathname === '/collections/manage' ||
    location.pathname === '/photos' ||
    location.pathname === '/collections/get-started' ||
    location.pathname.startsWith('/starred') ||
    location.pathname === '/homepage' ||
    location.pathname.startsWith('/settings') ||
    location.pathname === '/collections' ||
    location.pathname.startsWith('/gallery/');

  return (
    <div className="app">
      {!hideLayout && <Header />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/client-gallery" element={<ClientGallery />} />
        <Route path="/photos" element={<ProtectedRoute><PhotoLibrary /></ProtectedRoute>} />
        <Route path="/starred" element={<ProtectedRoute><Navigate to="/starred/collections" replace /></ProtectedRoute>} />
        <Route path="/starred/:tab" element={<ProtectedRoute><Starred /></ProtectedRoute>} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/:tab" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/collections/get-started" element={<ProtectedRoute><GetStarted /></ProtectedRoute>} />
        <Route path="/collections/create" element={<ProtectedRoute><CreateCollection /></ProtectedRoute>} />
        <Route path="/collections/manage" element={<ProtectedRoute><ErrorBoundary><CollectionDashboard /></ErrorBoundary></ProtectedRoute>} />
        
        {/* Public Gallery Routes */}
        <Route path="/collections" element={<CollectionList />} />
        <Route path="/gallery/:slug/f" element={<GalleryFavoritesHub />} />
        <Route path="/gallery/:slug" element={<GalleryView />} />
      </Routes>

      {!hideLayout && <Footer />}
    </div>
  );
}

export default App;
