import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { getSampleImageForPage } from '../../components/smart-albums/sampleAlbumImages';
import { AlbumContextMenu } from '../../components/smart-albums/AlbumContextMenu';
import '../ClientGallery.css';
import './SmartAlbums.css';

function getAlbumThumbSrc(album) {
    if (album.cover_image_url) return album.cover_image_url;
    return getSampleImageForPage(1);
}

function formatAlbumDate(dateStr) {
    if (!dateStr) return 'No date';
    try {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return 'No date';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return 'No date';
    }
}

const AlbumStarButton = ({ starred, onClick }) => (
    <svg
        className={`cg-style-76 ${starred ? 'opacity-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'opacity-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:opacity-100'}`}
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={starred ? '#f5c518' : 'none'}
        stroke={starred ? '#f5c518' : 'white'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={starred ? 'Unstar album' : 'Star album'}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
            }
        }}
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const AlbumsList = ({ starredOnly = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenuId, setContextMenuId] = useState(null);
    const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
    const contextRef = useRef(null);
    const pageTitle = starredOnly ? 'Starred' : 'Albums';

    const closeContextMenu = useCallback(() => {
        setContextMenuId(null);
        setContextMenuAnchor(null);
    }, []);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = starredOnly
                    ? await smartAlbumsService.getStarredAlbums(user.id)
                    : await smartAlbumsService.getAlbums(user.id);
                if (!cancelled) setAlbums(data);
            } catch (err) {
                console.error(err);
                if (!cancelled) setAlbums([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, starredOnly]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (contextRef.current?.contains(e.target)) return;
            if (contextMenuAnchor?.contains(e.target)) return;
            closeContextMenu();
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [contextMenuAnchor, closeContextMenu]);

    const handleToggleStar = async (e, album) => {
        e.stopPropagation();
        if (!user) return;
        const next = !album.is_starred;
        try {
            await smartAlbumsService.updateAlbumStar(user.id, album.id, next);
            if (starredOnly && !next) {
                setAlbums((prev) => prev.filter((a) => a.id !== album.id));
            } else {
                setAlbums((prev) =>
                    prev.map((a) => (a.id === album.id ? { ...a, is_starred: next } : a))
                );
            }
        } catch (err) {
            console.error(err);
            alert('Could not update star. Please try again.');
        }
    };

    const openContextMenu = (e, albumId) => {
        e.stopPropagation();
        if (contextMenuId === albumId) {
            closeContextMenu();
            return;
        }
        setContextMenuAnchor(e.currentTarget);
        setContextMenuId(albumId);
    };

    const handleDeleteAlbum = async (album) => {
        if (!user) return;
        if (!window.confirm(`Delete "${album.name}"? This cannot be undone.`)) return;
        try {
            await smartAlbumsService.deleteAlbum(user.id, album.id);
            setAlbums((prev) => prev.filter((a) => a.id !== album.id));
            closeContextMenu();
        } catch (err) {
            console.error(err);
            alert('Failed to delete album. Please try again.');
        }
    };

    const handleDuplicateAlbum = async (album) => {
        if (!user) return;
        closeContextMenu();
        try {
            const copy = await smartAlbumsService.duplicateAlbum(user.id, album.id);
            setAlbums((prev) => [copy, ...prev]);
        } catch (err) {
            console.error(err);
            alert('Failed to duplicate album. Please try again.');
        }
    };

    const handleMoveTo = () => {
        closeContextMenu();
        alert('Move to folders for Smart Albums is coming soon.');
    };

    const renderContextMenu = (album) => {
        if (contextMenuId !== album.id) return null;
        return (
            <AlbumContextMenu
                menuRef={contextRef}
                anchorEl={contextMenuAnchor}
                onPreview={() => {
                    closeContextMenu();
                    navigate(`/smart-albums/album/${album.id}?view=preview`);
                }}
                onMoveTo={handleMoveTo}
                onDuplicate={() => handleDuplicateAlbum(album)}
                onDelete={() => handleDeleteAlbum(album)}
            />
        );
    };

    const filteredAlbums = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return albums.filter((a) => {
            if (starredOnly && !a.is_starred) return false;
            if (q && !a.name?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [albums, searchQuery, starredOnly]);

    const showEmpty = !loading && filteredAlbums.length === 0 && !searchQuery;

    return (
        <main className="sa-main cg-style-2">
            <header className="sa-header cg-style-3">
                <div className="cg-style-4">
                    <h1 className="cg-style-5 sa-title-inline">{pageTitle}</h1>
                    <div className="cg-style-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="search"
                            placeholder="Search albums"
                            className="cg-style-7"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search albums"
                        />
                    </div>
                </div>
                {!starredOnly && (
                    <div className="cg-style-8">
                        <button type="button" className="sa-btn-primary" onClick={() => navigate('/smart-albums/create')}>
                            New Album
                        </button>
                    </div>
                )}
            </header>

            <div className="sa-content sa-albums-content">
                {loading ? (
                    <p className="sa-loading-text">Loading albums…</p>
                ) : showEmpty ? (
                    starredOnly ? (
                        <div className="cg-style-60">
                            <h3 className="cg-style-61">No starred albums</h3>
                            <p className="cg-style-62">Star albums from the Albums page to see them here.</p>
                        </div>
                    ) : (
                        <div className="sa-empty">
                            <div className="sa-empty-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                    <line x1="8" y1="6" x2="16" y2="6" />
                                    <line x1="8" y1="10" x2="14" y2="10" />
                                </svg>
                            </div>
                            <h2>Create your first Smart Album</h2>
                            <p>Design beautiful photo albums for your clients. Start from a template or build your own layout.</p>
                            <button type="button" className="sa-btn-primary" onClick={() => navigate('/smart-albums/create')}>
                                Create Album
                            </button>
                        </div>
                    )
                ) : filteredAlbums.length === 0 ? (
                    <div className="cg-style-60">
                        <h3 className="cg-style-61">No matching albums</h3>
                        <p className="cg-style-62">Try a different search term.</p>
                    </div>
                ) : (
                    <div className="cg-style-37 sa-albums-grid">
                        {filteredAlbums.map((album) => {
                            const thumbSrc = getAlbumThumbSrc(album);
                            return (
                                <div
                                    key={album.id}
                                    className={`cg-style-73 group${contextMenuId === album.id ? ' cg-style-73--ctx-open' : ''}`}
                                    onClick={() => navigate(`/smart-albums/album/${album.id}`)}
                                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/smart-albums/album/${album.id}`)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="cg-style-74">
                                        {thumbSrc ? (
                                            <img src={thumbSrc} alt={album.name} loading="lazy" />
                                        ) : (
                                            <div className="cg-style-38 sa-album-thumb-placeholder">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="cg-style-39" onClick={(e) => openContextMenu(e, album.id)}>
                                            ⋮
                                        </div>
                                        <AlbumStarButton
                                            starred={!!album.is_starred}
                                            onClick={(e) => handleToggleStar(e, album)}
                                        />
                                        {renderContextMenu(album)}
                                    </div>
                                    <div className="px-1">
                                        <h3 className="cg-style-43">{album.name}</h3>
                                        <div className="cg-style-44 cg-style-44--split">
                                            <div className="cg-style-44-meta">
                                                <span className="cg-style-45" />
                                                <span>{album.page_count || 21} pages</span>
                                                <span className="cg-style-46">·</span>
                                                <span>{formatAlbumDate(album.event_date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
};

export default AlbumsList;
