import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import { getMobileGalleryDbErrorMessage } from '../../lib/mobileGalleryDbError';
import CreateAppModal from '../../components/mobile-gallery/CreateAppModal';
import AppContextMenu from '../../components/mobile-gallery/AppContextMenu';
import './MobileGallery.css';

function getAppInitial(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'A';
}

const AppsList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [contextMenuId, setContextMenuId] = useState(null);
  const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
  const contextRef = useRef(null);

  const closeContextMenu = useCallback(() => {
    setContextMenuId(null);
    setContextMenuAnchor(null);
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setApps([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await mobileGalleryService.getApps(user.id);
        if (!cancelled) setApps(data);
      } catch (err) {
        console.error('[mobileGallery] Failed to load apps:', err);
        if (!cancelled) {
          setApps([]);
          setLoadError(getMobileGalleryDbErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (contextRef.current?.contains(e.target)) return;
      if (contextMenuAnchor?.contains(e.target)) return;
      closeContextMenu();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [contextMenuAnchor, closeContextMenu]);

  const handleCreate = async ({ name, event_date }) => {
    if (!user) return;
    setCreating(true);
    try {
      const app = await mobileGalleryService.createApp({
        photographer_id: user.id,
        name,
        event_date,
      });
      setCreateOpen(false);
      navigate(`/mobile-gallery/app/${app.id}`);
    } catch (err) {
      console.error(err);
      alert(getMobileGalleryDbErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const openContextMenu = (e, appId) => {
    e.stopPropagation();
    if (contextMenuId === appId) {
      closeContextMenu();
      return;
    }
    setContextMenuAnchor(e.currentTarget);
    setContextMenuId(appId);
  };

  const handleDelete = async (app) => {
    if (!user) return;
    closeContextMenu();
    if (!window.confirm(`Delete "${app.name}"? This cannot be undone.`)) return;
    try {
      await mobileGalleryService.deleteApp(user.id, app.id);
      setApps((prev) => prev.filter((a) => a.id !== app.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete app. Please try again.');
    }
  };

  const handleTogglePublish = async (app) => {
    if (!user) return;
    closeContextMenu();
    const nextStatus = app.status === 'published' ? 'draft' : 'published';
    try {
      const updated = await mobileGalleryService.updateApp(user.id, app.id, { status: nextStatus });
      setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      console.error(err);
      alert(`Failed to ${nextStatus === 'published' ? 'publish' : 'unpublish'} app. Please try again.`);
    }
  };

  const filteredApps = apps.filter((app) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return app.name?.toLowerCase().includes(q);
  });

  const showEmpty = !loading && apps.length === 0;

  return (
    <div className="mg-apps-page mg-content">
      <header className="mg-apps-header">
        <h1 className="mg-apps-title">Mobile Gallery Apps</h1>
        <div className="mg-apps-header-actions">
          {searchOpen ? (
            <div className="mg-search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Search apps"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search apps"
                autoFocus
              />
            </div>
          ) : (
            <button
              type="button"
              className="mg-search-toggle"
              onClick={() => setSearchOpen(true)}
              aria-label="Search apps"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}
          <button type="button" className="mg-btn-primary" onClick={() => setCreateOpen(true)}>
            + Create New
          </button>
        </div>
      </header>

      {loadError && (
        <div className="mg-empty" role="alert">
          <h2>Database setup required</h2>
          <p>{loadError}</p>
        </div>
      )}

      {!loadError && loading ? (
        <p className="mg-loading">Loading apps…</p>
      ) : !loadError && showEmpty ? (
        <div className="mg-empty">
          <div className="mg-empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <h2>Create your first Mobile Gallery App</h2>
          <p>Give your clients a beautiful, personalized mobile experience to view and share their photos.</p>
          <button type="button" className="mg-btn-primary" onClick={() => setCreateOpen(true)}>
            + Create New
          </button>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="mg-empty">
          <h2>No matching apps</h2>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <div className="mg-apps-grid">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="mg-app-card"
              onClick={() => navigate(`/mobile-gallery/app/${app.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/mobile-gallery/app/${app.id}`)}
              role="button"
              tabIndex={0}
            >
              <div className="mg-app-card-thumb">
                {app.cover_image_url || app.icon_url ? (
                  <img src={app.cover_image_url || app.icon_url} alt="" />
                ) : (
                  <div className="mg-app-card-icon">{getAppInitial(app.name)}</div>
                )}
              </div>
              <div className="mg-app-card-footer">
                <h3 className="mg-app-card-name">{app.name}</h3>
                <button
                  type="button"
                  className="mg-app-card-menu"
                  onClick={(e) => openContextMenu(e, app.id)}
                  aria-label="App options"
                  aria-haspopup="menu"
                  aria-expanded={contextMenuId === app.id}
                >
                  <svg width="18" height="4" viewBox="0 0 18 4" fill="currentColor" aria-hidden>
                    <circle cx="2" cy="2" r="1.5" />
                    <circle cx="9" cy="2" r="1.5" />
                    <circle cx="16" cy="2" r="1.5" />
                  </svg>
                </button>
              </div>
              {contextMenuId === app.id && (
                <AppContextMenu
                  menuRef={contextRef}
                  anchorEl={contextMenuAnchor}
                  isPublished={app.status === 'published'}
                  onTogglePublish={() => handleTogglePublish(app)}
                  onDelete={() => handleDelete(app)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <CreateAppModal
        isOpen={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        onCreate={handleCreate}
        saving={creating}
      />
    </div>
  );
};

export default AppsList;
