import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumSpreadComments from '../../components/smart-albums/AlbumSpreadComments';
import {
    pageToSpreadIndex,
    spreadIndexToPage,
    getTotalSpreads,
} from '../../components/smart-albums/albumSpreadUtils';
import { getSwapMarks } from '../../components/smart-albums/albumSwapMarks';
import {
    PHOTO_PINS_CHANGED_EVENT,
    getPhotoPins,
    removePhotoPin,
    updatePhotoPin,
} from '../../components/smart-albums/albumPhotoPins';
import {
    COMMENTS_CHANGED_EVENT,
    countMeaningfulComments,
    groupRootCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { useAuth } from '../../hooks/useAuth';
import './AlbumViewer.css';

/**
 * Client-facing album preview (gallery-style layout + proofing footer).
 */
export default function AlbumPreview({
    album,
    albumId,
    totalPages,
    initialPage,
    onPageChange,
    photoRevision = 0,
    minimalChrome = false,
    clientPreview = false,
}) {
    const { user } = useAuth();
    const [bookPage, setBookPage] = useState(initialPage);

    useEffect(() => {
        setBookPage(initialPage);
    }, [initialPage]);

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

    const albumForBook = useMemo(
        () => (album ? { ...album, id: albumId } : null),
        [album, albumId]
    );

    const isPhotographer = Boolean(
        !clientPreview && user?.id && album?.photographer_id === user.id
    );
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, { showCover: true, totalPages }),
        [bookPage, totalPages]
    );
    const spreadCount = getTotalSpreads(totalPages, { showCover: true });
    const commentsEnabled = album?.comments_enabled !== false;
    const messagesEnabled = album?.messages_enabled !== false;
    const [spreadCommentsBySpread, setSpreadCommentsBySpread] = useState({});
    const [photoPins, setPhotoPins] = useState([]);
    const [sidebarTab, setSidebarTab] = useState('comments');
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [editingPinId, setEditingPinId] = useState(null);
    const [editingPinMessage, setEditingPinMessage] = useState('');

    const loadSpreadComments = useCallback(async () => {
        if (!albumId || !commentsEnabled) return;
        try {
            const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
            setSpreadCommentsBySpread(groupRootCommentsBySpread(rows));
        } catch (e) {
            console.warn('Could not load spread comments for overview', e);
        }
    }, [albumId, commentsEnabled]);

    useEffect(() => {
        loadSpreadComments();
    }, [loadSpreadComments]);

    useEffect(() => {
        if (!albumId) return undefined;
        const loadPins = () => setPhotoPins(getPhotoPins(albumId));
        loadPins();
        const onPinsChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            loadPins();
        };
        window.addEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
        return () => window.removeEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
    }, [albumId]);

    useEffect(() => {
        if (!albumId || !commentsEnabled) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) loadSpreadComments();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
    }, [albumId, commentsEnabled, loadSpreadComments]);

    const handleBookPageChange = useCallback(
        (idx) => {
            setBookPage(idx);
            onPageChange?.(idx);
        },
        [onPageChange]
    );

    const spreadLabel =
        spreadIndex <= 0
            ? 'Cover'
            : `Spread ${spreadIndex} of ${Math.max(0, spreadCount - 1)}`;
    const photoCommentItems = useMemo(
        () =>
            (photoPins || [])
                .map((pin) => {
                    const pinSpreadIndex = pageToSpreadIndex(pin.pageNum, {
                        showCover: true,
                        totalPages,
                    });
                    const pinSpreadLabel = pinSpreadIndex <= 0 ? 'Cover' : `Spread ${pinSpreadIndex}`;
                    return {
                        ...pin,
                        spreadIndex: pinSpreadIndex,
                        spreadLabel: pinSpreadLabel,
                    };
                })
                .sort(
                    (a, b) =>
                        new Date(b.createdAt || 0).getTime() -
                        new Date(a.createdAt || 0).getTime()
                ),
        [photoPins, totalPages]
    );
    const albumCommentCount = useMemo(
        () =>
            countMeaningfulComments(
                Object.values(spreadCommentsBySpread || {}).flat()
            ),
        [spreadCommentsBySpread]
    );
    const swapMarksCount = useMemo(() => getSwapMarks(albumId).length, [albumId, photoRevision]);

    const handleSidebarToggle = useCallback((tab) => {
        setSidebarTab(tab);
        setSidebarExpanded((prev) => (tab === sidebarTab ? !prev : true));
    }, [sidebarTab]);

    const jumpToSpread = useCallback(
        (targetSpreadIndex) => {
            const targetPage = spreadIndexToPage(targetSpreadIndex, {
                showCover: true,
                totalPages,
            });
            setBookPage(targetPage);
            onPageChange?.(targetPage);
        },
        [onPageChange, totalPages]
    );

    return (
        <div className="av-page av-page--preview av-page--gallery-proof av-page--with-comments">
            <header className="av-preview-header">
                <button
                    type="button"
                    className="av-preview-header-btn"
                    aria-label="Notifications"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                    >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </button>
                <h1 className="av-preview-header-title">{album?.name || 'Album'}</h1>
                <span className="av-preview-header-spacer" aria-hidden />
            </header>

            <div className="av-preview-shell">
                <div className="av-preview-main">
                    <div className="av-preview-book-section">
                        <div className="av-viewer-body av-viewer-body--preview-book">
                            <AlbumBook
                                key={`${albumId}-preview`}
                                album={albumForBook}
                                totalPages={totalPages}
                                initialPage={bookPage}
                                onPageChange={handleBookPageChange}
                                previewMode
                                showSamples={false}
                                transformRevision={photoRevision}
                                swapMarkMode={clientPreview}
                                pinMarkMode={clientPreview}
                                placementMode={
                                    album?.grid_layout === 'whole-spread' ? 'whole' : 'single'
                                }
                                spreadCommentsBySpread={
                                    commentsEnabled ? spreadCommentsBySpread : null
                                }
                            />
                        </div>
                    </div>

                    <aside className="av-preview-sidebar" aria-label="Preview tools">
                        {sidebarExpanded && (
                            <div className="av-preview-sidebar-panel">
                                {sidebarTab === 'comments' ? (
                                    <>
                                        <h3 className="av-preview-sidebar-title">Comments</h3>
                                        <p className="av-preview-sidebar-lead">
                                            {albumCommentCount} comment{albumCommentCount === 1 ? '' : 's'} in album
                                        </p>
                                        <div className="av-preview-sidebar-comments">
                                            {photoCommentItems.length === 0 ? (
                                                <p className="av-preview-sidebar-text">
                                                    No photo comments yet.
                                                </p>
                                            ) : (
                                                <>
                                                    {photoCommentItems.map((pin) => (
                                                        <article
                                                            key={pin.id}
                                                            className="av-preview-sidebar-comment av-preview-sidebar-comment--pin"
                                                        >
                                                            {editingPinId === pin.id ? (
                                                                <div className="av-preview-sidebar-comment-edit">
                                                                    <p className="av-preview-sidebar-comment-author">
                                                                        Photo comment · {pin.spreadLabel}
                                                                    </p>
                                                                    <textarea
                                                                        className="av-preview-sidebar-comment-input"
                                                                        rows={3}
                                                                        value={editingPinMessage}
                                                                        onChange={(e) =>
                                                                            setEditingPinMessage(e.target.value)
                                                                        }
                                                                    />
                                                                    <div className="av-preview-sidebar-comment-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-action"
                                                                            onClick={() => {
                                                                                setEditingPinId(null);
                                                                                setEditingPinMessage('');
                                                                            }}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-action av-preview-sidebar-comment-action--primary"
                                                                            onClick={() => {
                                                                                const updated = updatePhotoPin(
                                                                                    albumId,
                                                                                    pin.id,
                                                                                    {
                                                                                        message:
                                                                                            editingPinMessage,
                                                                                    }
                                                                                );
                                                                                if (updated) {
                                                                                    setEditingPinId(null);
                                                                                    setEditingPinMessage('');
                                                                                }
                                                                            }}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        className="av-preview-sidebar-comment-link"
                                                                        onClick={() => jumpToSpread(pin.spreadIndex)}
                                                                    >
                                                                        <p className="av-preview-sidebar-comment-author">
                                                                            Photo comment · {pin.spreadLabel}
                                                                        </p>
                                                                        <p className="av-preview-sidebar-comment-body">
                                                                            {pin.message}
                                                                        </p>
                                                                    </button>
                                                                    <div className="av-preview-sidebar-comment-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-action"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingPinId(pin.id);
                                                                                setEditingPinMessage(pin.message);
                                                                            }}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-delete"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                removePhotoPin(albumId, pin.id);
                                                                            }}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </article>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : sidebarTab === 'swap' ? (
                                    <>
                                        <h3 className="av-preview-sidebar-title">Swap</h3>
                                        <p className="av-preview-sidebar-lead">
                                            {swapMarksCount > 0
                                                ? `${swapMarksCount} locked swap request${swapMarksCount === 1 ? '' : 's'}`
                                                : 'No swap requests yet'}
                                        </p>
                                        <p className="av-preview-sidebar-text">
                                            Swap actions are managed in the editor. This panel shows current status.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="av-preview-sidebar-title">Collections</h3>
                                        <p className="av-preview-sidebar-lead">
                                            Manage photos from the editor
                                        </p>
                                        <p className="av-preview-sidebar-text">
                                            Collection tools are available in Album Studio. Use this preview for proofing.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="av-preview-sidebar-rail">
                            <button
                                type="button"
                                className={`av-preview-sidebar-btn${
                                    sidebarTab === 'comments' ? ' is-active' : ''
                                }`}
                                onClick={() => handleSidebarToggle('comments')}
                                aria-label="Toggle comments panel"
                            >
                                <span aria-hidden>💬</span>
                                <span className="av-preview-sidebar-btn-label">Comments</span>
                            </button>
                            <button
                                type="button"
                                className={`av-preview-sidebar-btn${
                                    sidebarTab === 'swap' ? ' is-active' : ''
                                }`}
                                onClick={() => handleSidebarToggle('swap')}
                                aria-label="Toggle swap panel"
                            >
                                <span aria-hidden>⇅</span>
                                <span className="av-preview-sidebar-btn-label">Swap</span>
                            </button>
                            <button
                                type="button"
                                className={`av-preview-sidebar-btn${
                                    sidebarTab === 'collections' ? ' is-active' : ''
                                }`}
                                onClick={() => handleSidebarToggle('collections')}
                                aria-label="Toggle collections panel"
                            >
                                <span aria-hidden>▦</span>
                                <span className="av-preview-sidebar-btn-label">Collections</span>
                            </button>
                        </div>
                    </aside>
                </div>
            </div>
            <footer className="av-preview-footer av-preview-footer--bar">
                    <AlbumSpreadComments
                        key={`${albumId}-spread-${spreadIndex}`}
                        albumId={albumId}
                        spreadIndex={spreadIndex}
                        spreadLabel={spreadLabel}
                        commentsEnabled={commentsEnabled}
                        messagesEnabled={messagesEnabled}
                        isPhotographer={isPhotographer}
                        clientView={clientPreview || minimalChrome}
                        variant="footer"
                    />
            </footer>
        </div>
    );
}
