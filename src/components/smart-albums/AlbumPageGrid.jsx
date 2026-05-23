import React, { useState } from 'react';
import { getSampleImageForPage } from './sampleAlbumImages';
import { getProofCellPhotoIndex } from './albumSpreadGrid';

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
    if (pageNum === 1 && album.cover_image_url) {
        return album.cover_image_url;
    }
    return getSampleImageForPage(pageNum);
}

/**
 * Proof-style grid (absolute cells). Sizes are % of the flip page so the book grid stays the same.
 */
export default function AlbumPageGrid({ album, pageNum, totalPages, cells }) {
    return (
        <div className="ab-page-grid">
            {cells.map((cell) => {
                const photoIndex = getProofCellPhotoIndex(pageNum, cell.id, totalPages);
                const src = getImageSrc(album, photoIndex);

                return (
                    <div
                        key={cell.id}
                        className={`ab-grid-cell${cell.framed ? ' ab-grid-cell--framed' : ''}`}
                        style={{
                            left: cell.left,
                            top: cell.top,
                            width: cell.width,
                            height: cell.height,
                        }}
                    >
                        <div className="ab-grid-cell-photo-wrap">
                            <GridPhoto src={src} pageNum={photoIndex} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
