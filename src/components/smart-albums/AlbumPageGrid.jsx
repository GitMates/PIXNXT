import React, { useState } from 'react';
import { getGridSlotPhoto, getPagePhotoOverride, hasGridSlotPhoto } from './albumPagePhotos';
import {
    getPagePhotoTransform,
    getSpreadPhotoTransform,
    photoTransformStyle,
} from './albumPageTransforms';
import { getSpreadPhotoOverride } from './albumPagePhotos';
import { getSampleImageForPage } from './sampleAlbumImages';
import { getProofCellPhotoIndex, getSpreadLeftPageIndex } from './albumSpreadGrid';
import EditableGridPhoto from './EditableGridPhoto';
import AlbumSwapMarkBadge from './AlbumSwapMarkBadge';

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
        return <div className="ab-grid-cell-placeholder" />;
    }

    const panoClass =
        panoramic === 'left'
            ? ' ab-grid-cell-photo--spread-left'
            : panoramic === 'right'
              ? ' ab-grid-cell-photo--spread-right'
              : '';

    return (
        <img
            src={displaySrc}
            alt=""
            className={`ab-grid-cell-photo${panoClass}`}
            draggable={false}
            style={photoTransformStyle(transform)}
            onError={() => {
                if (!useSampleFallback && sampleSrc && src !== sampleSrc) {
                    setUseSampleFallback(true);
                }
            }}
        />
    );
}

function resolveSlotImage(albumId, pageNum, cellId, spreadLeft, { showSamples = true } = {}) {
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft);
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
    onTransformChange,
    transformRevision = 0,
    swapMarkMode = false,
    getSwapMarkInfo,
    onSwapRequest,
}) {
    const albumId = albumIdProp ?? album?.id;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { showCover: true });
    const inSelectedSpread =
        selectionLeftPage != null && selectionLeftPage === spreadLeft;
    const selectWholeSpread = selectionMode === 'spread' && inSelectedSpread;
    const wholePlacement = placementMode === 'whole';
    const useSelectCells = editable && !spreadEdit;
    const CellTag = useSelectCells ? 'button' : 'div';

    const buildSwapSlot = (photoIndex, cellId) => {
        const spreadNum = Math.floor((spreadLeft - 1) / 2) + 1;
        if (wholePlacement) {
            return {
                pageNum: spreadLeft,
                cellId: 1,
                spreadLeft,
                whole: true,
                label: `Spread ${spreadNum} · Whole`,
            };
        }
        const label =
            cellId === 1 ? `Spread ${spreadNum} · Left` : `Spread ${spreadNum} · Right`;
        return { pageNum: photoIndex, cellId, spreadLeft, label };
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
                const photoIndex = getProofCellPhotoIndex(pageNum, cell.id, totalPages);
                const { src, panoramic } = resolveSlotImage(
                    albumId,
                    photoIndex,
                    cell.id,
                    spreadLeft,
                    { showSamples }
                );
                const isSelected =
                    inSelectedSpread &&
                    (selectionMode === 'spread' || selectedCellId === cell.id);
                const hasPhoto = hasGridSlotPhoto(albumId, photoIndex, cell.id, spreadLeft);
                const spreadPhotoOnly = panoramic != null;
                const spreadSrc = spreadPhotoOnly
                    ? getSpreadPhotoOverride(albumId, spreadLeft)
                    : null;
                const swapMarkInfo =
                    swapMarkMode && getSwapMarkInfo?.(photoIndex, cell.id, spreadLeft);
                const canSwap = swapMarkMode && Boolean(src) && !swapMarkInfo;
                const markedClass = swapMarkInfo
                    ? ` ab-grid-cell--swap-marked${
                          swapMarkInfo.locked !== false ? ' ab-grid-cell--swap-locked' : ''
                      }`
                    : '';

                return (
                    <CellTag
                        key={cell.id}
                        type={useSelectCells ? 'button' : undefined}
                        className={`ab-grid-cell${cell.framed ? ' ab-grid-cell--framed' : ''}${
                            isSelected ? ' ab-grid-cell--selected' : ''
                        }${useSelectCells ? ' ab-grid-cell--interactive' : ''}${
                            spreadEdit && hasPhoto ? ' ab-grid-cell--editing' : ''
                        }${wholePlacement && selectWholeSpread ? ' ab-grid-cell--whole-unified' : ''}${markedClass}`}
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
                                      if (wholePlacement) {
                                          onSelectSpread?.(spreadLeft);
                                      } else {
                                          onSelectCell?.(spreadLeft, cell.id);
                                      }
                                  }
                                : undefined
                        }
                    >
                        <div
                            className={`ab-grid-cell-photo-wrap${
                                canSwap ? ' ab-grid-cell-photo-wrap--swap' : ''
                            }`}
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
                            {canSwap && (
                                <div className="ab-swap-hover">
                                    <button
                                        type="button"
                                        className="ab-swap-hover-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSwapRequest?.(buildSwapSlot(photoIndex, cell.id));
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                            <path d="M7 16V4M7 4 3 8M7 4l4 4" />
                                            <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
                                        </svg>
                                        Swap
                                    </button>
                                </div>
                            )}
                        </div>
                        <AlbumSwapMarkBadge markInfo={swapMarkInfo} />
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
