import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getAlbumPhotoRevision } from '../../components/smart-albums/albumPagePhotos';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import AlbumPreview from './AlbumPreview';
import { parseUrlPage } from './useAlbumWorkspace';
import './AlbumViewer.css';

/**
 * Album preview in its own tab (like collection gallery preview).
 * Shows the client-facing view; photographer can proof comments when published.
 */
export default function PhotographerAlbumPreview() {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [photoRevision, setPhotoRevision] = useState(0);

    useEffect(() => {
        if (!user?.id || !albumId) return undefined;
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await smartAlbumsService.getAlbum(user.id, albumId);
                if (!cancelled) setAlbum(data);
            } catch (e) {
                console.error(e);
                if (!cancelled) setAlbum(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, albumId]);

    useEffect(() => {
        if (albumId) setPhotoRevision(getAlbumPhotoRevision(albumId) || 0);
    }, [albumId, album?.id]);

    const totalPages = album?.page_count || 21;
    const initialPage = parseUrlPage(searchParams.get('page'), totalPages);

    const handlePageChange = (pageIdx) => {
        const next = new URLSearchParams(searchParams);
        next.set('page', String(pageIdx));
        navigate(`/smart-albums/preview/${albumId}?${next.toString()}`, { replace: true });
    };

    if (loading) {
        return (
            <div className="av-page av-page--preview">
                <div className="av-loading">Loading album…</div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="av-page av-page--preview">
                <div className="av-loading">Album not found.</div>
            </div>
        );
    }

    return (
        <AlbumPreview
            album={album}
            albumId={albumId}
            totalPages={totalPages}
            initialPage={initialPage}
            photoRevision={photoRevision}
            onPageChange={handlePageChange}
            minimalChrome
            clientPreview
        />
    );
}
