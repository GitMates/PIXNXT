import React, { useMemo } from 'react';
import {
    deriveCoverUrlFromSnapshot,
    hydrateAlbumPreviewData,
} from './albumPreviewData';
import { getAlbumListThumbnailUrl } from './albumPagePhotos';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import BookWrapSpineImage from './BookWrapSpineImage';
import './AlbumListCoverThumb.css';

function resolveThumbSrc(album) {
    if (album?.cover_image_url) return album.cover_image_url;
    const fromSnapshot = deriveCoverUrlFromSnapshot(album?.preview_data);
    if (fromSnapshot) return fromSnapshot;
    if (album?.preview_data && album?.id) {
        hydrateAlbumPreviewData(album.id, album.preview_data);
    }
    return album?.id ? getAlbumListThumbnailUrl(album.id) : null;
}

/** Album grid card — front cover only (spine/back excluded from book wrap). */
export default function AlbumListCoverThumb({ album, alt = '' }) {
    const src = useMemo(() => resolveThumbSrc(album), [album]);
    const layout = useMemo(
        () => (album?.has_covers === true ? getBookWrapSpineLayout(album) : null),
        [album]
    );

    if (!src) {
        const title = String(album?.name ?? '').trim();
        if (album?.has_covers === true && album?.blank_covers === true && title) {
            return (
                <div className="cg-style-38 sa-album-thumb-placeholder sa-album-thumb-placeholder--title">
                    <span className="sa-album-thumb-title">{title}</span>
                </div>
            );
        }
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

    if (album?.has_covers === true && album?.blank_covers === true && !src) {
        return <div className="sa-album-list-thumb-crop sa-album-list-thumb-crop--blank" aria-hidden />;
    }

    if (album?.has_covers === true && src) {
        return (
            <div className="sa-album-list-thumb-crop">
                <BookWrapSpineImage
                    src={src}
                    side="front"
                    layout={layout || getBookWrapSpineLayout(album)}
                    transform={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
                    className="sa-album-list-thumb-img ab-book-wrap-cover-img"
                />
            </div>
        );
    }

    return <img src={src} alt={alt} className="sa-album-list-thumb-img" loading="lazy" />;
}
