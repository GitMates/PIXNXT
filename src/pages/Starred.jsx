import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { getPhotoGridDisplayUrl, getPhotoVideoSrc } from '../lib/photoDisplayUrl';
import { formatStorageBytes } from '../utils/formatStorageBytes';
import { isGalleryVideo } from '../lib/galleryMediaType';
import './PhotoLibrary.css';
import './ClientGallery.css';
import './Starred.css';

const Starred = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const activeTab = tab === 'photos' ? 'photos' : 'collections';

    const [collections, setCollections] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'photos') {
                const rows = await galleryService.getStarredPhotos(user.id);
                setPhotos(rows);
                setCollections([]);
            } else {
                const rows = await galleryService.getStarredCollections(user.id);
                setCollections(rows);
                setPhotos([]);
            }
        } catch (err) {
            console.error('Failed to load starred items:', err);
            setError('Failed to load starred items. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.id, activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleCollectionStar = async (e, collection) => {
        e.stopPropagation();
        try {
            await galleryService.updateCollection(collection.id, { is_starred: false });
            setCollections((prev) => prev.filter((c) => c.id !== collection.id));
        } catch (err) {
            console.error('Failed to unstar collection:', err);
            alert('Could not update star. Please try again.');
        }
    };

    const handleTogglePhotoStar = async (e, photo) => {
        e.stopPropagation();
        try {
            await galleryService.togglePhotoStar(photo.id, false);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        } catch (err) {
            console.error('Failed to unstar photo:', err);
            alert('Could not update star. Please try again.');
        }
    };

    const getCoverSrc = (collection) => collection.cover_url || collection.cover || '';

    const openCollection = (collection) => {
        navigate(`/collections/manage?id=${encodeURIComponent(collection.id)}`);
    };

    const openPhotoCollection = (photo) => {
        const collectionId = photo.collection_id || photo.collection?.id;
        if (!collectionId) return;
        navigate(`/collections/manage?id=${encodeURIComponent(collectionId)}`);
    };

    const isEmpty = activeTab === 'collections' ? collections.length === 0 : photos.length === 0;

    return (
        <SidebarLayout>
            <main className="pl-main st-main">
                <header className="st-header">
                    <h1 className="st-title">Starred</h1>

                    <div className="st-tabs">
                        <button
                            type="button"
                            className={`st-tab ${activeTab === 'collections' ? 'active' : ''}`}
                            onClick={() => navigate('/starred/collections')}
                        >
                            Collections
                        </button>
                        <button
                            type="button"
                            className={`st-tab ${activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => navigate('/starred/photos')}
                        >
                            Photos
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="st-loading">Loading…</div>
                ) : error ? (
                    <div className="st-loading st-loading--error">{error}</div>
                ) : isEmpty ? (
                    <div className="st-empty-state">
                        <div className="st-empty-graphic">
                            <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M100 130C100 110 115 95 130 95C145 95 160 110 160 130V150H100V130Z" stroke="#333" strokeWidth="1.5" fill="#fff" />
                                <circle cx="130" cy="75" r="20" stroke="#333" strokeWidth="1.5" fill="#fff" />
                                <path d="M125 55C125 55 120 45 130 40C140 45 135 55 135 55" stroke="#333" strokeWidth="1.5" />
                                <path d="M110 75L95 65L100 50" stroke="#333" strokeWidth="1.5" fill="none" />
                                <path d="M40 100L45 110L55 110L48 118L51 128L40 122L29 128L32 118L25 110L35 110L40 100Z" fill="#F0F4F3" stroke="#999" strokeWidth="1" />
                            </svg>
                        </div>
                        {activeTab === 'collections' ? (
                            <>
                                <h2 className="pl-empty-title">You have no starred collections yet</h2>
                                <p className="pl-empty-text">
                                    Star collections from the Collections page to see them here.
                                </p>
                                <button type="button" className="pl-new-btn" onClick={() => navigate('/client-gallery')}>
                                    Go to Collections
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="pl-empty-title">You have no starred photos yet</h2>
                                <p className="pl-empty-text">
                                    Star photos inside a collection to track your favorites here.
                                </p>
                                <button type="button" className="pl-new-btn" onClick={() => navigate('/client-gallery')}>
                                    Go to Collections
                                </button>
                            </>
                        )}
                    </div>
                ) : activeTab === 'collections' ? (
                    <div className="st-grid cg-style-37 px-10 pb-12">
                        {collections.map((collection) => (
                            <div
                                key={collection.id}
                                className="cg-style-73 group"
                                onClick={() => openCollection(collection)}
                            >
                                <div className="cg-style-74">
                                    {getCoverSrc(collection) ? (
                                        <img src={getCoverSrc(collection)} alt={collection.name} loading="lazy" />
                                    ) : (
                                        <div className="cg-style-38">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        </div>
                                    )}
                                    <svg
                                        className="cg-style-76 opacity-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="#f5c518"
                                        stroke="#f5c518"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        onClick={(e) => handleToggleCollectionStar(e, collection)}
                                    >
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </div>
                                <div className="px-1">
                                    <h3 className="cg-style-43">{collection.name}</h3>
                                    <div className="cg-style-44 cg-style-44--split">
                                        <div className="cg-style-44-meta">
                                            <span>{collection.photo_count || 0} items</span>
                                            <span className="cg-style-46">·</span>
                                            <span>
                                                {collection.event_date
                                                    ? new Date(collection.event_date).toLocaleDateString()
                                                    : 'No date'}
                                            </span>
                                        </div>
                                        <span className="cg-style-80" title="Storage used">
                                            {formatStorageBytes(collection.storage_bytes)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="st-photo-grid px-10 pb-12">
                        {photos.map((photo) => {
                            const isVideo = isGalleryVideo(photo);
                            const src = isVideo ? getPhotoVideoSrc(photo) : getPhotoGridDisplayUrl(photo);
                            const collectionName = photo.collection?.name || 'Collection';
                            return (
                                <div
                                    key={photo.id}
                                    className="st-photo-card group"
                                    onClick={() => openPhotoCollection(photo)}
                                >
                                    <div className="st-photo-thumb">
                                        {src ? (
                                            isVideo ? (
                                                <video src={src} muted playsInline preload="metadata" />
                                            ) : (
                                                <img src={src} alt={photo.filename || 'Starred photo'} loading="lazy" />
                                            )
                                        ) : (
                                            <div className="st-photo-placeholder" />
                                        )}
                                        <button
                                            type="button"
                                            className="st-photo-star"
                                            aria-label="Remove from starred"
                                            onClick={(e) => handleTogglePhotoStar(e, photo)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f5c518" stroke="#f5c518" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                        </button>
                                    </div>
                                    <p className="st-photo-filename">{photo.filename || 'Untitled'}</p>
                                    <p className="st-photo-collection">{collectionName}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </SidebarLayout>
    );
};

export default Starred;
