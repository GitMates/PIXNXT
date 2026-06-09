import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    MAX_ALBUM_PAGES,
    MIN_ALBUM_PAGES,
    PAGES_PER_SPREAD,
    insertAlbumStoragePages,
    removeAlbumStoragePages,
} from '../../components/smart-albums/albumPageStorage';
import {
    mergeRemotePreviewPagesIntoLocal,
    migrateInsideCoverSpreadToPageTwo,
    migrateEndHalfSpreadToLeftPage,
    migrateBackCoverUsesBookWrap,
    migrateFrontCoverToFullSpread,
    migrateMiskeyedInnerSpreadPhotos,
    migrateWholeSpreadPagePhotosToSpreadKeys,
    migrateWholeSpreadPhotoOffRightPage,
} from '../../components/smart-albums/albumPagePhotos';
import {
    migrateInsideCoverSpreadTransform,
    migrateMiskeyedInnerSpreadTransforms,
} from '../../components/smart-albums/albumPageTransforms';
import {
    getAlbumSpreadOptions,
    getEndSpreadPageIndices,
    getPageInsertIndex,
    getPageRemoveIndex,
    getTotalSpreads,
} from '../../components/smart-albums/albumSpreadUtils';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    hydrateAlbumPreviewData,
    shiftAlbumRemotePreviewPages,
} from '../../components/smart-albums/albumPreviewData';

export function parseUrlPage(raw, totalPages, _spreadOpts) {
    if (raw == null || raw === '') return 0;
    let n = parseInt(raw, 10);
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
    const spreadOpts = getAlbumSpreadOptions(album);
    const initialPage = parseUrlPage(searchParams.get('page'), totalPages, spreadOpts);
    const spreadCount = getTotalSpreads(totalPages, spreadOpts);
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
                if (!cancelled) {
                    if (data?.preview_data) {
                        hydrateAlbumPreviewData(albumId, data.preview_data);
                    }
                    mergeRemotePreviewPagesIntoLocal(albumId);
                    const pages = data?.page_count || 21;
                    const albumSpreadOpts = getAlbumSpreadOptions(data);
                    migrateEndHalfSpreadToLeftPage(albumId, pages, data);
                    migrateMiskeyedInnerSpreadPhotos(albumId, pages, data);
                    migrateWholeSpreadPhotoOffRightPage(albumId, data);
                    if (!albumSpreadOpts.hasCovers) {
                        migrateWholeSpreadPagePhotosToSpreadKeys(albumId, pages, data);
                    }
                    if (albumSpreadOpts.hasCovers) {
                        migrateFrontCoverToFullSpread(albumId);
                        migrateBackCoverUsesBookWrap(albumId, pages);
                        migrateInsideCoverSpreadToPageTwo(albumId, pages);
                        migrateInsideCoverSpreadTransform(albumId);
                    }
                    if (albumSpreadOpts.hasCovers) {
                        const { left: endLeft } = getEndSpreadPageIndices(pages);
                        migrateMiskeyedInnerSpreadTransforms(albumId, endLeft);
                    }
                    setAlbum(data);
                }
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
        async (pageDelta) => {
            if (!user || !albumId || !album) return null;
            const current = album.page_count || 21;
            const albumSpreadOpts = getAlbumSpreadOptions(album);
            const minPages = albumSpreadOpts.hasCovers ? MIN_ALBUM_PAGES : 2;
            const next = Math.max(
                minPages,
                Math.min(MAX_ALBUM_PAGES, current + pageDelta)
            );
            if (next === current) return null;

            try {
                const countDelta = next - current;
                mergeRemotePreviewPagesIntoLocal(albumId);

                if (countDelta > 0) {
                    const insertAt = getPageInsertIndex(current, albumSpreadOpts);
                    insertAlbumStoragePages(albumId, insertAt, countDelta);
                    shiftAlbumRemotePreviewPages(albumId, insertAt, countDelta);
                } else if (countDelta < 0) {
                    const removeCount = -countDelta;
                    const removeAt = getPageRemoveIndex(current, removeCount, albumSpreadOpts);
                    removeAlbumStoragePages(albumId, removeAt, removeCount);
                    shiftAlbumRemotePreviewPages(albumId, removeAt, -removeCount);
                }

                const updated = await smartAlbumsService.updateAlbumPageCount(
                    user.id,
                    albumId,
                    next
                );
                setAlbum(updated);

                const urlPage = parseUrlPage(searchParams.get('page'), current, albumSpreadOpts);
                let clamped = Math.min(urlPage, next - 1);
                if (countDelta > 0) {
                    const insertAt = getPageInsertIndex(current, albumSpreadOpts);
                    clamped = parseUrlPage(insertAt, next, albumSpreadOpts);
                } else if (countDelta < 0) {
                    const removeAt = getPageRemoveIndex(current, -countDelta, albumSpreadOpts);
                    const removeEnd = removeAt - countDelta;
                    if (urlPage >= removeAt && urlPage < removeEnd) {
                        clamped = Math.max(0, removeAt - 1);
                    } else if (urlPage >= removeEnd) {
                        clamped = Math.min(urlPage + countDelta, next - 1);
                    }
                }
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
