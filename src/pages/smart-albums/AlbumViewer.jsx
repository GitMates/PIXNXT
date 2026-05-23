import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import './AlbumViewer.css';

/** Proof Albums-style URL: ?page=14 is the left page index (0-based) of the spread. */
function parseUrlPage(raw, totalPages) {
    if (raw == null || raw === '') return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(totalPages - 1, n));
}

const AlbumViewer = () => {
    const { albumId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');

    const totalPages = album?.page_count || 21;
    const initialPage = parseUrlPage(searchParams.get('page'), totalPages);

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
        if (!user || !albumId) return;

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

    const handlePageChange = (pageIdx) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set('page', String(pageIdx));
                return next;
            },
            { replace: true }
        );
    };

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

    const title = album.name.toUpperCase();

    return (
        <div className="av-page">
            <header className="av-topbar">
                <div className="av-topbar-left">
                    <button type="button" className="av-back-btn" onClick={() => navigate('/smart-albums')} aria-label="Back to albums">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <span className="av-bell" aria-hidden>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </span>
                </div>
                <h1 className="av-title">{title}</h1>
                <div className="av-topbar-right">
                    <button type="button" className="av-icon-btn" aria-label="Album options">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                        </svg>
                    </button>
                </div>
            </header>

            <div className="av-viewer-body">
                <AlbumBook
                    key={albumId}
                    album={album}
                    totalPages={totalPages}
                    initialPage={initialPage}
                    onPageChange={handlePageChange}
                />
            </div>

            <footer className="av-comments">
                <span className="av-comments-count">0 comments</span>
                <input
                    type="text"
                    className="av-comment-input"
                    placeholder="Start typing here to add new comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </footer>
        </div>
    );
};

export default AlbumViewer;
