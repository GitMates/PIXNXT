import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { openSmartAlbumPreview, getSmartAlbumPreviewShareUrl, openShareByEmail, openWhatsAppShare } from '../../lib/shareSmartAlbum';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { AlbumContextMenu } from '../../components/smart-albums/AlbumContextMenu';
import AlbumListCoverThumb from '../../components/smart-albums/AlbumListCoverThumb';
import { AlbumPreviewLinkModal, AlbumPreviewQrModal } from '../../components/smart-albums/AlbumShareModals';
import EditAlbumModal from '../../components/smart-albums/EditAlbumModal';
import AlbumSettingsSheet from '../../components/smart-albums/AlbumSettingsSheet';
import AlbumStatusFilterPopover from '../../components/smart-albums/AlbumStatusFilterPopover';
import '../../components/portal/portal.css';
import '../../components/smart-albums/AlbumStatusFilterPopover.css';
import './SmartAlbums.css';
import './SmartAlbumsListProofer.css';

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

function getAlbumCategories(album) {
    return Array.isArray(album.category_tags) ? album.category_tags.filter(Boolean) : [];
}

function isThisMonth(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isThisYear(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === new Date().getFullYear();
}

const CREATED_FILTERS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'this-month', label: 'This month' },
    { value: 'this-year', label: 'This year' },
];

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatAlbumDate(dateStr);
}

function getAlbumProofStatus(album) {
    if (album.client_approved_at) {
        return { label: 'Approved', tone: 'approved' };
    }
    if (album.client_changes_submitted_at) {
        return { label: 'Revision requested', tone: 'revision' };
    }
    if (album.status === 'published' && album.share_link_enabled !== false) {
        return { label: 'Awaiting feedback', tone: 'awaiting' };
    }
    return { label: 'Draft', tone: 'draft' };
}

function getAlbumClientLabel(album) {
    const tags = getAlbumCategories(album);
    if (tags.length) return tags.join(' & ');
    const parts = album.name?.split('—') || album.name?.split('-') || [];
    if (parts.length > 1) {
        const left = parts[0].trim();
        if (left.includes(' x ')) {
            return left
                .split(' x ')
                .map((part) => part.trim())
                .filter(Boolean)
                .join(' & ');
        }
    }
    return '';
}

function getAlbumFootnote(album, status) {
    if (status?.tone === 'revision' || album.client_changes_submitted_at) {
        const spreads = album.page_count || 4;
        return `${spreads} spreads have new comments`;
    }
    if (album.client_commenting_started_at) {
        return 'Client started reviewing spreads';
    }
    if (album.client_approved_at) {
        return 'Approved for binding';
    }
    if (isAwaitingFeedback(album)) {
        return 'Awaiting client sign-off';
    }
    const pages = album.page_count || 0;
    return pages ? `${pages} spreads in album` : '';
}

const PAGE_SUBTITLES = {
    all: 'Upload your spreads, collect feedback, and get sign-off — all in one swipeable proof.',
    awaiting: 'Albums shared with clients that are still waiting on feedback or approval.',
    approved: 'Albums your clients have approved and are ready for production.',
};

function isAwaitingFeedback(album) {
    if (album.client_approved_at) return false;
    return album.status === 'published' && album.share_link_enabled !== false;
}

function isApprovedAlbum(album) {
    return Boolean(album.client_approved_at);
}

