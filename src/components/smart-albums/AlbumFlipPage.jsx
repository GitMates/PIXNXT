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
import {
    getProofLeftPageGridPercent,
    getProofRightPageGridPercent,
    getSpreadLeftPageIndex,
    isProofLeftGridPage,
    isProofRightGridPage,
} from './albumSpreadGrid';
import {
    getEndSpreadPageRole,
    getLastSpreadInfo,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverRightPage,
} from './albumSpreadUtils';

function getPageImageSrc(album, pageNum, showSamples) {
    if (pageNum === 0) {
        return resolveCoverImageSrc(album, { showSamples });
    }
    const albumId = album?.id;
    if (albumId) {
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return pageSrc;
    }
    return showSamples ? getSampleImageForPage(pageNum) : null;
}

function pageHasVisiblePhoto(album, albumId, pageNum, totalPages, showSamples, wholeSpread = false) {
    if (pageNum === 0 && resolveCoverImageSrc(album, { showSamples })) return true;
    if (isInsideCoverRightPage(pageNum, totalPages)) {
        return Boolean(getInsideCoverRightPhotoSrc(albumId, { showSamples }));
    }
    if (getPagePhotoOverride(albumId, pageNum)) return true;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { showCover: true, totalPages });
    const gridOpts = { wholeSpread };
    if (isProofLeftGridPage(pageNum, { showCover: true, totalPages })) {
        const slot = getGridSlotPhoto(albumId, pageNum, 1, spreadLeft, totalPages, gridOpts);
        if (slot?.src) return true;
    }
    if (isProofRightGridPage(pageNum, { showCover: true, totalPages })) {
        const slot = getGridSlotPhoto(albumId, pageNum, 2, spreadLeft, totalPages, gridOpts);
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

/** Cover / end spread: blurred bleed + centered framed photo (side = which half of the spread). */
function FramedSpreadPhoto({ src, pageNum, showSamples, side = 'right' }) {
    const [useSampleFallback, setUseSampleFallback] = useState(false);
    const sampleSrc = showSamples ? getSampleImageForPage(pageNum) : null;
    const displaySrc = useSampleFallback ? sampleSrc : src;

    if (!displaySrc) {
        return <div className="ab-page-empty" aria-hidden />;
    }

    return (
        <div className={`ab-framed-page ab-framed-page--${side}`}>
            <span className="ab-framed-page-bg" aria-hidden>
                <img
                    src={displaySrc}
                    alt=""
                    draggable={false}
                    onError={() => {
                        if (!useSampleFallback && sampleSrc && src !== sampleSrc) {
                            setUseSampleFallback(true);
                        }
                    }}
                />
            </span>
            <PagePhoto
                src={displaySrc}
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
        onSelectCover,
        onTransformChange,
        transformRevision = 0,
        showPageBadge = false,
        swapMarkMode = false,
        getSwapMarkInfo,
        onSwapRequest,
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
    if (pageNum < 0 || pageNum >= totalPages) {
        return (
            <div className="ab-flip-page ab-flip-page--empty" ref={ref} data-density="hard">
                <div className="ab-page-empty" />
            </div>
        );
    }

    const albumId = albumIdProp ?? album?.id;
    const { right: lastSpreadRight } = getLastSpreadInfo(totalPages);
    const wholeSpread = placementMode === 'whole';
    const rightPageHasPhoto = pageHasVisiblePhoto(
        album,
        albumId,
        lastSpreadRight,
        totalPages,
        showSamples,
        wholeSpread
    );
    const endSpreadRole = getEndSpreadPageRole(pageNum, totalPages, {
        rightPageHasPhoto,
    });
    const gridOpts = { showCover: true, totalPages };
    const spreadLeftForPage = getSpreadLeftPageIndex(pageNum, gridOpts);
    const endHalfLeftPage = isEndHalfSpreadLeftPage(spreadLeftForPage, totalPages);
    const useLeftGrid = isProofLeftGridPage(pageNum, gridOpts) && !endHalfLeftPage;
    const useRightGrid = isProofRightGridPage(pageNum, gridOpts);
    const src = getPageImageSrc(album, pageNum, showSamples);
    /** Flipbook `showCover` renders page 0 as a single page — full cover, not a 50/50 spread. */
    const isFrontCoverPage = pageNum === 0 && !useLeftGrid && !useRightGrid;

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

    if (isInsideCoverRightPage(pageNum, totalPages)) {
        const photoSrc = getInsideCoverRightPhotoSrc(albumId, { showSamples });
        const transform = albumId
            ? getPagePhotoTransform(albumId, 2)
            : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        void transformRevision;
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
    const canSelectCover = pageNum === 0 && editable && !spreadEdit;
    const PageWrapTag = canSelectCover ? 'button' : 'div';
    const coverSwapMarkInfo = swapMarkMode && getSwapMarkInfo?.(0, 0);
    const canCoverSwap = swapMarkMode && pageNum === 0 && Boolean(src) && !coverSwapMarkInfo;
    const coverProofTools = (swapMarkMode || pinMarkMode) && pageNum === 0 && Boolean(src);
    const coverPins =
        pinMarkMode && getPinsForSlot ? getPinsForSlot(0, 0, 0) : [];

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
                    showGridComments={showGridComments}
                    selectionLeftPage={selectionLeftPage}
                    selectionMode={selectionMode}
                    selectedCellId={selectedCellId}
                    onSelectCell={onSelectCell}
                    onSelectSpread={onSelectSpread}
                    onTransformChange={onTransformChange}
                    transformRevision={transformRevision}
                    swapMarkMode={swapMarkMode}
                    getSwapMarkInfo={getSwapMarkInfo}
                    onSwapRequest={onSwapRequest}
                    pinMarkMode={pinMarkMode}
                    pinModeActive={pinModeActive}
                    getPinsForSlot={getPinsForSlot}
                    onPinPlace={onPinPlace}
                    onPinRemove={onPinRemove}
                    onActivatePinMode={onActivatePinMode}
                    proofToolsHover={proofToolsHover}
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
                    showGridComments={showGridComments}
                    selectionLeftPage={selectionLeftPage}
                    selectionMode={selectionMode}
                    selectedCellId={selectedCellId}
                    onSelectCell={onSelectCell}
                    onSelectSpread={onSelectSpread}
                    onTransformChange={onTransformChange}
                    transformRevision={transformRevision}
                    swapMarkMode={swapMarkMode}
                    getSwapMarkInfo={getSwapMarkInfo}
                    onSwapRequest={onSwapRequest}
                    pinMarkMode={pinMarkMode}
                    pinModeActive={pinModeActive}
                    getPinsForSlot={getPinsForSlot}
                    onPinPlace={onPinPlace}
                    onPinRemove={onPinRemove}
                    onActivatePinMode={onActivatePinMode}
                    proofToolsHover={proofToolsHover}
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
                        showGridComments={showGridComments}
                        selectionLeftPage={selectionLeftPage}
                        selectionMode={selectionMode}
                        selectedCellId={selectedCellId}
                        onSelectCell={onSelectCell}
                        onSelectSpread={onSelectSpread}
                        onTransformChange={onTransformChange}
                        transformRevision={transformRevision}
                        swapMarkMode={swapMarkMode}
                        getSwapMarkInfo={getSwapMarkInfo}
                        onSwapRequest={onSwapRequest}
                        pinMarkMode={pinMarkMode}
                        pinModeActive={pinModeActive}
                        getPinsForSlot={getPinsForSlot}
                        onPinPlace={onPinPlace}
                        onPinRemove={onPinRemove}
                        onActivatePinMode={onActivatePinMode}
                        proofToolsHover={proofToolsHover}
                    />
                </div>
            );
        }
        return (
            <div className="ab-flip-page ab-flip-page--half-photo-left" ref={ref} data-density="hard">
                {pageBadge}
                <FramedSpreadPhoto
                    src={src}
                    pageNum={pageNum}
                    showSamples={showSamples}
                    side="left"
                />
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
                    }${proofToolsHover && coverProofTools && !pinModeActive ? ' ab-page-photo-wrap--swap' : ''}${
                        coverSwapMarkInfo
                            ? ` ab-page-photo-wrap--swap-marked${
                                  coverSwapMarkInfo.locked !== false
                                      ? ' ab-page-photo-wrap--swap-locked'
                                      : ''
                              }`
                            : ''
                    }`}
                    onClick={canSelectCover ? () => onSelectCover?.() : undefined}
                    aria-label={canSelectCover ? 'Choose cover photo' : undefined}
                >
                    <AlbumPhotoPinLayer
                        hasPhoto={Boolean(src)}
                        pinModeActive={pinModeActive && pinMarkMode}
                        proofToolsEnabled={coverProofTools}
                        proofToolsHover={proofToolsHover}
                        canSwap={canCoverSwap}
                        onSwapRequest={() =>
                            onSwapRequest?.({ pageNum: 0, cellId: 0, label: 'Cover' })
                        }
                        onActivatePinMode={pinMarkMode ? onActivatePinMode : undefined}
                        pins={coverPins}
                        onPlacePin={(xPct, yPct) =>
                            onPinPlace?.({
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
                    <AlbumSwapMarkBadge markInfo={coverSwapMarkInfo} />
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
                }${proofToolsHover && coverProofTools && !pinModeActive ? ' ab-page-photo-wrap--swap' : ''}${
                    coverSwapMarkInfo
                        ? ` ab-page-photo-wrap--swap-marked${
                              coverSwapMarkInfo.locked !== false
                                  ? ' ab-page-photo-wrap--swap-locked'
                                  : ''
                          }`
                        : ''
                }`}
                onClick={canSelectCover ? () => onSelectCover?.() : undefined}
                aria-label={canSelectCover ? 'Choose cover photo' : undefined}
            >
                <AlbumPhotoPinLayer
                    hasPhoto={Boolean(src)}
                    pinModeActive={pinModeActive && pinMarkMode && pageNum === 0}
                    proofToolsEnabled={coverProofTools}
                    proofToolsHover={proofToolsHover}
                    canSwap={canCoverSwap}
                    onSwapRequest={() =>
                        onSwapRequest?.({ pageNum: 0, cellId: 0, label: 'Cover' })
                    }
                    onActivatePinMode={pinMarkMode ? onActivatePinMode : undefined}
                    pins={coverPins}
                    onPlacePin={(xPct, yPct) =>
                        onPinPlace?.({
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
                <AlbumSwapMarkBadge markInfo={coverSwapMarkInfo} />
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
