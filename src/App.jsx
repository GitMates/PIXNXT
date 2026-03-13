import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

function App() {
  const location = useLocation();
  const hideLayout = location.pathname === '/dashboard' ||
    location.pathname === '/client-gallery' ||
    location.pathname === '/collections/create' ||
    location.pathname === '/collections/manage' ||
    location.pathname === '/photos' ||
    location.pathname === '/collections/get-started' ||
    location.pathname.startsWith('/starred') ||
    location.pathname === '/homepage' ||
    location.pathname.startsWith('/settings');

  return (
    <div className="app">
      {!hideLayout && <Header />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/client-gallery" element={<ClientGallery />} />
        <Route path="/photos" element={<PhotoLibrary />} />
        <Route path="/starred" element={<Navigate to="/starred/collections" replace />} />
        <Route path="/starred/:tab" element={<Starred />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/:tab" element={<Settings />} />
        <Route path="/collections/get-started" element={<GetStarted />} />
        <Route path="/collections/create" element={<CreateCollection />} />
        <Route path="/collections/manage" element={<CollectionDashboard />} />
      </Routes>

      {!hideLayout && <Footer />}
    </div>
  );
}

export default App;
