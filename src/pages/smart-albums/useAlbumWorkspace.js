import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    MAX_ALBUM_PAGES,
    MIN_ALBUM_PAGES,
    PAGES_PER_SPREAD,
    pruneAlbumStorageForPageCount,
} from '../../components/smart-albums/albumPageStorage';
import { getTotalSpreads } from '../../components/smart-albums/albumSpreadUtils';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';

export function parseUrlPage(raw, totalPages) {
    if (raw == null || raw === '') return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(totalPages - 1, n));
}

/** Preview = client-facing album only (final output). */
export function isAlbumPreviewView(searchParams) {
    const v = searchParams.get('view');
    return v === 'preview' || v === 'album';
}

export function isAlbumEditView(searchParams) {
    const v = searchParams.get('view');
    return !v || v === 'edit' || v === 'gallery';
}

export function useAlbumWorkspace() {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);

    const totalPages = album?.page_count || 21;
    const initialPage = parseUrlPage(searchParams.get('page'), totalPages);
    const spreadCount = getTotalSpreads(totalPages, { showCover: true });
    const isPreview = isAlbumPreviewView(searchParams);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        const lockScroll = !isAlbumPreviewView(searchParams);
        if (lockScroll) {
            html.style.overflow = 'hidden';
            body.style.overflow = 'hidden';
        }
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, [searchParams]);

    useEffect(() => {
        if (!user || !albumId) return undefined;

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await smartAlbumsService.getAlbum(user.id, albumId);
                if (!cancelled) setAlbum(data);
            } catch (err) {
                console.error(err);
                if (!cancelled) setAlbum(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, albumId]);

    const handlePageChange = useCallback(
        (pageIdx) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('page', String(pageIdx));
                    return next;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const setView = useCallback(
        (view) => {
            const next = new URLSearchParams(searchParams);
            if (view === 'edit') {
                next.delete('view');
            } else {
                next.set('view', view);
            }
            const qs = next.toString();
            navigate(`/smart-albums/album/${albumId}${qs ? `?${qs}` : ''}`, { replace: true });
        },
        [navigate, albumId, searchParams]
    );

    const changePageCount = useCallback(
        async (delta) => {
            if (!user || !albumId || !album) return null;
            const current = album.page_count || 21;
            const next = Math.max(
                MIN_ALBUM_PAGES,
                Math.min(MAX_ALBUM_PAGES, current + delta)
            );
            if (next === current) return null;

            try {
                const updated = await smartAlbumsService.updateAlbumPageCount(
                    user.id,
                    albumId,
                    next
                );
                if (next < current) {
                    pruneAlbumStorageForPageCount(albumId, next);
                }
                setAlbum(updated);

                const urlPage = parseUrlPage(searchParams.get('page'), current);
                const clamped = Math.min(urlPage, next - 1);
                if (clamped !== urlPage) {
                    setSearchParams(
                        (prev) => {
                            const p = new URLSearchParams(prev);
                            p.set('page', String(clamped));
                            return p;
                        },
                        { replace: true }
                    );
                }
                return { previous: current, next, updated };
            } catch (err) {
                console.error(err);
                return null;
            }
        },
        [user, albumId, album, searchParams, setSearchParams]
    );

    useEffect(() => {
        if (searchParams.get('view') === 'gallery') {
            const next = new URLSearchParams(searchParams);
            next.delete('view');
            const qs = next.toString();
            navigate(`/smart-albums/album/${albumId}${qs ? `?${qs}` : ''}`, { replace: true });
        }
    }, [searchParams, navigate, albumId]);

    const patchAlbum = useCallback((patch) => {
        setAlbum((prev) => {
            if (!prev) return prev;
            const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
            return next;
        });
    }, []);

    return {
        albumId,
        album,
        patchAlbum,
        loading,
        totalPages,
        spreadCount,
        initialPage,
        isPreview,
        handlePageChange,
        changePageCount,
        setView,
        searchParams,
        minPages: MIN_ALBUM_PAGES,
        maxPages: MAX_ALBUM_PAGES,
        pagesPerSpread: PAGES_PER_SPREAD,
    };
}
