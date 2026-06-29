import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import SmartAlbumsSidebarLayout from '../../components/smart-albums/SmartAlbumsSidebarLayout';
import AlbumsList from './AlbumsList';
import AwaitingFeedbackAlbumsList from './AwaitingFeedbackAlbumsList';
import ApprovedAlbumsList from './ApprovedAlbumsList';
import SmartAlbumsSettings from './SmartAlbumsSettings';
import CreateAlbum from './CreateAlbum';
import AlbumViewer from './AlbumViewer';
import PhotographerAlbumPreview from './PhotographerAlbumPreview';

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
            <Route path="awaiting" element={<AwaitingFeedbackAlbumsList />} />
            <Route path="approved" element={<ApprovedAlbumsList />} />
            <Route path="starred" element={<Navigate to="/smart-albums/awaiting" replace />} />
            <Route path="settings" element={<SmartAlbumsSettings />} />
        </Route>
        <Route path="create" element={<CreateAlbum />} />
        <Route path="preview/:albumId" element={<PhotographerAlbumPreview />} />
        <Route path="album/:albumId" element={<AlbumViewer />} />
        <Route path="*" element={<Navigate to="/smart-albums" replace />} />
    </Routes>
);

export default SmartAlbums;
