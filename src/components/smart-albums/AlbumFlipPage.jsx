import React, { useState } from 'react';
import {
    getGridSlotPhoto,
    getInsideCoverRightPhotoSrc,
    getPagePhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { getPagePhotoTransform, photoTransformStyle } from './albumPageTransforms';
import { getSampleImageForPage } from './sampleAlbumImages';
import AlbumPageGrid from './AlbumPageGrid';
import AlbumSwapMarkBadge from './AlbumSwapMarkBadge';
import AlbumPhotoPinLayer from './AlbumPhotoPinLayer';
import './AlbumPhotoPins.css';
import { useAlbumBookPageContext } from './AlbumBookPageContext';
import {
    getProofLeftPageGridPercent,
    getProofRightPageGridPercent,
    getSpreadLeftPageIndex,
    isProofLeftGridPage,
    isProofRightGridPage,
} from './albumSpreadGrid';
import { getAlbumCollection } from './albumCollection';
import {
    getAlbumSpreadOptions,
    getEndSpreadPageRole,
    getLastSpreadInfo,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverRightPage,
} from './albumSpreadUtils';

function getPageImageSrc(album, pageNum, showSamples, spreadOpts) {
    const opts = spreadOpts ?? getAlbumSpreadOptions(album);
    if (pageNum === 0 && opts.hasCovers) {
        return resolveCoverImageSrc(album, { showSamples });
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
    if (pageNum === 0 && opts.hasCovers && resolveCoverImageSrc(album, { showSamples })) {
        return true;
    }
    if (isInsideCoverRightPage(pageNum, totalPages, opts)) {
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

/** Cover / end spread: centered framed photo on plain background (side = which half of the spread). */
function FramedSpreadPhoto({ src, pageNum, showSamples, side = 'right' }) {
    if (!src && !showSamples) {
        return <div className="ab-page-empty" aria-hidden />;
    }

    return (
        <div className={`ab-framed-page ab-framed-page--${side}`}>
            <PagePhoto
                src={src}
                pageNum={pageNum}
                showSamples={showSamples}
                className="ab-framed-page-img"
            />
        </div>
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
    const liveOnActivatePinMode = ctx.onActivatePinMode ?? onActivatePinMode;
    const liveProofToolsHover = ctx.proofToolsHover ?? proofToolsHover;
    const liveShowGridComments = ctx.showGridComments ?? showGridComments;

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
    const gridOpts = { ...spreadOpts, totalPages };
    const { right: lastSpreadRight } = getLastSpreadInfo(totalPages, spreadOpts);
    const wholeSpread = placementMode === 'whole';
    const rightPageHasPhoto = pageHasVisiblePhoto(
        album,
        albumId,
        lastSpreadRight,
        totalPages,
        showSamples,
        wholeSpread,
        spreadOpts
    );
    const endSpreadRole = getEndSpreadPageRole(pageNum, totalPages, {
        ...spreadOpts,
        rightPageHasPhoto,
    });
    const spreadLeftForPage = getSpreadLeftPageIndex(pageNum, gridOpts);
    const endHalfLeftPage = isEndHalfSpreadLeftPage(spreadLeftForPage, totalPages, spreadOpts);
    const useLeftGrid = isProofLeftGridPage(pageNum, gridOpts) && !endHalfLeftPage;
    const useRightGrid = isProofRightGridPage(pageNum, gridOpts);
    const src = getPageImageSrc(album, pageNum, showSamples, spreadOpts);
    /** With covers, flipbook `showCover` renders page 0 alone — not a 50/50 spread. */
    const isFrontCoverPage =
        spreadOpts.hasCovers && pageNum === 0 && !useLeftGrid && !useRightGrid;

    if (endSpreadRole === 'half-blank') {
        return (
            <div className="ab-flip-page ab-flip-page--half-blank" ref={ref} data-density="hard">
                <div className="ab-page-empty" aria-hidden />
            </div>
        );
    }

    const pageBadge =
        showPageBadge && pageNum >= 0 ? (
            <span className="ab-badge ab-badge--focus">{pageNum + 1}</span>
        ) : null;

    if (isCoverInsidePage(pageNum, totalPages)) {
        return (
            <div className="ab-flip-page ab-flip-page--half-blank" ref={ref} data-density="hard">
                <div className="ab-page-empty" aria-hidden />
            </div>
        );
    }

    if (isInsideCoverRightPage(pageNum, totalPages, spreadOpts)) {
        const photoSrc = getInsideCoverRightPhotoSrc(albumId, { showSamples });
        const transform = albumId
            ? getPagePhotoTransform(albumId, 2)
            : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        return (
            <div
                className="ab-flip-page ab-flip-page--single-photo"
                ref={ref}
                data-density="hard"
            >
                {pageBadge}
                <div className="ab-single-page-photo">
                    {photoSrc ? (
                        <img
                            src={photoSrc}
                            alt=""
                            className="ab-page-photo ab-page-photo--full"
                            draggable={false}
                            style={photoTransformStyle(transform)}
                        />
                    ) : (
                        <div className="ab-page-empty" aria-hidden />
                    )}
                </div>
            </div>
        );
    }

    const showStar = pageNum === 1 && album?.is_starred;
    const canSelectCover = spreadOpts.hasCovers && pageNum === 0 && editable && !spreadEdit;
    const PageWrapTag = canSelectCover ? 'button' : 'div';
    const coverSwapMarkInfo = liveGetSwapMarkInfo?.(0, 0);
    const coverSwapMarkInfos =
        liveSwapMarkMode && liveGetSwapMarkInfos ? liveGetSwapMarkInfos(0, 0, 0) : [];
    const canCoverSwap = liveSwapMarkMode && pageNum === 0 && Boolean(src);
    const coverProofTools = (liveSwapMarkMode || livePinMarkMode) && pageNum === 0 && Boolean(src);
    const coverPins =
        livePinMarkMode && liveGetPinsForSlot ? liveGetPinsForSlot(0, 0, 0) : [];
    const isEndCoverPage = endSpreadRole === 'half-left' && !editable && !spreadEdit;
    const endCoverSwapMarkInfo =
        isEndCoverPage ? liveGetSwapMarkInfo?.(pageNum, 1, spreadLeftForPage) : null;
    const endCoverSwapMarkInfos =
        isEndCoverPage && liveSwapMarkMode && liveGetSwapMarkInfos
            ? liveGetSwapMarkInfos(pageNum, 1, spreadLeftForPage)
            : [];
    const canEndCoverSwap = isEndCoverPage && liveSwapMarkMode && Boolean(src);
    const endCoverProofTools = isEndCoverPage && (liveSwapMarkMode || livePinMarkMode) && Boolean(src);
    const endCoverPins =
        isEndCoverPage && livePinMarkMode && liveGetPinsForSlot
            ? liveGetPinsForSlot(pageNum, 1, spreadLeftForPage)
            : [];

    if (useLeftGrid) {
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
                    placementMode={placementMode}
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

    if (useRightGrid) {
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
                    placementMode={placementMode}
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
        if (editable || spreadEdit) {
            const { cells } = getProofLeftPageGridPercent();
            return (
                <div
                    className="ab-flip-page ab-flip-page--grid ab-flip-page--grid-left ab-flip-page--end-left-grid"
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
                        placementMode={placementMode}
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
                                label: 'End cover',
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
                                          label: 'End cover',
                                      })
                                : undefined
                        }
                        onPlaceSwapPin={(xPct, yPct) =>
                            liveOnPlaceSwapPin?.({
                                pageNum,
                                cellId: 1,
                                spreadLeft: spreadLeftForPage,
                                label: 'End cover',
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
                                label: 'End cover',
                            })
                        }
                        onRemovePin={liveOnPinRemove}
                    >
                        <FramedSpreadPhoto
                            src={src}
                            pageNum={pageNum}
                            showSamples={showSamples}
                            side="left"
                        />
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
                                              label: 'Cover',
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
                                          label: 'Cover',
                                      })
                                : undefined
                        }
                        onPlaceSwapPin={(xPct, yPct) =>
                            liveOnPlaceSwapPin?.({
                                pageNum: 0,
                                cellId: 0,
                                label: 'Cover',
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
                                label: 'Cover',
                            })
                        }
                        onRemovePin={liveOnPinRemove}
                    >
                        {src ? (
                            <FramedSpreadPhoto
                                src={src}
                                pageNum={pageNum}
                                showSamples={showSamples}
                                side="full"
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
                                      label: 'Cover',
                                  })
                            : undefined
                    }
                    onPlaceSwapPin={(xPct, yPct) =>
                        liveOnPlaceSwapPin?.({
                            pageNum: 0,
                            cellId: 0,
                            label: 'Cover',
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
                            label: 'Cover',
                        })
                    }
                    onRemovePin={onPinRemove}
                >
                    {src ? (
                        <PagePhoto src={src} pageNum={pageNum} showSamples={showSamples} />
                    ) : (
                        <div className="ab-page-empty" aria-hidden />
                    )}
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
