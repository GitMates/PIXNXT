import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import {
    addFilesToAlbumCollection,
    getAlbumCollection,
    getCollectionItem,
} from '../../components/smart-albums/albumCollection';
import {
    clearAllAlbumPagePhotos,
    getAlbumPhotoRevision,
    placeCollectionPhotoOnPages,
    setSpreadPhoto,
} from '../../components/smart-albums/albumPagePhotos';
import { clearAlbumTransforms, getTransformRevision } from '../../components/smart-albums/albumPageTransforms';
import {
    getProofCellPhotoIndex,
    getSpreadRightPageIndex,
} from '../../components/smart-albums/albumSpreadGrid';
import { getSpreadPages, pageToSpreadIndex } from '../../components/smart-albums/albumSpreadUtils';
import './AlbumEditor.css';

function getSpreadLeftForBookPage(bookPageIndex, totalPages) {
    const spreadIdx = pageToSpreadIndex(bookPageIndex, { showCover: true });
    return getSpreadPages(spreadIdx, totalPages).left;
}

function isProofGridSpread(leftPage) {
    return leftPage > 0;
}

function buildSpreadSelection(leftPage) {
    return { mode: 'spread', leftPage, cellId: null };
}

function buildCellSelection(leftPage, cellId) {
    return { mode: 'cell', leftPage, cellId };
}

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
    const [activePanel, setActivePanel] = useState('collections');
    const [uploadNotice, setUploadNotice] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [bookPage, setBookPage] = useState(initialPage);
    const [gridEditSet, setGridEditSet] = useState('single');
    const [collectionRevision, setCollectionRevision] = useState(0);
    const [transformRevision, setTransformRevision] = useState(0);
    const [gridSelection, setGridSelection] = useState(() => {
        const left = getSpreadLeftForBookPage(initialPage, totalPages);
        return isProofGridSpread(left) ? buildCellSelection(left, 1) : null;
    });

    const collectionItems = useMemo(
        () => getAlbumCollection(albumId),
        [albumId, collectionRevision]
    );

    const bumpWorkspace = useCallback(() => {
        onPhotosUploaded?.();
        setTransformRevision(getTransformRevision(albumId));
        setCollectionRevision((n) => n + 1);
    }, [albumId, onPhotosUploaded]);

    useEffect(() => {
        setBookPage(initialPage);
        const left = getSpreadLeftForBookPage(initialPage, totalPages);
        if (isProofGridSpread(left)) {
            setGridSelection((prev) =>
                prev?.leftPage === left ? prev : buildCellSelection(left, prev?.cellId || 1)
            );
        } else {
            setGridSelection(null);
        }
    }, [initialPage, totalPages]);

    const syncSelectionToPage = useCallback(
        (pageIndex) => {
            const left = getSpreadLeftForBookPage(pageIndex, totalPages);
            if (isProofGridSpread(left)) {
                setGridSelection((prev) => {
                    if (prev?.leftPage === left) return prev;
                    return gridEditSet === 'whole'
                        ? buildSpreadSelection(left)
                        : buildCellSelection(left, prev?.cellId || 1);
                });
            } else {
                setGridSelection(null);
            }
        },
        [totalPages, gridEditSet]
    );

    const handleBookPageChange = useCallback(
        (idx) => {
            setBookPage(idx);
            syncSelectionToPage(idx);
            onPageChange?.(idx);
        },
        [onPageChange, syncSelectionToPage]
    );

    const handleGridEditSetChange = useCallback(
        (set) => {
            setGridEditSet(set);
            setWholeGridNextSlot(0);
            const left =
                gridSelection?.leftPage ?? getSpreadLeftForBookPage(bookPage, totalPages);
            if (!isProofGridSpread(left)) return;
            if (set === 'whole') {
                setGridSelection(buildSpreadSelection(left));
            } else {
                setGridSelection(buildCellSelection(left, gridSelection?.cellId || 1));
            }
        },
        [gridSelection, bookPage, totalPages]
    );

    const handleSelectGridCell = useCallback((leftPage, cellId) => {
        setGridEditSet('single');
        setGridSelection(buildCellSelection(leftPage, cellId));
        setActivePanel('collections');
    }, []);

    const handleSelectGridSpread = useCallback((leftPage) => {
        setGridEditSet('whole');
        setGridSelection(buildSpreadSelection(leftPage));
        setActivePanel('collections');
    }, []);

    const placementTargets = useMemo(() => {
        if (!gridSelection || !isProofGridSpread(gridSelection.leftPage)) return [];
        if (gridEditSet === 'whole' || gridSelection.mode === 'spread') {
            return [];
        }
        if (gridSelection.cellId) {
            return [
                getProofCellPhotoIndex(
                    gridSelection.leftPage,
                    gridSelection.cellId,
                    totalPages
                ),
            ];
        }
        return [];
    }, [gridSelection, gridEditSet, totalPages]);

    const handleUploadToCollection = async (files) => {
        setUploading(true);
        try {
            const added = await addFilesToAlbumCollection(albumId, files);
            if (added.length > 0) {
                setCollectionRevision((n) => n + 1);
                setUploadNotice(`Added ${added.length} photo${added.length === 1 ? '' : 's'} to collection.`);
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

    const handlePlaceCollectionItem = useCallback(
        (itemId) => {
            const item = getCollectionItem(albumId, itemId);
            if (!item?.dataUrl || !gridSelection?.leftPage) {
                setUploadNotice('Open an inner spread and set placement in Grid layout.');
                window.setTimeout(() => setUploadNotice(null), 3500);
                return;
            }

            if (gridEditSet === 'whole' || gridSelection.mode === 'spread') {
                const left = gridSelection.leftPage;
                const right = getSpreadRightPageIndex(left, totalPages);
                if (setSpreadPhoto(albumId, left, item.dataUrl, right)) {
                    bumpWorkspace();
                    setUploadNotice('Placed one photo across the whole spread.');
                }
            } else {
                const targets = placementTargets;
                if (!targets.length) return;
                const count = placeCollectionPhotoOnPages(albumId, item.dataUrl, targets, {
                    spreadLeftPage: gridSelection.leftPage,
                });
                if (count > 0) {
                    bumpWorkspace();
                    setUploadNotice('Placed photo on spread.');
                }
            }
            window.setTimeout(() => setUploadNotice(null), 3500);
        },
        [albumId, placementTargets, gridEditSet, gridSelection, totalPages, bumpWorkspace]
    );

    const handleClearAllPhotos = useCallback(() => {
        clearAllAlbumPagePhotos(albumId, { totalPages });
        clearAlbumTransforms(albumId);
        bumpWorkspace();
        setUploadNotice('Removed all images from the album.');
        window.setTimeout(() => setUploadNotice(null), 3500);
    }, [albumId, totalPages, bumpWorkspace]);

    const spreadEdit = activePanel === 'edit';
    const workspaceKey = `${photoRevision}-${collectionRevision}-${transformRevision}-${getAlbumPhotoRevision(albumId)}`;

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
                    collectionItems={collectionItems}
                    onUploadToCollection={handleUploadToCollection}
                    onPlaceCollectionItem={handlePlaceCollectionItem}
                    onClearAllPhotos={handleClearAllPhotos}
                    uploading={uploading}
                    gridEditSet={gridEditSet}
                    onGridEditSetChange={handleGridEditSetChange}
                    gridSelection={gridSelection}
                    onSelectCell={(cellId) => {
                        const left =
                            gridSelection?.leftPage ??
                            getSpreadLeftForBookPage(bookPage, totalPages);
                        if (isProofGridSpread(left)) handleSelectGridCell(left, cellId);
                    }}
                    canSelectGrid={Boolean(gridSelection)}
                />

                <main className="ae-canvas">
                    <div className="ae-canvas-chrome">
                        <span className="ae-canvas-label">Spread editor</span>
                        <span className="ae-canvas-hint">
                            {spreadEdit
                                ? 'Drag photos · corner handle to resize'
                                : 'Collections → place photos · Grid layout sets single or whole grid'}
                        </span>
                    </div>
                    <div className="ae-canvas-stage">
                        <AlbumBook
                            key={`${albumId}-edit-${workspaceKey}`}
                            album={album}
                            totalPages={totalPages}
                            initialPage={initialPage}
                            onPageChange={handleBookPageChange}
                            editable={!spreadEdit}
                            spreadEdit={spreadEdit}
                            placementMode={gridEditSet === 'whole' ? 'whole' : 'single'}
                            showSamples={false}
                            gridSelection={gridSelection}
                            onSelectGridCell={handleSelectGridCell}
                            onSelectGridSpread={handleSelectGridSpread}
                            onTransformChange={() => {
                                setTransformRevision(getTransformRevision(albumId));
                                onPhotosUploaded?.();
                            }}
                            transformRevision={transformRevision}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
