import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import { assignPhotosFromFiles } from '../../components/smart-albums/albumPagePhotos';
import './AlbumEditor.css';

/**
 * Gallery edit view — sidebar tools + live album canvas (like collection dashboard).
 */
export default function AlbumEditor({
    album,
    albumId,
    totalPages,
    initialPage,
    onPageChange,
    onOpenPreview,
    photoRevision = 0,
    onPhotosUploaded,
}) {
    const navigate = useNavigate();
    const [activePanel, setActivePanel] = useState('upload');
    const [uploadNotice, setUploadNotice] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (files) => {
        setUploading(true);
        try {
            const count = await assignPhotosFromFiles(albumId, files, {
                startPage: 1,
                totalPages,
            });
            if (count > 0) {
                onPhotosUploaded?.();
                setUploadNotice(`Added ${count} photo${count === 1 ? '' : 's'} to the album.`);
            } else {
                setUploadNotice('No image files selected.');
            }
        } catch (e) {
            console.error(e);
            setUploadNotice('Upload failed. Try again.');
        } finally {
            setUploading(false);
            window.setTimeout(() => setUploadNotice(null), 4500);
        }
    };

    return (
        <div className="ae-page">
            <header className="ae-topbar">
                <div className="ae-topbar-left">
                    <button
                        type="button"
                        className="ae-icon-btn"
                        onClick={() => navigate('/smart-albums')}
                        aria-label="Back to albums"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="ae-topbar-titles">
                        <span className="ae-topbar-eyebrow">Smart album · Edit</span>
                        <h1 className="ae-topbar-title">{album.name}</h1>
                    </div>
                </div>
                <div className="ae-topbar-right">
                    {uploadNotice && <span className="ae-toast">{uploadNotice}</span>}
                    <button type="button" className="ae-btn-secondary" onClick={() => onOpenPreview()}>
                        Preview
                    </button>
                    <button type="button" className="ae-btn-primary" onClick={() => onOpenPreview()}>
                        Publish view
                    </button>
                </div>
            </header>

            <div className="ae-body">
                <AlbumEditorSidebar
                    activePanel={activePanel}
                    onPanelChange={setActivePanel}
                    album={album}
                    totalPages={totalPages}
                    onUploadFiles={handleUpload}
                    uploading={uploading}
                />

                <main className="ae-canvas">
                    <div className="ae-canvas-chrome">
                        <span className="ae-canvas-label">Spread editor</span>
                        <span className="ae-canvas-hint">Flip pages to edit · Preview for final output</span>
                    </div>
                    <div className="ae-canvas-stage">
                        <AlbumBook
                            key={`${albumId}-edit-${photoRevision}`}
                            album={album}
                            totalPages={totalPages}
                            initialPage={initialPage}
                            onPageChange={onPageChange}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
