import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumCoverEditView from '../../components/smart-albums/AlbumCoverEditView';
import AlbumCoverTextModal from '../../components/smart-albums/AlbumCoverTextModal';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import AlbumEditorNotifications from '../../components/smart-albums/AlbumEditorNotifications';
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
    deleteCollectionItemAsset,
    replaceCollectionItemFile,
    getAlbumCollection,
    getAlbumCollectionRevision,
    ALBUM_COLLECTION_CHANGED_EVENT,
    getAlbumLayoutPhotoCount,
    getCollectionItem,
    isCoverWrapCollectionItem,
    loadAlbumAssetsFromCloud,
    markCollectionItemAsCoverWrap,
    reorderCollectionItems,
} from '../../components/smart-albums/albumCollection';
import { insertAlbumStoragePages, removeAlbumStoragePages } from '../../components/smart-albums/albumPageStorage';
import {
    applyCollectionOrderToPages,
    captureEndCoverPlacement,
    capturePreBackPlacement,
    clearAllAlbumPagePhotos,
    clearCollectionItemPlacements,
    getAlbumPhotoRevision,
    getSlotPlacementCollectionItemId,
    getSpreadPhotoOverride,
    migrateBackCoverUsesBookWrap,
    migrateEndHalfSpreadToLeftPage,
    migrateFrontCoverToFullSpread,
    migrateInsideCoverSpreadToPageTwo,
    migratePreBackHalfSpreadToLeftPage,
    migrateWholeSpreadPagePhotosToSpreadKeys,
    migrateWholeSpreadPhotoOffRightPage,
    pageHasPlacedPhoto,
    placeCollectionItemOnPages,
    reorderOverviewSpreads,
    resolveBookWrapSpreadSrc,
    resolveSlotCollectionItemId,
    restoreEndCoverPlacement,
    restorePreBackPlacement,
    setPagePhotoFromCollectionItem,
    setPagePhotoFromDataUrl,
    setSpreadPhoto,
    setSpreadPhotoFromCollectionItem,
    spreadHasWholeSpreadPhoto,
    syncCollectionOrderToPlacements,
    syncCoverWrapRoleFromSpread,
} from '../../components/smart-albums/albumPagePhotos';
import { shiftAlbumRemotePreviewPages } from '../../components/smart-albums/albumPreviewData';
import { shiftAlbumPhotoPins } from '../../components/smart-albums/albumPhotoPins';
import { isImageFile, isPdfFile, probeImageFile } from '../../lib/pdfToImages';
import { pickImageFiles } from '../../lib/pickImageFiles';
import { getSlotUploadPixelTarget } from '../../components/smart-albums/albumGridSize';
import { useAlbumWrapAspect, withAlbumWrapAspect } from '../../components/smart-albums/useAlbumWrapAspect';
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
    canDeleteSpreadAtSpreadIndex,
    resolveDeleteSpreadTarget,
    spreadIndexFromMenuLabel,
} from '../../components/smart-albums/albumDeleteSpread';
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
    canInsertSpreadAfterSpread,
    canInsertSpreadBeforeSpread,
    getPageInsertIndex,
    getPageRemoveIndex,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverSpreadLeft,
    isManualWholeSpreadPlacement,
    isPreBackHalfSpreadLeftPage,
    isWholeSpreadLayout,
    pageToSpreadIndex,
    spreadIndexToPage,
} from '../../components/smart-albums/albumSpreadUtils';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import {
    captureSlotImageBeforeReplace,
    captureSlotImageBeforeReplaceAsync,
    trackSpreadImageReplacement,
} from '../../components/smart-albums/albumImageReplacements';
import AlbumEditorSettingsPanel from '../../components/smart-albums/AlbumEditorSettingsPanel';
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
    COMMENTS_SEEN_CHANGED_EVENT,
    groupRootCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { useAuth } from '../../hooks/useAuth';
import { getUserDisplayLabel } from '../../lib/userInitials';
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

