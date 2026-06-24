import React, { useMemo } from 'react';
import {
    deriveCoverUrlFromSnapshot,
    deriveFrontCoverUrlFromSnapshot,
    hydrateAlbumPreviewData,
} from './albumPreviewData';
import { resolveCoverImageSrc, resolveBookWrapSpreadSrc, getAlbumListThumbnailUrl } from './albumPagePhotos';
import { albumHasBlankCovers } from './albumSpreadUtils';
import { getAlbumCoverColor, DEFAULT_COVER_COLOR_PRESET_ID } from './albumCoverColor';
import { resolveFrontCoverDisplayText } from './albumCoverText';
import { getCoverLeatherSurfaceStyle } from './coverLeatherSurface';
import { parseGridSizeAspect } from './albumGridSize';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import BookWrapSpineImage from './BookWrapSpineImage';
import './AlbumListCoverThumb.css';

function resolveThumbSrc(album) {
    if (album?.preview_data && album?.id) {
        hydrateAlbumPreviewData(album.id, album.preview_data);
    }

    if (album?.has_covers === true) {
        const blankCovers = albumHasBlankCovers(album);

        if (blankCovers) {
            const wrapSrc = resolveBookWrapSpreadSrc(album, { showSamples: false });
            if (wrapSrc) return wrapSrc;
            return null;
        }

        const coverSrc = resolveCoverImageSrc(album, { showSamples: false });
        if (coverSrc) return coverSrc;
        const fromSnapshot = deriveFrontCoverUrlFromSnapshot(album?.preview_data, {
            blankCovers: false,
        });
        if (fromSnapshot) return fromSnapshot;
        if (album?.cover_image_url) return album.cover_image_url;
        return null;
    }

    if (album?.cover_image_url) return album.cover_image_url;
    const fromSnapshot = deriveCoverUrlFromSnapshot(album?.preview_data);
    if (fromSnapshot) return fromSnapshot;
    return album?.id ? getAlbumListThumbnailUrl(album.id) : null;
}

function FrontCoverThumbFrame({ children, variant = 'photo' }) {
    return (
        <div
            className={`sa-album-list-thumb-crop sa-album-list-thumb-crop--front-cover${
                variant === 'blank' ? ' sa-album-list-thumb-crop--front-cover-blank' : ''
            }${variant === 'leather' ? ' sa-album-list-thumb-crop--front-cover-leather' : ''}`}
        >
            {children}
        </div>
    );
}

/** Album grid card — front cover only (spine/back excluded from book wrap). */
export default function AlbumListCoverThumb({ album, alt = '' }) {
    const src = useMemo(() => resolveThumbSrc(album), [album]);
    const layout = useMemo(
        () => (album?.has_covers === true ? getBookWrapSpineLayout(album) : null),
        [album]
    );
    const hasCovers = album?.has_covers === true;

    if (hasCovers) {
        if (src) {
            return (
                <FrontCoverThumbFrame variant="photo">
                    <BookWrapSpineImage
                        src={src}
                        side="front"
                        layout={layout || getBookWrapSpineLayout(album)}
                        transform={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
                        className="sa-album-list-thumb-img ab-book-wrap-cover-img"
                    />
                </FrontCoverThumbFrame>
            );
        }

        if (albumHasBlankCovers(album)) {
            const pageAspect = parseGridSizeAspect(album?.grid_size || 'square');
            const coverColorId = album?.id ? getAlbumCoverColor(album.id) : DEFAULT_COVER_COLOR_PRESET_ID;
            const coverText = album?.id
                ? resolveFrontCoverDisplayText(album, album.id)
                : String(album?.name ?? '').trim();
            const leatherStyle = getCoverLeatherSurfaceStyle(coverColorId, {
                aspect: pageAspect,
                title: coverText,
            });

            return (
                <FrontCoverThumbFrame variant="leather">
                    <div
                        className="sa-album-list-thumb-front sa-album-list-thumb-front--leather ab-cover-leather-canvas"
                        style={leatherStyle}
                        aria-hidden
                    />
                </FrontCoverThumbFrame>
            );
        }

        return (
            <FrontCoverThumbFrame variant="blank">
                <div className="sa-album-list-thumb-front sa-album-list-thumb-front--blank" aria-hidden />
            </FrontCoverThumbFrame>
        );
    }

    if (!src) {
        return (
            <div className="cg-style-38 sa-album-thumb-placeholder">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
            </div>
        );
    }

    return <img src={src} alt={alt} className="sa-album-list-thumb-img" loading="lazy" />;
}
