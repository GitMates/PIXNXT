import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumSpreadComments from '../../components/smart-albums/AlbumSpreadComments';
import AlbumCommentSettings from '../../components/smart-albums/AlbumCommentSettings';
import { pageToSpreadIndex } from '../../components/smart-albums/albumSpreadUtils';
import { useAuth } from '../../hooks/useAuth';
import './AlbumViewer.css';

/**
 * Final client output — album flipbook + per-spread proofing comments (proof-album style).
 */
export default function AlbumPreview({
    album,
    albumId,
    totalPages,
    initialPage,
    onPageChange,
    onBackToEdit,
    onAlbumUpdate,
    photoRevision = 0,
    showEditControls = true,
}) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [bookPage, setBookPage] = useState(initialPage);
    const title = album.name.toUpperCase();
    const isPhotographer = Boolean(user?.id && album?.photographer_id === user.id);
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, { showCover: true }),
        [bookPage]
    );
    const commentsEnabled = album?.comments_enabled !== false;

    const handleBookPageChange = useCallback(
        (idx) => {
            setBookPage(idx);
            onPageChange?.(idx);
        },
        [onPageChange]
    );

    const handleAlbumPatch = useCallback(
        (patch) => {
            onAlbumUpdate?.(patch);
        },
        [onAlbumUpdate]
    );

    return (
        <div className="av-page av-page--preview av-page--with-comments">
            <header className="av-topbar av-topbar--preview">
                <div className="av-topbar-left">
                    {showEditControls ? (
                        <button
                            type="button"
                            className="av-back-btn"
                            onClick={onBackToEdit}
                            aria-label="Back to editor"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                    ) : null}
                </div>
                <h1 className="av-title">{title}</h1>
                <div className="av-topbar-right">
                    {showEditControls && (
                        <>
                            <button type="button" className="av-btn-ghost" onClick={onBackToEdit}>
                                Edit album
                            </button>
                            <button
                                type="button"
                                className="av-btn-ghost"
                                onClick={() => navigate('/smart-albums')}
                            >
                                All albums
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="av-preview-scroll">
                <div className="av-viewer-body av-viewer-body--preview-book">
                    <AlbumBook
                        key={`${albumId}-preview-${photoRevision}`}
                        album={{ ...album, id: albumId }}
                        totalPages={totalPages}
                        initialPage={initialPage}
                        onPageChange={handleBookPageChange}
                        previewMode
                        showSamples={false}
                    />
                </div>

                {spreadIndex === 0 && isPhotographer && showEditControls && (
                    <AlbumCommentSettings
                        album={album}
                        photographerId={user.id}
                        onUpdated={handleAlbumPatch}
                    />
                )}

                <AlbumSpreadComments
                    albumId={albumId}
                    spreadIndex={spreadIndex}
                    commentsEnabled={commentsEnabled}
                    isPhotographer={isPhotographer}
                    photographerName={user?.user_metadata?.full_name || user?.email || 'Photographer'}
                />
            </div>
        </div>
    );
}
