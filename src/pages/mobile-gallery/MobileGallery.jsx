import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import { galleryService } from '../../services/gallery.service';
import './MobileGallery.css';

const MobileGallery = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuId, setContextMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Inline Create Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [creatingApp, setCreatingApp] = useState(false);

  const contextRef = useRef(null);
  const appDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const fetchGalleries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await mobileGalleryService.getGalleries(user.id);
      setGalleries(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setContextMenuId(null);
      }
      if (appDropdownRef.current && !appDropdownRef.current.contains(e.target)) {
        setShowAppDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filtered = galleries.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openContextMenu = (e, id) => {
    e.stopPropagation();
    if (contextMenuId === id) {
      setContextMenuId(null);
    } else {
      setContextMenuId(id);
    }
  };

  const handleDelete = async (gallery) => {
    if (!window.confirm(`Delete "${gallery.name}"? This cannot be undone.`)) return;
    setDeletingId(gallery.id);
    try {
      await mobileGalleryService.deleteGallery(gallery.id);
      setGalleries((prev) => prev.filter((g) => g.id !== gallery.id));
    } catch (err) {
      alert('Failed to delete gallery.');
    } finally {
      setDeletingId(null);
      setContextMenuId(null);
    }
  };

  const getPublicUrl = (slug) => {
    const base = window.location.origin;
    return `${base}/mobile-gallery/view/${slug}`;
  };

  const handleShare = async (gallery) => {
    const url = getPublicUrl(gallery.slug);
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch (_) {
      prompt('Copy this link:', url);
    }
    setContextMenuId(null);
  };

  // Automated Profile Fetch & Gallery Creation
  const handleCreateApp = async (e) => {
    e.preventDefault();
    if (!newAppName.trim()) return alert('Please enter an app name.');
    
    setCreatingApp(true);
    try {
      // 1. Fetch photographer profile & branding settings dynamically
      let profile = null;
      try {
        profile = await galleryService.getPhotographerProfile(user.id);
      } catch (profileErr) {
        console.warn('Could not fetch photographer profile details, using defaults:', profileErr);
      }

      // 2. Prepare payload automatically populated from database profile
      const payload = {
        name: newAppName.trim(),
        event_date: newEventDate || null,
        photographer_name: profile?.display_name || user?.email?.split('@')[0] || 'Photographer',
        photographer_email: profile?.email || user?.email || '',
        photographer_phone: profile?.phone || '',
        photographer_instagram: profile?.social_instagram || '',
        photographer_website: profile?.website_url || '',
        cta_enabled: false,
        cta_text: 'Book a Session',
        cta_url: profile?.website_url || '',
        cover_style: 'none',
        grid_style: 'vertical',
        color_theme: 'light',
        theme_color: '#000000'
      };

      // 3. Save to database
      const gallery = await mobileGalleryService.createGallery(user.id, payload);
      
      // 4. Reset & navigate directly to editor photos view
      setShowCreateModal(false);
      setNewAppName('');
      setNewEventDate('');
      navigate(`/mobile-gallery/${gallery.id}/photos`);
    } catch (err) {
      alert('Failed to create Mobile Gallery App: ' + err.message);
    } finally {
      setCreatingApp(false);
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'P';

  return (
    <div className="mga-root">
      {/* ── Standalone Navigation Bar ── */}
      <nav className="mga-navbar">
        <Link to="/dashboard" className="mga-logo">
          PIXNXT
        </Link>
        <div className="mga-divider" />
        
        {/* App Switcher Dropdown */}
        <div className="mga-app-switcher" ref={appDropdownRef} onClick={() => setShowAppDropdown(!showAppDropdown)}>
          <svg className="mga-app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          <span className="mga-app-name">Mobile Gallery App</span>
          <svg className="mga-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>

          {showAppDropdown && (
            <div className="mga-switcher-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="mga-switch-item" onClick={() => { navigate('/client-gallery'); setShowAppDropdown(false); }}>
                <div className="mga-switch-icon" style={{ background: '#f0fbfb' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#44aaa7" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div>
                  <div className="mga-switch-name">Client Gallery</div>
                  <div className="mga-switch-desc">Share & sell photos online</div>
                </div>
              </div>
              <div className="mga-switch-item" onClick={() => { navigate('/smart-albums'); setShowAppDropdown(false); }}>
                <div className="mga-switch-icon" style={{ background: '#f5f0fb' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b44a7" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <div className="mga-switch-name">Smart Albums</div>
                  <div className="mga-switch-desc">Layout beautiful albums in seconds</div>
                </div>
              </div>
              <div className="mga-switch-sep" />
              <div className="mga-switch-item" onClick={() => { navigate('/dashboard'); setShowAppDropdown(false); }}>
                <span className="mga-switch-name" style={{ fontWeight: 500, fontSize: 13 }}>← Back to Dashboard</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Controls */}
        <div className="mga-navbar-right">
          <button className="mga-nav-icon-btn" title="Help">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button className="mga-nav-icon-btn" title="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          
          {/* Profile Dropdown */}
          <div style={{ position: 'relative' }} ref={profileDropdownRef}>
            <div className="mga-avatar" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
              {userInitial}
            </div>

            {showProfileDropdown && (
              <div className="mga-ctx" style={{ top: 'calc(100% + 8px)', right: 0 }}>
                <div className="mga-ctx-item" onClick={() => { navigate('/settings'); setShowProfileDropdown(false); }}>Profile</div>
                <div className="mga-ctx-item" onClick={() => { navigate('/dashboard'); setShowProfileDropdown(false); }}>Dashboard</div>
                <div className="mga-ctx-sep" />
                <div className="mga-ctx-item mga-ctx-item--danger" onClick={async () => { await logout(); navigate('/auth'); }}>Logout</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Sub Tabs (Apps / Settings) ── */}
      <div className="mga-tabs">
        <Link to="/mobile-gallery" className="mga-tab mga-tab-active">Apps</Link>
        <Link to="/settings" className="mga-tab">Settings</Link>
      </div>

      {/* ── Main Content Area ── */}
      <main className="mga-content">
        <div className="mga-page-header">
          <h1 className="mga-page-title">Mobile Gallery Apps</h1>
          
          <div className="mga-page-actions">
            {/* Search Input Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                placeholder="Search galleries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: '1px solid #ddd',
                  padding: '7px 12px',
                  fontSize: 13,
                  outline: 'none',
                  borderRadius: '2px',
                  width: searchQuery ? 200 : 0,
                  opacity: searchQuery ? 1 : 0,
                  transition: 'all 0.2s',
                  pointerEvents: searchQuery ? 'auto' : 'none'
                }}
              />
              <button
                className="mga-icon-btn"
                onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
                title="Search Galleries"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>

            <button className="mga-create-btn" onClick={() => setShowCreateModal(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create New
            </button>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="mga-skeleton-wrap">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mga-skeleton-card">
                <div className="mga-skeleton-thumb" />
                <div className="mga-skeleton-line" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mga-empty">
            {galleries.length === 0 ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
                <h3 className="mga-empty-title">No Mobile Gallery Apps yet</h3>
                <p className="mga-empty-sub">
                  Create your first personalized Mobile Gallery App and send it directly to your client's home screen.
                </p>
                <button className="mga-create-btn" onClick={() => setShowCreateModal(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Create New
                </button>
              </>
            ) : (
              <>
                <h3 className="mga-empty-title">No results for "{searchQuery}"</h3>
                <button className="mga-ghost-btn" onClick={() => setSearchQuery('')}>Clear search</button>
              </>
            )}
          </div>
        ) : (
          <div className="mga-grid">
            {filtered.map((gallery) => (
              <div
                key={gallery.id}
                className="mga-card"
                onClick={() => navigate(`/mobile-gallery/${gallery.id}/photos`)}
              >
                {/* Image Cover/Icon Preview */}
                <div className="mga-card-thumb">
                  {gallery.app_icon_url ? (
                    <img src={gallery.app_icon_url} alt={gallery.name} style={{ borderRadius: 28, width: '75%', height: '75%', objectFit: 'cover' }} />
                  ) : gallery.cover_image_url ? (
                    <img src={gallery.cover_image_url} alt={gallery.name} />
                  ) : (
                    <div className="mga-card-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="mga-card-footer">
                  <span className="mga-card-name">{gallery.name}</span>
                  
                  {/* Context Options Button */}
                  <div style={{ position: 'relative' }}>
                    <button
                      className="mga-card-menu"
                      onClick={(e) => openContextMenu(e, gallery.id)}
                      title="More Actions"
                    >
                      ···
                    </button>

                    {contextMenuId === gallery.id && (
                      <div className="mga-ctx" ref={contextRef} onClick={(e) => e.stopPropagation()}>
                        <div className="mga-ctx-item" onClick={() => { navigate(`/mobile-gallery/${gallery.id}/photos`); setContextMenuId(null); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit App
                        </div>
                        <div className="mga-ctx-item" onClick={() => { window.open(getPublicUrl(gallery.slug), '_blank'); setContextMenuId(null); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Preview
                        </div>
                        <div className="mga-ctx-item" onClick={() => handleShare(gallery)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                          Copy Link
                        </div>
                        <div className="mga-ctx-sep" />
                        <div className="mga-ctx-item mga-ctx-item--danger" onClick={() => handleDelete(gallery)}>
                          {deletingId === gallery.id ? (
                            'Deleting...'
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              Delete App
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── HIGH-FIDELITY "CREATE NEW APP" MODAL ── */}
      {showCreateModal && (
        <div className="mga-modal-overlay">
          <div className="mga-modal-card">
            <div className="mga-modal-header">
              <h2 className="mga-modal-title">Create New App</h2>
            </div>
            
            <form onSubmit={handleCreateApp}>
              <div className="mga-modal-body">
                {/* 1. App Name Field */}
                <div className="mga-modal-field">
                  <label className="mga-modal-label">Mobile Gallery App Name</label>
                  <input
                    type="text"
                    className="mga-modal-input"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    placeholder="e.g. John & Jane"
                    required
                    autoFocus
                  />
                </div>

                {/* 2. Event Date Field */}
                <div className="mga-modal-field">
                  <label className="mga-modal-label">Event Date</label>
                  <input
                    type="date"
                    className="mga-modal-input"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                  />
                  <p className="mga-modal-note" style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    Pick a date (optional)
                  </p>
                </div>

                {/* Info Text */}
                <p className="mga-modal-note" style={{ marginTop: 12 }}>
                  Looking to create an app from a client gallery? <span className="mga-modal-link">Learn more</span>
                </p>

                {/* Footer Buttons */}
                <div className="mga-modal-actions">
                  <button
                    type="button"
                    className="mga-modal-btn-cancel"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewAppName('');
                      setNewEventDate('');
                    }}
                    disabled={creatingApp}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="mga-modal-btn-create"
                    disabled={creatingApp || !newAppName.trim()}
                  >
                    {creatingApp ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileGallery;