function slotFromCurrentSpread(
    gridSelection,
    gridEditSet,
    bookPage,
    totalPages,
    spreadOpts,
    album,
    albumId
) {
    if (!gridSelection) return null;

    if (gridSelection.mode === 'cover') {
        return {
            pageNum: 0,
            cellId: 0,
            spreadLeft: 0,
            label: albumHasBlankCovers(album) ? 'Cover' : 'Cover',
        };
    }

    const left =
        gridSelection.leftPage ??
        getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
    const rightPage = Math.min(left + 1, Math.max(0, totalPages - 1));

    if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        return {
            pageNum: endLeft,
            cellId: 1,
            spreadLeft: endLeft,
            whole: false,
            label: 'End cover',
        };
    }

    if (albumHasBlankCovers(album)) {
        if (isInsideCoverSpreadLeft(left, totalPages, spreadOpts)) {
            return {
                pageNum: 3,
                cellId: 2,
                spreadLeft: left,
                whole: false,
                label: 'Inside cover',
            };
        }
        if (isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
            return {
                pageNum: left,
                cellId: 1,
                spreadLeft: left,
                whole: false,
                label: 'Pre-back spread',
            };
        }
    }

    const manualWhole = isManualWholeSpreadPlacement(left, totalPages, album, spreadOpts);
    const wantsWholeSpread =
        manualWhole &&
        (gridEditSet === 'whole' ||
            gridSelection.mode === 'spread' ||
            isWholeSpreadLayout(album?.grid_layout));

    if (wantsWholeSpread) {
        return {
            pageNum: left,
            cellId: 1,
            spreadLeft: left,
            whole: true,
            label: 'Whole spread',
        };
    }

    if (albumId) {
        if (spreadHasWholeSpreadPhoto(albumId, left)) {
            return {
                pageNum: left,
                cellId: 1,
                spreadLeft: left,
                whole: true,
                label: 'Whole spread',
            };
        }
        const rightHasPhoto = pageHasPlacedPhoto(albumId, rightPage);
        const leftHasPhoto = pageHasPlacedPhoto(albumId, left);
        if (rightHasPhoto && !leftHasPhoto) {
            return {
                pageNum: rightPage,
                cellId: 2,
                spreadLeft: left,
                whole: false,
            };
        }
    }

    const cellId = gridSelection.cellId || 1;
    return {
        pageNum: cellId === 2 ? rightPage : left,
        cellId,
        spreadLeft: left,
        whole: false,
    };
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
    const photographerDisplayName = getUserDisplayLabel(user);
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
    const [workspaceTick, setWorkspaceTick] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pageCountBusy, setPageCountBusy] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareLinkOpen, setShareLinkOpen] = useState(false);
    const [publishBusy, setPublishBusy] = useState(false);
    const [swapMarks, setSwapMarks] = useState(() => getSwapMarks(albumId));
    const [photoPins, setPhotoPins] = useState(() => getPhotoPins(albumId));
    const [proofSeenTick, setProofSeenTick] = useState(0);
    const shareRef = useRef(null);
    const collectionSyncRef = useRef(false);
    /** Skip post-delete photo migrations (React Strict Mode runs effects twice). */
    const skipPhotoMigrationsRef = useRef(0);
    const spreadDeleteBusyRef = useRef(false);
    const blockPhotoMigrationsRef = useRef(false);
    const slotMenuRef = useRef(null);
    const bumpWorkspaceRef = useRef(null);
    const prevLayoutPhotoCountRef = useRef(null);
    const albumRef = useRef(album);
    albumRef.current = album;
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

    const bumpWorkspace = useCallback(() => {
        onPhotosUploaded?.();
        setTransformRevision(getTransformRevision(albumId));
        setCollectionRevision(getAlbumCollectionRevision(albumId));
        setPhotoLayoutRev(getAlbumPhotoRevision(albumId) || 0);
        setWorkspaceTick((t) => t + 1);
    }, [albumId, onPhotosUploaded]);
    bumpWorkspaceRef.current = bumpWorkspace;

    /** Defer refresh so portaled menus unmount before the flipbook updates (avoids React DOM conflicts). */
    const scheduleWorkspaceRefresh = useCallback(() => {
        requestAnimationFrame(() => {
            bumpWorkspace();
        });
    }, [bumpWorkspace]);

    const layoutRevision = useMemo(
        () =>
            `${workspaceTick}:${photoRevision}:${photoLayoutRev}:${transformRevision}:${collectionRevision}`,
        [workspaceTick, photoRevision, photoLayoutRev, transformRevision, collectionRevision]
    );

    const wrapAspect = useAlbumWrapAspect(album, albumId, layoutRevision);

    const albumForBook = useMemo(
        () => withAlbumWrapAspect(album, albumId, wrapAspect),
        [album, albumId, wrapAspect]
    );

    useEffect(() => {
        setCollectionRevision(getAlbumCollectionRevision(albumId));
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onAlbumDataChanged = (e) => {
            if (e.detail?.albumId !== albumId) return;
            scheduleWorkspaceRefresh();
        };
        window.addEventListener(ALBUM_COLLECTION_CHANGED_EVENT, onAlbumDataChanged);
        return () => window.removeEventListener(ALBUM_COLLECTION_CHANGED_EVENT, onAlbumDataChanged);
    }, [albumId, scheduleWorkspaceRefresh]);

    useEffect(() => {
        if (!albumId) return;
        if (syncCollectionOrderToPlacements(albumId)) {
            setCollectionRevision(getAlbumCollectionRevision(albumId));
        }
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
        const albumNow = albumRef.current;
        if (!albumId || !albumNow || !user?.id) return albumNow;
        syncCoverWrapRoleFromSpread(albumId);
        const photoCount = getAlbumLayoutPhotoCount(albumId, albumNow);
        const prevPhotoCount = prevLayoutPhotoCountRef.current;
        const collectionShrunk = prevPhotoCount != null && photoCount < prevPhotoCount;
        const collectionGrew = prevPhotoCount != null && photoCount > prevPhotoCount;
        prevLayoutPhotoCountRef.current = photoCount;
        if (!photoCount && !getSpreadPhotoOverride(albumId, 0)) return albumNow;

        const blankCovers = albumHasBlankCovers(albumNow);
        const requiredPages = computePageCountFromPhotoCount(photoCount, {
            includeCovers: albumNow?.has_covers === true,
            blankCovers,
            gridLayout: albumNow.grid_layout || 'two-page',
        });
        const targetPages = Math.min(requiredPages, maxPages);
        const currentPages = albumNow.page_count || 0;
        if (targetPages === currentPages) return albumNow;

        const spreadOptsNow = getAlbumSpreadOptions(albumNow, {
            collectionCount: photoCount,
        });

        if (targetPages > currentPages) {
            if (!collectionGrew) return albumNow;
            const delta = targetPages - currentPages;
            const insertAt = getPageInsertIndex(currentPages, spreadOptsNow);
            insertAlbumStoragePages(albumId, insertAt, delta);
            shiftAlbumRemotePreviewPages(albumId, insertAt, delta);
            shiftAlbumPhotoPins(albumId, insertAt, delta);
        } else if (targetPages < currentPages && blankCovers && collectionShrunk) {
            const delta = currentPages - targetPages;
            const removeAt = getPageRemoveIndex(currentPages, delta, spreadOptsNow);
            const capturedEndCover = captureEndCoverPlacement(albumId, currentPages);
            const capturedPreBack = capturePreBackPlacement(albumId, currentPages, spreadOptsNow);
            removeAlbumStoragePages(albumId, removeAt, delta);
            shiftAlbumRemotePreviewPages(albumId, removeAt, -delta);
            shiftAlbumPhotoPins(albumId, removeAt, -delta);
            restorePreBackPlacement(albumId, targetPages, capturedPreBack, spreadOptsNow);
            restoreEndCoverPlacement(albumId, targetPages, capturedEndCover);
            migratePreBackHalfSpreadToLeftPage(albumId, targetPages, albumNow);
            migrateEndHalfSpreadToLeftPage(albumId, targetPages, albumNow);
        } else {
            return albumNow;
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
        if (requiredPages > (album.page_count || 0)) {
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
        if (blockPhotoMigrationsRef.current) {
            return undefined;
        }
        if (skipPhotoMigrationsRef.current > 0) {
            skipPhotoMigrationsRef.current -= 1;
            return undefined;
        }
        let changed = false;
        const wholeSpreadAlbum = isWholeSpreadLayout(album?.grid_layout);
        if (migrateEndHalfSpreadToLeftPage(albumId, totalPages, album)) changed = true;
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
            bumpWorkspaceRef.current?.();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [albumId, album?.grid_layout, totalPages, spreadOpts.hasCovers]);

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
        window.addEventListener(COMMENTS_SEEN_CHANGED_EVENT, bumpSeen);
        return () => {
            window.removeEventListener(PHOTO_PINS_SEEN_CHANGED_EVENT, bumpSeen);
            window.removeEventListener(SWAP_MARKS_SEEN_CHANGED_EVENT, bumpSeen);
            window.removeEventListener(COMMENTS_SEEN_CHANGED_EVENT, bumpSeen);
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
        const validPanels = ['collections', 'cover', 'pin', 'comments', 'grid', 'edit', 'pages'];
        if (panel === 'swap') {
            setActivePanel('pin');
        } else if (panel && validPanels.includes(panel)) {
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
            slotMenuRef.current = null;
            setSlotMenu(null);
            setBookPage(idx);
            syncSelectionToPage(idx);
            onPageChange?.(idx);
        },
        [onPageChange, syncSelectionToPage]
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
        (slot, itemId, replacementBefore = null) => {
            if (!slot || !itemId) return false;
            const before =
                replacementBefore ??
                captureSlotImageBeforeReplace(albumId, slot, album, totalPages);

            const trackReplacement = (placed) => {
                if (placed && before) {
                    trackSpreadImageReplacement(albumId, slot, itemId, {
                        album,
                        totalPages,
                        previousItemId: before.previousItemId,
                        previousUrl: before.previousUrl,
                        previousStoragePath: before.previousStoragePath,
                    });
                }
                if (placed) {
                    syncCollectionOrderToPlacements(albumId);
                }
                return placed;
            };

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
                return trackReplacement(placed);
            }
            if (slot.pageNum === 0) {
                return trackReplacement(setPagePhotoFromCollectionItem(albumId, 0, itemId));
            }
            const left = slot.spreadLeft ?? getSpreadLeftForBookPage(slot.pageNum, totalPages, spreadOpts);
            const useWholeSpread =
                Boolean(slot.whole) &&
                (isManualWholeSpreadPlacement(left, totalPages, album, spreadOpts) ||
                    spreadHasWholeSpreadPhoto(albumId, left));
            if (useWholeSpread) {
                const right = getSpreadRightPageIndex(left, totalPages);
                return trackReplacement(
                    setSpreadPhotoFromCollectionItem(albumId, left, itemId, right, {
                        totalPages,
                        spreadOpts: { ...spreadOpts, gridLayout: album?.grid_layout },
                    })
                );
            }
            if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                return trackReplacement(
                    setPagePhotoFromCollectionItem(albumId, left, itemId, {
                        clearSpreadForLeft: left,
                    })
                );
            }
            const photoIndex = getProofCellPhotoIndex(
                slot.pageNum,
                slot.cellId || 1,
                totalPages,
                spreadCtx
            );
            return trackReplacement(
                setPagePhotoFromCollectionItem(albumId, photoIndex, itemId, {
                    clearSpreadForLeft: left,
                })
            );
        },
        [album, albumId, totalPages, spreadCtx, spreadOpts]
    );

    const handleSlotActivate = useCallback(
        (slot, anchorRect) => {
            if (activePanel === 'edit') return;
            const target = resolveDeleteSpreadTarget(slot, slot.label, totalPages, spreadOpts);
            if (!target) return;
            const { spreadLeft, spreadIndex } = target;
            const slotWithSpread = { ...slot, spreadLeft, spreadIndex };
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
                isManualWholeSpreadPlacement(spreadLeft, totalPages, album, spreadOpts)
            ) {
                setGridEditSet('whole');
                setGridSelection(buildSpreadSelection(spreadLeft));
            } else {
                setGridEditSet('single');
                setGridSelection(buildCellSelection(spreadLeft, slot.cellId || 1));
            }
            const menuState = {
                slot: slotWithSpread,
                anchorRect,
                label: slot.label,
                spreadLeft,
                spreadIndex,
                removeAtLeft: target.removeAtLeft,
            };
            slotMenuRef.current = menuState;
            setSlotMenu(menuState);
        },
        [activePanel, album, totalPages, spreadOpts]
    );

    const closeSlotMenu = useCallback(() => {
        slotMenuRef.current = null;
        setSlotMenu(null);
    }, []);

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

    const resolveSpreadReplacementItem = useCallback(
        async (files, slot, { coverWrap = false } = {}) => {
            const photographerId = user?.id ?? album?.photographer_id;
            const previousItemId = resolveSlotCollectionItemId(albumId, slot, {
                totalPages,
                spreadOpts,
                album,
            });
            const file = files[0];
            const compressionTarget = getSlotUploadPixelTarget(album, slot, { coverWrap });

            if (previousItemId && file && !isPdfFile(file) && (isImageFile(file) || (await probeImageFile(file)))) {
                const replaced = await replaceCollectionItemFile(albumId, previousItemId, file, {
                    photographerId,
                    compressionTarget,
                    retainPreviousStorage: true,
                });
                if (replaced) return replaced;
            }

            const added = await addFilesToAlbumCollection(albumId, files.slice(0, 1), {
                photographerId,
                skipDuplicateCheck: true,
                coverWrap,
                album,
                compressionTarget,
            });
            const replacementItem = added[0] || added.duplicateItems?.[0];
            if (previousItemId && replacementItem?.id && previousItemId !== replacementItem.id) {
                clearCollectionItemPlacements(albumId, previousItemId);
                await deleteCollectionItemAsset(albumId, previousItemId, { retainStorage: true });
            }
            return replacementItem;
        },
        [album, album?.photographer_id, albumId, spreadOpts, totalPages, user?.id]
    );

    const handleReplaceFilesForSlot = useCallback(
        async (files, slot) => {
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
                const before = await captureSlotImageBeforeReplaceAsync(
                    albumId,
                    slot,
                    album,
                    totalPages
                );
                const replacementItem = await resolveSpreadReplacementItem(files, slot, {
                    coverWrap: isCoverSlot,
                });
                if (!replacementItem?.id) {
                    showToast('No supported images in that file.', { variant: 'error', duration: 4000 });
                    return;
                }
                if (placeCollectionItemOnSlot(slot, replacementItem.id, before)) {
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
            placeCollectionItemOnSlot,
            resolveSpreadReplacementItem,
            scheduleWorkspaceRefresh,
            showToast,
            totalPages,
        ]
    );

    const handleReplaceFromMenu = useCallback(() => {
        const slot = slotMenu?.slot ?? null;
        closeSlotMenu();
        if (!slot) return;
        pickImageFiles({
            onPick: (files) => {
                if (files.length) void handleReplaceFilesForSlot(files, slot);
            },
        });
    }, [slotMenu, closeSlotMenu, handleReplaceFilesForSlot]);

    const handleRemoveSpreadPhotos = useCallback(() => {
        const slot = slotMenu?.slot;
        if (!slot) return;
        const left = slot.spreadLeft ?? getSpreadLeftForBookPage(slot.pageNum, totalPages, spreadOpts);
        const scope = slot.whole ? 'whole' : slot.cellId === 2 ? 'right' : 'left';
        closeSlotMenu();
        requestAnimationFrame(async () => {
            if (
                clearSpreadPhotos(albumId, left, totalPages, scope, {
                    gridLayout: album?.grid_layout,
                    spreadOpts,
                })
            ) {
                scheduleWorkspaceRefresh();
                if (user?.id) {
                    try {
                        await smartAlbumsService.syncAlbumPreviewData(user.id, albumId);
                    } catch (err) {
                        console.warn('Could not sync album preview after remove:', err);
                    }
                }
                showToast('Photos removed from spread.', { duration: 3500 });
            }
        });
    }, [
        slotMenu,
        closeSlotMenu,
        albumId,
        album?.grid_layout,
        totalPages,
        spreadOpts,
        scheduleWorkspaceRefresh,
        showToast,
        user?.id,
    ]);

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

            const slot = slotFromCurrentSpread(
                gridSelection,
                gridEditSet,
                bookPage,
                totalPages,
                spreadOpts,
                album,
                albumId
            );
            const before = slot
                ? captureSlotImageBeforeReplace(albumId, slot, album, totalPages)
                : null;
            const finish = (placed) => {
                if (placed && slot && before) {
                    trackSpreadImageReplacement(albumId, slot, itemId, {
                        album,
                        totalPages,
                        previousItemId: before.previousItemId,
                        previousUrl: before.previousUrl,
                        previousStoragePath: before.previousStoragePath,
                    });
                }
                if (placed) {
                    syncCollectionOrderToPlacements(albumId);
                }
                return placed;
            };

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
                return finish(placed);
            }

            const left = gridSelection.leftPage;
            const endHalfLeft = isEndHalfSpreadLeftPage(left, totalPages, spreadOpts);

            if (
                endHalfLeft &&
                gridSelection.mode !== 'cover' &&
                !isWholeSpreadLayout(album?.grid_layout)
            ) {
                const { left: endLeft } = getEndSpreadPageIndices(totalPages);
                return finish(
                    setPagePhotoFromCollectionItem(albumId, endLeft, item.id, {
                        clearSpreadForLeft: endLeft,
                    })
                );
            }

            const wantsWholeSpread =
                gridEditSet === 'whole' ||
                gridSelection.mode === 'spread' ||
                isManualWholeSpreadPlacement(left, totalPages, album, spreadOpts) ||
                spreadHasWholeSpreadPhoto(albumId, left);

            if (wantsWholeSpread) {
                const isWholeAlbum = isWholeSpreadLayout(album?.grid_layout);
                if (!isWholeAlbum && endHalfLeft) {
                    return finish(
                        setPagePhotoFromCollectionItem(albumId, left, item.id, {
                            clearSpreadForLeft: left,
                        })
                    );
                }
                if (!isWholeAlbum && isInsideCoverSpreadLeft(left, totalPages)) {
                    return finish(
                        setPagePhotoFromCollectionItem(albumId, 2, item.id, {
                            clearSpreadForLeft: left,
                        })
                    );
                }
                if (isWholeAlbum && albumHasBlankCovers(album)) {
                    if (isInsideCoverSpreadLeft(left, totalPages, spreadOpts)) {
                        return finish(
                            setPagePhotoFromCollectionItem(albumId, 3, item.id, {
                                clearSpreadForLeft: left,
                            })
                        );
                    }
                    if (isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                        return finish(
                            setPagePhotoFromCollectionItem(albumId, left, item.id, {
                                clearSpreadForLeft: left,
                            })
                        );
                    }
                }
                return placeCollectionItemOnSlot(slot, itemId);
            }

            const targets = placementTargets;
            if (!targets.length) return false;
            return finish(
                placeCollectionItemOnPages(albumId, item.id, targets, {
                    spreadLeftPage: gridSelection.leftPage,
                }) > 0
            );
        },
        [
            albumId,
            album,
            bookPage,
            gridSelection,
            gridEditSet,
            placementTargets,
            placeCollectionItemOnSlot,
            totalPages,
            spreadOpts,
        ]
    );

    const handleUploadToCollection = async (files) => {
        setUploading(true);
        if (files.some((f) => isPdfFile(f))) {
            showToast('Converting PDF pages to images…', { variant: 'info', duration: 0 });
        }
        try {
            const added = await addFilesToAlbumCollection(albumId, files, {
                photographerId: album?.photographer_id,
                album,
            });
            const skippedDuplicates = added.skippedDuplicates || 0;
            if (added.length > 0) {
                setCollectionRevision(getAlbumCollectionRevision(albumId));
                await ensurePageCountForCollection();
                scheduleWorkspaceRefresh();
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

    const handleUploadForCurrentSpread = useCallback(
        async (files) => {
            const slot = slotFromCurrentSpread(
                gridSelection,
                gridEditSet,
                bookPage,
                totalPages,
                spreadOpts,
                album,
                albumId
            );
            if (!slot) {
                showToast('Flip to a spread first, then upload a photo.', {
                    variant: 'info',
                    duration: 4500,
                });
                return;
            }
            if (!files?.length) return;

            setUploading(true);
            if (files.some((f) => isPdfFile(f))) {
                showToast('Converting PDF pages to images…', { variant: 'info', duration: 0 });
            } else {
                showToast('Uploading photo…', { variant: 'info', duration: 0 });
            }

            try {
                const isCoverSlot =
                    albumHasCoverSpreads(album) && gridSelection?.mode === 'cover';
                const before = await captureSlotImageBeforeReplaceAsync(
                    albumId,
                    slot,
                    album,
                    totalPages
                );
                const replacementItem = await resolveSpreadReplacementItem(files, slot, {
                    coverWrap: isCoverSlot,
                });
                if (!replacementItem?.id) {
                    showToast('No supported images in that file.', {
                        variant: 'error',
                        duration: 4000,
                    });
                    return;
                }
                if (placeCollectionItemOnSlot(slot, replacementItem.id, before)) {
                    setCollectionRevision(getAlbumCollectionRevision(albumId));
                    scheduleWorkspaceRefresh();
                    showToast(
                        isCoverSlot
                            ? 'Photo updated on cover.'
                            : 'Photo updated on current spread.',
                        {
                            variant: 'success',
                            duration: 3500,
                        }
                    );
                } else {
                    showToast(
                        isCoverSlot
                            ? 'Could not place photo on this cover.'
                            : 'Could not place photo on this spread.',
                        {
                            variant: 'error',
                            duration: 4000,
                        }
                    );
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
            bookPage,
            gridEditSet,
            gridSelection,
            placeCollectionItemOnSlot,
            resolveSpreadReplacementItem,
            scheduleWorkspaceRefresh,
            showToast,
            spreadOpts,
            totalPages,
        ]
    );

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
            if (!reorderCollectionItems(albumId, fromIndex, toIndex, { album })) return;
            void syncCollectionOrderToSpreads().then((placed) => {
                if (placed > 0) scheduleWorkspaceRefresh();
            });
        },
        [albumId, album, syncCollectionOrderToSpreads, scheduleWorkspaceRefresh]
    );

    const handleReorderOverviewSpread = useCallback(
        (fromSpreadIndex, toSpreadIndex) => {
            if (
                !reorderOverviewSpreads(albumId, fromSpreadIndex, toSpreadIndex, {
                    totalPages,
                    spreadOpts,
                })
            ) {
                return;
            }
            setTransformRevision(getTransformRevision(albumId));
            setSwapMarks(getSwapMarks(albumId));
            setPhotoPins(getPhotoPins(albumId));
            syncCollectionOrderToPlacements(albumId);
            scheduleWorkspaceRefresh();
            showToast('Spread order updated.', { variant: 'success', duration: 3000 });
        },
        [albumId, totalPages, spreadOpts, scheduleWorkspaceRefresh, showToast]
    );

    const canAddPages = totalPages + pagesPerSpread <= maxPages;
    const canRemovePages =
        totalPages - pagesPerSpread >= minPages &&
        canRemoveSpreadBeforeLastTwo(totalPages, spreadOpts);

    const deleteAlbumSpreadAt = useCallback(
        async (spreadIndex, { removeAt } = {}) => {
            const idx = Number(spreadIndex);
            const removeAtLeft = Number(removeAt);
            if (
                spreadDeleteBusyRef.current ||
                !Number.isFinite(idx) ||
                !onChangePageCount ||
                !canDeleteSpreadAtSpreadIndex(idx, totalPages, spreadOpts)
            ) {
                return false;
            }

            spreadDeleteBusyRef.current = true;
            blockPhotoMigrationsRef.current = true;
            setPageCountBusy(true);
            skipPhotoMigrationsRef.current = 12;

            try {
                const result = await onChangePageCount(-pagesPerSpread, {
                    spreadDelete: true,
                    spreadIndex: idx,
                    removeAt: Number.isFinite(removeAtLeft) ? removeAtLeft : undefined,
                });
                if (result) {
                    if (syncCollectionOrderToPlacements(albumId)) {
                        setCollectionRevision(getAlbumCollectionRevision(albumId));
                    }
                    bumpWorkspace();
                    if (user?.id) {
                        try {
                            await smartAlbumsService.syncAlbumPreviewData(user.id, albumId);
                        } catch (err) {
                            console.warn('Could not sync album preview after spread delete:', err);
                        }
                    }
                    showToast('Spread deleted.', { duration: 3500 });
                }
                return Boolean(result);
            } finally {
                spreadDeleteBusyRef.current = false;
                setPageCountBusy(false);
                window.setTimeout(() => {
                    blockPhotoMigrationsRef.current = false;
                }, 3000);
            }
        },
        [
            album,
            albumId,
            onChangePageCount,
            totalPages,
            spreadOpts,
            pagesPerSpread,
            bumpWorkspace,
            showToast,
            user?.id,
        ]
    );

    const slotMenuSwapHint = useMemo(() => {
        if (!slotMenu?.slot) return 'Any left or right photo';
        if (spreadOpts.hasCovers && slotMenu.slot.pageNum === 0) return 'Cover only';
        const gridLayout = album?.grid_layout || 'two-page';
        if (isWholeGridSwapSlot(albumId, slotMenu.slot, totalPages, gridLayout, album)) {
            return 'Other whole spreads only';
        }
        return 'Any left or right photo';
    }, [slotMenu, albumId, album?.grid_layout, totalPages]);

    const slotMenuCanAddSpreadBefore = useMemo(() => {
        const spreadLeft = slotMenu?.slot?.spreadLeft;
        if (spreadLeft == null || !canAddPages) return false;
        return canInsertSpreadBeforeSpread(spreadLeft, totalPages, spreadOpts);
    }, [slotMenu, canAddPages, totalPages, spreadOpts]);

    const slotMenuCanAddSpreadAfter = useMemo(() => {
        const spreadLeft = slotMenu?.slot?.spreadLeft;
        if (spreadLeft == null || !canAddPages) return false;
        if (isPreBackHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts)) return false;
        return canInsertSpreadAfterSpread(spreadLeft, totalPages, spreadOpts);
    }, [slotMenu, canAddPages, totalPages, spreadOpts]);

    const slotMenuIsPreBackSpread = useMemo(() => {
        const spreadLeft = slotMenu?.slot?.spreadLeft;
        if (spreadLeft == null) return false;
        return isPreBackHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts);
    }, [slotMenu, totalPages, spreadOpts]);

    const slotMenuShowRemovePhotos = useMemo(() => {
        if (!slotMenu?.slot) return false;
        if (slotMenuIsPreBackSpread) return true;
        return Boolean(slotMenu.slot.hasPhoto);
    }, [slotMenu, slotMenuIsPreBackSpread]);

    const slotMenuCanDeleteSpread = useMemo(() => {
        const idx = slotMenu?.spreadIndex;
        if (idx == null || Number.isNaN(idx)) return false;
        return canDeleteSpreadAtSpreadIndex(idx, totalPages, spreadOpts);
    }, [slotMenu, totalPages, spreadOpts]);

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

    const handleAddSpreadBefore = useCallback(async () => {
        const slot = slotMenu?.slot;
        if (!slot || !canAddPages || !onChangePageCount) return;
        const insertAt = slot.spreadLeft;
        closeSlotMenu();
        setPageCountBusy(true);
        const result = await onChangePageCount(pagesPerSpread, { insertAt, navigateToPage: insertAt });
        setPageCountBusy(false);
        if (result) bumpWorkspace();
        if (result) {
            showToast(`Added ${pagesPerSpread} pages before this spread.`, { duration: 3500 });
        }
    }, [
        slotMenu,
        canAddPages,
        onChangePageCount,
        pagesPerSpread,
        closeSlotMenu,
        bumpWorkspace,
        showToast,
    ]);

    const handleAddSpreadAfter = useCallback(async () => {
        const slot = slotMenu?.slot;
        if (!slot || !canAddPages || !onChangePageCount) return;
        const insertAt = slot.spreadLeft + pagesPerSpread;
        closeSlotMenu();
        setPageCountBusy(true);
        const result = await onChangePageCount(pagesPerSpread, { insertAt, navigateToPage: insertAt });
        setPageCountBusy(false);
        if (result) bumpWorkspace();
        if (result) {
            showToast(`Added ${pagesPerSpread} pages after this spread.`, { duration: 3500 });
        }
    }, [
        slotMenu,
        canAddPages,
        onChangePageCount,
        pagesPerSpread,
        closeSlotMenu,
        bumpWorkspace,
        showToast,
    ]);

    const handleDeleteSpreadAt = useCallback(async () => {
        const menu = slotMenuRef.current;
        if (!menu) return;

        const removeAtLeft = Number(menu.removeAtLeft ?? menu.spreadLeft ?? menu.slot?.spreadLeft);
        let spreadIndex = Number(menu.spreadIndex);
        if (!Number.isFinite(spreadIndex) && Number.isFinite(removeAtLeft)) {
            spreadIndex = pageToSpreadIndex(removeAtLeft, { ...spreadOpts, totalPages });
        }
        if (!Number.isFinite(spreadIndex)) {
            spreadIndex = spreadIndexFromMenuLabel(menu.label, totalPages, spreadOpts);
        }

        closeSlotMenu();
        if (!Number.isFinite(spreadIndex)) return;
        if (!canDeleteSpreadAtSpreadIndex(spreadIndex, totalPages, spreadOpts)) return;
        await deleteAlbumSpreadAt(spreadIndex, {
            removeAt: Number.isFinite(removeAtLeft) ? removeAtLeft : undefined,
        });
    }, [closeSlotMenu, deleteAlbumSpreadAt, totalPages, spreadOpts]);

    const handleDeleteSpreadFromOverview = useCallback(
        async (spreadLeft) => {
            if (spreadLeft == null || Number.isNaN(spreadLeft)) return;
            const spreadIndex = pageToSpreadIndex(spreadLeft, {
                ...spreadOpts,
                totalPages,
            });
            await deleteAlbumSpreadAt(spreadIndex, { removeAt: spreadLeft });
        },
        [deleteAlbumSpreadAt, spreadOpts, totalPages]
    );

    const handleRemovePages = useCallback(async () => {
        if (!canRemovePages || !onChangePageCount) return;
        setPageCountBusy(true);
        const result = await onChangePageCount(-pagesPerSpread);
        setPageCountBusy(false);
        if (result) bumpWorkspace();
    }, [canRemovePages, onChangePageCount, pagesPerSpread, bumpWorkspace]);

    const handleClearAllPhotos = useCallback(() => {
        clearAllAlbumPagePhotos(albumId, { totalPages });
        clearAlbumTransforms(albumId);
        bumpWorkspace();
        showToast('Removed all images from the album.', { duration: 3500 });
    }, [albumId, totalPages, bumpWorkspace, showToast]);

    const published = album?.status === 'published';

    const handlePublishToggle = useCallback(async () => {
        if (!user?.id || !albumId || publishBusy) return;
        const next = !published;
        const status = next ? 'published' : 'draft';
        setPublishBusy(true);
        try {
            const updated = await smartAlbumsService.updateAlbumClientSettings(user.id, albumId, {
                status,
            });
            onAlbumUpdate?.(updated);
            showToast(
                next ? 'Album published for clients.' : 'Album moved to draft.',
                { variant: 'success', duration: 3500 }
            );
        } catch (e) {
            console.error(e);
            showToast('Could not update publish status.', { variant: 'error', duration: 4000 });
        } finally {
            setPublishBusy(false);
        }
    }, [user?.id, albumId, published, publishBusy, onAlbumUpdate, showToast]);

    const handleNotificationSelect = useCallback(
        ({ page, panel }) => {
            const editorPanel = panel === 'comments' ? 'pin' : panel || 'pin';
            setActivePanel(editorPanel);
            handleBookPageChange(page);
            syncSelectionToPage(page);
        },
        [handleBookPageChange, syncSelectionToPage]
    );

    const spreadEdit = activePanel === 'edit';
    const coverEditMode = activePanel === 'cover' && albumHasCoverSpreads(album);

    const isCoverEditorSlotMenu = useMemo(() => {
        if (!coverEditMode || !slotMenu?.slot) return false;
        const slot = slotMenu.slot;
        return slot.pageNum === 0 || slot.label === 'Cover' || slot.label === 'Book wrap';
    }, [coverEditMode, slotMenu]);

    const slotMenuCanSwap = useMemo(() => {
        if (isCoverEditorSlotMenu || !slotMenu?.slot?.hasPhoto) return false;
        if (spreadOpts.hasCovers && slotMenu?.spreadIndex === 1) return false;
        const spreadLeft = slotMenu?.slot?.spreadLeft;
        if (spreadLeft != null && isPreBackHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts)) {
            return false;
        }
        return true;
    }, [isCoverEditorSlotMenu, slotMenu, spreadOpts.hasCovers, totalPages, spreadOpts]);

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
    const showGridComments = false;
    const loadProofSpreadComments =
        activePanel === 'pin' || activePanel === 'comments';
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
        if (!loadProofSpreadComments || !albumId) return;
        loadSpreadComments();
    }, [loadProofSpreadComments, albumId, loadSpreadComments]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) loadSpreadComments();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
    }, [albumId, loadSpreadComments]);

    const pickerSubtitle =
        collectionItems.length > 0
            ? `${collectionItems.length} photo${collectionItems.length === 1 ? '' : 's'} in your collection`
            : 'Upload photos to your collection first';

    return (
        <div className="ae-page theme-mono">
            <header className="ae-topbar">
                <div className="ae-topbar-left">
                    <button
                        type="button"
                        className="ae-icon-btn ae-topbar-back"
                        onClick={() => navigate('/smart-albums')}
                        aria-label="Back to albums"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className="ae-topbar-title">{album.name}</h1>
                    <div
                        className="ae-publish-toggle"
                        role="group"
                        aria-label="Album visibility"
                        aria-busy={publishBusy}
                    >
                        <button
                            type="button"
                            className={`ae-publish-toggle-option${
                                !published ? ' ae-publish-toggle-option--active' : ''
                            }`}
                            onClick={() => {
                                if (published) handlePublishToggle();
                            }}
                            disabled={!user?.id || publishBusy}
                        >
                            Draft
                        </button>
                        <button
                            type="button"
                            className={`ae-publish-toggle-option${
                                published ? ' ae-publish-toggle-option--active' : ''
                            }`}
                            onClick={() => {
                                if (!published) handlePublishToggle();
                            }}
                            disabled={!user?.id || publishBusy}
                        >
                            Published
                        </button>
                    </div>
                </div>
                <div className="ae-topbar-right">
                    <AlbumEditorNotifications
                        album={album}
                        totalPages={totalPages}
                        bookPage={bookPage}
                        activePanel={activePanel}
                        onSelectNotification={handleNotificationSelect}
                    />
                    <button
                        type="button"
                        className="ae-btn-toolbar"
                        onClick={() => openSmartAlbumPreview(albumId, bookPage)}
                    >
                        Preview
                    </button>
                    <div className="ae-share-wrap" ref={shareRef}>
                        <button
                            type="button"
                            className="ae-btn-toolbar ae-btn-share"
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
                                onDeleteSpread={handleDeleteSpreadFromOverview}
                                onReorderOverviewSpread={handleReorderOverviewSpread}
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
                            <AlbumEditorSettingsPanel
                                album={album}
                                photographerId={user.id}
                                onAlbumUpdated={onAlbumUpdate}
                            />
                        ) : null
                    }
                    album={album}
                    totalPages={totalPages}
                    collectionItems={collectionItems}
                    collectionRevision={collectionRevision}
                    onUploadForCurrentSpread={handleUploadForCurrentSpread}
                    onOpenPicker={openPicker}
                    onClearAllPhotos={handleClearAllPhotos}
                    uploading={uploading}
                    gridEditSet={gridEditSet}
                    onGridEditSetChange={handleGridEditSetChange}
                    gridSelection={gridSelection}
                    bookPage={bookPage}
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
                    spreadCommentsBySpread={spreadCommentsBySpread}
                    albumId={albumId}
                    photographerName={photographerDisplayName}
                    onNavigateToPin={handleNavigateToPin}
                    onNavigateToSwapSlotKey={handleNavigateToSwapSlotKey}
                    onReorderCollectionItem={handleReorderCollectionItem}
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

            <AlbumSpreadSlotMenu
                open={Boolean(slotMenu)}
                anchorRect={slotMenu?.anchorRect}
                slotLabel={slotMenu?.label}
                hasPhoto={slotMenuShowRemovePhotos}
                canSwap={slotMenuCanSwap}
                swapHint={slotMenuSwapHint}
                canAddSpreadBefore={slotMenuCanAddSpreadBefore}
                canAddSpreadAfter={slotMenuCanAddSpreadAfter}
                canDeleteSpread={slotMenuCanDeleteSpread}
                deleteSpreadLeft={slotMenu?.spreadLeft ?? null}
                pageCountBusy={pageCountBusy}
                onAddSpreadBefore={handleAddSpreadBefore}
                onAddSpreadAfter={handleAddSpreadAfter}
                onDeleteSpread={handleDeleteSpreadAt}
                onCoverText={isCoverEditorSlotMenu ? handleCoverTextFromMenu : undefined}
                hasCoverText={Boolean(coverTextMessage)}
                onRemovePhotos={handleRemoveSpreadPhotos}
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
