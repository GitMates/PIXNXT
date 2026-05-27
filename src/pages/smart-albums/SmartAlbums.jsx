import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import SmartAlbumsSidebarLayout from '../../components/smart-albums/SmartAlbumsSidebarLayout';
import AlbumsList from './AlbumsList';
import StarredAlbumsList from './StarredAlbumsList';
import CreateAlbum from './CreateAlbum';
import AlbumViewer from './AlbumViewer';
import PhotographerAlbumPreview from './PhotographerAlbumPreview';
import SmartAlbumsSettings from './SmartAlbumsSettings';

function AlbumsShell() {
    return (
        <SmartAlbumsSidebarLayout>
            <Outlet />
        </SmartAlbumsSidebarLayout>
    );
}

const SmartAlbums = () => (
    <Routes>
        <Route element={<AlbumsShell />}>
            <Route index element={<AlbumsList />} />
            <Route path="starred" element={<StarredAlbumsList />} />
            <Route path="settings" element={<SmartAlbumsSettings />} />
        </Route>
        <Route path="create" element={<CreateAlbum />} />
        <Route path="preview/:albumId" element={<PhotographerAlbumPreview />} />
        <Route path="album/:albumId" element={<AlbumViewer />} />
        <Route path="*" element={<Navigate to="/smart-albums" replace />} />
    </Routes>
);

export default SmartAlbums;
