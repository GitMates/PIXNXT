import React from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import './AlbumViewer.css';

/**
 * Final client output — album only, no edit sidebar (gallery preview).
 */
export default function AlbumPreview({
    album,
    albumId,
    totalPages,
    initialPage,
    onPageChange,
    onBackToEdit,
    photoRevision = 0,
}) {
    const navigate = useNavigate();
    const title = album.name.toUpperCase();

    return (
        <div className="av-page av-page--preview">
            <header className="av-topbar av-topbar--preview">
                <div className="av-topbar-left">
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
                </div>
                <h1 className="av-title">{title}</h1>
                <div className="av-topbar-right">
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
                </div>
            </header>

            <div className="av-viewer-body">
                <AlbumBook
                    key={`${albumId}-preview-${photoRevision}`}
                    album={album}
                    totalPages={totalPages}
                    initialPage={initialPage}
                    onPageChange={onPageChange}
                />
            </div>
        </div>
    );
}
