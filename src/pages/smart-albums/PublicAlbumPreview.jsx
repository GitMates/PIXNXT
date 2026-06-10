import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getAlbumPhotoRevision } from '../../components/smart-albums/albumPagePhotos';
import { hydrateAlbumPreviewData, clearAlbumPreviewDataCache } from '../../components/smart-albums/albumPreviewData';
import { smartAlbumCommentsService } from '../../services/smartAlbumComments.service';
import AlbumPreview from './AlbumPreview';
import { getAlbumSpreadOptions } from '../../components/smart-albums/albumSpreadUtils';
import { parseUrlPage } from './useAlbumWorkspace';
import './AlbumViewer.css';

/**
 * Public share link: album preview + per-spread comments (no login required).
 */
export default function PublicAlbumPreview() {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [photoRevision, setPhotoRevision] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await smartAlbumCommentsService.getAlbumPublic(albumId);
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
    }, [albumId]);

    useEffect(() => {
        if (album?.preview_data) {
            hydrateAlbumPreviewData(albumId, album.preview_data);
        }
    }, [albumId, album?.preview_data]);

    useEffect(() => {
        return () => {
            clearAlbumPreviewDataCache(albumId);
        };
    }, [albumId]);

    useEffect(() => {
        if (albumId) setPhotoRevision(getAlbumPhotoRevision(albumId) || 0);
    }, [albumId, album?.id, album?.preview_data]);

    const totalPages = album?.page_count || 21;
    const spreadOpts = getAlbumSpreadOptions(album);
    const initialPage = parseUrlPage(searchParams.get('page'), totalPages, spreadOpts);

    const handlePageChange = (pageIdx) => {
        const next = new URLSearchParams(searchParams);
        next.set('page', String(pageIdx));
        navigate(`/album-preview/${albumId}?${next.toString()}`, { replace: true });
    };

    if (loading) {
        return (
            <div className="av-page av-page--preview">
                <div className="av-loading">Loading album…</div>
            </div>
        );
    }

    if (!album || album.status !== 'published') {
        return (
            <div className="av-page av-page--preview">
                <div className="av-loading">Album not found or not published yet.</div>
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
