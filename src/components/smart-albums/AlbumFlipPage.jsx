import React, { useState } from 'react';
import { getPagePhotoOverride } from './albumPagePhotos';
import { getSampleImageForPage } from './sampleAlbumImages';
import AlbumPageGrid from './AlbumPageGrid';
import {
    getProofLeftPageGridPercent,
    getProofRightPageGridPercent,
    isProofLeftGridPage,
    isProofRightGridPage,
} from './albumSpreadGrid';

function getPageImageSrc(album, pageNum, showSamples) {
    const override = getPagePhotoOverride(album?.id, pageNum);
    if (override) return override;
    if (pageNum === 0 && album.cover_image_url) {
        return album.cover_image_url;
    }
    return showSamples ? getSampleImageForPage(pageNum) : null;
}

function PagePhoto({ src, pageNum, showSamples }) {
    const [useSampleFallback, setUseSampleFallback] = useState(false);
    const sampleSrc = showSamples ? getSampleImageForPage(pageNum) : null;
    const displaySrc = useSampleFallback ? sampleSrc : src;

    if (!displaySrc) {
        return <div className="ab-page-placeholder" />;
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
        selectionLeftPage = null,
        selectionMode = null,
        selectedCellId = null,
        onSelectCell,
        onSelectSpread,
        onSelectCover,
        onTransformChange,
        transformRevision = 0,
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
    const useLeftGrid = isProofLeftGridPage(pageNum);
    const useRightGrid = isProofRightGridPage(pageNum);
    const src = getPageImageSrc(album, pageNum, showSamples);
    const showStar = pageNum === 1 && album.is_starred;
    const canSelectCover = pageNum === 0 && editable && !spreadEdit;
    const PageWrapTag = canSelectCover ? 'button' : 'div';

    if (useLeftGrid) {
        const { cells } = getProofLeftPageGridPercent();
        return (
            <div className="ab-flip-page ab-flip-page--grid" ref={ref} data-density="hard">
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
                    selectionLeftPage={selectionLeftPage}
                    selectionMode={selectionMode}
                    selectedCellId={selectedCellId}
                    onSelectCell={onSelectCell}
                    onSelectSpread={onSelectSpread}
                    onTransformChange={onTransformChange}
                    transformRevision={transformRevision}
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
            <div className="ab-flip-page ab-flip-page--grid" ref={ref} data-density="hard">
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
                    selectionLeftPage={selectionLeftPage}
                    selectionMode={selectionMode}
                    selectedCellId={selectedCellId}
                    onSelectCell={onSelectCell}
                    onSelectSpread={onSelectSpread}
                    onTransformChange={onTransformChange}
                    transformRevision={transformRevision}
                />
            </div>
        );
    }

    return (
        <div className="ab-flip-page" ref={ref} data-density="hard">
            <PageWrapTag
                type={canSelectCover ? 'button' : undefined}
                className={`ab-page-photo-wrap${
                    canSelectCover ? ' ab-page-photo-wrap--interactive' : ''
                }`}
                onClick={canSelectCover ? () => onSelectCover?.() : undefined}
                aria-label={canSelectCover ? 'Choose cover photo' : undefined}
            >
                {src ? (
                    <PagePhoto src={src} pageNum={pageNum} showSamples={showSamples} />
                ) : pageNum === 0 ? (
                    <div className="ab-page-cover-placeholder" />
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
            </PageWrapTag>
        </div>
    );
});

export default React.memo(AlbumFlipPage);
