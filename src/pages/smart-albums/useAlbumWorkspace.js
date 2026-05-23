import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
    const isPreview = isAlbumPreviewView(searchParams);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

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

    useEffect(() => {
        if (searchParams.get('view') === 'gallery') {
            const next = new URLSearchParams(searchParams);
            next.delete('view');
            const qs = next.toString();
            navigate(`/smart-albums/album/${albumId}${qs ? `?${qs}` : ''}`, { replace: true });
        }
    }, [searchParams, navigate, albumId]);

    return {
        albumId,
        album,
        loading,
        totalPages,
        initialPage,
        isPreview,
        handlePageChange,
        setView,
        searchParams,
    };
}
