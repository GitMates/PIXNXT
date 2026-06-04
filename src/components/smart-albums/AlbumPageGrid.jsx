import React, { useState } from 'react';
import { getAlbumCollection } from './albumCollection';
import { getGridSlotPhoto, getPagePhotoOverride, hasGridSlotPhoto } from './albumPagePhotos';
import {
    getPagePhotoTransform,
    getSpreadPhotoTransform,
    photoTransformStyle,
} from './albumPageTransforms';
import { getSpreadPhotoOverride } from './albumPagePhotos';
import { getSampleImageForPage } from './sampleAlbumImages';
import { getProofCellPhotoIndex, getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getAlbumSpreadOptions,
    isEndHalfSpreadLeftPage,
    isFrontCoverSpreadLeft,
    isInsideCoverSpreadLeft,
} from './albumSpreadUtils';
import EditableGridPhoto from './EditableGridPhoto';
import AlbumSwapMarkBadge from './AlbumSwapMarkBadge';
import AlbumPhotoPinLayer from './AlbumPhotoPinLayer';
import './AlbumPhotoPins.css';
import { makeSlotKey } from './albumSwapMarks';

function GridPhoto({
    src,
    pageNum,
    albumId,
    spreadLeft,
    showSamples = true,
    transformRevision = 0,
    panoramic = null,
}) {
    const transform =
        albumId != null && panoramic != null && spreadLeft != null
            ? getSpreadPhotoTransform(albumId, spreadLeft)
            : albumId != null
              ? getPagePhotoTransform(albumId, pageNum)
              : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    void transformRevision;
    const [useSampleFallback, setUseSampleFallback] = useState(false);
    const sampleSrc = showSamples ? getSampleImageForPage(pageNum) : null;
    const displaySrc = useSampleFallback ? sampleSrc : src;

    if (!displaySrc) {
        return <div className="ab-page-empty" aria-hidden />;
    }

    const img = (
        <img
            src={displaySrc}
            alt=""
            className="ab-grid-cell-photo"
            draggable={false}
            style={photoTransformStyle(transform, { panoramic })}
            onError={() => {
                if (!useSampleFallback && sampleSrc && src !== sampleSrc) {
                    setUseSampleFallback(true);
                }
            }}
        />
    );

    if (panoramic) {
        return <span className={`ab-pano-bleed ab-pano-bleed--${panoramic}`}>{img}</span>;
    }

    return img;
}

function resolveSlotImage(
    albumId,
    pageNum,
    cellId,
    spreadLeft,
    totalPages,
    { showSamples = true, wholeSpread = false, spreadOpts } = {}
) {
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
        wholeSpread,
        spreadOpts,
    });
    if (slot.src) return slot;
    const sample = showSamples ? getSampleImageForPage(pageNum) : null;
    return { src: sample, panoramic: null };
}

