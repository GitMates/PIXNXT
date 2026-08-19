import React, { useEffect, useMemo, useState } from 'react';
import {
    deriveCoverUrlFromSnapshot,
    deriveFrontCoverUrlFromSnapshot,
    hydrateAlbumPreviewData,
} from './albumPreviewData';
import { resolveCoverImageSrc, resolveBookWrapSpreadSrc, getAlbumListThumbnailUrl } from './albumPagePhotos';
import { albumHasBlankCovers, albumShowsLeatherCover } from './albumSpreadUtils';
import {
    COVER_COLOR_CHANGED_EVENT,
    getAlbumCoverColor,
    DEFAULT_COVER_COLOR_PRESET_ID,
} from './albumCoverColor';
import {
    COVER_TEXT_CHANGED_EVENT,
    resolveFrontCoverDisplayText,
} from './albumCoverText';
import { ALBUM_COLLECTION_CHANGED_EVENT } from './albumCollection';
import { IMAGE_REPLACEMENTS_CHANGED_EVENT } from './albumImageReplacements';
import { getCoverLeatherSurfaceStyle } from './coverLeatherSurface';
import { parseGridSizeAspect } from './albumGridSize';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import BookWrapSpineImage from './BookWrapSpineImage';
import './AlbumListCoverThumb.css';

function resolveThumbSrc(album) {
    if (album?.preview_data && album?.id) {
        hydrateAlbumPreviewData(album.id, album.preview_data);
    }

    const wrapSrc = resolveBookWrapSpreadSrc(album, { showSamples: false });
    if (wrapSrc) return wrapSrc;

    const coverSrc = resolveCoverImageSrc(album, { showSamples: false });
    if (coverSrc) return coverSrc;

    const fromSnapshot = deriveFrontCoverUrlFromSnapshot(album?.preview_data, {
        blankCovers: albumHasBlankCovers(album),
    });
    if (fromSnapshot) return fromSnapshot;

    if (album?.cover_image_url) return album.cover_image_url;
    if (album?.preview_cover_url) return album.preview_cover_url;

    if (albumShowsLeatherCover(album, null)) return null;

    const derived = deriveCoverUrlFromSnapshot(album?.preview_data);
    if (derived) return derived;
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

/**
 * Album cover thumb — photo or blank leather (front cover only).
 * Updates live when cover colour / text / photos change.
 */
export default function AlbumListCoverThumb({ album, alt = '', variant = 'grid' }) {
    const albumId = album?.id;
    const [coverTick, setCoverTick] = useState(0);
    const [photoFailed, setPhotoFailed] = useState(false);

    useEffect(() => {
        if (!albumId) return undefined;
        const bump = (e) => {
            if (e?.detail?.albumId && e.detail.albumId !== albumId) return;
            setCoverTick((n) => n + 1);
        };
        window.addEventListener(COVER_COLOR_CHANGED_EVENT, bump);
        window.addEventListener(COVER_TEXT_CHANGED_EVENT, bump);
        window.addEventListener(ALBUM_COLLECTION_CHANGED_EVENT, bump);
        window.addEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, bump);
        return () => {
            window.removeEventListener(COVER_COLOR_CHANGED_EVENT, bump);
            window.removeEventListener(COVER_TEXT_CHANGED_EVENT, bump);
            window.removeEventListener(ALBUM_COLLECTION_CHANGED_EVENT, bump);
            window.removeEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, bump);
        };
    }, [albumId]);

    const src = useMemo(() => {
        void coverTick;
        return resolveThumbSrc(album);
    }, [album, coverTick]);

    useEffect(() => {
        setPhotoFailed(false);
    }, [src]);

    const layout = useMemo(
        () => (album?.has_covers !== false ? getBookWrapSpineLayout(album) : null),
        [album]
    );
    const hasCovers = album?.has_covers !== false;
    const pageAspect = parseGridSizeAspect(album?.grid_size || 'square');
    const coverColorId = useMemo(() => {
        void coverTick;
        const fromRow = album?.cover_color_preset || album?.preview_data?.cover_color_preset;
        if (fromRow && typeof fromRow === 'string') return fromRow;
        return albumId ? getAlbumCoverColor(albumId) : DEFAULT_COVER_COLOR_PRESET_ID;
    }, [album, albumId, coverTick]);
    const coverText = useMemo(() => {
        void coverTick;
        if (!albumId) return String(album?.name ?? '').trim();
        return resolveFrontCoverDisplayText(album, albumId);
    }, [album, albumId, coverTick]);

    const rootClass =
        variant === 'list'
            ? 'sa-album-list-thumb sa-album-list-thumb--list'
            : 'sa-album-list-thumb';

    const showLeather = albumShowsLeatherCover(album, photoFailed ? null : src);

    if (hasCovers) {
        if (src && !photoFailed && !showLeather) {
            return (
                <div className={rootClass}>
                    <FrontCoverThumbFrame variant="photo">
                        <BookWrapSpineImage
                            src={src}
                            side="front"
                            layout={layout || getBookWrapSpineLayout(album)}
                            transform={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
                            className="sa-album-list-thumb-img ab-book-wrap-cover-img"
                            onError={() => setPhotoFailed(true)}
                        />
                    </FrontCoverThumbFrame>
                </div>
            );
        }

        if (showLeather) {
            const leatherStyle = {
                ...getCoverLeatherSurfaceStyle(coverColorId, {
                    aspect: pageAspect,
                    title: coverText,
                }),
                backgroundSize: '100% 100%',
            };

            return (
                <div className={rootClass}>
                    <FrontCoverThumbFrame variant="leather">
                        <div
                            className="sa-album-list-thumb-front sa-album-list-thumb-front--leather ab-cover-leather-canvas"
                            style={leatherStyle}
                            aria-label={coverText || album?.name || 'Front cover'}
                        />
                    </FrontCoverThumbFrame>
                </div>
            );
        }
    }

    if (!src || photoFailed) {
        return (
            <div className={`${rootClass} cg-style-38 sa-album-thumb-placeholder`}>
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

    return (
        <div className={rootClass}>
            <img
                src={src}
                alt={alt}
                className="sa-album-list-thumb-img"
                loading="lazy"
                onError={() => setPhotoFailed(true)}
            />
        </div>
    );
}
