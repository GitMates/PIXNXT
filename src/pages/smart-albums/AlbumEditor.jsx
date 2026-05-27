import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import CollectionPickerModal from '../../components/smart-albums/CollectionPickerModal';
/* Share disabled — uncomment to restore
import { AlbumPreviewLinkModal, AlbumPreviewQrModal } from '../../components/smart-albums/AlbumShareModals';
import {
    getSmartAlbumPreviewShareUrl,
    openShareByEmail,
    openWhatsAppShare,
} from '../../lib/shareSmartAlbum';
*/
import { openSmartAlbumPreview } from '../../lib/shareSmartAlbum';
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
    placeCollectionItemOnPages,
    setPagePhotoFromCollectionItem,
    setSpreadPhotoFromCollectionItem,
} from '../../components/smart-albums/albumPagePhotos';
import { clearAlbumTransforms, getTransformRevision } from '../../components/smart-albums/albumPageTransforms';
import {
    getProofCellPhotoIndex,
    PROOF_CELL_LABELS,
    getSpreadRightPageIndex,
} from '../../components/smart-albums/albumSpreadGrid';
import { getSpreadPages, pageToSpreadIndex } from '../../components/smart-albums/albumSpreadUtils';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
/* Smart album comments — disabled (see smartAlbumCommentsEnabled.js)
import AlbumCommentSettings from '../../components/smart-albums/AlbumCommentSettings';
import AlbumCommentsFeed from '../../components/smart-albums/AlbumCommentsFeed';
import {
    COMMENTS_CHANGED_EVENT,
    groupRootCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
*/
import { SMART_ALBUM_COMMENTS_ENABLED } from '../../components/smart-albums/smartAlbumCommentsEnabled';
import { useAuth } from '../../hooks/useAuth';
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

function buildCoverSelection() {
    return { mode: 'cover', leftPage: 0, cellId: null };
}

function layoutToPlacementMode(layout) {
    return layout === 'whole-spread' ? 'whole' : 'single';
}

