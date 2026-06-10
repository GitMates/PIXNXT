import React, { useEffect, useMemo, useState } from 'react';
import {
    getGridSlotPhoto,
    getInsideCoverRightPhotoSrc,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import {
    getPagePhotoTransform,
    getSpreadPhotoTransform,
    photoTransformStyle,
} from './albumPageTransforms';
import { getSampleImageForPage } from './sampleAlbumImages';
import AlbumPageGrid from './AlbumPageGrid';
import AlbumSwapMarkBadge from './AlbumSwapMarkBadge';
import AlbumPhotoPinLayer from './AlbumPhotoPinLayer';
import './AlbumPhotoPins.css';
import { getSlotLabel } from './albumSwapMarks';
import { useAlbumBookPageContext } from './AlbumBookPageContext';
import {
    getProofLeftPageGridPercent,
    getProofRightPageGridPercent,
    getSpreadLeftPageIndex,
    isProofLeftGridPage,
    isProofRightGridPage,
} from './albumSpreadGrid';
import { getAlbumCollection } from './albumCollection';
import { COVER_TEXT_CHANGED_EVENT, getAlbumCoverText } from './albumCoverText';
import {
    getAlbumSpreadOptions,
    getEndSpreadPageRole,
    getLastSpreadInfo,
    getPreBackSpreadPageRole,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverLeftPage,
    isInsideCoverRightPage,
    isPreBackHalfSpreadRightPage,
    isWholeSpreadLayout,
} from './albumSpreadUtils';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import { SPINE_BOUNDS_CHANGED_EVENT } from './albumSpineSettings';
import BookWrapSpineImage from './BookWrapSpineImage';

function getPageImageSrc(album, pageNum, showSamples, spreadOpts) {
    const opts = spreadOpts ?? getAlbumSpreadOptions(album);
    const totalPages = opts.totalPages ?? album?.page_count;
    if (opts.hasCovers) {
        if (pageNum === 1) {
            return resolveCoverImageSrc(album, { showSamples });
        }
        if (
            totalPages != null &&
            getEndSpreadPageRole(pageNum, totalPages, opts) === 'half-left'
        ) {
            return resolveCoverImageSrc(album, { showSamples });
        }
    }
    const albumId = album?.id;
    if (albumId) {
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return pageSrc;
    }
    return showSamples ? getSampleImageForPage(pageNum) : null;
}

function pageHasVisiblePhoto(
    album,
    albumId,
    pageNum,
    totalPages,
    showSamples,
    wholeSpread = false,
    spreadOpts
) {
    const opts = { ...(spreadOpts ?? getAlbumSpreadOptions(album)), totalPages };
    if (pageNum === 1 && opts.hasCovers && resolveCoverImageSrc(album, { showSamples })) {
        return true;
    }
    if (!wholeSpread && isInsideCoverRightPage(pageNum, totalPages, opts)) {
        return Boolean(getInsideCoverRightPhotoSrc(albumId, { showSamples }));
    }
    if (getPagePhotoOverride(albumId, pageNum)) return true;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, opts);
    const slotOpts = { wholeSpread };
    if (isProofLeftGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 1, spreadLeft, totalPages, {
            ...slotOpts,
            spreadOpts: opts,
        });
        if (slot?.src) return true;
    }
    if (isProofRightGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 2, spreadLeft, totalPages, {
            ...slotOpts,
            spreadOpts: opts,
        });
        if (slot?.src) return true;
    }
    return Boolean(showSamples && getSampleImageForPage(pageNum));
}

function PagePhoto({ src, pageNum, showSamples, className = '' }) {
    const [useSampleFallback, setUseSampleFallback] = useState(false);
    const sampleSrc = showSamples ? getSampleImageForPage(pageNum) : null;
    const displaySrc = useSampleFallback ? sampleSrc : src;

    if (!displaySrc) {
        return <div className="ab-page-empty" aria-hidden />;
    }

    return (
        <img
            key={displaySrc}
            src={displaySrc}
            alt=""
            className={`ab-page-photo${className ? ` ${className}` : ''}`}
            draggable={false}
            onError={() => {
                if (!useSampleFallback && sampleSrc && src !== sampleSrc) {
                    setUseSampleFallback(true);
                }
            }}
        />
    );
}

