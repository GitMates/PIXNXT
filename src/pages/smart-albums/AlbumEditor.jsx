import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumCoverEditView from '../../components/smart-albums/AlbumCoverEditView';
import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';
import AlbumSpreadFilmstrip from '../../components/smart-albums/AlbumSpreadFilmstrip';
import AlbumEditorNotifications from '../../components/smart-albums/AlbumEditorNotifications';
import {
    COVER_TEXT_CHANGED_EVENT,
    getAlbumCoverText,
    setAlbumCoverText,
} from '../../components/smart-albums/albumCoverText';
import CollectionPickerModal from '../../components/smart-albums/CollectionPickerModal';
import { AlbumPreviewLinkModal } from '../../components/smart-albums/AlbumShareModals';
import AlbumSharePublishMenu, {
    AlbumPublishStatusBadge,
} from '../../components/smart-albums/AlbumSharePublishMenu';
import { openSmartAlbumPreview } from '../../lib/shareSmartAlbum';
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
    getPagePhotoOverride,
    getSlotPlacementCollectionItemId,
    getSpreadPlacementCollectionItemId,
    getSpreadPhotoOverride,
    healOrphanCollectionPlacements,
    embedPlacementStorageFallbacks,
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
    resolveSlotCollectionItemId,
    restoreEndCoverPlacement,
    restorePreBackPlacement,
    setPagePhotoFromCollectionItem,
    setPagePhotoFromDataUrl,
    setSpreadPhoto,
    setSpreadPhotoFromCollectionItem,
    spreadHasWholeSpreadPhoto,
    syncCollectionItemPlacements,
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
    clearWrapImageCache,
    clearWrapSegmentCache,
} from '../../components/smart-albums/bookWrapSegment';
import { clearAlbumSpineBoundsOverride } from '../../components/smart-albums/albumSpineSettings';
import { clearSpreadPhotos } from '../../components/smart-albums/albumSlotActions';
import AlbumSpreadSlotMenu from '../../components/smart-albums/AlbumSpreadSlotMenu';
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
    isDraggableOverviewSpread,
    isWholeSpreadLayout,
    pageToSpreadIndex,
    spreadIndexToPage,
} from '../../components/smart-albums/albumSpreadUtils';
import { resolveCollectionItemSpreadIndex } from '../../components/smart-albums/collectionThumbLayout';
import { buildOverviewSpreadReorderPlan } from '../../components/smart-albums/albumSpreadReorder';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import {
    captureSlotImageBeforeReplace,
    captureSlotImageBeforeReplaceAsync,
    configureImageReplacementsPersistence,
    getImageReplacements,
    getReplacementCurrentVersion,
    getReplacementVersion,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
    removeImageReplacement,
    restoreImageReplacementVersion,
    trackSpreadImageReplacement,
} from '../../components/smart-albums/albumImageReplacements';
import AlbumEditorSettingsPanel from '../../components/smart-albums/AlbumEditorSettingsPanel';
import {
    getSwapMarks,
    markSwapMarksSeen,
    parseSlotKey,
    SWAP_MARKS_CHANGED_EVENT,
    SWAP_MARKS_SEEN_CHANGED_EVENT,
    isSwapMarkUnseen,
} from '../../components/smart-albums/albumSwapMarks';
import {
    getPhotoPins,
    markPhotoPinsSeen,
    PHOTO_PINS_CHANGED_EVENT,
    PHOTO_PINS_SEEN_CHANGED_EVENT,
    isPhotoPinUnseen,
} from '../../components/smart-albums/albumPhotoPins';
import {
    COMMENTS_CHANGED_EVENT,
    COMMENTS_SEEN_CHANGED_EVENT,
    groupRootCommentsBySpread,
    isCommentUnseen,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { hydrateAlbumClientFeedback } from '../../components/smart-albums/hydrateAlbumClientFeedback';
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
    // Derive from the visible book page when nothing is explicitly selected
    // (Comments panel / New version should still target the current spread).
    if (gridSelection?.mode === 'cover') {
        return {
            pageNum: 0,
            cellId: 0,
            spreadLeft: 0,
            label: albumHasBlankCovers(album) ? 'Cover' : 'Cover',
        };
    }

    const left =
        gridSelection?.leftPage ??
        getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
    if (left == null || Number.isNaN(left)) return null;
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

    if (albumHasBlankCovers(album) || albumHasCoverSpreads(album)) {
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
            gridSelection?.mode === 'spread' ||
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

    const cellId = gridSelection?.cellId || 1;
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
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const photographerDisplayName = getUserDisplayLabel(user);
    const [activePanel, setActivePanel] = useState(() => {
        try {
            const panel = new URLSearchParams(window.location.search).get('panel');
            if (panel === 'cover') return 'cover';
            if (panel && ['pin', 'comments', 'grid', 'edit', 'pages'].includes(panel)) {
                return panel;
            }
        } catch {
            /* ignore */
        }
        return 'pin';
    });
    const { toast, showToast, clearToast } = useAppToast(4000);
    const [spreadCommentsBySpread, setSpreadCommentsBySpread] = useState({});
    const [uploading, setUploading] = useState(false);
    const [bookPage, setBookPage] = useState(initialPage);
    const [gridEditSet, setGridEditSet] = useState(() =>
        layoutToPlacementMode(album?.grid_layout)
    );
    const [collectionRevision, setCollectionRevision] = useState(() =>
        getAlbumCollectionRevision(albumId)
    );
    const [transformRevision, setTransformRevision] = useState(() =>
        getTransformRevision(albumId)
    );
    const [photoLayoutRev, setPhotoLayoutRev] = useState(() =>
        getAlbumPhotoRevision(albumId) || 0
    );
    const [workspaceTick, setWorkspaceTick] = useState(0);
    /** Remount flipbook when spread photo bytes change (page-flip ignores child updates). */
    const [photoContentEpoch, setPhotoContentEpoch] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pageCountBusy, setPageCountBusy] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareLinkOpen, setShareLinkOpen] = useState(false);
    const [showCoverSpine, setShowCoverSpine] = useState(true);
    const [publishBusy, setPublishBusy] = useState(false);
    const [swapMarks, setSwapMarks] = useState(() => getSwapMarks(albumId));
    const [imageReplacements, setImageReplacements] = useState(() =>
        albumId ? getImageReplacements(albumId) : []
    );
    const [photoPins, setPhotoPins] = useState(() => getPhotoPins(albumId));
    const [proofSeenTick, setProofSeenTick] = useState(0);

    useEffect(() => {
        configureImageReplacementsPersistence(user?.id ?? album?.photographer_id ?? null);
    }, [user?.id, album?.photographer_id]);
    const shareRef = useRef(null);
    const collectionSyncRef = useRef(false);
    /** Skip post-delete photo migrations (React Strict Mode runs effects twice). */
    const skipPhotoMigrationsRef = useRef(0);
    const spreadDeleteBusyRef = useRef(false);
    const blockPhotoMigrationsRef = useRef(false);
    const slotMenuRef = useRef(null);
    const bumpWorkspaceRef = useRef(null);
    const prevLayoutPhotoCountRef = useRef(null);
    /** Block auto page-count growth while New version / slot replace adds a collection item. */
    const suppressCollectionPageGrowthRef = useRef(false);
    /**
     * Page growth is allowlisted: only "Add to collection" uploads may insert spreads.
     * New version / slot replace / R2 history orphans must never grow page_count.
     */
    const allowCollectionPageGrowthRef = useRef(false);
    /** Snapshot page_count around New version so accidental growth can be reverted. */
    const pinnedPageCountRef = useRef(null);
    const albumRef = useRef(album);
    albumRef.current = album;
    const [slotMenu, setSlotMenu] = useState(null);
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

    const lastSavedAtLabel = useMemo(() => {
        const raw = album?.updated_at || album?.updatedAt;
        if (!raw) return '';
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }, [album?.updated_at, album?.updatedAt, layoutRevision]);

    useEffect(() => {
        if (!albumId) {
            setImageReplacements([]);
            return undefined;
        }
        const load = () => setImageReplacements(getImageReplacements(albumId));
        load();
        const onChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            load();
        };
        window.addEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onChanged);
    }, [albumId]);

    const filmstripCommentSpreads = useMemo(() => {
        const set = new Set();
        Object.entries(spreadCommentsBySpread || {}).forEach(([key, rows]) => {
            const idx = Number(key);
            if (!Number.isFinite(idx)) return;
            if (
                Array.isArray(rows) &&
                rows.some(
                    (c) =>
                        c &&
                        c.author_type === 'client' &&
                        isCommentUnseen(albumId, c)
                )
            ) {
                set.add(idx);
            }
        });
        (photoPins || []).forEach((pin) => {
            if (isPhotoPinUnseen(albumId, pin)) {
                const idx = pin.spreadIndex != null 
                    ? pin.spreadIndex 
                    : pageToSpreadIndex(pin.pageNum, { ...spreadOpts, totalPages });
                if (Number.isFinite(idx)) {
                    set.add(idx);
                }
            }
        });
        return set;
    }, [spreadCommentsBySpread, photoPins, albumId, spreadOpts, totalPages, proofSeenTick]);

    const filmstripSwapSpreads = useMemo(() => {
        const set = new Set();
        (swapMarks || []).forEach((mark) => {
            if (isSwapMarkUnseen(albumId, mark)) {
                const a = parseSlotKey(mark.a);
                const b = parseSlotKey(mark.b);
                if (a) set.add(pageToSpreadIndex(a.pageNum, { ...spreadOpts, totalPages }));
                else if (b) set.add(pageToSpreadIndex(b.pageNum, { ...spreadOpts, totalPages }));
            }
        });
        return set;
    }, [swapMarks, albumId, spreadOpts, totalPages, proofSeenTick]);

    const filmstripVersionBySpread = useMemo(() => {
        const map = {};
        (imageReplacements || []).forEach((row) => {
            const idx = Number(row.spreadIndex);
            if (!Number.isFinite(idx)) return;
            const ver = getReplacementCurrentVersion(row);
            if (!map[idx] || ver > map[idx]) map[idx] = ver;
        });
        return map;
    }, [imageReplacements]);

    const filmstripTipBySpread = useMemo(() => {
        const base = String(album?.name || 'Album')
            .replace(/[^\w\s-]+/g, '')
            .trim()
            .replace(/\s+/g, '_');
        const tips = {};
        for (let i = 0; i < 200; i += 1) {
            const n = String(i + 1).padStart(2, '0');
            const ver = filmstripVersionBySpread[i] || 1;
            tips[i] = `${base || 'Album'}_PROOFING_${n}.jpg · v${ver}`;
        }
        return tips;
    }, [album?.name, filmstripVersionBySpread]);

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
        // Slot replace / New version may add a collection item for the current spread
        // without needing more album pages — never insert spreads in that window.
        if (suppressCollectionPageGrowthRef.current) return albumNow;
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
            // Deny-by-default: R2 history orphans / New version must not insert spreads.
            if (!allowCollectionPageGrowthRef.current || !collectionGrew) return albumNow;
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
        if (suppressCollectionPageGrowthRef.current) return;
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

    const beginSuppressCollectionPageGrowth = useCallback(() => {
        suppressCollectionPageGrowthRef.current = true;
        pinnedPageCountRef.current = albumRef.current?.page_count ?? null;
    }, []);

    const endSuppressCollectionPageGrowth = useCallback(() => {
        const albumNow = albumRef.current;
        if (albumId && albumNow) {
            // Baseline to the post-replace count so clearing the flag cannot
            // look like "collection grew" and insert blank spreads.
            prevLayoutPhotoCountRef.current = getAlbumLayoutPhotoCount(albumId, albumNow);
        }
        suppressCollectionPageGrowthRef.current = false;
    }, [albumId]);

    /** If New version / replace somehow grew page_count, roll it back. */
    const revertAccidentalPageGrowth = useCallback(async () => {
        const pinned = pinnedPageCountRef.current;
        pinnedPageCountRef.current = null;
        const albumNow = albumRef.current;
        if (!albumId || !user?.id || !albumNow || pinned == null) return;
        const current = albumNow.page_count || 0;
        if (current <= pinned) return;
        try {
            const updated = await smartAlbumsService.updateAlbumPageCount(
                user.id,
                albumId,
                pinned
            );
            onAlbumUpdate?.(updated);
            scheduleWorkspaceRefresh();
        } catch (err) {
            console.warn('Could not revert accidental page growth after version upload:', err);
        }
    }, [albumId, onAlbumUpdate, scheduleWorkspaceRefresh, user?.id]);

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
            if (migrateInsideCoverSpreadToPageTwo(albumId, totalPages, album)) {
                changed = true;
            }
            if (migrateInsideCoverSpreadTransform(albumId)) {
                changed = true;
            }
            if (migratePreBackHalfSpreadToLeftPage(albumId, totalPages, album)) {
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
        if (!albumId) return undefined;
        let cancelled = false;
        void hydrateAlbumClientFeedback(albumId, {
            viewerRole: 'photographer',
            viewerKey: user?.id || 'default',
        }).then(() => {
            if (cancelled) return;
            setSwapMarks(getSwapMarks(albumId));
            setPhotoPins(getPhotoPins(albumId));
        });
        return () => {
            cancelled = true;
        };
    }, [albumId, user?.id]);

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
            const healed = healOrphanCollectionPlacements(albumId);
            const embedded = embedPlacementStorageFallbacks(albumId);
            // Persist recovered R2 catalog so other devices / reloads keep showing photos.
            if (result.recoveredFromR2 || healed || embedded || result.merged) {
                try {
                    await smartAlbumsService.syncAlbumPreviewData(user.id, albumId);
                } catch (err) {
                    console.warn('Could not persist recovered album assets:', err?.message || err);
                }
            }
            setCollectionRevision(getAlbumCollectionRevision(albumId));
            onPhotosUploaded?.();
            setTransformRevision(getTransformRevision(albumId));
            if (healed || embedded || result.recoveredFromR2) {
                scheduleWorkspaceRefresh();
                bumpWorkspaceRef.current?.();
            }
        })();

        return () => {
            cancelled = true;
        };
        // Load once per album session; avoid re-fetch loops from callback identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [albumId, user?.id]);

    useEffect(() => {
        if (!showShareMenu) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setShowShareMenu(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
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
        const validPanels = ['cover', 'pin', 'comments', 'grid', 'edit', 'pages'];
        if (panel === 'swap') {
            setActivePanel('pin');
        } else if (panel && validPanels.includes(panel)) {
            setActivePanel(panel);
            if (panel === 'cover' && albumHasCoverSpreads(album)) {
                setGridEditSet('single');
                setGridSelection(buildCoverSelection());
            }
        }
    }, [searchParams, album]);

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
            // After navigating to the spread, broadcast an event to open the pin popover
            // so the pin's message is visible on the spread.
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent('album-spot-pin-open', {
                    detail: { layerId: null, pinId: pin.id },
                }));
            }, 120);
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

    const handleNavigateToSwapMark = useCallback(
        (mark, endpoint = 'A') => {
            if (!mark) return;
            const slotKey = endpoint === 'B' ? mark.b : mark.a;
            if (slotKey) {
                const { pageNum } = parseSlotKey(slotKey);
                const spreadIdx = pageToSpreadIndex(pageNum, spreadCtx);
                const page = spreadIndexToPage(spreadIdx, spreadCtx);
                const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
                handleBookPageChange(clamped);
            }
            window.setTimeout(() => {
                window.dispatchEvent(
                    new CustomEvent('album-spot-pin-open', {
                        detail: {
                            layerId: null,
                            markId: mark.id,
                            endpoint: endpoint === 'B' ? 'B' : 'A',
                        },
                    })
                );
            }, 120);
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
        (slot, itemId, replacementBefore = null, options = {}) => {
            if (!slot || !itemId) return false;
            const skipTrack = Boolean(options?.skipTrack);
            const before =
                skipTrack
                    ? null
                    : replacementBefore ??
                      captureSlotImageBeforeReplace(albumId, slot, album, totalPages);

            const trackReplacement = (placed) => {
                let tracked = null;
                if (placed && before && !skipTrack) {
                    tracked = trackSpreadImageReplacement(albumId, slot, itemId, {
                        album,
                        totalPages,
                        previousItemId: before.previousItemId,
                        previousUrl: before.previousUrl,
                        previousStoragePath: before.previousStoragePath,
                        newStoragePath: getCollectionItem(albumId, itemId)?.storagePath || null,
                    });
                }
                if (placed) {
                    syncCollectionOrderToPlacements(albumId);
                }
                return { placed, tracked };
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
                return trackReplacement(placed).placed;
            }
            if (slot.pageNum === 0) {
                return trackReplacement(setPagePhotoFromCollectionItem(albumId, 0, itemId)).placed;
            }
            const left = slot.spreadLeft ?? getSpreadLeftForBookPage(slot.pageNum, totalPages, spreadOpts);
            // Honor explicit whole-spread slots (New version / restore). Do not require an
            // existing spread: photo — otherwise replaces write a page key while the UI still
            // reads a stale remote spread: image and version history never appears to update.
            const useWholeSpread = Boolean(slot.whole);
            if (useWholeSpread) {
                const right = getSpreadRightPageIndex(left, totalPages);
                return trackReplacement(
                    setSpreadPhotoFromCollectionItem(albumId, left, itemId, right, {
                        totalPages,
                        spreadOpts: { ...spreadOpts, gridLayout: album?.grid_layout },
                    })
                ).placed;
            }
            if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                return trackReplacement(
                    setPagePhotoFromCollectionItem(albumId, left, itemId, {
                        clearSpreadForLeft: left,
                    })
                ).placed;
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
            ).placed;
        },
        [album, albumId, totalPages, spreadCtx, spreadOpts]
    );

    const handleRestoreImageReplacement = useCallback(
        (row) => {
            if (!albumId || !row) return;
            const result = restoreImageReplacementVersion(albumId, row, {
                album,
                totalPages,
                spreadOpts,
            });
            if (!result.ok) {
                if (result.reason === 'no_snapshot') {
                    showToast('Original photo is no longer available to restore.', {
                        variant: 'info',
                        duration: 4000,
                    });
                    return;
                }
                showToast('Could not restore that version.', {
                    variant: 'error',
                    duration: 4000,
                });
                return;
            }
            setImageReplacements(getImageReplacements(albumId));
            bumpWorkspace();
            showToast(`Restored v${result.version}.`, { variant: 'success', duration: 3000 });
        },
        [album, albumId, bumpWorkspace, showToast, spreadOpts, totalPages]
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
                return; // Cover actions are in the sidebar — no popup needed
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

    const syncEditorUrl = useCallback(
        (panelId, pageIndex = null) => {
            const page = pageIndex ?? bookPage;
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('page', String(page));
                    if (panelId === 'cover') {
                        next.set('panel', 'cover');
                    } else if (next.get('panel') === 'cover') {
                        next.delete('panel');
                    }
                    return next;
                },
                { replace: true }
            );
        },
        [bookPage, setSearchParams]
    );

    const keepCoverEditorActive = useCallback(() => {
        setActivePanel('cover');
        setGridEditSet('single');
        setGridSelection(buildCoverSelection());
        if (bookPage !== 0) {
            setBookPage(0);
            syncSelectionToPage(0);
            onPageChange?.(0);
        }
        syncEditorUrl('cover', 0);
    }, [bookPage, onPageChange, syncEditorUrl, syncSelectionToPage]);

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
            // Cover wrap replace must delete the previous R2 object so old wraps cannot resurface.
            const retainPreviousStorage = !coverWrap;

            if (previousItemId && file && !isPdfFile(file) && (isImageFile(file) || (await probeImageFile(file)))) {
                const beforePath =
                    getCollectionItem(albumId, previousItemId)?.storagePath || null;
                const replaced = await replaceCollectionItemFile(albumId, previousItemId, file, {
                    photographerId,
                    compressionTarget,
                    retainPreviousStorage,
                });
                const afterPath = replaced?.storagePath || null;
                if (replaced && afterPath && afterPath !== beforePath) {
                    // Keep every placement pointing at this item on the new storagePath,
                    // otherwise the UI keeps rendering the pre-replace URL.
                    syncCollectionItemPlacements(albumId, previousItemId);
                    return replaced;
                }
                // Replace reported success but path did not change (stale remote-only row).
                // Fall through to add+swap so the spread actually updates.
            }

            const added = await addFilesToAlbumCollection(albumId, files.slice(0, 1), {
                photographerId,
                skipDuplicateCheck: true,
                coverWrap,
                album,
                compressionTarget,
                // New version / slot replace must never import every PDF page into the
                // collection — that grows collectionCount and auto-inserts blank spreads.
                maxItems: 1,
            });
            const replacementItem = added[0] || added.duplicateItems?.[0];
            if (previousItemId && replacementItem?.id && previousItemId !== replacementItem.id) {
                clearCollectionItemPlacements(albumId, previousItemId);
                await deleteCollectionItemAsset(albumId, previousItemId, {
                    retainStorage: retainPreviousStorage,
                });
            }
            return replacementItem;
        },
        [album, album?.photographer_id, albumId, spreadOpts, totalPages, user?.id]
    );

    const handleReplaceFilesForSlot = useCallback(
        async (files, slot) => {
            if (!slot || files.length === 0) return;
            setUploading(true);
            beginSuppressCollectionPageGrowth();
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
                    // Version history is recorded inside placeCollectionItemOnSlot when `before` is set.
                    scheduleWorkspaceRefresh();
                    setPhotoContentEpoch((n) => n + 1);
                    if (isCoverSlot) {
                        // Drop any orphaned cover-wrap items left behind by older upload paths.
                        const keepId = replacementItem.id;
                        const orphans = getAlbumCollection(albumId).filter(
                            (item) => isCoverWrapCollectionItem(item) && item.id !== keepId
                        );
                        for (const orphan of orphans) {
                            clearCollectionItemPlacements(albumId, orphan.id);
                            try {
                                await deleteCollectionItemAsset(albumId, orphan.id, {
                                    retainStorage: false,
                                });
                            } catch (err) {
                                console.warn('Could not delete orphaned cover wrap from R2:', err);
                            }
                        }
                        clearWrapSegmentCache();
                        clearWrapImageCache();
                        clearAlbumSpineBoundsOverride(albumId);
                        if (getAlbumCoverText(albumId)) {
                            setAlbumCoverText(albumId, '');
                        }
                        setCollectionRevision(getAlbumCollectionRevision(albumId));
                        keepCoverEditorActive();
                        if (user?.id) {
                            try {
                                await smartAlbumsService.syncAlbumPreviewData(user.id, albumId);
                            } catch (err) {
                                console.warn('Could not sync album preview after cover upload:', err);
                            }
                        }
                        showToast('Cover image updated.', { variant: 'success', duration: 3500 });
                    } else {
                        showToast('Photo updated.', { variant: 'success', duration: 3500 });
                    }
                } else {
                    showToast('Could not place photo.', { variant: 'error', duration: 4000 });
                }
            } catch (err) {
                console.error(err);
                showToast('Upload failed. Try again.', { variant: 'error', duration: 4000 });
            } finally {
                endSuppressCollectionPageGrowth();
                pinnedPageCountRef.current = null;
                setUploading(false);
            }
        },
        [
            album,
            albumId,
            beginSuppressCollectionPageGrowth,
            endSuppressCollectionPageGrowth,
            placeCollectionItemOnSlot,
            resolveSpreadReplacementItem,
            scheduleWorkspaceRefresh,
            showToast,
            totalPages,
            keepCoverEditorActive,
            user?.id,
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

    const handleRemoveCoverPhotos = useCallback(async () => {
        const placementId = getSpreadPlacementCollectionItemId(albumId, 0);
        const coverWrapIds = new Set(
            getAlbumCollection(albumId)
                .filter((item) => isCoverWrapCollectionItem(item))
                .map((item) => item.id)
        );
        if (placementId) coverWrapIds.add(placementId);

        const cleared = clearSpreadPhotos(albumId, 0, totalPages, 'whole', {
            gridLayout: album?.grid_layout,
            spreadOpts,
        });

        for (const itemId of coverWrapIds) {
            clearCollectionItemPlacements(albumId, itemId);
            try {
                await deleteCollectionItemAsset(albumId, itemId, { retainStorage: false });
            } catch (err) {
                console.warn('Could not delete cover wrap from R2:', err);
            }
        }

        clearWrapSegmentCache();
        clearWrapImageCache();
        clearAlbumSpineBoundsOverride(albumId);
        setCollectionRevision(getAlbumCollectionRevision(albumId));

        if (cleared || coverWrapIds.size > 0) {
            scheduleWorkspaceRefresh();
            if (user?.id) {
                try {
                    await smartAlbumsService.syncAlbumPreviewData(user.id, albumId);
                } catch (err) {
                    console.warn('Could not sync album preview after cover remove:', err);
                }
            }
            showToast('Cover photos removed.', { duration: 3500 });
        }
    }, [
        albumId,
        album?.grid_layout,
        totalPages,
        spreadOpts,
        scheduleWorkspaceRefresh,
        showToast,
        user?.id,
    ]);

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
        allowCollectionPageGrowthRef.current = true;
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
            allowCollectionPageGrowthRef.current = false;
            setUploading(false);
        }
    };

    const handleUploadForCurrentSpread = useCallback(
        async (files, options = {}) => {
            const asNewVersion = Boolean(options?.asNewVersion);
            let slot = slotFromCurrentSpread(
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

            // New version is always a whole-spread replace so version history + flipbook
            // update the same spread: key the UI reads (not a single grid cell).
            if (asNewVersion && gridSelection?.mode !== 'cover') {
                const left =
                    slot.spreadLeft ??
                    getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
                slot = {
                    pageNum: left,
                    cellId: 1,
                    spreadLeft: left,
                    whole: true,
                    label: 'Whole spread',
                };
            } else if (
                !slot.whole &&
                albumId &&
                spreadHasWholeSpreadPhoto(
                    albumId,
                    slot.spreadLeft ??
                        getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts)
                )
            ) {
                const left =
                    slot.spreadLeft ??
                    getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
                slot = {
                    ...slot,
                    pageNum: left,
                    cellId: 1,
                    spreadLeft: left,
                    whole: true,
                    label: slot.label || 'Whole spread',
                };
            }

            setUploading(true);
            beginSuppressCollectionPageGrowth();
            if (files.some((f) => isPdfFile(f))) {
                showToast('Converting PDF pages to images…', { variant: 'info', duration: 0 });
            } else {
                showToast('Uploading photo…', { variant: 'info', duration: 0 });
            }

            try {
                const isCoverSlot =
                    albumHasCoverSpreads(album) && gridSelection?.mode === 'cover';
                const left =
                    slot.spreadLeft ??
                    getSpreadLeftForBookPage(bookPage, totalPages, spreadOpts);
                const right = Math.min(left + 1, Math.max(0, totalPages - 1));
                // Snapshot the visible preview BEFORE any in-place file replace. Capture via
                // collection id alone can miss page-only placements; without this, the photo
                // updates but version history stays on synthetic v1.
                const previewBeforeUrl =
                    getSpreadPhotoOverride(albumId, left) ||
                    getPagePhotoOverride(albumId, left) ||
                    (right !== left ? getPagePhotoOverride(albumId, right) : null) ||
                    null;
                const captured = await captureSlotImageBeforeReplaceAsync(
                    albumId,
                    slot,
                    album,
                    totalPages
                );
                const before = {
                    previousItemId: captured?.previousItemId || null,
                    previousStoragePath: captured?.previousStoragePath || null,
                    // previewBeforeUrl is snapshotted before replace — safe to keep as frozen string.
                    previousUrl: captured?.previousUrl || previewBeforeUrl || null,
                };
                const hasBefore =
                    Boolean(before.previousItemId) ||
                    Boolean(before.previousUrl) ||
                    Boolean(before.previousStoragePath);

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
                // For New version, place without internal track then record history explicitly
                // so a missed `before` inside placeCollectionItemOnSlot cannot drop v2/v3.
                const placed = placeCollectionItemOnSlot(
                    slot,
                    replacementItem.id,
                    hasBefore ? before : null,
                    asNewVersion ? { skipTrack: true } : undefined
                );
                if (placed) {
                    const versionSpreadIndex = pageToSpreadIndex(left, {
                        ...spreadOpts,
                        totalPages,
                    });
                    if (asNewVersion || hasBefore) {
                        trackSpreadImageReplacement(albumId, slot, replacementItem.id, {
                            album,
                            totalPages,
                            previousItemId: before.previousItemId,
                            previousUrl: before.previousUrl,
                            previousStoragePath: before.previousStoragePath,
                            newStoragePath: replacementItem.storagePath || null,
                            newUrl: replacementItem.storagePath
                                ? null
                                : replacementItem.dataUrl || null,
                            force: Boolean(asNewVersion),
                            spreadIndex: versionSpreadIndex,
                        });
                    }
                    setCollectionRevision(getAlbumCollectionRevision(albumId));
                    // Remount flipbook immediately (layoutRevision includes this tick).
                    setPhotoContentEpoch((n) => n + 1);
                    bumpWorkspace();
                    if (user?.id && (asNewVersion || isCoverSlot)) {
                        try {
                            await smartAlbumsService.syncAlbumPreviewData(user.id, albumId);
                        } catch (err) {
                            console.warn('Could not sync album preview after upload:', err);
                        }
                    }
                    if (isCoverSlot) {
                        clearWrapSegmentCache();
                        clearWrapImageCache();
                        clearAlbumSpineBoundsOverride(albumId);
                        if (getAlbumCoverText(albumId)) {
                            setAlbumCoverText(albumId, '');
                        }
                        keepCoverEditorActive();
                    }
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
                endSuppressCollectionPageGrowth();
                if (asNewVersion) {
                    await revertAccidentalPageGrowth();
                } else {
                    pinnedPageCountRef.current = null;
                }
                setUploading(false);
            }
        },
        [
            album,
            albumId,
            beginSuppressCollectionPageGrowth,
            bookPage,
            bumpWorkspace,
            endSuppressCollectionPageGrowth,
            gridEditSet,
            gridSelection,
            placeCollectionItemOnSlot,
            resolveSpreadReplacementItem,
            revertAccidentalPageGrowth,
            showToast,
            spreadOpts,
            totalPages,
            keepCoverEditorActive,
            user?.id,
        ]
    );

    const handleUploadCoverFile = useCallback(
        async (file) => {
            if (!file) return;
            if (!albumHasCoverSpreads(album)) {
                showToast('This album does not have a cover wrap to upload to.', {
                    variant: 'error',
                    duration: 4000,
                });
                return;
            }
            keepCoverEditorActive();
            await handleReplaceFilesForSlot([file], {
                pageNum: 0,
                cellId: 0,
                spreadLeft: 0,
                label: 'Cover',
            });
        },
        [album, handleReplaceFilesForSlot, keepCoverEditorActive, showToast]
    );

    const handlePlaceCollectionItem = useCallback(
        (itemId) => {
            if (placeItemOnSpread(itemId)) {
                scheduleWorkspaceRefresh();
                setPickerOpen(false);
                if (gridSelection?.mode === 'cover') {
                    if (getAlbumCoverText(albumId)) {
                        setAlbumCoverText(albumId, '');
                    }
                    keepCoverEditorActive();
                }
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
        [
            albumId,
            placeItemOnSpread,
            scheduleWorkspaceRefresh,
            showToast,
            gridSelection?.mode,
            keepCoverEditorActive,
        ]
    );

    const finishSpreadContentReorder = useCallback(
        (fromSpreadIndex, toSpreadIndex) => {
            const plan = buildOverviewSpreadReorderPlan(
                fromSpreadIndex,
                toSpreadIndex,
                totalPages,
                spreadOpts
            );
            if (
                !reorderOverviewSpreads(albumId, fromSpreadIndex, toSpreadIndex, {
                    totalPages,
                    spreadOpts,
                })
            ) {
                return false;
            }

            // Keep comment/message badges on the moved spread content immediately.
            if (plan) {
                setSpreadCommentsBySpread((prev) => {
                    const snapshots = Object.fromEntries(
                        plan.draggable.map((spreadIndex) => [
                            spreadIndex,
                            prev[spreadIndex] || [],
                        ])
                    );
                    const next = { ...prev };
                    plan.draggable.forEach((spreadIndex) => {
                        delete next[spreadIndex];
                    });
                    plan.draggable.forEach((targetSpread, i) => {
                        const sourceSpread = plan.newOrder[i];
                        const rows = (snapshots[sourceSpread] || []).map((row) => ({
                            ...row,
                            spread_index: targetSpread,
                        }));
                        if (rows.length) next[targetSpread] = rows;
                    });
                    return next;
                });
            }

            setTransformRevision(getTransformRevision(albumId));
            setSwapMarks(getSwapMarks(albumId));
            setPhotoPins(getPhotoPins(albumId));
            syncCollectionOrderToPlacements(albumId);
            setCollectionRevision(getAlbumCollectionRevision(albumId));
            setPhotoLayoutRev(getAlbumPhotoRevision(albumId) || 0);
            bumpWorkspace();
            showToast('Spread order updated.', { variant: 'success', duration: 3000 });
            return true;
        },
        [albumId, totalPages, spreadOpts, bumpWorkspace, showToast]
    );

    const handleReorderCollectionItem = useCallback(
        async (fromIndex, toIndex) => {
            if (fromIndex === toIndex) return;

            const items = getAlbumCollection(albumId);
            const fromSpread = resolveCollectionItemSpreadIndex(
                fromIndex,
                items,
                album,
                totalPages
            );
            const toSpread = resolveCollectionItemSpreadIndex(toIndex, items, album, totalPages);
            const canMoveWithFeedback =
                fromSpread != null &&
                toSpread != null &&
                fromSpread !== toSpread &&
                isDraggableOverviewSpread(fromSpread, totalPages, spreadOpts) &&
                isDraggableOverviewSpread(toSpread, totalPages, spreadOpts);

            // Prefer spread-content reorder so comments, swaps, pins, and messages travel with photos.
            if (canMoveWithFeedback && finishSpreadContentReorder(fromSpread, toSpread)) {
                return;
            }

            if (!reorderCollectionItems(albumId, fromIndex, toIndex, { album })) return;
            await syncCollectionOrderToSpreads();
            setCollectionRevision(getAlbumCollectionRevision(albumId));
            setPhotoLayoutRev(getAlbumPhotoRevision(albumId) || 0);
            setTransformRevision(getTransformRevision(albumId));
            setSwapMarks(getSwapMarks(albumId));
            setPhotoPins(getPhotoPins(albumId));
        },
        [
            albumId,
            album,
            totalPages,
            spreadOpts,
            finishSpreadContentReorder,
            syncCollectionOrderToSpreads,
        ]
    );

    const handleReorderOverviewSpread = useCallback(
        (fromSpreadIndex, toSpreadIndex) => {
            finishSpreadContentReorder(fromSpreadIndex, toSpreadIndex);
        },
        [finishSpreadContentReorder]
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
    const shareMode =
        album?.status !== 'published'
            ? 'draft'
            : album?.share_link_enabled === false
              ? 'paused'
              : 'live';

    const handlePublishToggle = useCallback(async () => {
        if (!user?.id || !albumId || publishBusy) return;
        const next = !published;
        const status = next ? 'published' : 'draft';
        setPublishBusy(true);
        try {
            const updated = await smartAlbumsService.updateAlbumClientSettings(user.id, albumId, {
                status,
                ...(next ? { share_link_enabled: true } : {}),
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

    const coverTextMessage = useMemo(() => {
        void coverTextRevision;
        return getAlbumCoverText(albumId);
    }, [albumId, coverTextRevision]);

    const handlePanelChange = useCallback(
        (panelId) => {
            if (panelId === 'cover' && !albumHasCoverSpreads(album)) {
                setActivePanel('pin');
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
            syncEditorUrl(panelId, panelId === 'cover' ? 0 : null);
        },
        [
            album,
            handleBookPageChange,
            albumId,
            totalPages,
            scheduleWorkspaceRefresh,
            syncEditorUrl,
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
        window.addEventListener(COMMENTS_SEEN_CHANGED_EVENT, onChanged);
        return () => {
            window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
            window.removeEventListener(COMMENTS_SEEN_CHANGED_EVENT, onChanged);
        };
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
                        onClick={() => navigate('/album-proofer')}
                        aria-label="Back to albums"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className="ae-topbar-title">{album.name}</h1>
                    <AlbumPublishStatusBadge
                        album={album}
                        onPublish={handlePublishToggle}
                        publishBusy={publishBusy}
                    />
                    <span className="ae-topbar-saved" aria-live="polite">
                        All changes saved
                        {lastSavedAtLabel ? ` · ${lastSavedAtLabel}` : ''}
                    </span>
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
                        className="ae-btn-toolbar ae-btn-toolbar--inset ae-btn-preview"
                        disabled={shareMode === 'paused'}
                        title={
                            shareMode === 'paused'
                                ? 'Resume client access to open preview'
                                : undefined
                        }
                        onClick={() => {
                            if (shareMode === 'paused') {
                                showToast('Client access is paused. Resume access to preview.', {
                                    duration: 3500,
                                });
                                return;
                            }
                            openSmartAlbumPreview(albumId, bookPage);
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        Preview
                    </button>
                    <div className="ae-share-wrap" ref={shareRef}>
                        <button
                            type="button"
                            className={`ae-btn-toolbar ae-btn-share${
                                showShareMenu ? ' ae-btn-toolbar--open' : ''
                            }${shareMode === 'live' ? ' ae-btn-share--primary' : ''}`}
                            onClick={() => setShowShareMenu((v) => !v)}
                            aria-expanded={showShareMenu}
                        >
                            Share
                            <svg
                                className={`ae-btn-share-chevron${
                                    showShareMenu ? ' ae-btn-share-chevron--open' : ''
                                }`}
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        <AlbumSharePublishMenu
                            open={showShareMenu}
                            onOpenChange={setShowShareMenu}
                            album={album}
                            photographerId={user?.id}
                            onAlbumUpdated={onAlbumUpdate}
                            showToast={showToast}
                        />
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
                                showSpine={showCoverSpine}
                                onShowSpineChange={setShowCoverSpine}
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
                                photoContentEpoch={photoContentEpoch}
                                showGridComments={showGridComments}
                                spreadCommentsBySpread={spreadCommentsBySpread}
                                swapMarkMode
                                pinMarkMode
                                proofToolsHover={false}
                            />
                        )}
                    </div>
                    {!coverEditMode ? (
                        <AlbumSpreadFilmstrip
                            album={albumForBook}
                            totalPages={totalPages}
                            bookPage={bookPage}
                            photoRevision={layoutRevision}
                            onReorderSpread={handleReorderOverviewSpread}
                            disabled={pageCountBusy || spreadEdit}
                            commentSpreads={filmstripCommentSpreads}
                            swapSpreads={filmstripSwapSpreads}
                            versionBySpread={filmstripVersionBySpread}
                            tipBySpread={filmstripTipBySpread}
                            onSelectSpread={(_spreadIndex, page) => {
                                const clamped = Math.max(
                                    0,
                                    Math.min(page, Math.max(0, totalPages - 1))
                                );
                                handleBookPageChange(clamped);
                            }}
                        />
                    ) : null}
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
                    onNavigateToSwapMark={handleNavigateToSwapMark}
                    onReorderCollectionItem={handleReorderCollectionItem}
                    proofSeenTick={proofSeenTick}
                    showCoverSpine={showCoverSpine}
                    onShowCoverSpineChange={setShowCoverSpine}
                    coverTextMessage={coverTextMessage}
                    onSaveCoverText={handleSaveCoverText}
                    onUploadCoverFile={handleUploadCoverFile}
                    onRemoveCoverPhotos={handleRemoveCoverPhotos}
                    workspaceRevision={layoutRevision}
                    onRestoreImageReplacement={handleRestoreImageReplacement}
                    onRemoveImageReplacement={(id) => {
                        if (!id) return;
                        removeImageReplacement(albumId, id);
                        bumpWorkspace();
                    }}
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
                canUpload={Boolean(slotMenu?.slot)}
                uploadBusy={uploading}
                canAddSpreadBefore={slotMenuCanAddSpreadBefore}
                canAddSpreadAfter={slotMenuCanAddSpreadAfter}
                canDeleteSpread={slotMenuCanDeleteSpread}
                deleteSpreadLeft={slotMenu?.spreadLeft ?? null}
                pageCountBusy={pageCountBusy}
                onAddSpreadBefore={handleAddSpreadBefore}
                onAddSpreadAfter={handleAddSpreadAfter}
                onDeleteSpread={handleDeleteSpreadAt}
                onRemovePhotos={handleRemoveSpreadPhotos}
                onUpload={handleReplaceFromMenu}
                onClose={closeSlotMenu}
            />
        </div>
    );
}
