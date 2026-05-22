import React from 'react';

function getPageImageSrc(album, pageNum) {
    if (pageNum === 1 && album.cover_image_url) {
        return album.cover_image_url;
    }
    return null;
}

function PageSheet({ album, pageNum, totalPages }) {
    if (pageNum < 0 || pageNum >= totalPages) {
        return <div className="ab-page-empty" />;
    }

    if (pageNum === 0) {
        return <div className="ab-page-empty" />;
    }

    const src = getPageImageSrc(album, pageNum);
    if (src) {
        return <img src={src} alt="" className="ab-page-photo" draggable={false} />;
    }

    return <div className="ab-page-placeholder">Add photos to this spread</div>;
}

export function AlbumSpreadPage({ album, pageNum, totalPages, isLeft }) {
    return (
        <div className={`ab-sheet ${isLeft ? 'ab-sheet--left' : 'ab-sheet--right'}`}>
            <span className="ab-badge">{pageNum}</span>
            <PageSheet album={album} pageNum={pageNum} totalPages={totalPages} />
        </div>
    );
}
