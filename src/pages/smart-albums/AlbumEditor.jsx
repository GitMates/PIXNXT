import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumCoverEditView from '../../components/smart-albums/AlbumCoverEditView';
import AlbumCoverTextModal from '../../components/smart-albums/AlbumCoverTextModal';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import {
    COVER_TEXT_CHANGED_EVENT,
    getAlbumCoverText,
    setAlbumCoverText,
} from '../../components/smart-albums/albumCoverText';
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
    getAlbumLayoutPhotoCount,
    getCollectionItem,
    isCoverWrapCollectionItem,
    loadAlbumAssetsFromCloud,
    markCollectionItemAsCoverWrap,
    reorderCollectionItems,
} from '../../components/smart-albums/albumCollection';
import { insertAlbumStoragePages, removeAlbumStoragePages } from '../../components/smart-albums/albumPageStorage';
import { shiftAlbumRemotePreviewPages } from '../../components/smart-albums/albumPreviewData';
import { shiftAlbumPhotoPins } from '../../components/smart-albums/albumPhotoPins';
import { isPdfFile } from '../../lib/pdfToImages';
import { filesFromInput } from '../../lib/uploadFileOrder';
import {
    clearAllAlbumPagePhotos,
    clearCollectionItemPlacements,
    getAlbumPhotoRevision,
    getSpreadPhotoOverride,
    migrateEndHalfSpreadToLeftPage,
    migrateBackCoverUsesBookWrap,
    migrateFrontCoverToFullSpread,
    migrateInsideCoverSpreadToPageTwo,
    applyCollectionOrderToPages,
    migrateMiskeyedInnerSpreadPhotos,
    migrateWholeSpreadPagePhotosToSpreadKeys,
    migrateWholeSpreadPhotoOffRightPage,
    spreadHasWholeSpreadPhoto,
    placeCollectionItemOnPages,
    setPagePhotoFromCollectionItem,
    setPagePhotoFromDataUrl,
    setSpreadPhoto,
    setSpreadPhotoFromCollectionItem,
    resolveBookWrapSpreadSrc,
    syncCoverWrapRoleFromSpread,
} from '../../components/smart-albums/albumPagePhotos';
import { loadImageAspectFromUrl } from '../../components/smart-albums/albumGridSize';
import {
    clearSpreadPhotos,
    swapPhotoSlots,
} from '../../components/smart-albums/albumSlotActions';
import AlbumSpreadSlotMenu from '../../components/smart-albums/AlbumSpreadSlotMenu';
import AlbumSwapExecuteModal from '../../components/smart-albums/AlbumSwapExecuteModal';
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
    albumHasBlankCovers,
    albumHasCoverSpreads,
    albumUsesBookWrap,
    getAlbumSpreadOptions,
    getEndSpreadPageIndices,
    getInnerPageCount,
    canRemoveSpreadBeforeLastTwo,
    getPageInsertIndex,
    getPageRemoveIndex,
    isCoverInsidePage,
    isEndHalfSpreadIndex,
    isEndHalfSpreadLeftPage,
    isInsideCoverSpreadLeft,
    isManualWholeSpreadPlacement,
    isPreBackHalfSpreadLeftPage,
    isWholeSpreadLayout,
    pageToSpreadIndex,
    spreadIndexToPage,
} from '../../components/smart-albums/albumSpreadUtils';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import AlbumCommentSettings from '../../components/smart-albums/AlbumCommentSettings';
import AlbumCommentsFeed from '../../components/smart-albums/AlbumCommentsFeed';
import {
    getSwapMarks,
    isWholeGridSwapSlot,
    markSwapMarksSeen,
    parseSlotKey,
    SWAP_MARKS_CHANGED_EVENT,
    SWAP_MARKS_SEEN_CHANGED_EVENT,
} from '../../components/smart-albums/albumSwapMarks';
import {
    getPhotoPins,
    markPhotoPinsSeen,
    PHOTO_PINS_CHANGED_EVENT,
    PHOTO_PINS_SEEN_CHANGED_EVENT,
} from '../../components/smart-albums/albumPhotoPins';
import {
    COMMENTS_CHANGED_EVENT,
    groupRootCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { useAuth } from '../../hooks/useAuth';
import { computePageCountFromPhotoCount } from './createAlbumLayout';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import './AlbumEditor.css';

function getSpreadLeftForBookPage(bookPageIndex, totalPages, spreadOpts) {
    return getSpreadLeftPageIndex(bookPageIndex, { ...spreadOpts, totalPages });
}

function isProofGridSpread(leftPage, totalPages, spreadOpts) {
    if (spreadOpts?.hasCovers === false) return leftPage >= 0;
    // Front cover spread (page 0) uses cover placement, not inner grid cells.
    if (leftPage === 0) return false;
    if (leftPage <= 0) return false;
    if (totalPages != null && isCoverInsidePage(leftPage, totalPages, spreadOpts)) return false;
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
    return isWholeSpreadLayout(layout) ? 'whole' : 'single';
}

function pickerTitle(gridEditSet, gridSelection, album) {
    if (gridSelection?.mode === 'cover') {
        return albumHasBlankCovers(album) ? 'Choose cover photo' : 'Choose book wrap photo';
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
    const location = useLocation();
    const [searchParams] = useSearchParams();
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
    const [photoLayoutRev, setPhotoLayoutRev] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pageCountBusy, setPageCountBusy] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareLinkOpen, setShareLinkOpen] = useState(false);
    const [swapMarks, setSwapMarks] = useState(() => getSwapMarks(albumId));
    const [photoPins, setPhotoPins] = useState(() => getPhotoPins(albumId));
    const [proofSeenTick, setProofSeenTick] = useState(0);
    const shareRef = useRef(null);
    const replaceFileRef = useRef(null);
    const pendingReplaceSlotRef = useRef(null);
    const collectionSyncRef = useRef(false);
    const prevLayoutPhotoCountRef = useRef(null);
    const [slotMenu, setSlotMenu] = useState(null);
    const [swapExecuteOrigin, setSwapExecuteOrigin] = useState(null);
    const [coverTextModalOpen, setCoverTextModalOpen] = useState(false);
    const [coverTextRevision, setCoverTextRevision] = useState(0);

    const collectionItems = useMemo(
        () => getAlbumCollection(albumId),
        [albumId, collectionRevision]
    );

    const collectionCount = useMemo(
        () => getAlbumLayoutPhotoCount(albumId, album),
        [albumId, album?.blank_covers, collectionRevision]
    );

    const spreadOpts = useMemo(
        () =>
            getAlbumSpreadOptions(album, {
                collectionCount,
            }),
        [album?.has_covers, album?.id, album?.page_count, collectionCount]
    );
    const spreadCtx = useMemo(
        () => ({ ...spreadOpts, totalPages }),
        [spreadOpts, totalPages]
    );

    const [gridSelection, setGridSelection] = useState(() => {
        const opts = getAlbumSpreadOptions(album);
        if (opts.hasCovers && (initialPage === 0 || initialPage === 1)) return buildCoverSelection();
        const left = getSpreadLeftForBookPage(initialPage, totalPages, opts);
        if (opts.hasCovers && isCoverInsidePage(initialPage, totalPages, opts)) {
            return buildCoverSelection();
        }
        return isProofGridSpread(left, totalPages, opts)
            ? buildCellSelection(left, 1)
            : opts.hasCovers
              ? buildCoverSelection()
              : buildCellSelection(0, 1);
    });

    const [wrapAspect, setWrapAspect] = useState(null);

    useEffect(() => {
        if (!album?.has_covers || !albumId) {
            setWrapAspect(null);
            return undefined;
        }
        const blankCovers = albumHasBlankCovers(album);
        if (!blankCovers && album?.spread_grid_size) {
            setWrapAspect(null);
            return undefined;
        }
        const src = resolveBookWrapSpreadSrc({ ...album, id: albumId }, { showSamples: false });
        if (!src) {
            setWrapAspect(null);
            return undefined;
        }
        let cancelled = false;
        loadImageAspectFromUrl(src).then((aspect) => {
            if (!cancelled && aspect > 0) setWrapAspect(aspect);
        });
        return () => {
            cancelled = true;
        };
    }, [
        album,
        albumId,
        album?.has_covers,
        album?.blank_covers,
        album?.spread_grid_size,
        photoRevision,
        photoLayoutRev,
        transformRevision,
    ]);

    const albumForBook = useMemo(
        () => ({
            ...album,
            id: albumId,
            ...(wrapAspect > 0 ? { __wrap_aspect: wrapAspect } : {}),
        }),
        [album, albumId, wrapAspect]
    );

    const bumpWorkspace = useCallback(() => {
        onPhotosUploaded?.();
        setTransformRevision(getTransformRevision(albumId));
        setCollectionRevision(getAlbumCollectionRevision(albumId));
        setPhotoLayoutRev(getAlbumPhotoRevision(albumId) || Date.now());
    }, [albumId, onPhotosUploaded]);

    /** Defer refresh so portaled menus unmount before the flipbook updates (avoids React DOM conflicts). */
    const scheduleWorkspaceRefresh = useCallback(() => {
        requestAnimationFrame(() => {
            bumpWorkspace();
        });
    }, [bumpWorkspace]);

    const layoutRevision = photoRevision || photoLayoutRev || transformRevision;

    useEffect(() => {
        setCollectionRevision(getAlbumCollectionRevision(albumId));
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onCoverTextChanged = (e) => {
            if (e.detail?.albumId === albumId) setCoverTextRevision((t) => t + 1);
        };
        window.addEventListener(COVER_TEXT_CHANGED_EVENT, onCoverTextChanged);
        return () => window.removeEventListener(COVER_TEXT_CHANGED_EVENT, onCoverTextChanged);
    }, [albumId]);

    useEffect(() => {
        collectionSyncRef.current = false;
        prevLayoutPhotoCountRef.current = null;
    }, [albumId]);

    const ensurePageCountForCollection = useCallback(async () => {
        if (!albumId || !album || !user?.id) return album;
        syncCoverWrapRoleFromSpread(albumId);
        const photoCount = getAlbumLayoutPhotoCount(albumId, album);
        const prevPhotoCount = prevLayoutPhotoCountRef.current;
        const collectionShrunk = prevPhotoCount != null && photoCount < prevPhotoCount;
        prevLayoutPhotoCountRef.current = photoCount;
        if (!photoCount && !getSpreadPhotoOverride(albumId, 0)) return album;

        const blankCovers = albumHasBlankCovers(album);
        const requiredPages = computePageCountFromPhotoCount(photoCount, {
            includeCovers: album?.has_covers === true,
            blankCovers,
            gridLayout: album.grid_layout || 'two-page',
        });
        const targetPages = Math.min(requiredPages, maxPages);
        const currentPages = album.page_count || 0;
        if (targetPages === currentPages) return album;

        const spreadOptsNow = getAlbumSpreadOptions(album, {
            collectionCount: photoCount,
        });

        if (targetPages > currentPages) {
            const delta = targetPages - currentPages;
            const insertAt = getPageInsertIndex(currentPages, spreadOptsNow);
            insertAlbumStoragePages(albumId, insertAt, delta);
            shiftAlbumRemotePreviewPages(albumId, insertAt, delta);
            shiftAlbumPhotoPins(albumId, insertAt, delta);
        } else if (targetPages < currentPages && blankCovers && collectionShrunk) {
            const delta = currentPages - targetPages;
            const removeAt = getPageRemoveIndex(currentPages, delta, spreadOptsNow);
            removeAlbumStoragePages(albumId, removeAt, delta);
            shiftAlbumRemotePreviewPages(albumId, removeAt, -delta);
            shiftAlbumPhotoPins(albumId, removeAt, -delta);
        } else {
            return album;
        }

        const updated = await smartAlbumsService.updateAlbumPageCount(
            user.id,
            albumId,
            targetPages
        );
        onAlbumUpdate?.(updated);
        scheduleWorkspaceRefresh();
        setCollectionRevision(getAlbumCollectionRevision(albumId));
        return updated;
    }, [
        albumId,
        album?.page_count,
        album?.has_covers,
        album?.blank_covers,
        album?.grid_layout,
        user?.id,
        onAlbumUpdate,
        maxPages,
        scheduleWorkspaceRefresh,
    ]);

    /** Grow page count when collection grows; shrink only when photos are removed (not manual spread edits). */
    useEffect(() => {
        if (!albumId || !album || !user?.id) return;
        void ensurePageCountForCollection();
    }, [
        albumId,
        album?.has_covers,
        album?.blank_covers,
        album?.grid_layout,
        collectionCount,
        ensurePageCountForCollection,
        user?.id,
    ]);

    const syncCollectionOrderToSpreads = useCallback(async () => {
        if (!albumId || !album || !user?.id) return 0;
        const items = getAlbumCollection(albumId);
        const placementItems = albumHasBlankCovers(album)
            ? items.filter((item) => !isCoverWrapCollectionItem(item))
            : items;
        if (!placementItems.length && !items.some(isCoverWrapCollectionItem)) return 0;

        const spreadOpts = getAlbumSpreadOptions(album, {
            collectionCount: placementItems.length,
        });
        const blankCovers = albumHasBlankCovers(album);
        const requiredPages = computePageCountFromPhotoCount(placementItems.length, {
            includeCovers: spreadOpts.hasCovers,
            blankCovers,
            gridLayout: album.grid_layout || 'two-page',
        });

        let albumForPlace = album;
        if (requiredPages !== (album.page_count || 0)) {
            albumForPlace = await smartAlbumsService.updateAlbumPageCount(
                user.id,
                albumId,
                requiredPages
            );
            onAlbumUpdate?.(albumForPlace);
        }

        return await applyCollectionOrderToPages(albumId, {
            ...albumForPlace,
            has_covers: album?.has_covers === true,
            blank_covers: blankCovers,
            grid_layout: album.grid_layout || 'two-page',
            page_count: requiredPages,
        });
    }, [albumId, album, user?.id, onAlbumUpdate]);

    useEffect(() => {
        let changed = false;
        const wholeSpreadAlbum = isWholeSpreadLayout(album?.grid_layout);
        if (migrateEndHalfSpreadToLeftPage(albumId, totalPages, album)) changed = true;
        if (migrateMiskeyedInnerSpreadPhotos(albumId, totalPages, album)) changed = true;
        if (migrateWholeSpreadPhotoOffRightPage(albumId, album)) changed = true;
        if (wholeSpreadAlbum) {
            if (migrateWholeSpreadPagePhotosToSpreadKeys(albumId, totalPages, album)) {
                changed = true;
            }
        } else if (!spreadOpts.hasCovers) {
            if (migrateWholeSpreadPagePhotosToSpreadKeys(albumId, totalPages, album)) {
                changed = true;
            }
        }
        if (spreadOpts.hasCovers) {
            if (migrateFrontCoverToFullSpread(albumId)) changed = true;
            if (albumUsesBookWrap(album) && migrateBackCoverUsesBookWrap(albumId, totalPages, album)) {
                changed = true;
            }
            if (!wholeSpreadAlbum && migrateInsideCoverSpreadToPageTwo(albumId, totalPages, album)) {
                changed = true;
            }
            if (!wholeSpreadAlbum && migrateInsideCoverSpreadTransform(albumId)) {
                changed = true;
            }
            const { left: endLeft } = getEndSpreadPageIndices(totalPages);
            if (migrateMiskeyedInnerSpreadTransforms(albumId, endLeft)) changed = true;
        }
        if (!changed) return undefined;
        const timer = window.setTimeout(() => {
            bumpWorkspace();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [albumId, album?.grid_layout, totalPages, spreadOpts.hasCovers, bumpWorkspace]);

    /** Align spread slots with collection order (1st upload → first slot). Runs once per album + after create. */
    useEffect(() => {
        if (!albumId || !album || collectionSyncRef.current) return;

        const fromCreate = location.state?.syncCollectionOrder === true;
        const onceKey = `pixnxt_collection_order_sync_v12_${albumId}`;
        let needsOnce = false;
        try {
            needsOnce = !localStorage.getItem(onceKey);
        } catch {
            needsOnce = false;
        }

        if (!fromCreate && !needsOnce) return;

        collectionSyncRef.current = true;
        let cancelled = false;
        void syncCollectionOrderToSpreads().then((placed) => {
            if (cancelled) return;
            if (placed > 0) scheduleWorkspaceRefresh();
            try {
                localStorage.setItem(onceKey, String(Date.now()));
            } catch {
                /* ignore */
            }
            if (fromCreate) {
                const path = `${location.pathname}${location.search}`;
                navigate(path, { replace: true, state: {} });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [
        albumId,
        album,
        location.state,
        location.pathname,
        location.search,
        navigate,
        syncCollectionOrderToSpreads,
        scheduleWorkspaceRefresh,
    ]);

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
        if (!albumId) return undefined;
        const bumpSeen = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            setProofSeenTick((tick) => tick + 1);
        };
        window.addEventListener(PHOTO_PINS_SEEN_CHANGED_EVENT, bumpSeen);
        window.addEventListener(SWAP_MARKS_SEEN_CHANGED_EVENT, bumpSeen);
        return () => {
            window.removeEventListener(PHOTO_PINS_SEEN_CHANGED_EVENT, bumpSeen);
            window.removeEventListener(SWAP_MARKS_SEEN_CHANGED_EVENT, bumpSeen);
        };
    }, [albumId]);

    // NOTE: comments should stay "unseen" until the user opens a specific comment row.
    // Marking all seen on tab open prevents the highlight from ever appearing.

    // NOTE: swaps should stay "unseen" until the user opens a specific swap row.
    // Marking all seen on tab open prevents the highlight from ever appearing.

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
        const left = getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
        if (albumHasCoverSpreads(album) && (bookPage === 0 || bookPage === 1)) {
            setGridSelection(buildCoverSelection());
            return;
        }
        if (albumHasCoverSpreads(album) && isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
            setGridSelection(buildCoverSelection());
            return;
        }
        if (isProofGridSpread(left, totalPages, spreadOpts)) {
            setGridSelection(
                lockedSet === 'whole'
                    ? buildSpreadSelection(left)
                    : buildCellSelection(left, 1)
            );
        }
    }, [album, album?.grid_layout, bookPage, totalPages, spreadOpts]);

    useEffect(() => {
        const maxPage = Math.max(0, totalPages - 1);
        const clampedPage = Math.min(initialPage, maxPage);
        setBookPage(clampedPage);
        const left = getSpreadLeftForBookPage(clampedPage, totalPages, spreadOpts);
        if (albumHasCoverSpreads(album) && (clampedPage === 0 || clampedPage === 1)) {
            setGridSelection(buildCoverSelection());
            return;
        }
        if (albumHasCoverSpreads(album) && isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
            setGridSelection(buildCoverSelection());
            return;
        }
        const lockedSet = layoutToPlacementMode(album?.grid_layout);
        if (isProofGridSpread(left, totalPages, spreadOpts)) {
            setGridSelection((prev) => {
                if (prev?.leftPage === left) return prev;
                return lockedSet === 'whole'
                    ? buildSpreadSelection(left)
                    : buildCellSelection(left, prev?.cellId || 1);
            });
        } else {
            setGridSelection(buildCellSelection(left, 1));
        }
    }, [initialPage, totalPages, spreadOpts, album, album?.grid_layout]);

    useEffect(() => {
        const panel = searchParams.get('panel');
        const validPanels = ['collections', 'cover', 'swap', 'pin', 'comments', 'grid', 'edit', 'pages'];
        if (panel && validPanels.includes(panel)) {
            setActivePanel(panel);
        }
    }, [searchParams]);

    useEffect(() => {
        setBookPage((prev) => {
            const maxPage = Math.max(0, totalPages - 1);
            return prev > maxPage ? maxPage : prev;
        });
    }, [totalPages]);

    const syncSelectionToPage = useCallback(
        (pageIndex) => {
            const left = getSpreadLeftForBookPage(pageIndex, totalPages, spreadOpts);
            if (albumHasCoverSpreads(album) && (pageIndex === 0 || pageIndex === 1)) {
                setGridSelection(buildCoverSelection());
                return;
            }
            if (albumHasCoverSpreads(album) && isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                setGridSelection(buildCoverSelection());
                return;
            }
            if (isProofGridSpread(left, totalPages, spreadOpts)) {
                setGridSelection((prev) => {
                    if (prev?.leftPage === left) return prev;
                    if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
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
        [album, totalPages, gridEditSet, spreadOpts]
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
            const page = spreadIndexToPage(spreadIndex, spreadCtx);
            const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
            handleBookPageChange(clamped);
        },
        [handleBookPageChange, totalPages]
    );
    const handleNavigateToPin = useCallback(
        (pin) => {
            if (!pin) return;
            const spreadIdx = pageToSpreadIndex(pin.pageNum, spreadCtx);
            const page = spreadIndexToPage(spreadIdx, spreadCtx);
            const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
            handleBookPageChange(clamped);
        },
        [handleBookPageChange, totalPages]
    );
    const handleNavigateToSwapSlotKey = useCallback(
        (slotKey) => {
            if (!slotKey) return;
            const { pageNum } = parseSlotKey(slotKey);
            const spreadIdx = pageToSpreadIndex(pageNum, spreadCtx);
            const page = spreadIndexToPage(spreadIdx, spreadCtx);
            const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
            handleBookPageChange(clamped);
        },
        [handleBookPageChange, totalPages]
    );

    const activeCommentSpreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, spreadCtx),
        [bookPage, totalPages]
    );

    const handleGridEditSetChange = useCallback(
        (set) => {
            const lockedSet = layoutToPlacementMode(album?.grid_layout);
            if (set !== lockedSet) return;
            setGridEditSet(set);
            const left =
                gridSelection?.leftPage ?? getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
            if (!isProofGridSpread(left, totalPages, spreadOpts)) return;
            if (set === 'whole') {
                setGridSelection(buildSpreadSelection(left));
            } else {
                setGridSelection(buildCellSelection(left, gridSelection?.cellId || 1));
            }
        },
        [album?.grid_layout, gridSelection, bookPage, totalPages]
    );

    const openPicker = useCallback(() => {
        if (activePanel === 'cover' && albumHasCoverSpreads(album)) {
            setGridEditSet('single');
            setGridSelection(buildCoverSelection());
            setPickerOpen(true);
            return;
        }
        if (!gridSelection) {
            showToast('Open an inner spread (not the cover) first.', { variant: 'info', duration: 3500 });
            return;
        }
        if (
            gridSelection.mode === 'cover' &&
            spreadOpts.hasCovers &&
            activePanel !== 'cover'
        ) {
            showToast('Open Edit cover or an inner spread to place photos from the collection.', {
                variant: 'info',
                duration: 3500,
            });
            return;
        }
        setPickerOpen(true);
    }, [gridSelection, showToast, spreadOpts.hasCovers, activePanel]);

    const handleSelectCover = useCallback(() => {
        setGridEditSet('single');
        setGridSelection(buildCoverSelection());
    }, []);

    const handleSelectGridCell = useCallback(
        (leftPage, cellId) => {
            if (isManualWholeSpreadPlacement(leftPage, totalPages, album, spreadOpts)) {
                setGridEditSet('whole');
                setGridSelection(buildSpreadSelection(leftPage));
                return;
            }
            setGridEditSet('single');
            setGridSelection(buildCellSelection(leftPage, cellId));
        },
        [album, totalPages, spreadOpts]
    );

    const handleSelectGridSpread = useCallback((leftPage) => {
        setGridEditSet('whole');
        setGridSelection(buildSpreadSelection(leftPage));
    }, []);

    const placeDataUrlOnSlot = useCallback(
        async (slot, dataUrl) => {
            if (!slot || !dataUrl) return false;
            if (
                albumHasCoverSpreads(album) &&
                (slot.pageNum === 0 ||
                    slot.pageNum === 1 ||
                    slot.label === 'Cover' ||
                    slot.label === 'Back cover' ||
                    slot.label === 'End cover')
            ) {
                const right = Math.min(1, totalPages - 1);
                return setSpreadPhoto(albumId, 0, dataUrl, right, { totalPages, spreadOpts });
            }
            if (slot.pageNum === 0) {
                return setPagePhotoFromDataUrl(albumId, 0, dataUrl);
            }
            const left =
                slot.spreadLeft ?? getSpreadLeftForBookPage(slot.pageNum, totalPages, spreadOpts);
            const useWholeSpread =
                slot.whole ||
                isManualWholeSpreadPlacement(left, totalPages, album, spreadOpts);
            if (useWholeSpread) {
                const right = getSpreadRightPageIndex(left, totalPages);
                return setSpreadPhoto(albumId, left, dataUrl, right, { totalPages });
            }
            if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                return setPagePhotoFromDataUrl(albumId, left, dataUrl, {
                    clearSpreadForLeft: left,
                });
            }
            const photoIndex = getProofCellPhotoIndex(
                slot.pageNum,
                slot.cellId || 1,
                totalPages,
                spreadCtx
            );
            return setPagePhotoFromDataUrl(albumId, photoIndex, dataUrl, {
                clearSpreadForLeft: left,
            });
        },
        [album, albumId, totalPages, spreadCtx, spreadOpts]
    );

    const placeCollectionItemOnSlot = useCallback(
        (slot, itemId) => {
            if (!slot || !itemId) return false;
            if (
                albumHasCoverSpreads(album) &&
                (slot.pageNum === 0 ||
                    slot.pageNum === 1 ||
                    slot.label === 'Cover' ||
                    slot.label === 'Back cover' ||
                    slot.label === 'End cover')
            ) {
                const right = Math.min(1, totalPages - 1);
                const placed = setSpreadPhotoFromCollectionItem(albumId, 0, itemId, right, {
                    totalPages,
                    spreadOpts,
                });
                if (placed) {
                    if (albumHasBlankCovers(album)) {
                        clearCollectionItemPlacements(albumId, itemId, { keepSpreadLeft: 0 });
                    }
                    markCollectionItemAsCoverWrap(albumId, itemId);
                }
                return placed;
            }
            if (slot.pageNum === 0) {
                return setPagePhotoFromCollectionItem(albumId, 0, itemId);
            }
            const left = slot.spreadLeft ?? getSpreadLeftForBookPage(slot.pageNum, totalPages, spreadOpts);
            const useWholeSpread =
                slot.whole ||
                isManualWholeSpreadPlacement(left, totalPages, album, spreadOpts);
            if (useWholeSpread) {
                const right = getSpreadRightPageIndex(left, totalPages);
                return setSpreadPhotoFromCollectionItem(albumId, left, itemId, right, {
                    totalPages,
                    spreadOpts: { ...spreadOpts, gridLayout: album?.grid_layout },
                });
            }
            if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                return setPagePhotoFromCollectionItem(albumId, left, itemId, {
                    clearSpreadForLeft: left,
                });
            }
            const photoIndex = getProofCellPhotoIndex(
                slot.pageNum,
                slot.cellId || 1,
                totalPages,
                spreadCtx
            );
            return setPagePhotoFromCollectionItem(albumId, photoIndex, itemId, {
                clearSpreadForLeft: left,
            });
        },
        [album, albumId, totalPages, spreadCtx, spreadOpts]
    );

    const handleSlotActivate = useCallback(
        (slot, anchorRect) => {
            if (activePanel === 'edit') return;
            if (
                albumHasCoverSpreads(album) &&
                (slot.pageNum === 0 ||
                    slot.pageNum === 1 ||
                    slot.label === 'Cover' ||
                    slot.label === 'Back cover' ||
                    slot.label === 'End cover')
            ) {
                setGridEditSet('single');
                setGridSelection(buildCoverSelection());
            } else if (
                slot.whole ||
                isManualWholeSpreadPlacement(slot.spreadLeft, totalPages, album, spreadOpts)
            ) {
                setGridEditSet('whole');
                setGridSelection(buildSpreadSelection(slot.spreadLeft));
            } else {
                setGridEditSet('single');
                setGridSelection(buildCellSelection(slot.spreadLeft, slot.cellId || 1));
            }
            setSlotMenu({ slot, anchorRect, label: slot.label });
        },
        [activePanel, album, totalPages, spreadOpts]
    );

    const closeSlotMenu = useCallback(() => setSlotMenu(null), []);

    const handleReplaceFromMenu = useCallback(() => {
        pendingReplaceSlotRef.current = slotMenu?.slot ?? null;
        closeSlotMenu();
        replaceFileRef.current?.click();
    }, [slotMenu, closeSlotMenu]);

    const handleChooseFromCollectionMenu = useCallback(() => {
        closeSlotMenu();
        requestAnimationFrame(() => {
            setPickerOpen(true);
        });
    }, [closeSlotMenu]);

    const handleCoverTextFromMenu = useCallback(() => {
        closeSlotMenu();
        requestAnimationFrame(() => {
            setCoverTextModalOpen(true);
        });
    }, [closeSlotMenu]);

    const handleSaveCoverText = useCallback(
        (message) => {
            setAlbumCoverText(albumId, message);
            setCoverTextModalOpen(false);
            showToast(message ? 'Cover message saved.' : 'Cover message removed.', {
                duration: 3500,
            });
        },
        [albumId, showToast]
    );

    const handleReplaceFiles = useCallback(
        async (e) => {
            const files = filesFromInput(e.target.files);
            e.target.value = '';
            const slot = pendingReplaceSlotRef.current;
            pendingReplaceSlotRef.current = null;
            if (!slot || files.length === 0) return;
            setUploading(true);
            showToast('Uploading photo…', { variant: 'info', duration: 0 });
            try {
                const isCoverSlot =
                    albumHasCoverSpreads(album) &&
                    (slot.pageNum === 0 ||
                        slot.pageNum === 1 ||
                        slot.label === 'Cover' ||
                        slot.label === 'Back cover' ||
                        slot.label === 'End cover');
                const added = await addFilesToAlbumCollection(albumId, files, {
                    photographerId: user?.id,
                    skipDuplicateCheck: true,
                    coverWrap: isCoverSlot,
                });
                const replacementItem = added[0] || added.duplicateItems?.[0];
                if (!replacementItem?.id) {
                    showToast('No supported images in that file.', { variant: 'error', duration: 4000 });
                    return;
                }
                if (placeCollectionItemOnSlot(slot, replacementItem.id)) {
                    await ensurePageCountForCollection();
                    scheduleWorkspaceRefresh();
                    showToast('Photo updated.', { variant: 'success', duration: 3500 });
                } else {
                    showToast('Could not place photo.', { variant: 'error', duration: 4000 });
                }
            } catch (err) {
                console.error(err);
                showToast('Upload failed. Try again.', { variant: 'error', duration: 4000 });
            } finally {
                setUploading(false);
            }
        },
        [
            album,
            albumId,
            user?.id,
            placeCollectionItemOnSlot,
            ensurePageCountForCollection,
            scheduleWorkspaceRefresh,
            showToast,
        ]
    );

    const handleRemoveSpreadPhotos = useCallback(() => {
        const slot = slotMenu?.slot;
        if (!slot) return;
        const left = slot.spreadLeft ?? getSpreadLeftForBookPage(slot.pageNum, totalPages, spreadOpts);
        const scope = slot.whole ? 'whole' : slot.cellId === 2 ? 'right' : 'left';
        closeSlotMenu();
        requestAnimationFrame(() => {
            if (clearSpreadPhotos(albumId, left, totalPages, scope)) {
                scheduleWorkspaceRefresh();
                showToast('Photos removed from spread.', { duration: 3500 });
            }
        });
    }, [slotMenu, closeSlotMenu, albumId, totalPages, scheduleWorkspaceRefresh, showToast]);

    const handleOpenSwapModal = useCallback(() => {
        if (slotMenu?.slot) setSwapExecuteOrigin(slotMenu.slot);
        closeSlotMenu();
    }, [slotMenu, closeSlotMenu]);

    const handleExecuteSwap = useCallback(
        (targetSlot) => {
            if (!swapExecuteOrigin || !targetSlot) return;
            const origin = swapExecuteOrigin;
            setSwapExecuteOrigin(null);
            requestAnimationFrame(() => {
                if (swapPhotoSlots(albumId, origin, targetSlot, totalPages, spreadCtx)) {
                    scheduleWorkspaceRefresh();
                    showToast('Photos swapped.', { duration: 3500 });
                } else {
                    showToast('Could not swap — one or both slots may be empty.', {
                        variant: 'error',
                        duration: 4000,
                    });
                }
            });
        },
        [swapExecuteOrigin, albumId, totalPages, spreadCtx, scheduleWorkspaceRefresh, showToast]
    );

    const placementTargets = useMemo(() => {
        if (!gridSelection || gridSelection.mode === 'cover') return [];
        const left = gridSelection.leftPage;
        if (left == null) return [];
        if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
            const { left: endLeft } = getEndSpreadPageIndices(totalPages);
            return [endLeft];
        }
        if (!isProofGridSpread(left, totalPages, spreadOpts)) return [];
        if (gridEditSet === 'whole' || gridSelection.mode === 'spread') return [];
        if (gridSelection.cellId) {
            return [
                getProofCellPhotoIndex(left, gridSelection.cellId, totalPages, spreadCtx),
            ];
        }
        return [];
    }, [gridSelection, gridEditSet, totalPages, spreadOpts]);

    const effectivePlacementMode = useMemo(() => {
        if (gridEditSet !== 'whole') return 'single';
        const left =
            gridSelection?.leftPage ?? getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
        const isWholeAlbum = isWholeSpreadLayout(album?.grid_layout);
        if (!isWholeAlbum) {
            if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) return 'single';
            if (isInsideCoverSpreadLeft(left, totalPages, spreadOpts)) return 'single';
        } else if (
            !spreadHasWholeSpreadPhoto(albumId, left) &&
            (isInsideCoverSpreadLeft(left, totalPages, spreadOpts) ||
                isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts))
        ) {
            return 'single';
        }
        return 'whole';
    }, [
        gridEditSet,
        gridSelection?.leftPage,
        bookPage,
        totalPages,
        spreadOpts,
        album?.grid_layout,
        albumId,
    ]);

    const bookPlacementMode = useMemo(() => {
        if (isWholeSpreadLayout(album?.grid_layout)) return 'whole';
        return effectivePlacementMode === 'whole' ? 'whole' : 'single';
    }, [album?.grid_layout, effectivePlacementMode]);

    const placeItemOnSpread = useCallback(
        (itemId) => {
            const item = getCollectionItem(albumId, itemId);
            if (!item || (!item.dataUrl && !item.storagePath) || !gridSelection) return false;

            if (albumHasCoverSpreads(album) && gridSelection.mode === 'cover') {
                const right = Math.min(1, totalPages - 1);
                const placed = setSpreadPhotoFromCollectionItem(albumId, 0, itemId, right, {
                    totalPages,
                    spreadOpts,
                });
                if (placed) {
                    if (albumHasBlankCovers(album)) {
                        clearCollectionItemPlacements(albumId, itemId, { keepSpreadLeft: 0 });
                    }
                    markCollectionItemAsCoverWrap(albumId, itemId);
                }
                return placed;
            }

            const left = gridSelection.leftPage;
            const endHalfLeft = isEndHalfSpreadLeftPage(left, totalPages, spreadOpts);

            if (
                endHalfLeft &&
                gridSelection.mode !== 'cover' &&
                !isWholeSpreadLayout(album?.grid_layout)
            ) {
                const { left: endLeft } = getEndSpreadPageIndices(totalPages);
                return setPagePhotoFromCollectionItem(albumId, endLeft, item.id, {
                    clearSpreadForLeft: endLeft,
                });
            }

            const wantsWholeSpread =
                gridEditSet === 'whole' ||
                gridSelection.mode === 'spread' ||
                isManualWholeSpreadPlacement(left, totalPages, album, spreadOpts);

            if (wantsWholeSpread) {
                const isWholeAlbum = isWholeSpreadLayout(album?.grid_layout);
                if (!isWholeAlbum && endHalfLeft) {
                    return setPagePhotoFromCollectionItem(albumId, left, item.id, {
                        clearSpreadForLeft: left,
                    });
                }
                if (!isWholeAlbum && isInsideCoverSpreadLeft(left, totalPages)) {
                    return setPagePhotoFromCollectionItem(albumId, 2, item.id, {
                        clearSpreadForLeft: left,
                    });
                }
                if (isWholeAlbum && albumHasBlankCovers(album)) {
                    if (isInsideCoverSpreadLeft(left, totalPages, spreadOpts)) {
                        return setPagePhotoFromCollectionItem(albumId, 3, item.id, {
                            clearSpreadForLeft: left,
                        });
                    }
                    if (isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                        return setPagePhotoFromCollectionItem(albumId, left, item.id, {
                            clearSpreadForLeft: left,
                        });
                    }
                }
                const right = getSpreadRightPageIndex(left, totalPages);
                return setSpreadPhotoFromCollectionItem(albumId, left, item.id, right, {
                    totalPages,
                    spreadOpts: { ...spreadOpts, gridLayout: album?.grid_layout },
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
        [albumId, album, gridSelection, gridEditSet, placementTargets, totalPages, spreadOpts]
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
                await ensurePageCountForCollection();
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
                scheduleWorkspaceRefresh();
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
        [placeItemOnSpread, scheduleWorkspaceRefresh, showToast, gridSelection?.mode]
    );

    const handleReorderCollectionItem = useCallback(
        (fromIndex, toIndex) => {
            if (!reorderCollectionItems(albumId, fromIndex, toIndex)) return;
            void syncCollectionOrderToSpreads().then((placed) => {
                if (placed > 0) scheduleWorkspaceRefresh();
            });
        },
        [albumId, syncCollectionOrderToSpreads, scheduleWorkspaceRefresh]
    );

    const handleApplyCollectionOrder = useCallback(() => {
        void syncCollectionOrderToSpreads().then((placed) => {
            if (placed > 0) {
                scheduleWorkspaceRefresh();
                showToast(
                    `Placed ${placed} photo${placed === 1 ? '' : 's'} on spreads in collection order (1, 2, 3…).`,
                    { variant: 'success', duration: 4500 }
                );
            } else {
                showToast('No photos in the collection to place.', { variant: 'info', duration: 3500 });
            }
        });
    }, [syncCollectionOrderToSpreads, scheduleWorkspaceRefresh, showToast]);

    const canAddPages = totalPages + pagesPerSpread <= maxPages;
    const canRemovePages =
        totalPages - pagesPerSpread >= minPages &&
        canRemoveSpreadBeforeLastTwo(totalPages, spreadOpts);

    const slotMenuSpreadIndex = useMemo(() => {
        if (!slotMenu?.slot) return -1;
        return pageToSpreadIndex(slotMenu.slot.pageNum, spreadCtx);
    }, [slotMenu, totalPages]);

    const canDeleteSpreadFromMenu =
        Boolean(slotMenu) &&
        canRemovePages &&
        slotMenuSpreadIndex > 0 &&
        !isEndHalfSpreadIndex(slotMenuSpreadIndex, totalPages, spreadOpts);

    const slotMenuSwapHint = useMemo(() => {
        if (!slotMenu?.slot) return 'Any left or right photo';
        if (spreadOpts.hasCovers && slotMenu.slot.pageNum === 0) return 'Cover only';
        const gridLayout = album?.grid_layout || 'two-page';
        if (isWholeGridSwapSlot(albumId, slotMenu.slot, totalPages, gridLayout, album)) {
            return 'Other whole spreads only';
        }
        return 'Any left or right photo';
    }, [slotMenu, albumId, album?.grid_layout, totalPages]);

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

    const handleDeleteSpreadFromMenu = useCallback(() => {
        if (!canRemovePages || !onChangePageCount) return;
        const ok = window.confirm(
            'Delete this spread? Two pages will be removed from the album.'
        );
        if (!ok) return;
        closeSlotMenu();
        requestAnimationFrame(async () => {
            await handleRemovePages();
            scheduleWorkspaceRefresh();
        });
    }, [
        closeSlotMenu,
        canRemovePages,
        onChangePageCount,
        handleRemovePages,
        scheduleWorkspaceRefresh,
    ]);

    const handleClearAllPhotos = useCallback(() => {
        clearAllAlbumPagePhotos(albumId, { totalPages });
        clearAlbumTransforms(albumId);
        bumpWorkspace();
        showToast('Removed all images from the album.', { duration: 3500 });
    }, [albumId, totalPages, bumpWorkspace, showToast]);

    const spreadEdit = activePanel === 'edit';
    const coverEditMode = activePanel === 'cover' && albumHasCoverSpreads(album);

    const isCoverEditorSlotMenu = useMemo(() => {
        if (!coverEditMode || !slotMenu?.slot) return false;
        const slot = slotMenu.slot;
        return slot.pageNum === 0 || slot.label === 'Cover' || slot.label === 'Book wrap';
    }, [coverEditMode, slotMenu]);

    const coverTextMessage = useMemo(() => {
        void coverTextRevision;
        return getAlbumCoverText(albumId);
    }, [albumId, coverTextRevision]);

    const handlePanelChange = useCallback(
        (panelId) => {
            if (panelId === 'cover' && !albumHasCoverSpreads(album)) {
                setActivePanel('collections');
                return;
            }
            setActivePanel(panelId);
            if (panelId === 'cover' && albumHasCoverSpreads(album)) {
                setGridEditSet('single');
                setGridSelection(buildCoverSelection());
                handleBookPageChange(0);
                let changed = false;
                if (albumUsesBookWrap(album)) {
                    if (migrateFrontCoverToFullSpread(albumId)) changed = true;
                    if (migrateBackCoverUsesBookWrap(albumId, totalPages)) changed = true;
                    const firstItem = getAlbumCollection(albumId)[0];
                    if (firstItem?.id && !getSpreadPhotoOverride(albumId, 0)) {
                        const right = Math.min(1, totalPages - 1);
                        if (
                            setSpreadPhotoFromCollectionItem(albumId, 0, firstItem.id, right, {
                                totalPages,
                                spreadOpts,
                            })
                        ) {
                            changed = true;
                        }
                    }
                }
                if (changed) scheduleWorkspaceRefresh();
            }
        },
        [
            album,
            handleBookPageChange,
            albumId,
            totalPages,
            scheduleWorkspaceRefresh,
        ]
    );
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
                <main className="ae-canvas">
                    <div className="ae-canvas-chrome">
                        <span className="ae-canvas-label">
                            {coverEditMode ? 'Cover editor' : 'Spread editor'}
                        </span>
                        <span className="ae-canvas-hint">
                            {coverEditMode
                                ? albumHasBlankCovers(album)
                                    ? 'Back · spine · front cover · click to choose an optional cover photo'
                                    : 'Back · spine · front from book wrap · click a cover to change photo'
                                : spreadEdit
                                  ? 'Drag photo to move · drag each edge to zoom · hover a photo to mark a swap'
                                  : 'Click a photo or slot for options · use Collections to upload'}
                        </span>
                    </div>
                    <div
                        className={`ae-canvas-stage${
                            spreadEdit ? ' ae-canvas-stage--edit' : ''
                        }${coverEditMode ? ' ae-canvas-stage--cover' : ''}`}
                    >
                        {coverEditMode ? (
                            <AlbumCoverEditView
                                album={albumForBook}
                                albumId={albumId}
                                editable={!spreadEdit}
                                showSamples={false}
                                onSlotActivate={handleSlotActivate}
                                transformRevision={transformRevision}
                                photoRevision={layoutRevision}
                            />
                        ) : (
                            <AlbumBook
                                key={albumId}
                                album={albumForBook}
                                totalPages={totalPages}
                                initialPage={bookPage}
                                onPageChange={handleBookPageChange}
                                editable={!spreadEdit}
                                spreadEdit={spreadEdit}
                                placementMode={bookPlacementMode}
                                showSamples={false}
                                gridSelection={gridSelection}
                                onSelectGridCell={handleSelectGridCell}
                                onSelectGridSpread={handleSelectGridSpread}
                                onSlotActivate={handleSlotActivate}
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
                                photoRevision={layoutRevision}
                                showGridComments={showGridComments}
                                spreadCommentsBySpread={spreadCommentsBySpread}
                                swapMarkMode
                                pinMarkMode
                                proofToolsHover={false}
                            />
                        )}
                    </div>
                </main>

                <AlbumEditorSidebar
                    activePanel={activePanel}
                    onPanelChange={handlePanelChange}
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
                            getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
                        if (isProofGridSpread(left, totalPages, spreadOpts)) handleSelectGridCell(left, cellId);
                    }}
                    canSelectGrid={Boolean(gridSelection) || coverEditMode}
                    spreadCount={spreadCount}
                    innerPageCount={getInnerPageCount(totalPages, spreadOpts)}
                    canAddPages={canAddPages}
                    canRemovePages={canRemovePages}
                    pagesPerSpread={pagesPerSpread}
                    pageCountBusy={pageCountBusy}
                    onAddPages={handleAddPages}
                    onRemovePages={handleRemovePages}
                    swapMarks={swapMarks}
                    photoPins={photoPins}
                    albumId={albumId}
                    onNavigateToPin={handleNavigateToPin}
                    onNavigateToSwapSlotKey={handleNavigateToSwapSlotKey}
                    onReorderCollectionItem={handleReorderCollectionItem}
                    onApplyCollectionOrder={handleApplyCollectionOrder}
                    proofSeenTick={proofSeenTick}
                />
            </div>

            <AppToast toast={toast} onDismiss={clearToast} />

            <AlbumPreviewLinkModal
                album={album}
                isOpen={shareLinkOpen}
                onClose={() => setShareLinkOpen(false)}
            />
            <CollectionPickerModal
                open={pickerOpen}
                title={pickerTitle(gridEditSet, gridSelection, album)}
                subtitle={pickerSubtitle}
                items={collectionItems}
                uploading={uploading}
                onClose={() => setPickerOpen(false)}
                onSelectItem={handlePlaceCollectionItem}
                onUploadFiles={handleUploadToCollection}
            />

            <input
                ref={replaceFileRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                className="ae-file-input"
                aria-hidden
                tabIndex={-1}
                onChange={handleReplaceFiles}
            />

            <AlbumSpreadSlotMenu
                open={Boolean(slotMenu)}
                anchorRect={slotMenu?.anchorRect}
                slotLabel={slotMenu?.label}
                hasPhoto={Boolean(slotMenu?.slot?.hasPhoto)}
                canSwap={!isCoverEditorSlotMenu && Boolean(slotMenu?.slot?.hasPhoto)}
                swapHint={slotMenuSwapHint}
                canRemoveSpread={!isCoverEditorSlotMenu && Boolean(slotMenu?.slot?.hasPhoto)}
                canDeleteSpread={!isCoverEditorSlotMenu && canDeleteSpreadFromMenu}
                onReplace={handleReplaceFromMenu}
                onChooseFromCollection={handleChooseFromCollectionMenu}
                onCoverText={isCoverEditorSlotMenu ? handleCoverTextFromMenu : undefined}
                hasCoverText={Boolean(coverTextMessage)}
                onRemovePhotos={handleRemoveSpreadPhotos}
                onDeleteSpread={handleDeleteSpreadFromMenu}
                onSwap={handleOpenSwapModal}
                onClose={closeSlotMenu}
            />

            <AlbumCoverTextModal
                open={coverTextModalOpen}
                initialMessage={coverTextMessage}
                onClose={() => setCoverTextModalOpen(false)}
                onSave={handleSaveCoverText}
            />

            <AlbumSwapExecuteModal
                open={Boolean(swapExecuteOrigin)}
                album={album}
                albumId={albumId}
                totalPages={totalPages}
                originSlot={swapExecuteOrigin}
                onSwap={handleExecuteSwap}
                onClose={() => setSwapExecuteOrigin(null)}
            />
        </div>
    );
}
