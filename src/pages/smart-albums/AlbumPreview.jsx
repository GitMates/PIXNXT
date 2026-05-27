import React, { useCallback, useMemo, useState } from 'react';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumSpreadComments from '../../components/smart-albums/AlbumSpreadComments';
import { SMART_ALBUM_COMMENTS_ENABLED } from '../../components/smart-albums/smartAlbumCommentsEnabled';
import { pageToSpreadIndex, getTotalSpreads } from '../../components/smart-albums/albumSpreadUtils';
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
    const isPhotographer = Boolean(
        !clientPreview && user?.id && album?.photographer_id === user.id
    );
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, { showCover: true }),
        [bookPage]
    );
    const spreadCount = getTotalSpreads(totalPages, { showCover: true });
    const commentsEnabled = SMART_ALBUM_COMMENTS_ENABLED && album?.comments_enabled !== false;

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

    return (
        <div
            className={`av-page av-page--preview av-page--gallery-proof${
                SMART_ALBUM_COMMENTS_ENABLED ? ' av-page--with-comments' : ''
            }`}
        >
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
                <div className="av-preview-book-section">
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
                </div>

                {SMART_ALBUM_COMMENTS_ENABLED && (
                    <footer className="av-preview-footer av-preview-footer--bar">
                        <AlbumSpreadComments
                            albumId={albumId}
                            spreadIndex={spreadIndex}
                            spreadLabel={spreadLabel}
                            commentsEnabled={commentsEnabled}
                            isPhotographer={isPhotographer}
                            photographerName={
                                user?.user_metadata?.full_name || user?.email || 'Photographer'
                            }
                            clientView={clientPreview || minimalChrome}
                            variant="footer"
                        />
                    </footer>
                )}
            </div>
        </div>
    );
}
