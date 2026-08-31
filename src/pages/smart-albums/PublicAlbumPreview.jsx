import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    getAlbumPhotoRevision,
    healOrphanCollectionPlacements,
    embedPlacementStorageFallbacks,
    mergeRemotePreviewPagesIntoLocal,
} from '../../components/smart-albums/albumPagePhotos';
import { loadAlbumAssetsFromCloud } from '../../components/smart-albums/albumCollection';
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
import { getAlbumShareSlug } from '../../lib/albumPreviewSlug';
import { supabase } from '../../lib/supabase/client';
import { parseUrlPage } from './useAlbumWorkspace';
import { AppLoader } from '../../components/ui/AppLoading';
import './AlbumViewer.css';

const SHARE_LINK_POLL_MS = 5000;

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

    // Canonicalize legacy …-msoohhle paths to the clean share slug in the address bar.
    useEffect(() => {
        if (!album || !albumId) return;
        const pretty = getAlbumShareSlug(album);
        if (!pretty || pretty === albumId) return;
        const next = new URLSearchParams(searchParams);
        const qs = next.toString();
        navigate(`/album-preview/${encodeURIComponent(pretty)}${qs ? `?${qs}` : ''}`, {
            replace: true,
        });
    }, [album, albumId, navigate, searchParams]);

    useEffect(() => {
        if (!albumId) return undefined;

        const reloadAlbum = () => {
            smartAlbumCommentsService
                .getAlbumPublic(albumId)
                .then((data) => setAlbum(data))
                .catch((e) => console.error(e));
        };

        const onSettingsChanged = (event) => {
            const detailId = event.detail?.albumId;
            if (!detailId) return;
            if (detailId === albumId || detailId === album?.id) reloadAlbum();
        };

        window.addEventListener(ALBUM_PROOFER_SETTINGS_CHANGED_EVENT, onSettingsChanged);
        return () => {
            window.removeEventListener(ALBUM_PROOFER_SETTINGS_CHANGED_EVENT, onSettingsChanged);
        };
    }, [albumId, album?.id]);

    // Keep share-link pause/resume in sync while the client tab stays open (no reload needed).
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
                const nextStatus = row.status ?? prev.status;
                if (
                    prev.share_link_enabled === nextEnabled &&
                    (prev.share_link_paused_at ?? null) === nextPausedAt &&
                    prev.status === nextStatus
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    share_link_enabled: nextEnabled,
                    share_link_paused_at: nextPausedAt,
                    status: nextStatus,
                };
            });
        };

        const refreshShareLink = async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            try {
                const { data, error } = await supabase
                    .from('album_proofer_albums')
                    .select('id, share_link_enabled, share_link_paused_at, status')
                    .eq('id', resolvedId)
                    .maybeSingle();
                if (error) throw error;
                // RLS hides paused albums from anon — treat a missing row as paused.
                if (!data) {
                    applyShareFields({
                        share_link_enabled: false,
                        share_link_paused_at: null,
                    });
                    return;
                }
                applyShareFields(data);
            } catch (e) {
                console.warn('Share link poll failed:', e?.message || e);
            }
        };

        const channel = supabase
            .channel(`public-album-share-link:${resolvedId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'album_proofer_albums',
                    filter: `id=eq.${resolvedId}`,
                },
                (payload) => {
                    applyShareFields(payload.new);
                }
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

    // Hydrate with album UUID — share URLs use slugs but all photo/collection caches key by id.
    useEffect(() => {
        const storageAlbumId = album?.id;
        if (!storageAlbumId || !album?.preview_data) return;
        hydrateAlbumPreviewData(storageAlbumId, album.preview_data);
        mergeRemotePreviewPagesIntoLocal(storageAlbumId);
    }, [album?.id, album?.preview_data]);

    // Client share links have no localStorage — hydrate collection + placements from cloud/R2.
    useEffect(() => {
        if (!album?.id || !album?.photographer_id) return undefined;

        let cancelled = false;
        (async () => {
            try {
                await loadAlbumAssetsFromCloud(album.id, album.photographer_id);
                if (cancelled) return;
                healOrphanCollectionPlacements(album.id);
                embedPlacementStorageFallbacks(album.id);
                setPhotoRevision(getAlbumPhotoRevision(album.id) || 0);
            } catch (error) {
                console.warn('Could not hydrate public album assets:', error?.message || error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [album?.id, album?.photographer_id]);

    useEffect(() => {
        const storageAlbumId = album?.id;
        return () => {
            if (storageAlbumId) clearAlbumPreviewDataCache(storageAlbumId);
        };
    }, [album?.id]);

    useEffect(() => {
        if (album?.id) setPhotoRevision(getAlbumPhotoRevision(album.id) || 0);
    }, [album?.id, album?.preview_data]);

    const totalPages = album?.page_count || 21;
    const spreadOpts = getAlbumSpreadOptions(album);
    const initialPage = parseUrlPage(searchParams.get('page'), totalPages, spreadOpts);
    const resolvedAlbumId = album?.id || albumId;

    const access = useMemo(() => {
        if (!album?.id) return null;
        return smartAlbumProoferSettingsService.getEffectiveAlbumAccess(
            album.photographer_id,
            album.id,
            album,
            album.preview_data
        );
    }, [album]);

    const handlePageChange = (pageIdx) => {
        const next = new URLSearchParams(searchParams);
        next.set('page', String(pageIdx));
        navigate(`/album-preview/${albumId}?${next.toString()}`, { replace: true });
    };

    if (loading) {
        return (
            <div className="av-page av-page--preview">
                <AppLoader label="Loading album" variant="page-short" className="av-loading app-loader" />
            </div>
        );
    }

    if (!album) {
        return (
            <div className="av-page av-page--preview av-access-gate">
                <div className="av-access-gate__card av-access-gate__card--center">
                    <h1 className="av-access-gate__title">
                        This album is temporarily unavailable
                    </h1>
                    <p className="av-access-gate__text">
                        Access may be paused, or this album is not published. Ask the photographer
                        for an updated link.
                    </p>
                </div>
            </div>
        );
    }

    if (!isClientShareLinkLive(album)) {
        return (
            <div className="av-page av-page--preview av-access-gate">
                <div className="av-access-gate__card av-access-gate__card--center">
                    <h1 className="av-access-gate__title">
                        This album is temporarily unavailable
                    </h1>
                    <p className="av-access-gate__text">
                        Client access is paused. Please check back later or contact the photographer.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AlbumPreviewAccessGate albumId={resolvedAlbumId} access={access}>
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
