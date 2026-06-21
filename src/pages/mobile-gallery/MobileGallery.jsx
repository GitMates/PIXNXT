import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MobileGalleryLayout from '../../components/mobile-gallery/MobileGalleryLayout';
import AppsList from './AppsList';
import ModuleSettings from './ModuleSettings';
import AppDetail from './AppDetail';
import AppPreview from './AppPreview';
import AppShare from './AppShare';

function ModuleShell() {
  return (
    <MobileGalleryLayout>
      <Outlet />
    </MobileGalleryLayout>
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