function pickerTitle(gridEditSet, gridSelection) {
    if (gridSelection?.mode === 'cover') {
        return 'Choose cover photo';
    }
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
    photoRevision = 0,
    onPhotosUploaded,
    spreadCount = 1,
    onChangePageCount,
    onAlbumUpdate,
    minPages = 3,
    maxPages = 99,
    pagesPerSpread = 2,
}) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activePanel, setActivePanel] = useState('collections');

    useEffect(() => {
        if (!SMART_ALBUM_COMMENTS_ENABLED && activePanel === 'comments') {
            setActivePanel('collections');
        }
    }, [activePanel]);
    const { toast, showToast, clearToast } = useAppToast(4000);
    // const [spreadCommentsBySpread, setSpreadCommentsBySpread] = useState({});
    const [uploading, setUploading] = useState(false);
    const [bookPage, setBookPage] = useState(initialPage);
    const [gridEditSet, setGridEditSet] = useState(() =>
        layoutToPlacementMode(album?.grid_layout)
    );
    const [collectionRevision, setCollectionRevision] = useState(0);
    const [transformRevision, setTransformRevision] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pageCountBusy, setPageCountBusy] = useState(false);
    const [overviewReopenToken, setOverviewReopenToken] = useState(0);
    /* Share disabled
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareLinkOpen, setShareLinkOpen] = useState(false);
    const [shareQrOpen, setShareQrOpen] = useState(false);
    const shareRef = useRef(null);
    */
    const [gridSelection, setGridSelection] = useState(() => {
        const left = getSpreadLeftForBookPage(initialPage, totalPages);
        return isProofGridSpread(left) ? buildCellSelection(left, 1) : buildCoverSelection();
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

    /* Share disabled
    useEffect(() => {
        if (!showShareMenu) return undefined;
        const onDocClick = (e) => {
            if (shareRef.current && !shareRef.current.contains(e.target)) {
                setShowShareMenu(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [showShareMenu]);
    */

    useEffect(() => {
        const lockedSet = layoutToPlacementMode(album?.grid_layout);
        setGridEditSet(lockedSet);
        const left = getSpreadLeftForBookPage(bookPage, totalPages);
        if (isProofGridSpread(left)) {
            setGridSelection(
                lockedSet === 'whole'
                    ? buildSpreadSelection(left)
                    : buildCellSelection(left, 1)
            );
        }
    }, [album?.grid_layout, bookPage, totalPages]);

    useEffect(() => {
        setBookPage(initialPage);
        const left = getSpreadLeftForBookPage(initialPage, totalPages);
        if (isProofGridSpread(left)) {
            setGridSelection((prev) =>
                prev?.leftPage === left ? prev : buildCellSelection(left, prev?.cellId || 1)
            );
        } else {
            setGridSelection(buildCoverSelection());
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
                setGridSelection(buildCoverSelection());
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
            const lockedSet = layoutToPlacementMode(album?.grid_layout);
            if (set !== lockedSet) return;
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
        [album?.grid_layout, gridSelection, bookPage, totalPages]
    );

    const openPicker = useCallback(() => {
        if (!gridSelection) {
            showToast('Open an inner spread (not the cover) first.', { variant: 'info', duration: 3500 });
            return;
        }
        setPickerOpen(true);
    }, [gridSelection, showToast]);

    const handleSelectCover = useCallback(() => {
        setGridEditSet('single');
        setGridSelection(buildCoverSelection());
        setPickerOpen(true);
    }, []);

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
            if (!item?.dataUrl || !gridSelection) return false;

            if (gridSelection.mode === 'cover') {
                return setPagePhotoFromCollectionItem(albumId, 0, item.id);
            }

            if (gridEditSet === 'whole' || gridSelection.mode === 'spread') {
                const left = gridSelection.leftPage;
                const right = getSpreadRightPageIndex(left, totalPages);
                return setSpreadPhotoFromCollectionItem(albumId, left, item.id, right);
            }

            const targets = placementTargets;
            if (!targets.length) return false;
            return (
                placeCollectionItemOnPages(albumId, item.id, targets, {
                    spreadLeftPage: gridSelection.leftPage,
                }) > 0
            );
        },
        [albumId, gridSelection, gridEditSet, placementTargets, totalPages]
    );

    const handleUploadToCollection = async (files) => {
        setUploading(true);
        if (files.some((f) => isPdfFile(f))) {
            showToast('Converting PDF pages to images…', { variant: 'info', duration: 0 });
        }
        try {
            const added = await addFilesToAlbumCollection(albumId, files, {
                photographerId: album?.photographer_id,
            });
            const skippedDuplicates = added.skippedDuplicates || 0;
            if (added.length > 0) {
                setCollectionRevision(getAlbumCollectionRevision(albumId));
                showToast(
                    `Added ${added.length} image${added.length === 1 ? '' : 's'} to collection${skippedDuplicates ? `, skipped ${skippedDuplicates} duplicate${skippedDuplicates === 1 ? '' : 's'}` : ''}.`,
                    { variant: 'success', duration: 4500 }
                );
            } else if (skippedDuplicates > 0) {
                showToast('Duplicate file skipped. It is already in this album.', {
                    variant: 'info',
                    duration: 4500,
                });
            } else {
                showToast('No supported files selected (JPG, PNG, or PDF).', {
                    variant: 'error',
                    duration: 4500,
                });
            }
        } catch (e) {
            console.error(e);
            showToast('Upload failed. Try again.', { variant: 'error', duration: 4500 });
        } finally {
            setUploading(false);
        }
    };

    const handlePlaceCollectionItem = useCallback(
        (itemId) => {
            if (placeItemOnSpread(itemId)) {
                bumpWorkspace();
                setPickerOpen(false);
                showToast(
                    gridSelection?.mode === 'cover'
                        ? 'Photo placed on cover.'
                        : 'Photo placed on spread.',
                    { duration: 3500 }
                );
            } else {
                showToast('Could not place photo. Try another image.', {
                    variant: 'error',
                    duration: 4500,
                });
            }
        },
        [placeItemOnSpread, bumpWorkspace, showToast, gridSelection?.mode]
    );

    const canAddPages = totalPages + pagesPerSpread <= maxPages;
    const canRemovePages = totalPages - pagesPerSpread >= minPages;

    const handleAddPages = useCallback(async () => {
        if (!canAddPages || !onChangePageCount) return null;
        setPageCountBusy(true);
        const result = await onChangePageCount(pagesPerSpread);
        setPageCountBusy(false);
        if (result) {
            bumpWorkspace();
            showToast(`Added ${pagesPerSpread} pages (${result.next} total).`, { duration: 3500 });
        }
        return result;
    }, [canAddPages, onChangePageCount, pagesPerSpread, bumpWorkspace, showToast]);

    const handleAddPagesFromOverview = useCallback(async () => {
        const result = await handleAddPages();
        if (result) setOverviewReopenToken(Date.now());
        return result;
    }, [handleAddPages]);

    const handleRemovePages = useCallback(async () => {
        if (!canRemovePages || !onChangePageCount) return;
        setPageCountBusy(true);
        const result = await onChangePageCount(-pagesPerSpread);
        setPageCountBusy(false);
        if (result) {
            bumpWorkspace();
            showToast(`Removed ${pagesPerSpread} pages (${result.next} total).`, { duration: 3500 });
        }
    }, [canRemovePages, onChangePageCount, pagesPerSpread, bumpWorkspace, showToast]);

    const handleClearAllPhotos = useCallback(() => {
        clearAllAlbumPagePhotos(albumId, { totalPages });
        clearAlbumTransforms(albumId);
        bumpWorkspace();
        showToast('Removed all images from the album.', { duration: 3500 });
    }, [albumId, totalPages, bumpWorkspace, showToast]);

    const spreadEdit = activePanel === 'edit';
    const showGridComments = SMART_ALBUM_COMMENTS_ENABLED && activePanel === 'comments';
    const workspaceKey = `${photoRevision}-${collectionRevision}-${transformRevision}-${getAlbumPhotoRevision(albumId)}`;

    /*
    const loadSpreadComments = useCallback(async () => {
        if (!albumId) return;
        try {
            const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
            setSpreadCommentsBySpread(groupRootCommentsBySpread(rows));
        } catch (e) {
            console.warn('Could not load spread comments for grid', e);
        }
    }, [albumId]);

    useEffect(() => {
        if (!showGridComments) return;
        loadSpreadComments();
    }, [showGridComments, loadSpreadComments]);

    useEffect(() => {
        if (!showGridComments || !albumId) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) loadSpreadComments();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
    }, [showGridComments, albumId, loadSpreadComments]);
    */

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
                    <button
                        type="button"
                        className="ae-btn-secondary"
                        onClick={() => openSmartAlbumPreview(albumId, initialPage)}
                    >
                        Preview
                    </button>
                    {/* Share disabled — uncomment ae-share-wrap block and related imports/state/modals
                    <div className="ae-share-wrap" ref={shareRef}>
                        ...
                    </div>
                    */}
                </div>
            </header>

            <div className="ae-body">
                <AlbumEditorSidebar
                    activePanel={activePanel}
                    onPanelChange={setActivePanel}
                    commentSettings={null}
                    commentsFeed={null}
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
                                ? 'Drag photo to move · drag each edge to zoom'
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
                            onSelectCover={handleSelectCover}
                            canAddPages={canAddPages}
                            onAddPages={handleAddPagesFromOverview}
                            pageCountBusy={pageCountBusy}
                            overviewReopenToken={overviewReopenToken}
                            onTransformChange={() => {
                                setTransformRevision(getTransformRevision(albumId));
                                onPhotosUploaded?.();
                            }}
                            transformRevision={transformRevision}
                            showGridComments={showGridComments}
                            spreadCommentsBySpread={null}
                        />
                    </div>
                </main>
            </div>

            <AppToast toast={toast} onDismiss={clearToast} />

            {/* Share disabled
            <AlbumPreviewLinkModal
                album={album}
                isOpen={shareLinkOpen}
                onClose={() => setShareLinkOpen(false)}
            />
            <AlbumPreviewQrModal
                album={album}
                isOpen={shareQrOpen}
                onClose={() => setShareQrOpen(false)}
            />
            */}

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
