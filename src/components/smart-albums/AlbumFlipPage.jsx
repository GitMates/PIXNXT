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

const AlbumFlipPage = React.forwardRef(function AlbumFlipPage({ album, pageNum, totalPages }, ref) {
    if (pageNum < 0 || pageNum >= totalPages) {
        return (
            <div className="ab-flip-page ab-flip-page--empty" ref={ref} data-density="hard">
                <div className="ab-page-empty" />
            </div>
        );
    }

    const src = getPageImageSrc(album, pageNum);
    const showStar = pageNum === 1 && album.is_starred;
    const showBadge = pageNum > 0;

    return (
        <div className="ab-flip-page" ref={ref} data-density="hard">
            {showBadge && <span className="ab-badge">{pageNum}</span>}
            <div className="ab-page-photo-wrap">
                {src ? (
                    <PagePhoto src={src} pageNum={pageNum} />
                ) : pageNum === 0 ? (
                    <div className="ab-page-cover-placeholder">
                        <span>{album.name}</span>
                    </div>
                ) : (
                    <div className="ab-page-placeholder">Add photos to this spread</div>
                )}
                {showStar && (
                    <span className="ab-page-star" aria-label="Starred">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f5c518" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </span>
                )}
            </div>
        </div>
    );
});

export default AlbumFlipPage;
