import React, { useState } from 'react';
import { getPagePhotoOverride } from './albumPagePhotos';
import { getSampleImageForPage } from './sampleAlbumImages';
import { getProofCellPhotoIndex, getSpreadLeftPageIndex } from './albumSpreadGrid';

function GridPhoto({ src, pageNum }) {
    const [useSampleFallback, setUseSampleFallback] = useState(false);
    const sampleSrc = getSampleImageForPage(pageNum);
    const displaySrc = useSampleFallback ? sampleSrc : src;

    if (!displaySrc) {
        return <div className="ab-grid-cell-placeholder" />;
    }

    return (
        <img
            src={displaySrc}
            alt=""
            className="ab-grid-cell-photo"
            draggable={false}
            onError={() => {
                if (!useSampleFallback && sampleSrc && src !== sampleSrc) {
                    setUseSampleFallback(true);
                }
            }}
        />
    );
}

function getImageSrc(album, pageNum) {
    const override = getPagePhotoOverride(album?.id, pageNum);
    if (override) return override;
    if (pageNum === 1 && album.cover_image_url) {
        return album.cover_image_url;
    }
    return getSampleImageForPage(pageNum);
}

/**
 * Proof-style grid (absolute cells). Sizes are % of the flip page so the book grid stays the same.
 */
export default function AlbumPageGrid({
    album,
    pageNum,
    totalPages,
    cells,
    editable = false,
    selectionLeftPage = null,
    selectionMode = null,
    selectedCellId = null,
    onSelectCell,
    onSelectSpread,
}) {
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { showCover: true });
    const inSelectedSpread =
        selectionLeftPage != null && selectionLeftPage === spreadLeft;
    const selectWholeSpread = selectionMode === 'spread' && inSelectedSpread;
    const CellTag = editable ? 'button' : 'div';

    return (
        <div
            className={`ab-page-grid${editable ? ' ab-page-grid--editable' : ''}${
                selectWholeSpread ? ' ab-page-grid--spread-selected' : ''
            }`}
            onClick={
                editable
                    ? (e) => {
                          if (e.target === e.currentTarget) {
                              onSelectSpread?.(spreadLeft);
                          }
                      }
                    : undefined
            }
            onKeyDown={undefined}
            role={editable ? 'group' : undefined}
            aria-label={editable ? 'Spread photo grid' : undefined}
        >
            {cells.map((cell) => {
                const photoIndex = getProofCellPhotoIndex(pageNum, cell.id, totalPages);
                const src = getImageSrc(album, photoIndex);
                const isSelected =
                    inSelectedSpread &&
                    (selectionMode === 'spread' || selectedCellId === cell.id);
                const hasPhoto = Boolean(getPagePhotoOverride(album?.id, photoIndex));

                return (
                    <CellTag
                        key={cell.id}
                        type={editable ? 'button' : undefined}
                        className={`ab-grid-cell${cell.framed ? ' ab-grid-cell--framed' : ''}${
                            isSelected ? ' ab-grid-cell--selected' : ''
                        }${editable ? ' ab-grid-cell--interactive' : ''}`}
                        style={{
                            left: cell.left,
                            top: cell.top,
                            width: cell.width,
                            height: cell.height,
                        }}
                        aria-label={
                            editable ? `Photo slot ${cell.id}${isSelected ? ', selected' : ''}` : undefined
                        }
                        aria-pressed={editable ? isSelected : undefined}
                        onClick={
                            editable
                                ? (e) => {
                                      e.stopPropagation();
                                      onSelectCell?.(spreadLeft, cell.id);
                                  }
                                : undefined
                        }
                    >
                        <div className="ab-grid-cell-photo-wrap">
                            <GridPhoto src={src} pageNum={photoIndex} />
                        </div>
                        {editable && !hasPhoto && (
                            <span className="ab-grid-cell-add" aria-hidden>
                                +
                            </span>
                        )}
                    </CellTag>
                );
            })}
        </div>
    );
}
