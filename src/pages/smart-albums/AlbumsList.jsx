import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import '../ClientGallery.css';
import './SmartAlbums.css';

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

const AlbumsList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await smartAlbumsService.getAlbums(user.id);
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
    }, [user]);

    const filteredAlbums = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return albums;
        return albums.filter((a) => a.name?.toLowerCase().includes(q));
    }, [albums, searchQuery]);

    return (
        <main className="sa-main cg-style-2">
            <header className="sa-header cg-style-3">
                <div className="cg-style-4">
                    <h1 className="cg-style-5 sa-title-inline">Albums</h1>
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
                <div className="cg-style-8">
                    <button type="button" className="sa-btn-primary" onClick={() => navigate('/smart-albums/create')}>
                        New Album
                    </button>
                </div>
            </header>

            <div className="sa-content sa-albums-content">
                {loading ? (
                    <p className="sa-loading-text">Loading albums…</p>
                ) : filteredAlbums.length === 0 && !searchQuery ? (
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
                ) : filteredAlbums.length === 0 ? (
                    <div className="cg-style-60">
                        <h3 className="cg-style-61">No matching albums</h3>
                        <p className="cg-style-62">Try a different search term.</p>
                    </div>
                ) : (
                    <div className="cg-style-37 sa-albums-grid">
                        {filteredAlbums.map((album) => (
                            <div
                                key={album.id}
                                className="cg-style-73 group"
                                onClick={() => navigate(`/smart-albums/album/${album.id}`)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/smart-albums/album/${album.id}`)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="cg-style-74">
                                    {album.cover_image_url ? (
                                        <img src={album.cover_image_url} alt={album.name} loading="lazy" />
                                    ) : (
                                        <div className="cg-style-38 sa-album-thumb-placeholder">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                            </svg>
                                        </div>
                                    )}
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
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default AlbumsList;
