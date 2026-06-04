import React from 'react';
import { resolveCoverImageSrc } from './albumPagePhotos';
import { getSpreadPhotoTransform, photoTransformStyle } from './albumPageTransforms';
import './AlbumCoverWrap.css';

function CoverHalfImage({ src, side, transform }) {
    if (!src) return null;
    const imgStyle = {
        ...photoTransformStyle(transform),
    };
    return (
        <div className="ab-cover-wrap-img-crop">
            <img
                src={src}
                alt=""
                className={`ab-cover-wrap-img ab-cover-wrap-img--${side}`}
                draggable={false}
                style={imgStyle}
            />
        </div>
    );
}

/**
 * 3D wrapped album cover: left half of the image = back cover, right half = front cover.
 */
export default function AlbumCoverWrap({
    album,
    albumId,
    showSamples = true,
    editable = false,
    previewMode = false,
    width,
    height,
    compact = false,
    onSelectCover,
    onSlotActivate,
}) {
    const src = resolveCoverImageSrc(album, { showSamples });
    const transform = albumId
        ? getSpreadPhotoTransform(albumId, 0)
        : { x: 0, y: 0, scaleX: 1, scaleY: 1 };

    const handleActivate = (e) => {
        if (!editable || previewMode) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (onSlotActivate) {
            onSlotActivate(
                {
                    pageNum: 0,
                    cellId: 0,
                    spreadLeft: 0,
                    whole: true,
                    hasPhoto: Boolean(src),
                    label: 'Cover',
                },
                rect
            );
            return;
        }
        onSelectCover?.();
    };

    const Tag = editable && !previewMode ? 'button' : 'div';

    return (
        <div
            className={`ab-cover-wrap-scene${compact ? ' ab-cover-wrap-scene--compact' : ''}`}
            style={
                width && height
                    ? { '--ab-cover-w': `${width}px`, '--ab-cover-h': `${height}px` }
                    : undefined
            }
            aria-label="Album cover — back and front"
        >
            <div className="ab-cover-wrap-book">
                <div className="ab-cover-wrap-face ab-cover-wrap-face--back" aria-hidden>
                    {src ? (
                        <CoverHalfImage src={src} side="back" transform={transform} />
                    ) : (
                        <span className="ab-cover-wrap-placeholder">Back cover</span>
                    )}
                </div>
                <div className="ab-cover-wrap-face ab-cover-wrap-face--spine" aria-hidden />
                <Tag
                    type={editable && !previewMode ? 'button' : undefined}
                    className={`ab-cover-wrap-face ab-cover-wrap-face--front${
                        editable && !previewMode ? ' ab-cover-wrap-face--interactive' : ''
                    }`}
                    onClick={editable && !previewMode ? handleActivate : undefined}
                    aria-label={editable && !previewMode ? 'Choose cover photo' : undefined}
                >
                    {src ? (
                        <CoverHalfImage src={src} side="front" transform={transform} />
                    ) : (
                        <span className="ab-cover-wrap-placeholder">Add cover photo</span>
                    )}
                </Tag>
            </div>
        </div>
    );
}