const AlbumFlipPage = React.forwardRef(function AlbumFlipPage(
    {
        album,
        albumId: albumIdProp,
        pageNum,
        totalPages,
        editable = false,
        spreadEdit = false,
        placementMode = 'single',
        showSamples = true,
        previewMode = false,
        showGridComments = false,
        selectionLeftPage = null,
        selectionMode = null,
        selectedCellId = null,
        onSelectCell,
        onSelectSpread,
        onSlotActivate,
        onSelectCover,
        onTransformChange,
        transformRevision = 0,
        photoRevision = 0,
        showPageBadge = false,
        swapMarkMode = false,
        getSwapMarkInfo,
        getSwapMarkInfos,
        onSwapRequest,
        swapPinModeActive = false,
        swapPinOriginKey = null,
        swapPinTargetStep = false,
        swapPinOriginPoint = null,
        onPlaceSwapPin,
        pinMarkMode = false,
        pinModeActive = false,
        getPinsForSlot,
        onPinPlace,
        onPinRemove,
        onActivatePinMode,
        proofToolsHover = true,
    },
    ref
) {
    const ctx = useAlbumBookPageContext();
    const liveSelectionLeftPage = ctx.selectionLeftPage ?? selectionLeftPage;
    const liveSelectionMode = ctx.selectionMode ?? selectionMode;
    const liveSelectedCellId = ctx.selectedCellId ?? selectedCellId;
    const liveOnSelectCell = ctx.onSelectCell ?? onSelectCell;
    const liveOnSelectSpread = ctx.onSelectSpread ?? onSelectSpread;
    const liveOnSlotActivate = ctx.onSlotActivate ?? onSlotActivate;
    const liveOnSelectCover = ctx.onSelectCover ?? onSelectCover;
    const liveOnTransformChange = ctx.onTransformChange ?? onTransformChange;
    const liveTransformRevision = ctx.transformRevision ?? transformRevision;
    const livePhotoRevision = ctx.photoRevision ?? photoRevision;
    const liveSwapMarkMode = ctx.swapMarkMode ?? swapMarkMode;
    const liveGetSwapMarkInfo = ctx.getSwapMarkInfo ?? getSwapMarkInfo;
    const liveGetSwapMarkInfos = ctx.getSwapMarkInfos ?? getSwapMarkInfos;
    const liveOnSwapRequest = ctx.onSwapRequest ?? onSwapRequest;
    const liveSwapPinModeActive = ctx.swapPinModeActive ?? swapPinModeActive;
    const liveSwapPinOriginKey = ctx.swapPinOriginKey ?? swapPinOriginKey;
    const liveSwapPinTargetStep = ctx.swapPinTargetStep ?? swapPinTargetStep;
    const liveSwapPinOriginPoint = ctx.swapPinOriginPoint ?? swapPinOriginPoint;
    const liveOnPlaceSwapPin = ctx.onPlaceSwapPin ?? onPlaceSwapPin;
    const livePinMarkMode = ctx.pinMarkMode ?? pinMarkMode;
    const livePinModeActive = ctx.pinModeActive ?? pinModeActive;
    const liveGetPinsForSlot = ctx.getPinsForSlot ?? getPinsForSlot;
    const liveOnPinPlace = ctx.onPinPlace ?? onPinPlace;
    const liveOnPinRemove = ctx.onPinRemove ?? onPinRemove;
    const liveOnPinSave = ctx.onPinSave;
    const liveOnActivatePinMode = ctx.onActivatePinMode ?? onActivatePinMode;
    const liveProofToolsHover = ctx.proofToolsHover ?? proofToolsHover;
    const liveSpotActionPicker = Boolean(ctx.spotActionPicker);
    const liveShowGridComments = ctx.showGridComments ?? showGridComments;
    const [spineBoundsTick, setSpineBoundsTick] = useState(0);
    const [coverTextTick, setCoverTextTick] = useState(0);
    useEffect(() => {
        if (!album?.id) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === album.id) setSpineBoundsTick((t) => t + 1);
        };
        window.addEventListener(SPINE_BOUNDS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(SPINE_BOUNDS_CHANGED_EVENT, onChanged);
    }, [album?.id]);
    useEffect(() => {
        if (!album?.id) return undefined;
        const onTextChanged = (e) => {
            if (e.detail?.albumId === album.id) setCoverTextTick((t) => t + 1);
        };
        window.addEventListener(COVER_TEXT_CHANGED_EVENT, onTextChanged);
        return () => window.removeEventListener(COVER_TEXT_CHANGED_EVENT, onTextChanged);
    }, [album?.id]);
    const bookWrapSpineLayout = useMemo(
        () => {
            if (album?.has_covers !== true) return null;
            if (album?.blank_covers === true) {
                const id = albumIdProp ?? album?.id;
                if (!id || !getSpreadPhotoOverride(id, 0)) return null;
            }
            return getBookWrapSpineLayout(album);
        },
        [album, spineBoundsTick]
    );
    const coverTransform = useMemo(() => {
        const id = albumIdProp ?? album?.id;
        if (!id || album?.has_covers !== true) {
            return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        }
        void liveTransformRevision;
        return getSpreadPhotoTransform(id, 0);
    }, [albumIdProp, album?.id, album?.has_covers, liveTransformRevision]);

    if (pageNum < 0 || pageNum >= totalPages) {
        return (
            <div className="ab-flip-page ab-flip-page--empty" ref={ref} data-density="hard">
                <div className="ab-page-empty" />
            </div>
        );
    }

    const albumId = albumIdProp ?? album?.id;
    void livePhotoRevision;
    void liveTransformRevision;
    const collectionCount = albumId ? getAlbumCollection(albumId).length : 0;
    const spreadOpts = getAlbumSpreadOptions(album, { collectionCount });
    const coverLayoutOpts =
        spreadOpts.hasCovers || album?.has_covers === true
            ? { ...spreadOpts, hasCovers: true, showCover: true }
            : spreadOpts;
    const gridOpts = { ...spreadOpts, totalPages };
    const { right: lastSpreadRight } = getLastSpreadInfo(totalPages, spreadOpts);
    const wholeSpread = placementMode === 'whole';
    const isWholeSpreadAlbum = wholeSpread || isWholeSpreadLayout(album?.grid_layout);
    const rightPageHasPhoto = pageHasVisiblePhoto(
        album,
        albumId,
        lastSpreadRight,
        totalPages,
        showSamples,
        isWholeSpreadAlbum,
        spreadOpts
    );
    const endSpreadRole = getEndSpreadPageRole(pageNum, totalPages, {
        ...spreadOpts,
        rightPageHasPhoto,
    });
    const preBackSpreadRole = getPreBackSpreadPageRole(pageNum, totalPages, spreadOpts);
    const spreadLeftForPage = getSpreadLeftPageIndex(pageNum, gridOpts);
    const labelForPin = (pinPageNum, cellId, whole = false) =>
        getSlotLabel(pinPageNum, cellId, whole, totalPages, album);
    const spreadWholePhoto = Boolean(albumId && getSpreadPhotoOverride(albumId, spreadLeftForPage));
    const useHalfSpreadLayout = !isWholeSpreadAlbum || !spreadWholePhoto;
    const endHalfLeftPage = isEndHalfSpreadLeftPage(spreadLeftForPage, totalPages, spreadOpts);
    const useLeftGrid = isProofLeftGridPage(pageNum, gridOpts) && !endHalfLeftPage;
    const useRightGrid = isProofRightGridPage(pageNum, gridOpts);
    const src = getPageImageSrc(album, pageNum, showSamples, coverLayoutOpts);
    const isFrontCoverPage = false;

    if (useHalfSpreadLayout) {
        if (
            preBackSpreadRole === 'half-blank' ||
            isPreBackHalfSpreadRightPage(pageNum, totalPages, spreadOpts)
        ) {
            return (
                <div
                    className="ab-flip-page ab-flip-page--half-blank ab-flip-page--pre-back-blank"
                    ref={ref}
                    data-density="hard"
                >
                    <div className="ab-page-empty" aria-hidden />
                </div>
            );
        }

        if (endSpreadRole === 'half-blank') {
            return (
                <div
                    className="ab-flip-page ab-flip-page--half-blank ab-flip-page--end-cover-blank"
                    ref={ref}
                    data-density="hard"
                >
                    <div className="ab-page-empty" aria-hidden />
                </div>
            );
        }
    }

    const pageBadge =
        showPageBadge && pageNum >= 0 ? (
            <span className="ab-badge ab-badge--focus">{pageNum + 1}</span>
        ) : null;

    if (isCoverInsidePage(pageNum, totalPages, coverLayoutOpts)) {
        return (
            <div className="ab-flip-page ab-flip-page--half-blank" ref={ref} data-density="hard">
                <div className="ab-page-empty" aria-hidden />
            </div>
        );
    }

    if (useHalfSpreadLayout) {
        if (isInsideCoverLeftPage(pageNum, spreadOpts)) {
            return (
                <div
                    className="ab-flip-page ab-flip-page--half-blank ab-flip-page--inside-cover-blank"
                    ref={ref}
                    data-density="hard"
                >
                    <div className="ab-page-empty" aria-hidden />
                </div>
            );
        }
    }

    const isFrontCoverRightPage = coverLayoutOpts.hasCovers && pageNum === 1;
    void coverTextTick;
    const coverText =
        isFrontCoverRightPage && albumId ? getAlbumCoverText(albumId) : '';
    const coverPlacementMode = placementMode;
    const showStar = pageNum === 1 && album?.is_starred;
    const canSelectCover = isFrontCoverRightPage && editable && !spreadEdit;
    const PageWrapTag = canSelectCover ? 'button' : 'div';
    const coverSwapMarkInfo = liveGetSwapMarkInfo?.(0, 0);
    const coverSwapMarkInfos =
        (liveSwapMarkMode || liveSpotActionPicker) && liveGetSwapMarkInfos
            ? liveGetSwapMarkInfos(0, 0, 0)
            : [];
    const canCoverSwap = (liveSwapMarkMode || liveSpotActionPicker) && pageNum === 1 && Boolean(src);
    const coverProofTools =
        (liveSwapMarkMode || livePinMarkMode) && pageNum === 1 && Boolean(src) && !liveSpotActionPicker;
    const coverPins =
        (livePinMarkMode || liveSpotActionPicker) && liveGetPinsForSlot
            ? liveGetPinsForSlot(1, 0, 0)
            : [];
    const isBackCoverPage = endSpreadRole === 'half-left' && spreadOpts.hasCovers;
    const isEndCoverPage = isBackCoverPage && !editable && !spreadEdit;
    const endCoverSwapMarkInfo =
        isEndCoverPage ? liveGetSwapMarkInfo?.(pageNum, 1, spreadLeftForPage) : null;
    const endCoverSwapMarkInfos =
        isEndCoverPage && (liveSwapMarkMode || liveSpotActionPicker) && liveGetSwapMarkInfos
            ? liveGetSwapMarkInfos(pageNum, 1, spreadLeftForPage)
            : [];
    const canEndCoverSwap =
        isEndCoverPage && (liveSwapMarkMode || liveSpotActionPicker) && Boolean(src);
    const endCoverProofTools =
        isEndCoverPage &&
        (liveSwapMarkMode || livePinMarkMode) &&
        Boolean(src) &&
        !liveSpotActionPicker;
    const endCoverPins =
        isEndCoverPage && (livePinMarkMode || liveSpotActionPicker) && liveGetPinsForSlot
            ? liveGetPinsForSlot(pageNum, 1, spreadLeftForPage)
            : [];

    const isInsideCoverRight = isInsideCoverRightPage(pageNum, totalPages, spreadOpts);
    const insideCoverPhotoSrc = isInsideCoverRight
        ? getInsideCoverRightPhotoSrc(albumId, { showSamples })
        : null;
    const insideCoverTransform = isInsideCoverRight && albumId
        ? getPagePhotoTransform(albumId, 3)
        : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const insideCoverSwapMarkInfo = isInsideCoverRight
        ? liveGetSwapMarkInfo?.(pageNum, 2, spreadLeftForPage)
        : null;
    const insideCoverSwapMarkInfos =
        isInsideCoverRight && (liveSwapMarkMode || liveSpotActionPicker) && liveGetSwapMarkInfos
            ? liveGetSwapMarkInfos(pageNum, 2, spreadLeftForPage)
            : [];
    const canInsideCoverSwap =
        isInsideCoverRight && (liveSwapMarkMode || liveSpotActionPicker) && Boolean(insideCoverPhotoSrc);
    const insideCoverProofTools =
        isInsideCoverRight &&
        (liveSwapMarkMode || livePinMarkMode) &&
        Boolean(insideCoverPhotoSrc) &&
        !liveSpotActionPicker;
    const insideCoverPins =
        isInsideCoverRight && (livePinMarkMode || liveSpotActionPicker) && liveGetPinsForSlot
            ? liveGetPinsForSlot(pageNum, 2, spreadLeftForPage)
            : [];

    const isPreBackHalfLeft = useHalfSpreadLayout && preBackSpreadRole === 'half-left';
    const preBackPhotoSrc = isPreBackHalfLeft
        ? (albumId && getPagePhotoOverride(albumId, pageNum)) || src
        : null;
    const preBackTransform = isPreBackHalfLeft && albumId
        ? getPagePhotoTransform(albumId, pageNum)
        : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const preBackSwapMarkInfo = isPreBackHalfLeft
        ? liveGetSwapMarkInfo?.(pageNum, 1, spreadLeftForPage)
        : null;
    const preBackSwapMarkInfos =
        isPreBackHalfLeft && (liveSwapMarkMode || liveSpotActionPicker) && liveGetSwapMarkInfos
            ? liveGetSwapMarkInfos(pageNum, 1, spreadLeftForPage)
            : [];
    const canPreBackSwap =
        isPreBackHalfLeft && (liveSwapMarkMode || liveSpotActionPicker) && Boolean(preBackPhotoSrc);
    const preBackProofTools =
        isPreBackHalfLeft &&
        (liveSwapMarkMode || livePinMarkMode) &&
        Boolean(preBackPhotoSrc) &&
        !liveSpotActionPicker;
    const preBackPins =
        isPreBackHalfLeft && (livePinMarkMode || liveSpotActionPicker) && liveGetPinsForSlot
            ? liveGetPinsForSlot(pageNum, 1, spreadLeftForPage)
            : [];

    if (isInsideCoverRight) {
        return (
            <div className="ab-flip-page ab-flip-page--single-photo" ref={ref} data-density="hard">
                {pageBadge}
                <div
                    className={`ab-page-photo-wrap${
                        liveProofToolsHover && insideCoverProofTools && !livePinModeActive
                            ? ' ab-page-photo-wrap--swap'
                            : ''
                    }${
                        insideCoverSwapMarkInfo
                            ? ` ab-page-photo-wrap--swap-marked${
                                  insideCoverSwapMarkInfo.locked !== false
                                      ? ' ab-page-photo-wrap--swap-locked'
                                      : ''
                              }`
                            : ''
                    }`}
                >
                    <AlbumPhotoPinLayer
                        hasPhoto={Boolean(insideCoverPhotoSrc)}
                        pinModeActive={livePinModeActive && livePinMarkMode}
                        swapPinModeActive={liveSwapPinModeActive}
                        swapPinTargetStep={liveSwapPinTargetStep}
                        proofToolsEnabled={insideCoverProofTools}
                        proofToolsHover={liveProofToolsHover}
                        canSwap={canInsideCoverSwap}
                        onSwapRequest={() =>
                            liveOnSwapRequest?.({
                                pageNum,
                                cellId: 2,
                                spreadLeft: spreadLeftForPage,
                                label: labelForPin(pageNum, 2),
                            })
                        }
                        onActivatePinMode={livePinMarkMode ? liveOnActivatePinMode : undefined}
                        onActivateSwapPinMode={
                            canInsideCoverSwap
                                ? () =>
                                      liveOnSwapRequest?.({
                                          pageNum,
                                          cellId: 2,
                                          spreadLeft: spreadLeftForPage,
                                          label: labelForPin(pageNum, 2),
                                      })
                                : undefined
                        }
                        onPlaceSwapPin={(xPct, yPct) =>
                            liveOnPlaceSwapPin?.({
                                pageNum,
                                cellId: 2,
                                spreadLeft: spreadLeftForPage,
                                label: labelForPin(pageNum, 2),
                                xPct,
                                yPct,
                            })
                        }
                        swapPins={[
                            ...insideCoverSwapMarkInfos
                                .filter((info) => info?.point)
                                .map((info) => ({
                                    id: `swap-pin-inside-${info.pinKey || info.markId}`,
                                    xPct: info.point.xPct,
                                    yPct: info.point.yPct,
                                    pinLabel: info.pinLabel || 'S',
                                    swapGroup: info.markId,
                                    message: `${info.slotLabel} ↔ ${info.partnerLabel}`,
                                })),
                            ...(liveSwapPinModeActive &&
                            liveSwapPinTargetStep &&
                            liveSwapPinOriginKey === `${pageNum}:2` &&
                            liveSwapPinOriginPoint?.xPct != null &&
                            liveSwapPinOriginPoint?.yPct != null
                                ? [
                                      {
                                          id: `swap-pin-live-inside-${pageNum}`,
                                          xPct: liveSwapPinOriginPoint.xPct,
                                          yPct: liveSwapPinOriginPoint.yPct,
                                          pinLabel: 'A',
                                          message: 'Source spot selected. Click target spot.',
                                      },
                                  ]
                                : []),
                        ]}
                        pins={insideCoverPins}
                        onPlacePin={(xPct, yPct) =>
                            liveOnPinPlace?.({
                                pageNum,
                                cellId: 2,
                                spreadLeft: spreadLeftForPage,
                                xPct,
                                yPct,
                                label: labelForPin(pageNum, 2),
                            })
                        }
                        onSaveSpotComment={
                            liveSpotActionPicker && liveOnPinSave
                                ? (xPct, yPct, message) =>
                                      liveOnPinSave({
                                          pageNum,
                                          cellId: 2,
                                          spreadLeft: spreadLeftForPage,
                                          xPct,
                                          yPct,
                                          label: labelForPin(pageNum, 2),
                                          message,
                                      })
                                : null
                        }
                        onRemovePin={liveOnPinRemove}
                    >
                        {insideCoverPhotoSrc ? (
                            <img
                                src={insideCoverPhotoSrc}
                                alt=""
                                className="ab-page-photo ab-page-photo--full"
                                draggable={false}
                                style={photoTransformStyle(insideCoverTransform)}
                            />
                        ) : (
                            <div className="ab-page-empty" aria-hidden />
                        )}
                    </AlbumPhotoPinLayer>
                    {!previewMode && <AlbumSwapMarkBadge markInfo={insideCoverSwapMarkInfo} />}
                </div>
            </div>
        );
    }

    if (isPreBackHalfLeft) {
        return (
            <div className="ab-flip-page ab-flip-page--half-photo-left" ref={ref} data-density="hard">
                {pageBadge}
                <div
                    className={`ab-page-photo-wrap${
                        liveProofToolsHover && preBackProofTools && !livePinModeActive
                            ? ' ab-page-photo-wrap--swap'
                            : ''
                    }${
                        preBackSwapMarkInfo
                            ? ` ab-page-photo-wrap--swap-marked${
                                  preBackSwapMarkInfo.locked !== false
                                      ? ' ab-page-photo-wrap--swap-locked'
                                      : ''
                              }`
                            : ''
                    }`}
                >
                    <AlbumPhotoPinLayer
                        hasPhoto={Boolean(preBackPhotoSrc)}
                        pinModeActive={livePinModeActive && livePinMarkMode}
                        swapPinModeActive={liveSwapPinModeActive}
                        swapPinTargetStep={liveSwapPinTargetStep}
                        proofToolsEnabled={preBackProofTools}
                        proofToolsHover={liveProofToolsHover}
                        canSwap={canPreBackSwap}
                        onSwapRequest={() =>
                            liveOnSwapRequest?.({
                                pageNum,
                                cellId: 1,
                                spreadLeft: spreadLeftForPage,
                                label: labelForPin(pageNum, 1),
                            })
                        }
                        onActivatePinMode={livePinMarkMode ? liveOnActivatePinMode : undefined}
                        onActivateSwapPinMode={
                            canPreBackSwap
                                ? () =>
                                      liveOnSwapRequest?.({
                                          pageNum,
                                          cellId: 1,
                                          spreadLeft: spreadLeftForPage,
                                          label: labelForPin(pageNum, 1),
                                      })
                                : undefined
                        }
                        onPlaceSwapPin={(xPct, yPct) =>
                            liveOnPlaceSwapPin?.({
                                pageNum,
                                cellId: 1,
                                spreadLeft: spreadLeftForPage,
                                xPct,
                                yPct,
                                label: labelForPin(pageNum, 1),
                            })
                        }
                        swapPins={[
                            ...preBackSwapMarkInfos
                                .filter((info) => info?.point)
                                .map((info) => ({
                                    id: `swap-pin-preback-${info.pinKey || info.markId}`,
                                    xPct: info.point.xPct,
                                    yPct: info.point.yPct,
                                    pinLabel: info.pinLabel || 'S',
                                    swapGroup: info.markId,
                                    message: `${info.slotLabel} ↔ ${info.partnerLabel}`,
                                })),
                            ...(liveSwapPinModeActive &&
                            liveSwapPinTargetStep &&
                            liveSwapPinOriginKey === `${pageNum}:1` &&
                            liveSwapPinOriginPoint?.xPct != null &&
                            liveSwapPinOriginPoint?.yPct != null
                                ? [
                                      {
                                          id: `swap-pin-live-preback-${pageNum}`,
                                          xPct: liveSwapPinOriginPoint.xPct,
                                          yPct: liveSwapPinOriginPoint.yPct,
                                          pinLabel: 'A',
                                          message: 'Source spot selected. Click target spot.',
                                      },
                                  ]
                                : []),
                        ]}
                        pins={preBackPins}
                        onPlacePin={(xPct, yPct) =>
                            liveOnPinPlace?.({
                                pageNum,
                                cellId: 1,
                                spreadLeft: spreadLeftForPage,
                                xPct,
                                yPct,
                                label: labelForPin(pageNum, 1),
                            })
                        }
                        onSaveSpotComment={
                            liveSpotActionPicker && liveOnPinSave
                                ? (xPct, yPct, message) =>
                                      liveOnPinSave({
                                          pageNum,
                                          cellId: 1,
                                          spreadLeft: spreadLeftForPage,
                                          xPct,
                                          yPct,
                                          label: labelForPin(pageNum, 1),
                                          message,
                                      })
                                : null
                        }
                        onRemovePin={liveOnPinRemove}
                    >
                        {preBackPhotoSrc ? (
                            <img
                                src={preBackPhotoSrc}
                                alt=""
                                className="ab-page-photo ab-page-photo--full"
                                draggable={false}
                                style={photoTransformStyle(preBackTransform)}
                            />
                        ) : (
                            <div className="ab-page-empty" aria-hidden />
                        )}
                    </AlbumPhotoPinLayer>
                    {!previewMode && <AlbumSwapMarkBadge markInfo={preBackSwapMarkInfo} />}
                </div>
            </div>
        );
    }

    if (useLeftGrid && !isBackCoverPage) {
        const { cells } = getProofLeftPageGridPercent();
        return (
            <div
                className="ab-flip-page ab-flip-page--grid ab-flip-page--grid-left"
                ref={ref}
                data-density="hard"
            >
                {pageBadge}
                <AlbumPageGrid
                    album={album}
                    albumId={albumId}
                    pageNum={pageNum}
                    totalPages={totalPages}
                    cells={cells}
                    editable={editable}
                    spreadEdit={spreadEdit}
                    placementMode={coverPlacementMode}
                    showSamples={showSamples}
                    previewMode={previewMode}
                    showGridComments={liveShowGridComments}
                    selectionLeftPage={liveSelectionLeftPage}
                    selectionMode={liveSelectionMode}
                    selectedCellId={liveSelectedCellId}
                    onSelectCell={liveOnSelectCell}
                    onSelectSpread={liveOnSelectSpread}
                    onSlotActivate={liveOnSlotActivate}
                    onTransformChange={liveOnTransformChange}
                    transformRevision={liveTransformRevision}
                    photoRevision={livePhotoRevision}
                    swapMarkMode={liveSwapMarkMode}
                    getSwapMarkInfo={liveGetSwapMarkInfo}
                    getSwapMarkInfos={liveGetSwapMarkInfos}
                    onSwapRequest={liveOnSwapRequest}
                    swapPinModeActive={liveSwapPinModeActive}
                    swapPinOriginKey={liveSwapPinOriginKey}
                    swapPinTargetStep={liveSwapPinTargetStep}
                    swapPinOriginPoint={liveSwapPinOriginPoint}
                    onPlaceSwapPin={liveOnPlaceSwapPin}
                    pinMarkMode={livePinMarkMode}
                    pinModeActive={livePinModeActive}
                    getPinsForSlot={liveGetPinsForSlot}
                    onPinPlace={liveOnPinPlace}
                    onPinRemove={liveOnPinRemove}
                    onActivatePinMode={liveOnActivatePinMode}
                    proofToolsHover={liveProofToolsHover}
                />
                {showStar && (
                    <span className="ab-page-star" aria-label="Starred">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f5c518" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </span>
                )}
            </div>
        );
    }

    if (useRightGrid && !isFrontCoverRightPage) {
        const { cells } = getProofRightPageGridPercent();
        return (
            <div
                className="ab-flip-page ab-flip-page--grid ab-flip-page--grid-right"
                ref={ref}
                data-density="hard"
            >
                {pageBadge}
                <AlbumPageGrid
                    album={album}
                    albumId={albumId}
                    pageNum={pageNum}
                    totalPages={totalPages}
                    cells={cells}
                    editable={editable}
                    spreadEdit={spreadEdit}
                    placementMode={coverPlacementMode}
                    showSamples={showSamples}
                    previewMode={previewMode}
                    showGridComments={liveShowGridComments}
                    selectionLeftPage={liveSelectionLeftPage}
                    selectionMode={liveSelectionMode}
                    selectedCellId={liveSelectedCellId}
                    onSelectCell={liveOnSelectCell}
                    onSelectSpread={liveOnSelectSpread}
                    onSlotActivate={liveOnSlotActivate}
                    onTransformChange={liveOnTransformChange}
                    transformRevision={liveTransformRevision}
                    photoRevision={livePhotoRevision}
                    swapMarkMode={liveSwapMarkMode}
                    getSwapMarkInfo={liveGetSwapMarkInfo}
                    getSwapMarkInfos={liveGetSwapMarkInfos}
                    onSwapRequest={liveOnSwapRequest}
                    swapPinModeActive={liveSwapPinModeActive}
                    swapPinOriginKey={liveSwapPinOriginKey}
                    swapPinTargetStep={liveSwapPinTargetStep}
                    swapPinOriginPoint={liveSwapPinOriginPoint}
                    onPlaceSwapPin={liveOnPlaceSwapPin}
                    pinMarkMode={livePinMarkMode}
                    pinModeActive={livePinModeActive}
                    getPinsForSlot={liveGetPinsForSlot}
                    onPinPlace={liveOnPinPlace}
                    onPinRemove={liveOnPinRemove}
                    onActivatePinMode={liveOnActivatePinMode}
                    proofToolsHover={liveProofToolsHover}
                />
            </div>
        );
    }

    if (endSpreadRole === 'half-left') {
        return (
            <div className="ab-flip-page ab-flip-page--half-photo-left" ref={ref} data-density="hard">
                {pageBadge}
                <div
                    className={`ab-page-photo-wrap${
                        liveProofToolsHover && endCoverProofTools && !livePinModeActive
                            ? ' ab-page-photo-wrap--swap'
                            : ''
                    }${
                        endCoverSwapMarkInfo
                            ? ` ab-page-photo-wrap--swap-marked${
                                  endCoverSwapMarkInfo.locked !== false
                                      ? ' ab-page-photo-wrap--swap-locked'
                                      : ''
                              }`
                            : ''
                    }`}
                >
                    <AlbumPhotoPinLayer
                        hasPhoto={Boolean(src)}
                        pinModeActive={livePinModeActive && livePinMarkMode}
                        swapPinModeActive={liveSwapPinModeActive}
                        swapPinTargetStep={liveSwapPinTargetStep}
                        proofToolsEnabled={endCoverProofTools}
                        proofToolsHover={liveProofToolsHover}
                        canSwap={canEndCoverSwap}
                        onSwapRequest={() =>
                            liveOnSwapRequest?.({
                                pageNum,
                                cellId: 1,
                                spreadLeft: spreadLeftForPage,
                                label: labelForPin(pageNum, 1),
                            })
                        }
                        onActivatePinMode={livePinMarkMode ? liveOnActivatePinMode : undefined}
                        onActivateSwapPinMode={
                            canEndCoverSwap
                                ? () =>
                                      liveOnSwapRequest?.({
                                          pageNum,
                                          cellId: 1,
                                          spreadLeft: spreadLeftForPage,
                                          label: labelForPin(pageNum, 1),
                                      })
                                : undefined
                        }
                        onPlaceSwapPin={(xPct, yPct) =>
                            liveOnPlaceSwapPin?.({
                                pageNum,
                                cellId: 1,
                                spreadLeft: spreadLeftForPage,
                                label: labelForPin(pageNum, 1),
                                xPct,
                                yPct,
                            })
                        }
                        swapPins={[
                            ...endCoverSwapMarkInfos
                                .filter((info) => info?.point)
                                .map((info) => ({
                                    id: `swap-pin-end-${info.pinKey || info.markId}`,
                                    xPct: info.point.xPct,
                                    yPct: info.point.yPct,
                                    pinLabel: info.pinLabel || 'S',
                                    swapGroup: info.markId,
                                    message: `${info.slotLabel} ↔ ${info.partnerLabel}`,
                                })),
                            ...(liveSwapPinModeActive &&
                            liveSwapPinTargetStep &&
                            liveSwapPinOriginKey === `${pageNum}:1` &&
                            liveSwapPinOriginPoint?.xPct != null &&
                            liveSwapPinOriginPoint?.yPct != null
                                ? [
                                      {
                                          id: `swap-pin-live-end-${pageNum}`,
                                          xPct: liveSwapPinOriginPoint.xPct,
                                          yPct: liveSwapPinOriginPoint.yPct,
                                          pinLabel: 'A',
                                          message: 'Source spot selected. Click target spot.',
                                      },
                                  ]
                                : []),
                        ]}
                        pins={endCoverPins}
                        onPlacePin={(xPct, yPct) =>
                            liveOnPinPlace?.({
                                pageNum,
                                cellId: 1,
                                spreadLeft: spreadLeftForPage,
                                xPct,
                                yPct,
                                label: labelForPin(pageNum, 1),
                            })
                        }
                        onSaveSpotComment={
                            liveSpotActionPicker && liveOnPinSave
                                ? (xPct, yPct, message) =>
                                      liveOnPinSave({
                                          pageNum,
                                          cellId: 1,
                                          spreadLeft: spreadLeftForPage,
                                          xPct,
                                          yPct,
                                          label: labelForPin(pageNum, 1),
                                          message,
                                      })
                                : null
                        }
                        onRemovePin={liveOnPinRemove}
                    >
                        {src ? (
                            isBackCoverPage && bookWrapSpineLayout ? (
                                <BookWrapSpineImage
                                    src={src}
                                    side="back"
                                    layout={bookWrapSpineLayout}
                                    transform={coverTransform}
                                    className="ab-page-photo ab-page-photo--full"
                                    panoramic="left"
                                />
                            ) : (
                                <PagePhoto
                                    src={src}
                                    pageNum={pageNum}
                                    showSamples={showSamples}
                                    className="ab-page-photo ab-page-photo--full"
                                />
                            )
                        ) : (
                            <div className="ab-page-empty" aria-hidden />
                        )}
                    </AlbumPhotoPinLayer>
                    {!previewMode && <AlbumSwapMarkBadge markInfo={endCoverSwapMarkInfo} />}
                </div>
            </div>
        );
    }

    if (isFrontCoverPage) {
        return (
            <div className="ab-flip-page ab-flip-page--front-cover" ref={ref} data-density="hard">
                {pageBadge}
                <PageWrapTag
                    type={canSelectCover ? 'button' : undefined}
                    className={`ab-front-cover-photo${
                        canSelectCover ? ' ab-page-photo-wrap--interactive' : ''
                    }${liveProofToolsHover && coverProofTools && !livePinModeActive ? ' ab-page-photo-wrap--swap' : ''}${
                        coverSwapMarkInfo
                            ? ` ab-page-photo-wrap--swap-marked${
                                  coverSwapMarkInfo.locked !== false
                                      ? ' ab-page-photo-wrap--swap-locked'
                                      : ''
                              }`
                            : ''
                    }`}
                    onClick={
                        canSelectCover
                            ? (e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  if (liveOnSlotActivate) {
                                      liveOnSlotActivate(
                                          {
                                              pageNum: 0,
                                              cellId: 0,
                                              spreadLeft: 0,
                                              whole: false,
                                              hasPhoto: Boolean(src),
                                              label: labelForPin(0, 0),
                                          },
                                          rect
                                      );
                                      return;
                                  }
                                  liveOnSelectCover?.();
                              }
                            : undefined
                    }
                    aria-label={canSelectCover ? 'Choose cover photo' : undefined}
                >
                    <AlbumPhotoPinLayer
                        hasPhoto={Boolean(src)}
                        pinModeActive={livePinModeActive && livePinMarkMode}
                        swapPinModeActive={liveSwapPinModeActive}
                        swapPinTargetStep={liveSwapPinTargetStep}
                        proofToolsEnabled={coverProofTools}
                        proofToolsHover={liveProofToolsHover}
                        canSwap={canCoverSwap}
                        onSwapRequest={() =>
                            liveOnSwapRequest?.({ pageNum: 0, cellId: 0, label: 'Cover' })
                        }
                        onActivatePinMode={livePinMarkMode ? liveOnActivatePinMode : undefined}
                        onActivateSwapPinMode={
                            canCoverSwap
                                ? () =>
                                      liveOnSwapRequest?.({
                                          pageNum: 0,
                                          cellId: 0,
                                          label: labelForPin(0, 0),
                                      })
                                : undefined
                        }
                        onPlaceSwapPin={(xPct, yPct) =>
                            liveOnPlaceSwapPin?.({
                                pageNum: 0,
                                cellId: 0,
                                label: labelForPin(0, 0),
                                xPct,
                                yPct,
                            })
                        }
                        swapPins={
                            [
                                ...coverSwapMarkInfos
                                    .filter((info) => info?.point)
                                    .map((info) => ({
                                        id: `swap-pin-cover-${info.pinKey || info.markId}`,
                                        xPct: info.point.xPct,
                                        yPct: info.point.yPct,
                                        pinLabel: info.pinLabel || 'S',
                                        swapGroup: info.markId,
                                        message: `${info.slotLabel} ↔ ${info.partnerLabel}`,
                                    })),
                                ...(liveSwapPinModeActive &&
                                liveSwapPinTargetStep &&
                                liveSwapPinOriginKey === '0:0' &&
                                liveSwapPinOriginPoint?.xPct != null &&
                                liveSwapPinOriginPoint?.yPct != null
                                    ? [
                                          {
                                              id: 'swap-pin-live-cover',
                                              xPct: liveSwapPinOriginPoint.xPct,
                                              yPct: liveSwapPinOriginPoint.yPct,
                                              pinLabel: 'A',
                                              message: 'Source spot selected. Click target spot.',
                                          },
                                      ]
                                    : []),
                            ]
                        }
                        pins={coverPins}
                        onPlacePin={(xPct, yPct) =>
                            liveOnPinPlace?.({
                                pageNum: 0,
                                cellId: 0,
                                xPct,
                                yPct,
                                label: labelForPin(0, 0),
                            })
                        }
                        onSaveSpotComment={
                            liveSpotActionPicker && liveOnPinSave
                                ? (xPct, yPct, message) =>
                                      liveOnPinSave({
                                          pageNum: 0,
                                          cellId: 0,
                                          xPct,
                                          yPct,
                                          label: labelForPin(0, 0),
                                          message,
                                      })
                                : null
                        }
                        onRemovePin={liveOnPinRemove}
                    >
                        {src ? (
                            <PagePhoto
                                src={src}
                                pageNum={pageNum}
                                showSamples={showSamples}
                                className="ab-page-photo ab-page-photo--full"
                            />
                        ) : (
                            <div className="ab-page-empty" aria-hidden />
                        )}
                    </AlbumPhotoPinLayer>
                    {!previewMode && <AlbumSwapMarkBadge markInfo={coverSwapMarkInfo} />}
                </PageWrapTag>
            </div>
        );
    }

    return (
        <div className="ab-flip-page" ref={ref} data-density="hard">
            {pageBadge}
            <PageWrapTag
                type={canSelectCover ? 'button' : undefined}
                className={`ab-page-photo-wrap${
                    canSelectCover ? ' ab-page-photo-wrap--interactive' : ''
                }${liveProofToolsHover && coverProofTools && !livePinModeActive ? ' ab-page-photo-wrap--swap' : ''}${
                    coverSwapMarkInfo
                        ? ` ab-page-photo-wrap--swap-marked${
                              coverSwapMarkInfo.locked !== false
                                  ? ' ab-page-photo-wrap--swap-locked'
                                  : ''
                          }`
                        : ''
                }`}
                onClick={canSelectCover ? () => liveOnSelectCover?.() : undefined}
                aria-label={canSelectCover ? 'Choose cover photo' : undefined}
            >
                <AlbumPhotoPinLayer
                    hasPhoto={Boolean(src)}
                    pinModeActive={livePinModeActive && livePinMarkMode && pageNum === 0}
                    swapPinModeActive={liveSwapPinModeActive}
                    swapPinTargetStep={liveSwapPinTargetStep}
                    proofToolsEnabled={coverProofTools}
                    proofToolsHover={liveProofToolsHover}
                    canSwap={canCoverSwap}
                    onSwapRequest={() =>
                        liveOnSwapRequest?.({ pageNum: 0, cellId: 0, label: 'Cover' })
                    }
                    onActivatePinMode={livePinMarkMode ? liveOnActivatePinMode : undefined}
                    onActivateSwapPinMode={
                        canCoverSwap
                            ? () =>
                                  liveOnSwapRequest?.({
                                      pageNum: 0,
                                      cellId: 0,
                                      label: labelForPin(0, 0),
                                  })
                            : undefined
                    }
                    onPlaceSwapPin={(xPct, yPct) =>
                        liveOnPlaceSwapPin?.({
                            pageNum: 0,
                            cellId: 0,
                            label: labelForPin(0, 0),
                            xPct,
                            yPct,
                        })
                    }
                    swapPins={
                        [
                            ...coverSwapMarkInfos
                                .filter((info) => info?.point)
                                .map((info) => ({
                                    id: `swap-pin-cover-single-${info.pinKey || info.markId}`,
                                    xPct: info.point.xPct,
                                    yPct: info.point.yPct,
                                    pinLabel: info.pinLabel || 'S',
                                    swapGroup: info.markId,
                                    message: `${info.slotLabel} ↔ ${info.partnerLabel}`,
                                })),
                            ...(liveSwapPinModeActive &&
                            liveSwapPinTargetStep &&
                            liveSwapPinOriginKey === '0:0' &&
                            liveSwapPinOriginPoint?.xPct != null &&
                            liveSwapPinOriginPoint?.yPct != null
                                ? [
                                      {
                                          id: 'swap-pin-live-cover-single',
                                          xPct: liveSwapPinOriginPoint.xPct,
                                          yPct: liveSwapPinOriginPoint.yPct,
                                          pinLabel: 'A',
                                          message: 'Source spot selected. Click target spot.',
                                      },
                                  ]
                                : []),
                        ]
                    }
                    pins={coverPins}
                    onPlacePin={(xPct, yPct) =>
                        liveOnPinPlace?.({
                            pageNum: 0,
                            cellId: 0,
                            xPct,
                            yPct,
                            label: labelForPin(0, 0),
                        })
                    }
                    onSaveSpotComment={
                        liveSpotActionPicker && liveOnPinSave
                            ? (xPct, yPct, message) =>
                                  liveOnPinSave({
                                      pageNum: 0,
                                      cellId: 0,
                                      xPct,
                                      yPct,
                                      label: labelForPin(0, 0),
                                      message,
                                  })
                            : null
                    }
                    onRemovePin={onPinRemove}
                >
                    {src ? (
                        isFrontCoverRightPage && bookWrapSpineLayout ? (
                            <BookWrapSpineImage
                                src={src}
                                side="front"
                                layout={bookWrapSpineLayout}
                                transform={coverTransform}
                                className="ab-page-photo ab-page-photo--full"
                                panoramic="right"
                            />
                        ) : (
                            <PagePhoto
                                src={src}
                                pageNum={pageNum}
                                showSamples={showSamples}
                            />
                        )
                    ) : (
                        <div className="ab-page-empty" aria-hidden />
                    )}
                    {coverText ? (
                        <div className="ab-cover-text-message" aria-hidden>
                            {coverText}
                        </div>
                    ) : null}
                </AlbumPhotoPinLayer>
                {!previewMode && <AlbumSwapMarkBadge markInfo={coverSwapMarkInfo} />}
                {showStar && (
                    <span className="ab-page-star" aria-label="Starred">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f5c518" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </span>
                )}
            </PageWrapTag>
        </div>
    );
});

export default React.memo(AlbumFlipPage);