export default function AlbumPageGrid({
    album,
    albumId: albumIdProp,
    pageNum,
    totalPages,
    cells,
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
    onTransformChange,
    transformRevision = 0,
    photoRevision = 0,
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
}) {
    const albumId = albumIdProp ?? album?.id;
    void photoRevision;
    void transformRevision;
    const collectionCount = albumId ? getAlbumCollection(albumId).length : 0;
    const spreadOpts = getAlbumSpreadOptions(album, { collectionCount });
    const spreadCtx = { ...spreadOpts, totalPages };
    const spreadLeft = getSpreadLeftPageIndex(pageNum, spreadCtx);
    const endHalfSpreadLeft = isEndHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts);
    const insideCoverSpread = isInsideCoverSpreadLeft(spreadLeft, totalPages, spreadOpts);
    const frontCoverSpread = isFrontCoverSpreadLeft(spreadLeft, spreadOpts);
    const inSelectedSpread =
        selectionLeftPage != null && selectionLeftPage === spreadLeft;
    const selectWholeSpread = selectionMode === 'spread' && inSelectedSpread;
    const wholePlacement =
        placementMode === 'whole' &&
        !endHalfSpreadLeft &&
        !insideCoverSpread &&
        !frontCoverSpread;
    const wholeSpread = wholePlacement;
    const useSelectCells = editable && !spreadEdit;
    const CellTag = useSelectCells ? 'button' : 'div';

    const buildSwapSlot = (photoIndex, cellId) => {
        const spreadNum = Math.floor((spreadLeft - 1) / 2) + 1;
        if (wholePlacement) {
            const isRightHalf = pageNum > spreadLeft || cellId === 2;
            const halfPage = isRightHalf
                ? Math.min(spreadLeft + 1, Math.max(0, totalPages - 1))
                : spreadLeft;
            const halfCell = isRightHalf ? 2 : 1;
            return {
                pageNum: halfPage,
                cellId: halfCell,
                spreadLeft,
                whole: true,
                label: `Spread ${spreadNum} · ${isRightHalf ? 'Right' : 'Left'}`,
            };
        }
        const label =
            cellId === 1 ? `Spread ${spreadNum} · Left` : `Spread ${spreadNum} · Right`;
        return { pageNum: photoIndex, cellId, spreadLeft, label };
    };

    const swapPointOnThisHalf = (point, halfPage, halfCell) => {
        if (!point || !wholePlacement) return true;
        const ptPage = point.pageNum ?? halfPage;
        const ptCell = point.cellId ?? halfCell;
        return ptPage === halfPage && ptCell === halfCell;
    };

    return (
        <div
            className={`ab-page-grid${editable ? ' ab-page-grid--editable' : ''}${
                spreadEdit ? ' ab-page-grid--spread-edit' : ''
            }${selectWholeSpread ? ' ab-page-grid--spread-selected' : ''}${
                wholePlacement && selectWholeSpread ? ' ab-page-grid--whole-target' : ''
            }${previewMode ? ' ab-page-grid--preview' : ''}`}
            onClick={
                useSelectCells
                    ? (e) => {
                          if (e.target === e.currentTarget || wholePlacement) {
                              onSelectSpread?.(spreadLeft);
                          }
                      }
                    : undefined
            }
            role={useSelectCells ? 'group' : undefined}
            aria-label={
                useSelectCells
                    ? wholePlacement
                        ? 'Whole spread — one photo'
                        : 'Spread photo grid'
                    : undefined
            }
        >
            {cells.map((cell) => {
                if (wholePlacement && pageNum !== spreadLeft) {
                    const spreadOnly = getGridSlotPhoto(
                        albumId,
                        pageNum,
                        cell.id,
                        spreadLeft,
                        totalPages,
                        { wholeSpread: true, spreadOpts: spreadCtx }
                    );
                    if (!spreadOnly.src) return null;
                }

                const photoIndex = getProofCellPhotoIndex(
                    pageNum,
                    cell.id,
                    totalPages,
                    spreadCtx
                );
                const { src, panoramic } = resolveSlotImage(
                    albumId,
                    photoIndex,
                    cell.id,
                    spreadLeft,
                    totalPages,
                    { showSamples, wholeSpread, spreadOpts: spreadCtx }
                );
                const isSelected =
                    inSelectedSpread &&
                    (selectionMode === 'spread' || selectedCellId === cell.id);
                const hasPhoto = hasGridSlotPhoto(
                    albumId,
                    photoIndex,
                    cell.id,
                    spreadLeft,
                    totalPages,
                    { wholeSpread, spreadOpts: spreadCtx }
                );
                const spreadPhotoOnly = panoramic != null;
                const spreadSrc = spreadPhotoOnly
                    ? getSpreadPhotoOverride(albumId, spreadLeft)
                    : null;
                const swapMarkInfo = getSwapMarkInfo?.(photoIndex, cell.id, spreadLeft);
                const swapMarkInfos =
                    swapMarkMode && getSwapMarkInfos
                        ? getSwapMarkInfos(photoIndex, cell.id, spreadLeft)
                        : swapMarkInfo
                          ? [swapMarkInfo]
                          : [];
                const canSwap = swapMarkMode && Boolean(src);
                const proofTools = (swapMarkMode || pinMarkMode) && Boolean(src);
                const slotPins =
                    pinMarkMode && getPinsForSlot
                        ? getPinsForSlot(photoIndex, cell.id, spreadLeft)
                        : [];
                const markedClass = swapMarkInfo
                    ? ` ab-grid-cell--swap-marked${
                          swapMarkInfo.locked !== false ? ' ab-grid-cell--swap-locked' : ''
                      }`
                    : '';
                const swapPins = swapMarkInfos
                    .filter((info) => info?.point && swapPointOnThisHalf(info.point, pageNum, cell.id))
                    .map((info) => ({
                        id: `swap-pin-${info.pinKey || info.markId}-${photoIndex}-${cell.id}`,
                        xPct: info.point.xPct,
                        yPct: info.point.yPct,
                        pinLabel: info.pinLabel || 'S',
                        swapGroup: info.markId,
                        message: `${info.slotLabel} ↔ ${info.partnerLabel}`,
                    }));
                const slotKey = makeSlotKey(photoIndex, cell.id);
                const isOriginSlot =
                    Boolean(swapPinModeActive) && Boolean(swapPinOriginKey) && slotKey === swapPinOriginKey;
                const swapPinPlacementEnabled =
                    Boolean(swapPinModeActive) &&
                    (Boolean(src) || (swapPinTargetStep && !isOriginSlot));
                if (
                    isOriginSlot &&
                    swapPinTargetStep &&
                    swapPinOriginPoint?.xPct != null &&
                    swapPinOriginPoint?.yPct != null &&
                    swapPointOnThisHalf(swapPinOriginPoint, pageNum, cell.id)
                ) {
                    swapPins.push({
                        id: `swap-pin-live-${slotKey}`,
                        xPct: swapPinOriginPoint.xPct,
                        yPct: swapPinOriginPoint.yPct,
                        pinLabel: 'A',
                        message: 'Source spot selected. Click target spot.',
                    });
                }

                return (
                    <CellTag
                        key={cell.id}
                        type={useSelectCells ? 'button' : undefined}
                        className={`ab-grid-cell${cell.framed ? ' ab-grid-cell--framed' : ''}${
                            isSelected ? ' ab-grid-cell--selected' : ''
                        }${useSelectCells ? ' ab-grid-cell--interactive' : ''}${
                            useSelectCells && hasPhoto ? ' ab-grid-cell--has-photo' : ''
                        }${spreadEdit && hasPhoto ? ' ab-grid-cell--editing' : ''}${
                            wholePlacement && selectWholeSpread ? ' ab-grid-cell--whole-unified' : ''
                        }${markedClass}`}
                        style={{
                            left: cell.left,
                            top: cell.top,
                            width: cell.width,
                            height: cell.height,
                        }}
                        aria-label={
                            useSelectCells
                                ? wholePlacement
                                    ? `Whole spread${isSelected ? ', selected' : ''}`
                                    : `Photo slot ${cell.id}${isSelected ? ', selected' : ''}`
                                : undefined
                        }
                        aria-pressed={useSelectCells ? isSelected : undefined}
                        onClick={
                            useSelectCells
                                ? (e) => {
                                      e.stopPropagation();
                                      const slot = buildSwapSlot(photoIndex, cell.id);
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      if (onSlotActivate) {
                                          onSlotActivate(
                                              {
                                                  pageNum: slot.pageNum,
                                                  cellId: slot.cellId,
                                                  spreadLeft: slot.spreadLeft,
                                                  whole: Boolean(slot.whole),
                                                  hasPhoto,
                                                  label: slot.label,
                                              },
                                              rect
                                          );
                                          return;
                                      }
                                      if (wholePlacement) {
                                          onSelectSpread?.(spreadLeft);
                                      } else {
                                          onSelectCell?.(spreadLeft, cell.id);
                                      }
                                  }
                                : undefined
                        }
                    >
                        <AlbumPhotoPinLayer
                            className={
                                proofToolsHover && proofTools && !pinModeActive
                                    ? ' ab-grid-cell-photo-wrap--swap'
                                    : ''
                            }
                            hasPhoto={Boolean(src)}
                            swapPinPlacementEnabled={swapPinPlacementEnabled}
                            pinModeActive={pinModeActive && pinMarkMode}
                            proofToolsEnabled={proofTools}
                            proofToolsHover={proofToolsHover}
                            canSwap={canSwap}
                            onSwapRequest={() => onSwapRequest?.(buildSwapSlot(photoIndex, cell.id))}
                            onActivateSwapPinMode={
                                canSwap ? () => onSwapRequest?.(buildSwapSlot(photoIndex, cell.id)) : undefined
                            }
                            swapPinModeActive={swapPinModeActive}
                            swapPinTargetStep={swapPinTargetStep}
                            renderPlacementHint={false}
                            onPlaceSwapPin={(xPct, yPct) =>
                                onPlaceSwapPin?.({
                                    ...buildSwapSlot(photoIndex, cell.id),
                                    xPct,
                                    yPct,
                                })
                            }
                            swapPins={swapPins}
                            onActivatePinMode={pinMarkMode ? onActivatePinMode : undefined}
                            pins={slotPins}
                            onPlacePin={(xPct, yPct) => {
                                let targetPage = photoIndex;
                                let targetCell = cell.id;
                                if (wholePlacement) {
                                    targetPage = cell.id === 2 ? spreadLeft + 1 : spreadLeft;
                                    targetCell = cell.id;
                                }
                                onPinPlace?.({
                                    pageNum: targetPage,
                                    cellId: targetCell,
                                    spreadLeft,
                                    xPct,
                                    yPct,
                                    label: buildSwapSlot(photoIndex, cell.id).label,
                                });
                            }}
                            onRemovePin={onPinRemove}
                        >
                            {spreadEdit && hasPhoto ? (
                                <EditableGridPhoto
                                    albumId={albumId}
                                    pageNum={photoIndex}
                                    spreadLeftPage={spreadLeft}
                                    panoramic={panoramic}
                                    src={
                                        spreadSrc ||
                                        getPagePhotoOverride(albumId, photoIndex)
                                    }
                                    transformRevision={transformRevision}
                                    onTransformChange={onTransformChange}
                                />
                            ) : (
                                <GridPhoto
                                    src={src}
                                    pageNum={photoIndex}
                                    albumId={albumId}
                                    spreadLeft={spreadLeft}
                                    showSamples={showSamples}
                                    transformRevision={transformRevision}
                                    panoramic={panoramic}
                                />
                            )}
                        </AlbumPhotoPinLayer>
                        {!previewMode && <AlbumSwapMarkBadge markInfo={swapMarkInfo} />}
                        {useSelectCells && !hasPhoto && (
                            <span className="ab-grid-cell-add">
                                <span className="ab-grid-cell-add-icon">+</span>
                                <span className="ab-grid-cell-add-label">Add photo</span>
                            </span>
                        )}
                        {previewMode && !hasPhoto && (
                            <span className="ab-grid-cell-empty" aria-hidden />
                        )}
                    </CellTag>
                );
            })}
        </div>
    );
}
