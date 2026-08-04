import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getAlbumPhotoRevision } from '../../components/smart-albums/albumPagePhotos';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    ALBUM_PROOFER_SETTINGS_CHANGED_EVENT,
    smartAlbumProoferSettingsService,
} from '../../services/smartAlbumProoferSettings.service';
import AlbumPreview from './AlbumPreview';
import AlbumPreviewAccessGate from '../../components/smart-albums/AlbumPreviewAccessGate';
import { getAlbumSpreadOptions } from '../../components/smart-albums/albumSpreadUtils';
import { parseUrlPage } from './useAlbumWorkspace';
import {
    hydrateAlbumPreviewData,
    clearAlbumPreviewDataCache,
    normalizeAlbumForClientPreview,
} from '../../components/smart-albums/albumPreviewData';
import { isClientShareLinkLive } from '../../lib/shareSmartAlbum';
import { supabase } from '../../lib/supabase/client';
import './AlbumViewer.css';

const SHARE_LINK_POLL_MS = 5000;

/**
 * Album preview in its own tab (like collection gallery preview).
 * Mirrors the client experience, including password protection when enabled.
 * Private-link token walls are skipped for the album owner.
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
        if (!user?.id || !albumId) return undefined;

        const reloadAlbum = () => {
            smartAlbumsService
                .getAlbum(user.id, albumId)
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
    }, [user?.id, albumId]);

    // Pick up pause/resume while this preview tab stays open.
    useEffect(() => {
        const resolvedId = album?.id;
        if (!resolvedId) return undefined;

        let cancelled = false;

        const applyShareFields = (row) => {
            if (!row || cancelled) return;
            setAlbum((prev) => {
                if (!prev) return prev;
                const nextEnabled = row.share_link_enabled;
                const nextPausedAt = row.share_link_paused_at ?? null;
                if (
                    prev.share_link_enabled === nextEnabled &&
                    (prev.share_link_paused_at ?? null) === nextPausedAt
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    share_link_enabled: nextEnabled,
                    share_link_paused_at: nextPausedAt,
                };
            });
        };

        const refreshShareLink = async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            try {
                const { data, error } = await supabase
                    .from('album_proofer_albums')
                    .select('id, share_link_enabled, share_link_paused_at')
                    .eq('id', resolvedId)
                    .maybeSingle();
                if (error) throw error;
                if (data) applyShareFields(data);
            } catch (e) {
                console.error(e);
            }
        };

        const channel = supabase
            .channel(`photographer-album-share-link:${resolvedId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'smart_albums',
                    filter: `id=eq.${resolvedId}`,
                },
                (payload) => applyShareFields(payload.new)
            )
            .subscribe();

        const pollId = window.setInterval(refreshShareLink, SHARE_LINK_POLL_MS);
        const onVisible = () => {
            if (document.visibilityState === 'visible') refreshShareLink();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            window.clearInterval(pollId);
            document.removeEventListener('visibilitychange', onVisible);
            void supabase.removeChannel(channel);
        };
    }, [album?.id]);

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
    const accessPaused = !isClientShareLinkLive(album);

    const access = useMemo(() => {
        if (!album?.id) return null;
        return smartAlbumProoferSettingsService.getEffectiveAlbumAccess(
            album.photographer_id,
            album.id,
            album,
            album.preview_data
        );
    }, [album]);

    const isOwner = Boolean(user?.id && album?.photographer_id === user.id);

    const handlePageChange = (pageIdx) => {
        const next = new URLSearchParams(searchParams);
        next.set('page', String(pageIdx));
        navigate(`/album-proofer/preview/${albumId}?${next.toString()}`, { replace: true });
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

    if (accessPaused) {
        return (
            <div className="av-page av-page--preview av-access-gate">
                <div className="av-access-gate__card av-access-gate__card--center">
                    <h1 className="av-access-gate__title">
                        This album is temporarily unavailable
                    </h1>
                    <p className="av-access-gate__text">
                        Client access is paused. Resume access from Share to open preview again.
                    </p>
                </div>
            </div>
        );
    }

    const resolvedAlbumId = album.id || albumId;

    return (
        <AlbumPreviewAccessGate
            albumId={resolvedAlbumId}
            access={access}
            isOwner={isOwner}
        >
            <AlbumPreview
                album={normalizeAlbumForClientPreview(album)}
                albumId={resolvedAlbumId}
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
