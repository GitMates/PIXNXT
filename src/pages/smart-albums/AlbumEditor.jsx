import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import CollectionPickerModal from '../../components/smart-albums/CollectionPickerModal';
import { AlbumPreviewLinkModal } from '../../components/smart-albums/AlbumShareModals';
import {
    getSmartAlbumPreviewShareUrl,
    openShareByEmail,
    openSmartAlbumPreview,
    openWhatsAppShare,
} from '../../lib/shareSmartAlbum';
import {
    addFilesToAlbumCollection,
    getAlbumCollection,
    getAlbumCollectionRevision,
    getCollectionItem,
    loadAlbumAssetsFromCloud,
} from '../../components/smart-albums/albumCollection';
import { isPdfFile } from '../../lib/pdfToImages';
import {
    clearAllAlbumPagePhotos,
    getAlbumPhotoRevision,
    migrateEndHalfSpreadToLeftPage,
    migrateInsideCoverSpreadToPageTwo,
    migrateMiskeyedInnerSpreadPhotos,
    placeCollectionItemOnPages,
    setPagePhotoFromCollectionItem,
    setSpreadPhotoFromCollectionItem,
} from '../../components/smart-albums/albumPagePhotos';
import {
    clearAlbumTransforms,
    getTransformRevision,
    migrateInsideCoverSpreadTransform,
    migrateMiskeyedInnerSpreadTransforms,
} from '../../components/smart-albums/albumPageTransforms';
import {
    getProofCellPhotoIndex,
    getSpreadLeftPageIndex,
    PROOF_CELL_LABELS,
    getSpreadRightPageIndex,
} from '../../components/smart-albums/albumSpreadGrid';
import {
    getEndSpreadPageIndices,
    getInnerPageCount,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverSpreadLeft,
    pageToSpreadIndex,
    spreadIndexToPage,
} from '../../components/smart-albums/albumSpreadUtils';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import AlbumCommentSettings from '../../components/smart-albums/AlbumCommentSettings';
import AlbumCommentsFeed from '../../components/smart-albums/AlbumCommentsFeed';
import { getSwapMarks, SWAP_MARKS_CHANGED_EVENT } from '../../components/smart-albums/albumSwapMarks';
import { getPhotoPins, PHOTO_PINS_CHANGED_EVENT } from '../../components/smart-albums/albumPhotoPins';
import {
    COMMENTS_CHANGED_EVENT,
    groupRootCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { useAuth } from '../../hooks/useAuth';
import './AlbumEditor.css';

function getSpreadLeftForBookPage(bookPageIndex, totalPages) {
    return getSpreadLeftPageIndex(bookPageIndex, { showCover: true, totalPages });
}

function isProofGridSpread(leftPage, totalPages) {
    if (leftPage <= 0) return false;
    if (totalPages != null && isCoverInsidePage(leftPage, totalPages)) return false;
    return true;
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
    const { toast, showToast, clearToast } = useAppToast(4000);
    const [spreadCommentsBySpread, setSpreadCommentsBySpread] = useState({});
    const [uploading, setUploading] = useState(false);
    const [bookPage, setBookPage] = useState(initialPage);
    const [gridEditSet, setGridEditSet] = useState(() =>
        layoutToPlacementMode(album?.grid_layout)
    );
    const [collectionRevision, setCollectionRevision] = useState(0);
    const [transformRevision, setTransformRevision] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pageCountBusy, setPageCountBusy] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareLinkOpen, setShareLinkOpen] = useState(false);
    const [swapMarks, setSwapMarks] = useState(() => getSwapMarks(albumId));
    const [photoPins, setPhotoPins] = useState(() => getPhotoPins(albumId));
    const shareRef = useRef(null);
    const [gridSelection, setGridSelection] = useState(() => {
        if (initialPage === 0) return buildCoverSelection();
        const left = getSpreadLeftForBookPage(initialPage, totalPages);
        if (isCoverInsidePage(initialPage, totalPages)) {
            return buildCellSelection(left, 2);
        }
        return isProofGridSpread(left, totalPages)
            ? buildCellSelection(left, 1)
            : buildCoverSelection();
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
        let changed = false;
        if (migrateEndHalfSpreadToLeftPage(albumId, totalPages)) changed = true;
        if (migrateMiskeyedInnerSpreadPhotos(albumId, totalPages)) changed = true;
        if (migrateInsideCoverSpreadToPageTwo(albumId, totalPages)) changed = true;
        if (migrateInsideCoverSpreadTransform(albumId)) changed = true;
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (migrateMiskeyedInnerSpreadTransforms(albumId, endLeft)) changed = true;
        if (changed) bumpWorkspace();
    }, [albumId, totalPages, bumpWorkspace]);

    useEffect(() => {
        setSwapMarks(getSwapMarks(albumId));
    }, [albumId]);

    useEffect(() => {
        const onSwapMarksChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            setSwapMarks(getSwapMarks(albumId));
        };
        window.addEventListener(SWAP_MARKS_CHANGED_EVENT, onSwapMarksChanged);
        return () => window.removeEventListener(SWAP_MARKS_CHANGED_EVENT, onSwapMarksChanged);
    }, [albumId]);

    useEffect(() => {
        setPhotoPins(getPhotoPins(albumId));
    }, [albumId]);

    useEffect(() => {
        const onPinsChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            setPhotoPins(getPhotoPins(albumId));
        };
        window.addEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
        return () => window.removeEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
    }, [albumId]);

    useEffect(() => {
        if (!albumId || !user?.id) return undefined;

        let cancelled = false;
        (async () => {
            const result = await loadAlbumAssetsFromCloud(albumId, user.id);
            if (cancelled || !result.loaded) return;
            setCollectionRevision(getAlbumCollectionRevision(albumId));
            onPhotosUploaded?.();
            setTransformRevision(getTransformRevision(albumId));
        })();

        return () => {
            cancelled = true;
        };
        // Load once per album session; avoid re-fetch loops from callback identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [albumId, user?.id]);

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

    useEffect(() => {
        const lockedSet = layoutToPlacementMode(album?.grid_layout);
        setGridEditSet(lockedSet);
        const left = getSpreadLeftForBookPage(bookPage, totalPages);
        if (isProofGridSpread(left, totalPages)) {
            setGridSelection(
                lockedSet === 'whole'
                    ? buildSpreadSelection(left)
                    : buildCellSelection(left, 1)
            );
        }
    }, [album?.grid_layout, bookPage, totalPages]);

    useEffect(() => {
        const maxPage = Math.max(0, totalPages - 1);
        const clampedPage = Math.min(initialPage, maxPage);
        setBookPage(clampedPage);
        if (clampedPage === 0) {
            setGridSelection(buildCoverSelection());
            return;
        }
        const left = getSpreadLeftForBookPage(clampedPage, totalPages);
        if (isCoverInsidePage(clampedPage, totalPages)) {
            setGridSelection(buildCellSelection(left, 2));
            return;
        }
        if (isProofGridSpread(left, totalPages)) {
            setGridSelection((prev) =>
                prev?.leftPage === left ? prev : buildCellSelection(left, prev?.cellId || 1)
            );
        } else {
            setGridSelection(buildCellSelection(left, 1));
        }
    }, [initialPage, totalPages]);

    useEffect(() => {
        setBookPage((prev) => {
            const maxPage = Math.max(0, totalPages - 1);
            return prev > maxPage ? maxPage : prev;
        });
    }, [totalPages]);

    const syncSelectionToPage = useCallback(
        (pageIndex) => {
            if (pageIndex === 0) {
                setGridSelection(buildCoverSelection());
                return;
            }
            const left = getSpreadLeftForBookPage(pageIndex, totalPages);
            if (isCoverInsidePage(pageIndex, totalPages)) {
                setGridSelection(buildCellSelection(left, 2));
                return;
            }
            if (isProofGridSpread(left, totalPages)) {
                setGridSelection((prev) => {
                    if (prev?.leftPage === left) return prev;
                    if (isEndHalfSpreadLeftPage(left, totalPages)) {
                        return buildCellSelection(left, prev?.cellId || 1);
                    }
                    return gridEditSet === 'whole'
                        ? buildSpreadSelection(left)
                        : buildCellSelection(left, prev?.cellId || 1);
                });
            } else {
                setGridSelection(buildCellSelection(left, 1));
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

    const handleNavigateToCommentSpread = useCallback(
        (spreadIndex) => {
            const page = spreadIndexToPage(spreadIndex, { showCover: true, totalPages });
            const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
            handleBookPageChange(clamped);
        },
        [handleBookPageChange, totalPages]
    );

    const activeCommentSpreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, { showCover: true, totalPages }),
        [bookPage, totalPages]
    );

    const handleGridEditSetChange = useCallback(
        (set) => {
            const lockedSet = layoutToPlacementMode(album?.grid_layout);
            if (set !== lockedSet) return;
            setGridEditSet(set);
            const left =
                gridSelection?.leftPage ?? getSpreadLeftForBookPage(bookPage, totalPages);
            if (!isProofGridSpread(left, totalPages)) return;
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
        if (!gridSelection || gridSelection.mode === 'cover') return [];
        const left = gridSelection.leftPage;
        if (left == null) return [];
        if (isEndHalfSpreadLeftPage(left, totalPages)) {
            const { left: endLeft } = getEndSpreadPageIndices(totalPages);
            return [endLeft];
        }
        if (!isProofGridSpread(left, totalPages)) return [];
        if (gridEditSet === 'whole' || gridSelection.mode === 'spread') return [];
        if (gridSelection.cellId) {
            return [
                getProofCellPhotoIndex(left, gridSelection.cellId, totalPages),
            ];
        }
        return [];
    }, [gridSelection, gridEditSet, totalPages]);

    const effectivePlacementMode = useMemo(() => {
        if (gridEditSet !== 'whole') return 'single';
        const left =
            gridSelection?.leftPage ?? getSpreadLeftForBookPage(bookPage, totalPages);
        if (isEndHalfSpreadLeftPage(left, totalPages)) return 'single';
        if (isInsideCoverSpreadLeft(left, totalPages)) return 'single';
        return 'whole';
    }, [gridEditSet, gridSelection?.leftPage, bookPage, totalPages]);

    const placeItemOnSpread = useCallback(
        (itemId) => {
            const item = getCollectionItem(albumId, itemId);
            if (!item?.dataUrl || !gridSelection) return false;

            if (gridSelection.mode === 'cover') {
                return setPagePhotoFromCollectionItem(albumId, 0, item.id);
            }

            const left = gridSelection.leftPage;
            const endHalfLeft = isEndHalfSpreadLeftPage(left, totalPages);

            if (endHalfLeft && gridSelection.mode !== 'cover') {
                const { left: endLeft } = getEndSpreadPageIndices(totalPages);
                return setPagePhotoFromCollectionItem(albumId, endLeft, item.id, {
                    clearSpreadForLeft: endLeft,
                });
            }

            if (gridEditSet === 'whole' || gridSelection.mode === 'spread') {
                if (endHalfLeft) {
                    return setPagePhotoFromCollectionItem(albumId, left, item.id, {
                        clearSpreadForLeft: left,
                    });
                }
                if (isInsideCoverSpreadLeft(left, totalPages)) {
                    return setPagePhotoFromCollectionItem(albumId, 2, item.id, {
                        clearSpreadForLeft: left,
                    });
                }
                const right = getSpreadRightPageIndex(left, totalPages);
                return setSpreadPhotoFromCollectionItem(albumId, left, item.id, right, {
                    totalPages,
                });
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
    const canRemovePages =
        totalPages - pagesPerSpread >= minPages &&
        getInnerPageCount(totalPages) >= pagesPerSpread;

    const handleAddPages = useCallback(
        async ({ silent = false } = {}) => {
            if (!canAddPages || !onChangePageCount) return null;
            setPageCountBusy(true);
            const result = await onChangePageCount(pagesPerSpread);
            setPageCountBusy(false);
            if (result) bumpWorkspace();
            if (result && !silent) {
                showToast(`Added ${pagesPerSpread} pages (${result.next} total).`, { duration: 3500 });
            }
            return result;
        },
        [canAddPages, onChangePageCount, pagesPerSpread, showToast, bumpWorkspace]
    );

    const handleAddPagesFromOverview = useCallback(async () => {
        return handleAddPages({ silent: true });
    }, [handleAddPages]);

    const handleRemovePages = useCallback(async () => {
        if (!canRemovePages || !onChangePageCount) return;
        setPageCountBusy(true);
        const result = await onChangePageCount(-pagesPerSpread);
        setPageCountBusy(false);
        if (result) bumpWorkspace();
    }, [canRemovePages, onChangePageCount, pagesPerSpread, bumpWorkspace]);

    const handleRemovePagesFromOverview = useCallback(async () => {
        await handleRemovePages();
    }, [handleRemovePages]);

    const handleClearAllPhotos = useCallback(() => {
        clearAllAlbumPagePhotos(albumId, { totalPages });
        clearAlbumTransforms(albumId);
        bumpWorkspace();
        showToast('Removed all images from the album.', { duration: 3500 });
    }, [albumId, totalPages, bumpWorkspace, showToast]);

    const spreadEdit = activePanel === 'edit';
    const showGridComments = activePanel === 'comments';
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
                        onClick={() => openSmartAlbumPreview(albumId, bookPage)}
                    >
                        Preview
                    </button>
                    <div className="ae-share-wrap" ref={shareRef}>
                        <button
                            type="button"
                            className="ae-btn-primary ae-btn-share"
                            onClick={() => setShowShareMenu((v) => !v)}
                            aria-expanded={showShareMenu}
                        >
                            Share
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {showShareMenu && (
                            <div className="ae-share-dropdown" role="menu">
                                <button
                                    type="button"
                                    className="ae-share-dropdown-item"
                                    onClick={() => {
                                        setShowShareMenu(false);
                                        openShareByEmail(
                                            getSmartAlbumPreviewShareUrl(album),
                                            album.name || 'Album preview'
                                        );
                                    }}
                                >
                                    Share by email
                                </button>
                                <button
                                    type="button"
                                    className="ae-share-dropdown-item"
                                    onClick={() => {
                                        setShowShareMenu(false);
                                        setShareLinkOpen(true);
                                    }}
                                >
                                    Get direct link
                                </button>
                                <button
                                    type="button"
                                    className="ae-share-dropdown-item ae-share-dropdown-item--whatsapp"
                                    onClick={() => {
                                        setShowShareMenu(false);
                                        openWhatsAppShare(
                                            getSmartAlbumPreviewShareUrl(album),
                                            album.name || 'Album preview'
                                        );
                                    }}
                                >
                                    Share on WhatsApp
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="ae-body">
                <AlbumEditorSidebar
                    activePanel={activePanel}
                    onPanelChange={setActivePanel}
                    commentSettings={
                        user?.id ? (
                            <AlbumCommentSettings
                                album={album}
                                photographerId={user.id}
                                onUpdated={onAlbumUpdate}
                            />
                        ) : null
                    }
                    commentsFeed={
                        albumId ? (
                            <AlbumCommentsFeed
                                albumId={albumId}
                                onNavigateToSpread={handleNavigateToCommentSpread}
                                activeSpreadIndex={activeCommentSpreadIndex}
                            />
                        ) : null
                    }
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
                        if (isProofGridSpread(left, totalPages)) handleSelectGridCell(left, cellId);
                    }}
                    canSelectGrid={Boolean(gridSelection)}
                    spreadCount={spreadCount}
                    innerPageCount={getInnerPageCount(totalPages)}
                    canAddPages={canAddPages}
                    canRemovePages={canRemovePages}
                    pagesPerSpread={pagesPerSpread}
                    pageCountBusy={pageCountBusy}
                    onAddPages={handleAddPages}
                    onRemovePages={handleRemovePages}
                    swapMarks={swapMarks}
                    photoPins={photoPins}
                    albumId={albumId}
                />

                <main className="ae-canvas">
                    <div className="ae-canvas-chrome">
                        <span className="ae-canvas-label">Spread editor</span>
                        <span className="ae-canvas-hint">
                            {spreadEdit
                                ? 'Drag photo to move · drag each edge to zoom · hover a photo to mark a swap'
                                : 'Click a page slot to pick a photo · hover a placed photo to mark a swap'}
                        </span>
                    </div>
                    <div className={`ae-canvas-stage${spreadEdit ? ' ae-canvas-stage--edit' : ''}`}>
                        <AlbumBook
                            key={albumId}
                            album={albumForBook}
                            totalPages={totalPages}
                            initialPage={bookPage}
                            onPageChange={handleBookPageChange}
                            editable={!spreadEdit}
                            spreadEdit={spreadEdit}
                            placementMode={effectivePlacementMode === 'whole' ? 'whole' : 'single'}
                            showSamples={false}
                            gridSelection={gridSelection}
                            onSelectGridCell={handleSelectGridCell}
                            onSelectGridSpread={handleSelectGridSpread}
                            onSelectCover={handleSelectCover}
                            canAddPages={canAddPages}
                            onAddPages={handleAddPagesFromOverview}
                            canRemovePages={canRemovePages}
                            onRemovePages={handleRemovePagesFromOverview}
                            pageCountBusy={pageCountBusy}
                            onTransformChange={() => {
                                setTransformRevision(getTransformRevision(albumId));
                                onPhotosUploaded?.();
                            }}
                            transformRevision={transformRevision}
                            showGridComments={showGridComments}
                            spreadCommentsBySpread={spreadCommentsBySpread}
                            swapMarkMode
                            pinMarkMode
                            proofToolsHover={false}
                        />
                    </div>
                </main>
            </div>

            <AppToast toast={toast} onDismiss={clearToast} />

            <AlbumPreviewLinkModal
                album={album}
                isOpen={shareLinkOpen}
                onClose={() => setShareLinkOpen(false)}
            />
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
