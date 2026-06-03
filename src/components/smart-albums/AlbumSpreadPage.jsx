import React, { useState } from 'react';
import { getSampleImageForPage } from './sampleAlbumImages';

function getPageImageSrc(album, pageNum) {
    if (pageNum === 0 && album.cover_image_url) {
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

    const showStar = pageNum === 1 && album.is_starred;

    return (
        <div className="ab-page-photo-wrap">
            <PagePhoto src={src} pageNum={pageNum} />
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

export function AlbumSpreadPage({ album, pageNum, totalPages, isLeft }) {
    return (
        <div className={`ab-sheet ${isLeft ? 'ab-sheet--left' : 'ab-sheet--right'}`}>
            <span className="ab-badge">{pageNum}</span>
            <PageSheet album={album} pageNum={pageNum} totalPages={totalPages} />
        </div>
    );
}
