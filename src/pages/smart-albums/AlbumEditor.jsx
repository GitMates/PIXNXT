import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import CollectionPickerModal from '../../components/smart-albums/CollectionPickerModal';
import {
    addFilesToAlbumCollection,
    getAlbumCollection,
    getAlbumCollectionRevision,
    getCollectionItem,
} from '../../components/smart-albums/albumCollection';
import { isPdfFile } from '../../lib/pdfToImages';
import {
    clearAllAlbumPagePhotos,
    getAlbumPhotoRevision,
    placeCollectionPhotoOnPages,
    setSpreadPhoto,
} from '../../components/smart-albums/albumPagePhotos';
import { clearAlbumTransforms, getTransformRevision } from '../../components/smart-albums/albumPageTransforms';
import {
    getProofCellPhotoIndex,
    PROOF_CELL_LABELS,
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

function pickerTitle(gridEditSet, gridSelection) {
    if (gridEditSet === 'whole' || gridSelection?.mode === 'spread') {
        return 'Choose photo for whole spread';
    }
    const id = gridSelection?.cellId;
    const label = id ? PROOF_CELL_LABELS[id] : '';
    return id ? `Choose photo · Slot ${id}${label ? ` (${label})` : ''}` : 'Choose photo';
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
    spreadCount = 1,
    onChangePageCount,
    minPages = 3,
    maxPages = 99,
    pagesPerSpread = 2,
}) {
    const navigate = useNavigate();
    const [activePanel, setActivePanel] = useState('collections');
    const [uploadNotice, setUploadNotice] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [bookPage, setBookPage] = useState(initialPage);
    const [gridEditSet, setGridEditSet] = useState('single');
    const [collectionRevision, setCollectionRevision] = useState(0);
    const [transformRevision, setTransformRevision] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pageCountBusy, setPageCountBusy] = useState(false);
    const [gridSelection, setGridSelection] = useState(() => {
        const left = getSpreadLeftForBookPage(initialPage, totalPages);
        return isProofGridSpread(left) ? buildCellSelection(left, 1) : null;
    });

    const albumForBook = useMemo(() => ({ ...album, id: albumId }), [album, albumId]);

    const collectionItems = useMemo(
        () => getAlbumCollection(albumId),
        [albumId, collectionRevision]
    );

    const bumpWorkspace = useCallback(() => {
        onPhotosUploaded?.();
        setTransformRevision(getTransformRevision(albumId));
        setCollectionRevision(getAlbumCollectionRevision(albumId));
    }, [albumId, onPhotosUploaded]);

    useEffect(() => {
        setCollectionRevision(getAlbumCollectionRevision(albumId));
    }, [albumId]);

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

    const openPicker = useCallback(() => {
        if (!gridSelection?.leftPage) {
            setUploadNotice('Open an inner spread (not the cover) first.');
            window.setTimeout(() => setUploadNotice(null), 3500);
            return;
        }
        setPickerOpen(true);
    }, [gridSelection]);

    const handleSelectGridCell = useCallback((leftPage, cellId) => {
        setGridEditSet('single');
        setGridSelection(buildCellSelection(leftPage, cellId));
        setPickerOpen(true);
    }, []);

    const handleSelectGridSpread = useCallback((leftPage) => {
        setGridEditSet('whole');
        setGridSelection(buildSpreadSelection(leftPage));
        setPickerOpen(true);
    }, []);

    const placementTargets = useMemo(() => {
        if (!gridSelection || !isProofGridSpread(gridSelection.leftPage)) return [];
        if (gridEditSet === 'whole' || gridSelection.mode === 'spread') return [];
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

    const placeItemOnSpread = useCallback(
        (itemId) => {
            const item = getCollectionItem(albumId, itemId);
            if (!item?.dataUrl || !gridSelection?.leftPage) return false;

            if (gridEditSet === 'whole' || gridSelection.mode === 'spread') {
                const left = gridSelection.leftPage;
                const right = getSpreadRightPageIndex(left, totalPages);
                return setSpreadPhoto(albumId, left, item.dataUrl, right);
            }

            const targets = placementTargets;
            if (!targets.length) return false;
            return (
                placeCollectionPhotoOnPages(albumId, item.dataUrl, targets, {
                    spreadLeftPage: gridSelection.leftPage,
                }) > 0
            );
        },
        [albumId, gridSelection, gridEditSet, placementTargets, totalPages]
    );

    const handleUploadToCollection = async (files) => {
        setUploading(true);
        if (files.some((f) => isPdfFile(f))) {
            setUploadNotice('Converting PDF pages to images…');
        }
        try {
            const added = await addFilesToAlbumCollection(albumId, files);
            if (added.length > 0) {
                setCollectionRevision(getAlbumCollectionRevision(albumId));
                setUploadNotice(
                    `Added ${added.length} image${added.length === 1 ? '' : 's'} to collection (PDF pages count as separate photos).`
                );
            } else {
                setUploadNotice('No supported files selected (JPG, PNG, or PDF).');
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
            if (placeItemOnSpread(itemId)) {
                bumpWorkspace();
                setPickerOpen(false);
                setUploadNotice('Photo placed on spread.');
            }
            window.setTimeout(() => setUploadNotice(null), 3500);
        },
        [placeItemOnSpread, bumpWorkspace]
    );

    const canAddPages = totalPages + pagesPerSpread <= maxPages;
    const canRemovePages = totalPages - pagesPerSpread >= minPages;

    const handleAddPages = useCallback(async () => {
        if (!canAddPages || !onChangePageCount) return;
        setPageCountBusy(true);
        const result = await onChangePageCount(pagesPerSpread);
        setPageCountBusy(false);
        if (result) {
            bumpWorkspace();
            setUploadNotice(`Added ${pagesPerSpread} pages (${result.next} total).`);
            window.setTimeout(() => setUploadNotice(null), 3500);
        }
    }, [canAddPages, onChangePageCount, pagesPerSpread, bumpWorkspace]);

    const handleRemovePages = useCallback(async () => {
        if (!canRemovePages || !onChangePageCount) return;
        setPageCountBusy(true);
        const result = await onChangePageCount(-pagesPerSpread);
        setPageCountBusy(false);
        if (result) {
            bumpWorkspace();
            setUploadNotice(`Removed ${pagesPerSpread} pages (${result.next} total).`);
            window.setTimeout(() => setUploadNotice(null), 3500);
        }
    }, [canRemovePages, onChangePageCount, pagesPerSpread, bumpWorkspace]);

    const handleClearAllPhotos = useCallback(() => {
        clearAllAlbumPagePhotos(albumId, { totalPages });
        clearAlbumTransforms(albumId);
        bumpWorkspace();
        setUploadNotice('Removed all images from the album.');
        window.setTimeout(() => setUploadNotice(null), 3500);
    }, [albumId, totalPages, bumpWorkspace]);

    const spreadEdit = activePanel === 'edit';
    const workspaceKey = `${photoRevision}-${collectionRevision}-${transformRevision}-${getAlbumPhotoRevision(albumId)}`;

    const pickerSubtitle =
        collectionItems.length > 0
            ? `${collectionItems.length} photo${collectionItems.length === 1 ? '' : 's'} in your collection`
            : 'Upload photos to your collection first';

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
                    onOpenPicker={openPicker}
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
                    spreadCount={spreadCount}
                    innerPageCount={Math.max(0, totalPages - 1)}
                    canAddPages={canAddPages}
                    canRemovePages={canRemovePages}
                    pagesPerSpread={pagesPerSpread}
                    pageCountBusy={pageCountBusy}
                    onAddPages={handleAddPages}
                    onRemovePages={handleRemovePages}
                />

                <main className="ae-canvas">
                    <div className="ae-canvas-chrome">
                        <span className="ae-canvas-label">Spread editor</span>
                        <span className="ae-canvas-hint">
                            {spreadEdit
                                ? 'Drag to reposition · handle to zoom'
                                : 'Click a page slot to pick a photo from your collection'}
                        </span>
                    </div>
                    <div className={`ae-canvas-stage${spreadEdit ? ' ae-canvas-stage--edit' : ''}`}>
                        <AlbumBook
                            key={`${albumId}-edit-${workspaceKey}-${totalPages}`}
                            album={albumForBook}
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

            <CollectionPickerModal
                open={pickerOpen}
                title={pickerTitle(gridEditSet, gridSelection)}
                subtitle={pickerSubtitle}
                items={collectionItems}
                uploading={uploading}
                onClose={() => setPickerOpen(false)}
                onSelectItem={handlePlaceCollectionItem}
                onUploadFiles={handleUploadToCollection}
            />
        </div>
    );
}
