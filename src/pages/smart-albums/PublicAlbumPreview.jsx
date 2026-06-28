import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getAlbumPhotoRevision } from '../../components/smart-albums/albumPagePhotos';
import { hydrateAlbumPreviewData, clearAlbumPreviewDataCache, normalizeAlbumForClientPreview } from '../../components/smart-albums/albumPreviewData';
import AlbumPreviewAccessGate from '../../components/smart-albums/AlbumPreviewAccessGate';
import { smartAlbumCommentsService } from '../../services/smartAlbumComments.service';
import {
    ALBUM_PROOFER_SETTINGS_CHANGED_EVENT,
    smartAlbumProoferSettingsService,
} from '../../services/smartAlbumProoferSettings.service';
import AlbumPreview from './AlbumPreview';
import { getAlbumSpreadOptions } from '../../components/smart-albums/albumSpreadUtils';
import { isClientShareLinkLive } from '../../lib/shareSmartAlbum';
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
        if (!albumId) return undefined;

        const reloadAlbum = () => {
            smartAlbumCommentsService
                .getAlbumPublic(albumId)
                .then((data) => setAlbum(data))
                .catch((e) => console.error(e));
        };

        const onSettingsChanged = (event) => {
            if (event.detail?.albumId === albumId) reloadAlbum();
        };

        window.addEventListener(ALBUM_PROOFER_SETTINGS_CHANGED_EVENT, onSettingsChanged);
        return () => {
            window.removeEventListener(ALBUM_PROOFER_SETTINGS_CHANGED_EVENT, onSettingsChanged);
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

    const access = useMemo(() => {
        if (!album?.id) return null;
        return smartAlbumProoferSettingsService.getEffectiveAlbumAccess(
            album.photographer_id,
            albumId,
            album,
            album.preview_data
        );
    }, [album, albumId]);

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

    if (!album || !isClientShareLinkLive(album)) {
        return (
            <div className="av-page av-page--preview">
                <div className="av-loading">
                    Album not found, not published, or the client share link is disabled.
                </div>
            </div>
        );
    }

    return (
        <AlbumPreviewAccessGate
            albumId={albumId}
            photographerId={album.photographer_id}
            access={access}
        >
            <AlbumPreview
                album={normalizeAlbumForClientPreview(album)}
                albumId={albumId}
                totalPages={totalPages}
                initialPage={initialPage}
                photoRevision={photoRevision}
                onPageChange={handlePageChange}
                minimalChrome
                clientPreview
            />
        </AlbumPreviewAccessGate>
    );
}
