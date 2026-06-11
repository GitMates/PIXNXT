import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAlbumPhotoRevision } from '../../components/smart-albums/albumPagePhotos';
import { openSmartAlbumPreview } from '../../lib/shareSmartAlbum';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { getAlbumSpreadOptions } from '../../components/smart-albums/albumSpreadUtils';
import AlbumEditor from './AlbumEditor';
import { useAlbumWorkspace, isAlbumPreviewView, parseUrlPage } from './useAlbumWorkspace';
import './AlbumViewer.css';

/**
 * Album editor workspace. Preview opens in a separate tab (like gallery view).
 */
const AlbumViewer = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [photoRevision, setPhotoRevision] = useState(0);
    const {
        albumId,
        album,
        loading,
        totalPages,
        initialPage,
        handlePageChange,
        changePageCount,
        spreadCount,
        patchAlbum,
        minPages,
        maxPages,
        pagesPerSpread,
    } = useAlbumWorkspace();

    useEffect(() => {
        if (albumId) {
            setPhotoRevision(getAlbumPhotoRevision(albumId) || 0);
        }
    }, [albumId, album?.id]);

    useEffect(() => {
        if (!albumId || !user?.id) return;
        smartAlbumsService.syncAlbumPreviewData(user.id, albumId).catch((e) => {
            console.warn('Could not sync album preview snapshot', e);
        });
    }, [albumId, user?.id, photoRevision]);

    useEffect(() => {
        if (!albumId || !isAlbumPreviewView(searchParams)) return;
        const page = parseUrlPage(searchParams.get('page'), totalPages, getAlbumSpreadOptions(album));
        openSmartAlbumPreview(albumId, page);
        const next = new URLSearchParams(searchParams);
        next.delete('view');
        const qs = next.toString();
        navigate(`/smart-albums/album/${albumId}${qs ? `?${qs}` : ''}`, { replace: true });
    }, [album, albumId, searchParams, navigate, totalPages]);

    if (loading) {
        return (
            <div className="av-page">
                <div className="av-loading">Loading album…</div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="av-page">
                <div className="av-topbar">
                    <button type="button" className="av-back-btn" onClick={() => navigate('/smart-albums')}>
                        Back to Albums
                    </button>
                </div>
                <div className="av-loading">Album not found.</div>
            </div>
        );
    }

    return (
        <AlbumEditor
            album={album}
            albumId={albumId}
            onAlbumUpdate={patchAlbum}
            totalPages={totalPages}
            initialPage={initialPage}
            photoRevision={photoRevision}
            onPageChange={handlePageChange}
            onPhotosUploaded={() =>
                setPhotoRevision(getAlbumPhotoRevision(albumId) || Date.now())
            }
            spreadCount={spreadCount}
            onChangePageCount={changePageCount}
            minPages={minPages}
            maxPages={maxPages}
            pagesPerSpread={pagesPerSpread}
        />
    );
};

export default AlbumViewer;
