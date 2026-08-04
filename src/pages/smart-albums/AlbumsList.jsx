import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { openSmartAlbumPreview, getSmartAlbumPreviewShareUrl, openShareByEmail, openWhatsAppShare } from '../../lib/shareSmartAlbum';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { galleryService } from '../../services/gallery.service';
import { smartAlbumCommentsService, COMMENTS_CHANGED_EVENT } from '../../services/smartAlbumComments.service';
import {
    ALBUM_PROOF_STATUS_CHANGED_EVENT,
    getAlbumProofActivityAt,
    getAlbumProofFootnote,
    getAlbumProofStatus,
    mergeAlbumProofTimestamps,
} from '../../components/smart-albums/albumProofStatus';
import { formatAlbumCardTime, formatAbsoluteDateTime } from '../../lib/relativeTime';
import { AlbumContextMenu } from '../../components/smart-albums/AlbumContextMenu';
import AlbumListCoverThumb from '../../components/smart-albums/AlbumListCoverThumb';
import { AlbumPreviewLinkModal, AlbumPreviewQrModal } from '../../components/smart-albums/AlbumShareModals';
import EditAlbumModal from '../../components/smart-albums/EditAlbumModal';
import AlbumDuplicateModal from '../../components/smart-albums/AlbumDuplicateModal';
import AlbumSettingsSheet from '../../components/smart-albums/AlbumSettingsSheet';
import AlbumStatusFilterPopover from '../../components/smart-albums/AlbumStatusFilterPopover';
import '../../components/portal/portal.css';
import '../../components/smart-albums/AlbumStatusFilterPopover.css';
import './SmartAlbums.css';
import './SmartAlbumsListProofer.css';

/** Status pipeline order for "Needs you first" sorting. */
const NEEDS_YOU_FIRST_STATUS_ORDER = {
    draft: 0,
    awaiting: 1,
    feedback: 2,
    revision: 3,
    approved: 4,
    paused: 5,
};

