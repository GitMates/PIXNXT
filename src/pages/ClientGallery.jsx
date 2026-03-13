import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import './ClientGallery.css';

const ClientGallery = () => {
    const navigate = useNavigate();
    const [collections, setCollections] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Load collections from localStorage
        const saved = localStorage.getItem('pixnxt_collections');
        if (saved) {
            try { setCollections(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    const handleCreateCollection = () => {
        if (!newName.trim()) return;
        const collection = {
            id: Date.now(),
            name: newName.trim(),
            date: newDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            cover: null,
            photoCount: 0,
        };
        const updated = [...collections, collection];
        setCollections(updated);
        localStorage.setItem('pixnxt_collections', JSON.stringify(updated));
        localStorage.setItem('pixnxt_collection_name', collection.name);
        localStorage.setItem('pixnxt_collection_date', collection.date);
        localStorage.removeItem('pixnxt_photos');
        localStorage.removeItem('pixnxt_collection_cover');
        localStorage.setItem('pixnxt_collection_photo_count', '0');
        setNewName('');
        setNewDate('');
        setShowCreateForm(false);
        navigate('/collections/manage');
    };

    const handleCardClick = (collection) => {
        localStorage.setItem('pixnxt_collection_name', collection.name);
        localStorage.setItem('pixnxt_collection_date', collection.date);
        navigate('/collections/manage');
    };

    const handleCoverUpload = (collectionId, e) => {
        e.stopPropagation();
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const updated = collections.map(c =>
                    c.id === collectionId ? { ...c, cover: ev.target.result } : c
                );
                setCollections(updated);
                localStorage.setItem('pixnxt_collections', JSON.stringify(updated));
            };
            reader.readAsDataURL(file);
        }
    };

    // Sync cover and count from CollectionDashboard localStorage
    useEffect(() => {
        const cover = localStorage.getItem('pixnxt_collection_cover');
        const count = localStorage.getItem('pixnxt_collection_photo_count');
        const name = localStorage.getItem('pixnxt_collection_name');
        if (name && collections.length > 0) {
            const updated = collections.map(c => {
                if (c.name === name) {
                    return {
                        ...c,
                        cover: cover || c.cover,
                        photoCount: count ? parseInt(count) : c.photoCount
                    };
                }
                return c;
            });
            // Only update if changed
            const hasChanges = updated.some((c, i) =>
                c.cover !== collections[i].cover || c.photoCount !== collections[i].photoCount
            );
            if (hasChanges) {
                setCollections(updated);
                localStorage.setItem('pixnxt_collections', JSON.stringify(updated));
            }
        }
    }, []);

    return (
        <SidebarLayout>
            <main className="cg-main cg-collections-view">
                {/* Header */}
                <div className="cg-collections-header">
                    <div className="cg-collections-header-left">
                        <h1 className="cg-collections-title">Collections</h1>
                        <div className="cg-search-box">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search" className="cg-search-input" />
                        </div>
                    </div>
                    <div className="cg-collections-header-right">
                        <button className="cg-view-presets-btn">View Presets</button>
                        <button className="cg-new-collection-btn" onClick={() => setShowCreateForm(true)}>
                            New Collection
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="cg-filter-bar">
                    <div className="cg-filters-left">
                        <button className="cg-filter-chip">Status <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                        <button className="cg-filter-chip">Category Tag <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                        <button className="cg-filter-chip">Event Date <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                        <button className="cg-filter-chip">Expiry Date <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                        <button className="cg-filter-chip">Starred <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                    <div className="cg-filters-right">
                        <button className="cg-view-icon-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="18" x2="12" y2="18"></line><line x1="3" y1="6" x2="3" y2="18"></line><polyline points="1 15 3 18 5 15"></polyline></svg>
                        </button>
                        <button className="cg-view-icon-btn active">
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        </button>
                    </div>
                </div>

                {/* Collection Cards Grid */}
                {collections.length > 0 ? (
                    <div className="cg-collection-grid">
                        {collections.map(collection => (
                            <div
                                key={collection.id}
                                className="cg-collection-card"
                                onClick={() => handleCardClick(collection)}
                            >
                                <div className="cg-card-thumb">
                                    {collection.cover ? (
                                        <img src={collection.cover} alt={collection.name} />
                                    ) : (
                                        <div className="cg-card-placeholder">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        </div>
                                    )}
                                </div>
                                <div className="cg-card-info">
                                    <h3 className="cg-card-name">{collection.name}</h3>
                                    <div className="cg-card-meta">
                                        <span className="cg-card-dot"></span>
                                        <span className="cg-card-count">{collection.photoCount || 0} items</span>
                                        <span className="cg-card-separator">·</span>
                                        <span className="cg-card-date">{collection.date}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="cg-empty-collections">
                        <div className="cg-empty-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d0d5d9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                        </div>
                        <h3 className="cg-empty-title">No collections yet</h3>
                        <p className="cg-empty-text">Create your first collection to get started</p>
                        <button className="cg-empty-create-btn" onClick={() => setShowCreateForm(true)}>
                            Create Collection
                        </button>
                    </div>
                )}

                {/* Create Collection Inline Modal */}
                {showCreateForm && (
                    <div className="cd-modal-overlay" onClick={() => setShowCreateForm(false)}>
                        <div className="cg-create-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="cg-create-modal-header">
                                <h3>New Collection</h3>
                                <button className="cd-modal-close" onClick={() => setShowCreateForm(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="cg-create-modal-body">
                                <div className="cg-form-group">
                                    <label>Collection Name</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Jessie & Ryan"
                                        autoFocus
                                    />
                                </div>
                                <div className="cg-form-group">
                                    <label>Event Date</label>
                                    <input
                                        type="text"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        placeholder="e.g. Mar 12, 2026"
                                    />
                                </div>
                                <button className="cg-create-submit" onClick={handleCreateCollection}>
                                    Create Collection
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </SidebarLayout>
    );
};

export default ClientGallery;
