import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    addSwapMark,
    getSwapMarksForSlot,
    getSwapMarkForSlot,
    getSwapMarks,
    makeSlotKey,
    slotsMatch,
    SWAP_MARKS_CHANGED_EVENT,
} from './albumSwapMarks';
import {
    addPhotoPin,
    getPhotoPins,
    getPinsForSlot,
    PHOTO_PINS_CHANGED_EVENT,
    removePhotoPin,
} from './albumPhotoPins';

/**
 * Shared proofing state/handlers for AlbumBook and 3D spread overlays.
 */
export default function useAlbumBookProofing({
    album,
    previewMode = false,
    placementMode = 'single',
    transformRevision = 0,
    photoRevision = 0,
    swapMarkMode = false,
    pinMarkMode = false,
    proofToolsHover = true,
    proofSpotPicker = false,
    spotCanComment = false,
    spotCanSwap = false,
    showGridComments = false,
    onSelectGridCell = null,
    onSelectGridSpread = null,
    onSlotActivate = null,
    onSelectCover = null,
    onTransformChange = null,
    gridSelection = null,
}) {
    const albumId = album?.id;
    const [swapMarks, setSwapMarks] = useState(() => getSwapMarks(albumId));
    const [swapPinFlow, setSwapPinFlow] = useState(null);
    const [photoPins, setPhotoPins] = useState(() => getPhotoPins(albumId));
    const [pinModeActive, setPinModeActive] = useState(false);
    const [pinComposer, setPinComposer] = useState(null);

    const isPinModeOn = previewMode ? pinMarkMode : pinModeActive;

    useEffect(() => {
        if (!albumId) return undefined;
        const loadMarks = () => setSwapMarks(getSwapMarks(albumId));
        loadMarks();
        const onChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            loadMarks();
        };
        window.addEventListener(SWAP_MARKS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(SWAP_MARKS_CHANGED_EVENT, onChanged);
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const loadPins = () => setPhotoPins(getPhotoPins(albumId));
        loadPins();
        const onChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            loadPins();
        };
        window.addEventListener(PHOTO_PINS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(PHOTO_PINS_CHANGED_EVENT, onChanged);
    }, [albumId]);

    useEffect(() => {
        if (!previewMode) return;
        if (proofSpotPicker) {
            setPinModeActive(false);
            setPinComposer(null);
            return;
        }
        if (pinMarkMode) {
            setPinModeActive(true);
            setSwapPinFlow(null);
            return;
        }
        setPinModeActive(false);
        setPinComposer(null);
    }, [previewMode, pinMarkMode, proofSpotPicker]);

    useEffect(() => {
        if (!previewMode) return;
        if (!swapMarkMode) setSwapPinFlow(null);
    }, [previewMode, swapMarkMode]);

    useEffect(() => {
        if (!swapPinFlow) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setSwapPinFlow(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [swapPinFlow]);

    const handleActivatePinMode = useCallback(() => {
        setPinModeActive(true);
        setSwapPinFlow(null);
    }, []);

    const handleSwapRequest = useCallback(
        (slot) => {
            if (!albumId || !slot) return;
            setSwapPinFlow({ originSlot: slot, originPoint: null });
        },
        [albumId]
    );

    const handleSwapPinPlace = useCallback(
        (placement) => {
            if (!albumId || !placement) return;
            const placementPoint = {
                xPct: placement.xPct,
                yPct: placement.yPct,
                pageNum: placement.pageNum,
                cellId: placement.cellId ?? 0,
            };
            if (!swapPinFlow) {
                if (!swapMarkMode && !proofSpotPicker) return;
                setSwapPinFlow({ originSlot: placement, originPoint: placementPoint });
                return;
            }
            const originSlot = swapPinFlow.originSlot;

            if (!swapPinFlow.originPoint) {
                if (slotsMatch(originSlot, placement)) {
                    setSwapPinFlow((prev) =>
                        prev ? { ...prev, originPoint: placementPoint } : prev
                    );
                    return;
                }
                const mark = addSwapMark(albumId, originSlot, placement, {
                    pointA: {
                        xPct: 50,
                        yPct: 50,
                        pageNum: originSlot.pageNum,
                        cellId: originSlot.cellId ?? 0,
                    },
                    pointB: placementPoint,
                });
                if (mark) setSwapPinFlow(null);
                return;
            }

            if (slotsMatch(originSlot, placement)) {
                const mark = addSwapMark(albumId, originSlot, placement, {
                    pointA: swapPinFlow.originPoint,
                    pointB: placementPoint,
                });
                if (mark) setSwapPinFlow(null);
                return;
            }

            const mark = addSwapMark(albumId, originSlot, placement, {
                pointA: swapPinFlow.originPoint,
                pointB: placementPoint,
            });
            if (mark) setSwapPinFlow(null);
        },
        [albumId, swapPinFlow, swapMarkMode, proofSpotPicker]
    );

    const getSwapMarkInfo = useCallback(
        (pageNum, cellId, spreadLeft) =>
            getSwapMarkForSlot(swapMarks, pageNum, cellId, {
                placementMode,
                spreadLeft,
                gridLayout: album?.grid_layout || 'two-page',
                album,
                totalPages: album?.page_count ?? 0,
            }),
        [swapMarks, placementMode, album]
    );

    const getSwapMarkInfos = useCallback(
        (pageNum, cellId, spreadLeft) =>
            getSwapMarksForSlot(swapMarks, pageNum, cellId, {
                placementMode,
                spreadLeft,
                gridLayout: album?.grid_layout || 'two-page',
                album,
                totalPages: album?.page_count ?? 0,
            }),
        [swapMarks, placementMode, album]
    );

    const getSlotPins = useCallback(
        (pageNum, cellId, spreadLeft) =>
            getPinsForSlot(photoPins, pageNum, cellId, { placementMode, spreadLeft }),
        [photoPins, placementMode]
    );

    const handlePinPlace = useCallback((placement) => {
        setPinComposer(placement);
    }, []);

    const handlePinSaveDirect = useCallback(
        (placement) => {
            if (!albumId || !placement?.message?.trim()) return;
            addPhotoPin(albumId, placement);
        },
        [albumId]
    );

    const handlePinRemove = useCallback(
        (pinId) => {
            if (!albumId) return;
            removePhotoPin(albumId, pinId);
        },
        [albumId]
    );

    const pageContextValue = useMemo(
        () => ({
            selectionLeftPage: gridSelection?.leftPage ?? null,
            selectionMode: gridSelection?.mode ?? null,
            selectedCellId: gridSelection?.cellId ?? null,
            photoRevision,
            transformRevision,
            showGridComments,
            onSelectCell: onSelectGridCell,
            onSelectSpread: onSelectGridSpread,
            onSlotActivate,
            onSelectCover,
            onTransformChange,
            swapMarkMode,
            getSwapMarkInfo,
            getSwapMarkInfos,
            onSwapRequest: handleSwapRequest,
            swapPinModeActive: previewMode
                ? swapMarkMode || Boolean(swapPinFlow)
                : Boolean(swapPinFlow),
            swapPinOriginKey: swapPinFlow
                ? makeSlotKey(swapPinFlow.originSlot.pageNum, swapPinFlow.originSlot.cellId ?? 0)
                : null,
            swapPinTargetStep: Boolean(swapPinFlow?.originPoint),
            swapPinOriginPoint: swapPinFlow?.originPoint || null,
            onPlaceSwapPin: handleSwapPinPlace,
            pinMarkMode,
            pinModeActive: isPinModeOn,
            getPinsForSlot: getSlotPins,
            onPinPlace: handlePinPlace,
            onPinSave: handlePinSaveDirect,
            onPinRemove: handlePinRemove,
            onActivatePinMode: handleActivatePinMode,
            proofToolsHover,
            spotActionPicker: proofSpotPicker,
            spotCanComment,
            spotCanSwap,
        }),
        [
            gridSelection?.leftPage,
            gridSelection?.mode,
            gridSelection?.cellId,
            photoRevision,
            transformRevision,
            showGridComments,
            onSelectGridCell,
            onSelectGridSpread,
            onSlotActivate,
            onSelectCover,
            onTransformChange,
            swapMarkMode,
            pinMarkMode,
            isPinModeOn,
            proofToolsHover,
            handleSwapRequest,
            swapPinFlow,
            handleSwapPinPlace,
            previewMode,
            getSwapMarkInfo,
            getSwapMarkInfos,
            getSlotPins,
            handlePinPlace,
            handlePinSaveDirect,
            handlePinRemove,
            handleActivatePinMode,
            proofSpotPicker,
            spotCanComment,
            spotCanSwap,
        ]
    );

    return {
        pageContextValue,
        pinComposer,
        setPinComposer,
        swapPinFlow,
    };
}
