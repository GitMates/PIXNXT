import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import SidebarLayout from '../../components/SidebarLayout';
import MobileGalleryLayout from '../../components/mobile-gallery/MobileGalleryLayout';
import AppsList from './AppsList';
import ModuleSettings from './ModuleSettings';
import AppDetail from './AppDetail';
import AppPreview from './AppPreview';
import AppShare from './AppShare';
import '../../styles/mobileGalleryTheme.css';
import './MobileGallery.css';

function ModuleShell() {
  return (
    <SidebarLayout productId="mobile-gallery">
      <div className="theme-mono mg-theme mg-main flex-1 min-h-0">
        <Outlet />
      </div>
    </SidebarLayout>
  );
}

const MobileGallery = () => (
  <Routes>
    <Route element={<ModuleShell />}>
      <Route index element={<AppsList />} />
      <Route path="settings" element={<ModuleSettings />} />
    </Route>
    <Route path="app/:appId" element={<AppDetail />} />
    <Route path="app/:appId/share" element={<AppShare />} />
    <Route path="app/:appId/preview" element={<AppPreview />} />
    <Route path="*" element={<Navigate to="/mobile-gallery" replace />} />
  </Routes>
);

export default MobileGallery;