const AlbumsList = ({ starredOnly = false, proofFilter = 'all' }) => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [starFilter, setStarFilter] = useState(starredOnly ? 'starred' : 'all');
    const [createdFilter, setCreatedFilter] = useState('newest');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pendingStatusFilter, setPendingStatusFilter] = useState('all');
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [contextMenuId, setContextMenuId] = useState(null);
    const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
    const [shareLinkAlbum, setShareLinkAlbum] = useState(null);
    const [shareQrAlbum, setShareQrAlbum] = useState(null);
    const [duplicateBusyId, setDuplicateBusyId] = useState(null);
    const [editAlbum, setEditAlbum] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [settingsAlbum, setSettingsAlbum] = useState(null);
    const contextRef = useRef(null);
    const filtersRef = useRef(null);
    const pageTitle =
        proofFilter === 'awaiting'
            ? 'Awaiting feedback'
            : proofFilter === 'approved'
              ? 'Approved'
              : starredOnly
                ? 'Starred'
                : 'Albums';

    const closeContextMenu = useCallback(() => {
        setContextMenuId(null);
        setContextMenuAnchor(null);
    }, []);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setAlbums([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = starredOnly
                    ? await smartAlbumsService.getStarredAlbums(user.id)
                    : await smartAlbumsService.getAlbums(user.id);
                if (!cancelled) {
                    setAlbums(data);
                }
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
    }, [user, authLoading, starredOnly]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (contextRef.current?.contains(e.target)) return;
            if (contextMenuAnchor?.contains(e.target)) return;
            closeContextMenu();
            if (filtersRef.current?.contains(e.target)) return;
            setSortOpen(false);
            setShowStatusFilter(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [contextMenuAnchor, closeContextMenu]);

    useEffect(() => {
        if (starredOnly) setStarFilter('starred');
    }, [starredOnly]);

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
        if (!user || duplicateBusyId) return;
        closeContextMenu();
        setDuplicateBusyId(album.id);
        try {
            const copy = await smartAlbumsService.duplicateAlbum(user.id, album.id);
            setAlbums((prev) => [copy, ...prev]);
        } catch (err) {
            console.error(err);
            alert(err?.message || 'Failed to duplicate album. Please try again.');
        } finally {
            setDuplicateBusyId(null);
        }
    };

    const handleShareByEmail = useCallback(
        (album) => {
            if (!album) return;
            closeContextMenu();
            openShareByEmail(getSmartAlbumPreviewShareUrl(album), album.name || 'Album');
        },
        [closeContextMenu]
    );

    const handleShareWhatsApp = useCallback(
        (album) => {
            if (!album) return;
            closeContextMenu();
            openWhatsAppShare(getSmartAlbumPreviewShareUrl(album), album.name || 'Album');
        },
        [closeContextMenu]
    );

    const handleGetDirectLink = useCallback(
        (album) => {
            if (!album) return;
            closeContextMenu();
            setShareLinkAlbum(album);
        },
        [closeContextMenu]
    );

    const handleGetQrCode = useCallback(
        (album) => {
            if (!album) return;
            closeContextMenu();
            setShareQrAlbum(album);
        },
        [closeContextMenu]
    );

    const handleQuickEdit = useCallback(
        (album) => {
            if (!album) return;
            closeContextMenu();
            setEditAlbum(album);
        },
        [closeContextMenu]
    );

    const handleEditSave = async (payload) => {
        if (!user?.id || !editAlbum) return;
        setEditSaving(true);
        try {
            const updated = await smartAlbumsService.updateAlbumDetails(user.id, editAlbum.id, payload);
            setAlbums((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
            setEditAlbum(null);
        } catch (err) {
            console.error(err);
            alert(err?.message || 'Failed to save changes. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    const renderContextMenu = (album) => {
        if (contextMenuId !== album.id) return null;
        return (
            <AlbumContextMenu
                menuRef={contextRef}
                anchorEl={contextMenuAnchor}
                onPreview={() => {
                    closeContextMenu();
                    openSmartAlbumPreview(album.id);
                }}
                onQuickEdit={() => handleQuickEdit(album)}
                onAlbumSettings={() => {
                    closeContextMenu();
                    setSettingsAlbum(album);
                }}
                onDuplicate={() => handleDuplicateAlbum(album)}
                onDelete={() => handleDeleteAlbum(album)}
                onShareByEmail={() => handleShareByEmail(album)}
                onGetDirectLink={() => handleGetDirectLink(album)}
                onGetQrCode={() => handleGetQrCode(album)}
                onShareWhatsApp={() => handleShareWhatsApp(album)}
            />
        );
    };

    const sortLabel =
        CREATED_FILTERS.find((f) => f.value === createdFilter)?.label || 'Newest';

    const filteredAlbums = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const result = albums.filter((a) => {
            if (proofFilter === 'awaiting' && !isAwaitingFeedback(a)) return false;
            if (proofFilter === 'approved' && !isApprovedAlbum(a)) return false;
            if (statusFilter !== 'all' && getAlbumProofStatus(a).tone !== statusFilter) {
                return false;
            }
            if (starredOnly && !a.is_starred) return false;
            if (starFilter === 'starred' && !a.is_starred) return false;
            if (starFilter === 'not-starred' && a.is_starred) return false;
            if (createdFilter === 'this-month' && !isThisMonth(a.created_at)) return false;
            if (createdFilter === 'this-year' && !isThisYear(a.created_at)) return false;
            if (q) {
                const inName = a.name?.toLowerCase().includes(q);
                const inClient = getAlbumClientLabel(a).toLowerCase().includes(q);
                if (!inName && !inClient) return false;
            }
            return true;
        });
        return result.sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime() || 0;
            const bTime = new Date(b.created_at || 0).getTime() || 0;
            return createdFilter === 'oldest' ? aTime - bTime : bTime - aTime;
        });
    }, [albums, searchQuery, starredOnly, proofFilter, statusFilter, starFilter, createdFilter]);

    const hasActiveFilters =
        (!starredOnly && starFilter !== 'all') ||
        (starredOnly && starFilter !== 'starred') ||
        statusFilter !== 'all' ||
        createdFilter !== 'newest';
    const showEmpty = !loading && filteredAlbums.length === 0 && !searchQuery && !hasActiveFilters;

    const pageSubtitle =
        proofFilter === 'awaiting'
            ? PAGE_SUBTITLES.awaiting
            : proofFilter === 'approved'
              ? PAGE_SUBTITLES.approved
              : PAGE_SUBTITLES.all;

    return (
        <main className="sa-proofer-albums">
            <header className="sa-proofer-albums__hero">
                <div>
                    <h1 className="sa-proofer-albums__title">{pageTitle}</h1>
                    <p className="sa-proofer-albums__subtitle">{pageSubtitle}</p>
                </div>
                {!starredOnly && proofFilter === 'all' && (
                    <button
                        type="button"
                        className="sa-proofer-albums__new-btn"
                        onClick={() => navigate('/smart-albums/create')}
                    >
                        + New album
                    </button>
                )}
            </header>

            <div className="sa-proofer-albums__toolbar" ref={filtersRef}>
                <label className="sa-proofer-albums__search">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="search"
                        placeholder="Search albums by title or client…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search albums"
                    />
                </label>
                {proofFilter === 'all' && (
                    <div className="sa-proofer-albums__filter-anchor">
                        <button
                            type="button"
                            className={`sa-proofer-albums__icon-btn${showStatusFilter || statusFilter !== 'all' ? ' sa-proofer-albums__icon-btn--active' : ''}${statusFilter !== 'all' ? ' sa-proofer-albums__icon-btn--filtered' : ''}`}
                            onClick={() => {
                                setSortOpen(false);
                                setShowStatusFilter((open) => {
                                    if (!open) setPendingStatusFilter(statusFilter);
                                    return !open;
                                });
                            }}
                            aria-label="Filter albums"
                            aria-expanded={showStatusFilter}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                        </button>
                        <AlbumStatusFilterPopover
                            open={showStatusFilter}
                            value={pendingStatusFilter}
                            onChange={setPendingStatusFilter}
                            onApply={() => {
                                setStatusFilter(pendingStatusFilter);
                                setShowStatusFilter(false);
                            }}
                            onClear={() => setPendingStatusFilter('all')}
                            onClose={() => setShowStatusFilter(false)}
                        />
                    </div>
                )}
                <div className="sa-proofer-albums__sort">
                    <button
                        type="button"
                        className="sa-proofer-albums__sort-btn"
                        onClick={() => setSortOpen((open) => !open)}
                        aria-expanded={sortOpen}
                    >
                        <span>{createdFilter === 'newest' ? 'Newest' : sortLabel}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {sortOpen && (
                        <div className="sa-proofer-albums__sort-menu">
                            {CREATED_FILTERS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`sa-proofer-albums__sort-option${createdFilter === option.value ? ' sa-proofer-albums__sort-option--selected' : ''}`}
                                    onClick={() => {
                                        setCreatedFilter(option.value);
                                        setSortOpen(false);
                                    }}
                                >
                                    <span>{option.label}</span>
                                    {createdFilter === option.value && <span>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="sa-proofer-albums__content">
                {loading ? (
                    <p className="sa-proofer-albums__loading">Loading albums…</p>
                ) : showEmpty ? (
                    starredOnly ? (
                        <div className="sa-proofer-albums__empty">
                            <p>No starred albums yet. Star albums from the Albums page to see them here.</p>
                        </div>
                    ) : (
                        <div className="sa-proofer-albums__empty-card">
                            <h2>Create your first album</h2>
                            <p>Design beautiful photo albums for your clients. Start from a template or build your own layout.</p>
                            <button
                                type="button"
                                className="sa-proofer-albums__new-btn"
                                onClick={() => navigate('/smart-albums/create')}
                            >
                                + New album
                            </button>
                        </div>
                    )
                ) : filteredAlbums.length === 0 ? (
                    <div className="sa-proofer-albums__empty">
                        <p>No matching albums. Try a different search or filter.</p>
                    </div>
                ) : (
                    <div className="sa-proofer-albums__grid">
                        {filteredAlbums.map((album) => {
                            const status = getAlbumProofStatus(album);
                            const clientLabel = getAlbumClientLabel(album);
                            const footnote = getAlbumFootnote(album, status);
                            return (
                                <article
                                    key={album.id}
                                    className={`sa-proofer-album-card${contextMenuId === album.id ? ' sa-proofer-album-card--menu-open' : ''}`}
                                    onClick={() => navigate(`/smart-albums/album/${album.id}`)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && navigate(`/smart-albums/album/${album.id}`)
                                    }
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="sa-proofer-album-card__shell">
                                        <div className="sa-proofer-album-card__media">
                                            <AlbumListCoverThumb album={album} alt={album.name} />
                                            <button
                                                type="button"
                                                className="sa-proofer-album-card__menu"
                                                onClick={(e) => openContextMenu(e, album.id)}
                                                aria-label="Album options"
                                            >
                                                ⋮
                                            </button>
                                            {renderContextMenu(album)}
                                        </div>
                                        <div className="sa-proofer-album-card__body">
                                            <h3 className="sa-proofer-album-card__name">{album.name}</h3>
                                            {clientLabel ? (
                                                <p className="sa-proofer-album-card__client">{clientLabel}</p>
                                            ) : null}
                                            <div className="sa-proofer-album-card__divider" />
                                            <div className="sa-proofer-album-card__meta">
                                                <span
                                                    className={`sa-proofer-album-badge sa-proofer-album-badge--${status.tone}`}
                                                >
                                                    {status.tone === 'revision' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                        </svg>
                                                    )}
                                                    {status.label}
                                                </span>
                                                <span className="sa-proofer-album-card__time">
                                                    {formatRelativeTime(album.updated_at || album.created_at)}
                                                </span>
                                            </div>
                                            {footnote ? (
                                                <p className="sa-proofer-album-card__note">{footnote}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            <AlbumPreviewLinkModal
                album={shareLinkAlbum}
                isOpen={Boolean(shareLinkAlbum)}
                onClose={() => setShareLinkAlbum(null)}
            />
            <AlbumPreviewQrModal
                album={shareQrAlbum}
                isOpen={Boolean(shareQrAlbum)}
                onClose={() => setShareQrAlbum(null)}
            />
            <EditAlbumModal
                album={editAlbum}
                isOpen={Boolean(editAlbum)}
                onClose={() => setEditAlbum(null)}
                onSave={handleEditSave}
                onAdvanced={(album) => navigate(`/smart-albums/album/${album.id}`)}
                saving={editSaving}
            />
            <AlbumSettingsSheet
                isOpen={Boolean(settingsAlbum)}
                onClose={() => setSettingsAlbum(null)}
                album={settingsAlbum}
                photographerId={user?.id}
                onSaved={(updated) => {
                    if (!updated?.id) return;
                    setAlbums((prev) =>
                        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
                    );
                    setSettingsAlbum((current) =>
                        current?.id === updated.id ? { ...current, ...updated } : current
                    );
                }}
            />
        </main>
    );
};

export default AlbumsList;
