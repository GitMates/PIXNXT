import React, { useState } from 'react';
import { getSampleImageForPage } from './sampleAlbumImages';

function getPageImageSrc(album, pageNum) {
    if (pageNum === 1 && album.cover_image_url) {
        return album.cover_image_url;
    }
    return getSampleImageForPage(pageNum);
}

function PagePhoto({ src, pageNum }) {
    const [useSampleFallback, setUseSampleFallback] = useState(false);
    const sampleSrc = getSampleImageForPage(pageNum);
    const displaySrc = useSampleFallback ? sampleSrc : src;

    if (!displaySrc) {
        return <div className="ab-page-placeholder">Add photos to this spread</div>;
    }

    return (
        <img
            key={displaySrc}
            src={displaySrc}
            alt=""
            className="ab-page-photo"
            draggable={false}
            onError={() => {
                if (!useSampleFallback && sampleSrc && src !== sampleSrc) {
                    setUseSampleFallback(true);
                }
            }}
        />
    );
}

function PageSheet({ album, pageNum, totalPages }) {
    if (pageNum < 0 || pageNum >= totalPages) {
        return <div className="ab-page-empty" />;
    }

    if (pageNum === 0) {
        return <div className="ab-page-empty" />;
    }

    const src = getPageImageSrc(album, pageNum);
    if (!src) {
        return <div className="ab-page-placeholder">Add photos to this spread</div>;
    }

    return <PagePhoto src={src} pageNum={pageNum} />;
}

export function AlbumSpreadPage({ album, pageNum, totalPages, isLeft }) {
    return (
        <div className={`ab-sheet ${isLeft ? 'ab-sheet--left' : 'ab-sheet--right'}`}>
            <span className="ab-badge">{pageNum}</span>
            <PageSheet album={album} pageNum={pageNum} totalPages={totalPages} />
        </div>
    );
}