function getNeedsYouFirstRank(album) {
    const tone = getAlbumProofStatus(album).tone;
    return NEEDS_YOU_FIRST_STATUS_ORDER[tone] ?? 99;
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

function getAlbumListSubtitle(album, clientLabel) {
    const parts = [];
    if (clientLabel) parts.push(clientLabel);
    const spreads = Number(album?.page_count) || 0;
    if (spreads > 0) {
        parts.push(`${spreads} spread${spreads === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
}

function getAlbumListAction(status) {
    if (status?.tone === 'feedback' || status?.tone === 'awaiting') {
        return { label: 'Remind', kind: 'remind' };
    }
    return { label: 'Open', kind: 'open' };
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

function isApprovedAlbum(album) {
    return getAlbumProofStatus(album).tone === 'approved';
}

export function isNeedsYouStatusTone(tone) {
    return tone === 'awaiting' || tone === 'feedback' || tone === 'revision';
}

function isNeedsYouAlbum(album) {
    return isNeedsYouStatusTone(getAlbumProofStatus(album).tone);
}

function formatStatusLabel(status) {
    return status?.label || 'Draft';
}

function formatAlbumMetaParts(clientLabel, footnote) {
    const parts = [];
    if (clientLabel) parts.push(clientLabel);
    if (footnote) parts.push(footnote);
    return parts.join(' · ');
}

const AlbumsList = ({ starredOnly = false, proofFilter = 'all' }) => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [albums, setAlbums] = useState([]);
    const [proofSummaries, setProofSummaries] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [starFilter, setStarFilter] = useState(starredOnly ? 'starred' : 'all');
    const [createdFilter, setCreatedFilter] = useState('newest');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pendingStatusFilter, setPendingStatusFilter] = useState('all');
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [needsYouFirst, setNeedsYouFirst] = useState(true);
    const [contextMenuId, setContextMenuId] = useState(null);
    const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
    const [shareLinkAlbum, setShareLinkAlbum] = useState(null);
    const [shareQrAlbum, setShareQrAlbum] = useState(null);
    const [photographerProfile, setPhotographerProfile] = useState(null);
    const [duplicateBusyId, setDuplicateBusyId] = useState(null);
    const [duplicateAlbum, setDuplicateAlbum] = useState(null);
    const [editAlbum, setEditAlbum] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [settingsAlbum, setSettingsAlbum] = useState(null);
    const [settingsAnchor, setSettingsAnchor] = useState(null);
    const [relativeNow, setRelativeNow] = useState(() => Date.now());
    const contextRef = useRef(null);
    const filtersRef = useRef(null);
    const pageTitle =
        proofFilter === 'awaiting'
            ? 'Needs you'
            : proofFilter === 'approved'
              ? 'Approved'
              : starredOnly
                ? 'Starred'
                : 'Albums';

    const closeContextMenu = useCallback(() => {
        setContextMenuId(null);
        setContextMenuAnchor(null);
    }, []);

    const loadAlbums = useCallback(async ({ silent = false } = {}) => {
        if (!user?.id) {
            setAlbums([]);
            setProofSummaries({});
            setLoading(false);
            return;
        }

        try {
            if (!silent) setLoading(true);
            const data = starredOnly
                ? await smartAlbumsService.getStarredAlbums(user.id)
                : await smartAlbumsService.getAlbums(user.id);
            const summaries = await smartAlbumCommentsService.getAlbumProofSummaries(
                data.map((album) => album.id)
            );
            setProofSummaries(summaries);
            setAlbums(data);
        } catch (err) {
            console.error(err);
            setAlbums([]);
            setProofSummaries({});
        } finally {
            setLoading(false);
        }
    }, [user?.id, starredOnly]);

    useEffect(() => {
        if (authLoading) return;
        void loadAlbums();
    }, [authLoading, loadAlbums]);

    useEffect(() => {
        if (!user?.id) {
            setPhotographerProfile(null);
            return undefined;
        }
        let cancelled = false;
        galleryService
            .getPhotographerProfile(user.id)
            .then((profile) => {
                if (!cancelled) setPhotographerProfile(profile || null);
            })
            .catch(() => {
                if (!cancelled) setPhotographerProfile(null);
            });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return undefined;

        const refresh = () => {
            void loadAlbums({ silent: true });
        };

        const onCommentsChanged = () => refresh();
        const onProofStatusChanged = () => refresh();

        window.addEventListener(COMMENTS_CHANGED_EVENT, onCommentsChanged);
        window.addEventListener(ALBUM_PROOF_STATUS_CHANGED_EVENT, onProofStatusChanged);
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') refresh();
        });

        return () => {
            window.removeEventListener(COMMENTS_CHANGED_EVENT, onCommentsChanged);
            window.removeEventListener(ALBUM_PROOF_STATUS_CHANGED_EVENT, onProofStatusChanged);
            window.removeEventListener('focus', refresh);
        };
    }, [user?.id, loadAlbums]);

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

    // Keep "Just now" / "Xm ago" labels honest while the list stays open.
    useEffect(() => {
        const tick = () => setRelativeNow(Date.now());
        const id = window.setInterval(tick, 15_000);
        const onVisible = () => {
            if (document.visibilityState === 'visible') tick();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', tick);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', tick);
        };
    }, []);

    const openAlbumSettings = useCallback(
        (e, album) => {
            e.stopPropagation();
            closeContextMenu();
            const rect = e.currentTarget.getBoundingClientRect();
            setSettingsAnchor({ top: rect.bottom + 6, left: rect.right });
            setSettingsAlbum(album);
        },
        [closeContextMenu]
    );

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

    const openDuplicateAlbum = useCallback(
        (album) => {
            if (!album || duplicateBusyId) return;
            closeContextMenu();
            setSettingsAlbum(null);
            setSettingsAnchor(null);
            setDuplicateAlbum(album);
        },
        [closeContextMenu, duplicateBusyId]
    );

    const handleConfirmDuplicateAlbum = async () => {
        if (!user || !duplicateAlbum || duplicateBusyId) return;
        const album = duplicateAlbum;
        setDuplicateBusyId(album.id);
        try {
            const copy = await smartAlbumsService.duplicateAlbum(user.id, album.id);
            setAlbums((prev) => [copy, ...prev]);
            setDuplicateAlbum(null);
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
            openShareByEmail(
                getSmartAlbumPreviewShareUrl(album, { photographerProfile }),
                album.name || 'Album'
            );
        },
        [closeContextMenu, photographerProfile]
    );

    const handleShareWhatsApp = useCallback(
        (album) => {
            if (!album) return;
            closeContextMenu();
            openWhatsAppShare(
                getSmartAlbumPreviewShareUrl(album, { photographerProfile }),
                album.name || 'Album'
            );
        },
        [closeContextMenu, photographerProfile]
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
            const nameExists = albums.some(
                (a) =>
                    a.id !== editAlbum.id &&
                    a.name.trim().toLowerCase() === payload.name.trim().toLowerCase()
            );
            if (nameExists) {
                alert('An album with this name already exists.');
                throw new Error('duplicate-name');
            }
            const updated = await smartAlbumsService.updateAlbumDetails(
                user.id,
                editAlbum.id,
                payload
            );
            setAlbums((prev) =>
                prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
            );
            return updated;
        } catch (err) {
            console.error(err);
            if (err?.message !== 'duplicate-name') {
                alert(err?.message || 'Failed to save changes. Please try again.');
            }
            throw err;
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
                    if (album?.share_link_enabled === false) return;
                    openSmartAlbumPreview(album.id);
                }}
                onQuickEdit={() => handleQuickEdit(album)}
                onAlbumSettings={() => {
                    closeContextMenu();
                    setSettingsAlbum(album);
                }}
                onDuplicate={() => openDuplicateAlbum(album)}
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

    const enrichedAlbums = useMemo(
        () =>
            albums.map((album) =>
                mergeAlbumProofTimestamps(album, proofSummaries[album.id] || null)
            ),
        [albums, proofSummaries]
    );

    const proofCounts = useMemo(() => {
        let needYou = 0;
        let awaitingClient = 0;
        let approved = 0;
        for (const album of enrichedAlbums) {
            const tone = getAlbumProofStatus(album).tone;
            if (tone === 'revision') needYou += 1;
            else if (tone === 'awaiting' || tone === 'feedback') awaitingClient += 1;
            else if (tone === 'approved') approved += 1;
        }
        return { needYou, awaitingClient, approved, total: enrichedAlbums.length };
    }, [enrichedAlbums]);

    const filteredAlbums = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const result = enrichedAlbums.filter((a) => {
            if (proofFilter === 'awaiting' && !isNeedsYouAlbum(a)) return false;
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
            if (needsYouFirst && (proofFilter === 'all' || proofFilter === 'awaiting')) {
                const rankDiff = getNeedsYouFirstRank(a) - getNeedsYouFirstRank(b);
                if (rankDiff !== 0) return rankDiff;
                const aAct = new Date(getAlbumProofActivityAt(a) || 0).getTime() || 0;
                const bAct = new Date(getAlbumProofActivityAt(b) || 0).getTime() || 0;
                if (aAct !== bAct) return bAct - aAct;
            }
            const aTime = new Date(a.created_at || 0).getTime() || 0;
            const bTime = new Date(b.created_at || 0).getTime() || 0;
            return createdFilter === 'oldest' ? aTime - bTime : bTime - aTime;
        });
    }, [
        enrichedAlbums,
        searchQuery,
        starredOnly,
        proofFilter,
        statusFilter,
        starFilter,
        createdFilter,
        needsYouFirst,
    ]);

    const hasActiveFilters =
        (!starredOnly && starFilter !== 'all') ||
        (starredOnly && starFilter !== 'starred') ||
        statusFilter !== 'all' ||
        createdFilter !== 'newest';
    const showEmpty = !loading && filteredAlbums.length === 0 && !searchQuery && !hasActiveFilters;
    const showFirstProofEmpty = showEmpty && !starredOnly && proofFilter === 'all';
    // Avoid flashing Albums chrome + "Loading…" before the first-proof empty state.
    const awaitingFirstProof =
        loading &&
        !starredOnly &&
        proofFilter === 'all' &&
        albums.length === 0 &&
        !searchQuery &&
        !hasActiveFilters;
    const hideListChrome = showFirstProofEmpty || awaitingFirstProof;

    const pageSubtitle =
        proofFilter === 'awaiting'
            ? 'Not opened, awaiting feedback, and revision requested.'
            : proofFilter === 'approved'
              ? 'Albums your clients have approved and are ready for production.'
              : `${proofCounts.needYou} need you · ${proofCounts.awaitingClient} awaiting client · ${proofCounts.approved} approved`;

    const showFilteredEmpty =
        showEmpty && (proofFilter === 'awaiting' || proofFilter === 'approved');

    return (
        <main className={`sa-proofer-albums${hideListChrome ? ' sa-proofer-albums--first-proof' : ''}`}>
            {!hideListChrome && (
                <>
            <header className="sa-proofer-albums__hero">
                <div>
                    <h1 className="sa-proofer-albums__title type-page-title">{pageTitle}</h1>
                    <p className="sa-proofer-albums__subtitle">{pageSubtitle}</p>
                </div>
                {!starredOnly && proofFilter === 'all' && (
                    <button
                        type="button"
                        className="sa-proofer-albums__new-btn"
                        onClick={() => navigate('/album-proofer/create')}
                    >
                        New album
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
                        placeholder="Search albums or clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search albums"
                    />
                </label>
                {proofFilter === 'all' && (
                    <div className="sa-proofer-albums__filter-anchor">
                        <button
                            type="button"
                            className={`sa-proofer-albums__chip-btn${showStatusFilter || statusFilter !== 'all' ? ' sa-proofer-albums__chip-btn--active' : ''}${statusFilter !== 'all' ? ' sa-proofer-albums__chip-btn--filtered' : ''}`}
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Filter
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
                        className={`sa-proofer-albums__chip-btn${needsYouFirst || sortOpen ? ' sa-proofer-albums__chip-btn--active' : ''}`}
                        onClick={() => {
                            setShowStatusFilter(false);
                            setSortOpen((open) => !open);
                        }}
                        aria-expanded={sortOpen}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M7 15l5 5 5-5" />
                            <path d="M7 9l5-5 5 5" />
                        </svg>
                        <span>{needsYouFirst && proofFilter === 'all' ? 'Needs you first' : createdFilter === 'newest' ? 'Newest' : sortLabel}</span>
                    </button>
                    {sortOpen && (
                        <div className="sa-proofer-albums__sort-menu">
                            {proofFilter === 'all' && (
                                <button
                                    type="button"
                                    className={`sa-proofer-albums__sort-option${needsYouFirst ? ' sa-proofer-albums__sort-option--selected' : ''}`}
                                    onClick={() => {
                                        setNeedsYouFirst(true);
                                        setSortOpen(false);
                                    }}
                                >
                                    <span>Needs you first</span>
                                    {needsYouFirst && <span>✓</span>}
                                </button>
                            )}
                            {CREATED_FILTERS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`sa-proofer-albums__sort-option${!needsYouFirst && createdFilter === option.value ? ' sa-proofer-albums__sort-option--selected' : ''}`}
                                    onClick={() => {
                                        setNeedsYouFirst(false);
                                        setCreatedFilter(option.value);
                                        setSortOpen(false);
                                    }}
                                >
                                    <span>{option.label}</span>
                                    {!needsYouFirst && createdFilter === option.value && <span>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="sa-proofer-albums__view-toggle" role="group" aria-label="View mode">
                    <button
                        type="button"
                        className={`sa-proofer-albums__view-btn${viewMode === 'grid' ? ' sa-proofer-albums__view-btn--active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid view"
                        aria-pressed={viewMode === 'grid'}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`sa-proofer-albums__view-btn${viewMode === 'list' ? ' sa-proofer-albums__view-btn--active' : ''}`}
                        onClick={() => setViewMode('list')}
                        aria-label="List view"
                        aria-pressed={viewMode === 'list'}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>
                </>
            )}

            <div className="sa-proofer-albums__content">
                {awaitingFirstProof ? (
                    <div className="sa-proofer-albums__first-proof" aria-busy="true" aria-live="polite">
                        <p className="sa-proofer-albums__first-proof-loading">Loading…</p>
                    </div>
                ) : loading ? (
                    <p className="sa-proofer-albums__loading">Loading albums…</p>
                ) : showEmpty ? (
                    starredOnly ? (
                        <div className="sa-proofer-albums__empty">
                            <p>No starred albums yet. Star albums from the Albums page to see them here.</p>
                        </div>
                    ) : showFilteredEmpty ? (
                        <div className="sa-proofer-albums__empty">
                            <p>No album</p>
                        </div>
                    ) : (
                        <div className="sa-proofer-albums__first-proof">
                            <div className="sa-proofer-albums__first-proof-icon" aria-hidden>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="8" height="16" rx="1.5" />
                                    <rect x="13" y="4" width="8" height="16" rx="1.5" />
                                </svg>
                            </div>
                            <h2 className="sa-proofer-albums__first-proof-title">Your first album proof</h2>
                            <p className="sa-proofer-albums__first-proof-lede">
                                Upload the spreads you&apos;ve already designed. Your client swipes through them,
                                comments on the ones they want changed, and signs off — in one link, no email threads.
                            </p>
                            <div className="sa-proofer-albums__first-proof-actions">
                                <button
                                    type="button"
                                    className="sa-proofer-albums__new-btn"
                                    onClick={() => navigate('/album-proofer/create')}
                                >
                                    Upload spreads
                                </button>
                                <button
                                    type="button"
                                    className="sa-proofer-albums__ghost-btn"
                                    onClick={() => window.open('/albumguide.mp4', '_blank', 'noopener,noreferrer')}
                                >
                                    See a sample album
                                </button>
                            </div>
                            <ol className="sa-proofer-albums__first-proof-steps">
                                <li>
                                    <span className="sa-proofer-albums__first-proof-step-num" aria-hidden>1</span>
                                    <div>
                                        <strong>Upload your spreads</strong>
                                        <span>JPG or PNG exports from InDesign, Photoshop or Album Proofer. Drag the folder in.</span>
                                    </div>
                                </li>
                                <li>
                                    <span className="sa-proofer-albums__first-proof-step-num" aria-hidden>2</span>
                                    <div>
                                        <strong>Publish and send</strong>
                                        <span>Choose who can open it, then send by WhatsApp or email. You press send, never us.</span>
                                    </div>
                                </li>
                                <li>
                                    <span className="sa-proofer-albums__first-proof-step-num" aria-hidden>3</span>
                                    <div>
                                        <strong>Collect feedback in one place</strong>
                                        <span>Comments and swap requests land per-spread. No more &apos;the 4th photo on page 9&apos;.</span>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    )
                ) : filteredAlbums.length === 0 ? (
                    <div className="sa-proofer-albums__empty">
                        <p>No matching albums. Try a different search or filter.</p>
                    </div>
                ) : (
                    <div className={`sa-proofer-albums__grid${viewMode === 'list' ? ' sa-proofer-albums__grid--list' : ''}`}>
                        {filteredAlbums.map((album) => {
                            const status = getAlbumProofStatus(album);
                            const clientLabel = getAlbumClientLabel(album);
                            const footnote = getAlbumProofFootnote(album, status);
                            const activityAt = getAlbumProofActivityAt(album);
                            const metaText = formatAlbumMetaParts(clientLabel, footnote);
                            const listSubtitle = getAlbumListSubtitle(album, clientLabel);
                            const listAction = getAlbumListAction(status);
                            const cardTime = formatAlbumCardTime(activityAt, { now: relativeNow });
                            const cardTimeTitle = formatAbsoluteDateTime(activityAt);
                            const openAlbum = () => navigate(`/album-proofer/album/${album.id}`);
                            return (
                                <article
                                    key={album.id}
                                    className={`sa-proofer-album-card${
                                        viewMode === 'list' ? ' sa-proofer-album-card--list' : ''
                                    }${settingsAlbum?.id === album.id ? ' sa-proofer-album-card--menu-open' : ''}`}
                                    onClick={openAlbum}
                                    onKeyDown={(e) => e.key === 'Enter' && openAlbum()}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="sa-proofer-album-card__media">
                                        <AlbumListCoverThumb
                                            album={album}
                                            alt={album.name}
                                            variant={viewMode === 'list' ? 'list' : 'grid'}
                                        />
                                        {viewMode !== 'list' ? (
                                            <button
                                                type="button"
                                                className="sa-proofer-album-card__menu"
                                                onClick={(e) => openAlbumSettings(e, album)}
                                                aria-label="Open album settings"
                                            >
                                                ⋮
                                            </button>
                                        ) : null}
                                    </div>
                                    {viewMode === 'list' ? (
                                        <>
                                            <div className="sa-proofer-album-card__info">
                                                <h3 className="sa-proofer-album-card__name">{album.name}</h3>
                                                {listSubtitle ? (
                                                    <p className="sa-proofer-album-card__subtitle">{listSubtitle}</p>
                                                ) : null}
                                            </div>
                                            <div className="sa-proofer-album-card__trailing">
                                                <span
                                                    className={`sa-proofer-album-status sa-proofer-album-status--${status.tone} sa-proofer-album-status--list`}
                                                >
                                                    <span className="sa-proofer-album-status__dot" aria-hidden />
                                                    {formatStatusLabel(status)}
                                                </span>
                                                <span
                                                    className="sa-proofer-album-card__time"
                                                    title={cardTimeTitle || undefined}
                                                >
                                                    {cardTime || '—'}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="sa-proofer-album-card__action"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (listAction.kind === 'remind') {
                                                            handleGetDirectLink(album);
                                                        } else {
                                                            openAlbum();
                                                        }
                                                    }}
                                                >
                                                    {listAction.label}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="sa-proofer-album-card__body">
                                            <div className="sa-proofer-album-card__top">
                                                <h3 className="sa-proofer-album-card__name">{album.name}</h3>
                                                <span className={`sa-proofer-album-status sa-proofer-album-status--${status.tone}`}>
                                                    <span className="sa-proofer-album-status__dot" aria-hidden />
                                                    {formatStatusLabel(status)}
                                                </span>
                                            </div>
                                            {metaText || cardTime ? (
                                                <p className="sa-proofer-album-card__meta">
                                                    {metaText ? <span>{metaText}</span> : null}
                                                    {metaText && cardTime ? (
                                                        <span className="sa-proofer-album-card__meta-sep" aria-hidden>
                                                            {' · '}
                                                        </span>
                                                    ) : null}
                                                    {cardTime ? (
                                                        <time
                                                            className="sa-proofer-album-card__time sa-proofer-album-card__time--grid"
                                                            dateTime={activityAt || undefined}
                                                            title={cardTimeTitle || undefined}
                                                        >
                                                            {cardTime}
                                                        </time>
                                                    ) : null}
                                                </p>
                                            ) : null}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            <AlbumPreviewLinkModal
                album={shareLinkAlbum}
                photographerProfile={photographerProfile}
                isOpen={Boolean(shareLinkAlbum)}
                onClose={() => setShareLinkAlbum(null)}
            />
            <AlbumPreviewQrModal
                album={shareQrAlbum}
                photographerProfile={photographerProfile}
                isOpen={Boolean(shareQrAlbum)}
                onClose={() => setShareQrAlbum(null)}
            />
            <EditAlbumModal
                album={editAlbum}
                isOpen={Boolean(editAlbum)}
                onClose={() => setEditAlbum(null)}
                onSave={handleEditSave}
                photographerId={user?.id}
                onAlbumUpdated={(updated) => {
                    if (!updated?.id) return;
                    setAlbums((prev) =>
                        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
                    );
                }}
                saving={editSaving}
            />
            <AlbumDuplicateModal
                album={duplicateAlbum}
                isOpen={Boolean(duplicateAlbum)}
                onClose={() => {
                    if (duplicateBusyId) return;
                    setDuplicateAlbum(null);
                }}
                onConfirm={handleConfirmDuplicateAlbum}
                busy={Boolean(duplicateBusyId && duplicateAlbum?.id === duplicateBusyId)}
            />
            <AlbumSettingsSheet
                isOpen={Boolean(settingsAlbum)}
                onClose={() => { setSettingsAlbum(null); setSettingsAnchor(null); }}
                album={settingsAlbum}
                anchor={settingsAnchor}
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
                onPreview={() => {
                    if (settingsAlbum) {
                        if (settingsAlbum.share_link_enabled === false) return;
                        openSmartAlbumPreview(settingsAlbum.id);
                        setSettingsAlbum(null);
                    }
                }}
                onQuickEdit={() => {
                    const album = settingsAlbum;
                    if (!album) return;
                    setSettingsAlbum(null);
                    setSettingsAnchor(null);
                    // Open after settings unmounts so the edit popup is on top.
                    window.setTimeout(() => {
                        setEditAlbum(album);
                    }, 0);
                }}
                onDuplicate={() => {
                    if (settingsAlbum) openDuplicateAlbum(settingsAlbum);
                }}
                onDelete={async () => {
                    if (!settingsAlbum) return;
                    const albumToDelete = settingsAlbum;
                    if (!window.confirm(`Delete "${albumToDelete.name}"? This cannot be undone.`)) return;
                    setSettingsAlbum(null);
                    try {
                        await smartAlbumsService.deleteAlbum(user?.id, albumToDelete.id);
                        setAlbums((prev) => prev.filter((a) => a.id !== albumToDelete.id));
                    } catch (err) {
                        console.error(err);
                        alert('Failed to delete album. Please try again.');
                    }
                }}
                onShareByEmail={() => {
                    if (settingsAlbum) handleShareByEmail(settingsAlbum);
                    setSettingsAlbum(null);
                }}
                onGetDirectLink={() => {
                    if (settingsAlbum) handleGetDirectLink(settingsAlbum);
                    setSettingsAlbum(null);
                }}
                onGetQrCode={() => {
                    if (settingsAlbum) handleGetQrCode(settingsAlbum);
                    setSettingsAlbum(null);
                }}
                onShareWhatsApp={() => {
                    if (settingsAlbum) handleShareWhatsApp(settingsAlbum);
                    setSettingsAlbum(null);
                }}
            />
        </main>
    );
};

export default AlbumsList;
