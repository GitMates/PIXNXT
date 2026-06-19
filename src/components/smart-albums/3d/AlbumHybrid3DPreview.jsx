import React, { useCallback, useEffect, useMemo } from 'react';
import AlbumBook from '../AlbumBook';
import {
    pageToSpreadIndex,
    spreadIndexToPage,
} from '../albumSpreadUtils';
import BookCover3DView from './BookCover3DView';
import './AlbumHybrid3DPreview.css';

/** 3D front cover; inner spreads use the 2D flipbook without leaving preview mode. */
export default function AlbumHybrid3DPreview({
    album,
    totalPages,
    bookPage,
    onPageChange,
    showSamples = false,
    photoRevision = 0,
    albumBookProps = {},
}) {
    const spreadOpts = useMemo(
        () => ({ showCover: true, totalPages }),
        [totalPages]
    );
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, spreadOpts),
        [bookPage, spreadOpts]
    );
    const onCover = spreadIndex <= 0;

    const openBook = useCallback(() => {
        const insidePage = spreadIndexToPage(1, spreadOpts);
        onPageChange?.(insidePage);
    }, [onPageChange, spreadOpts]);

    const returnToCover = useCallback(() => {
        onPageChange?.(0);
    }, [onPageChange]);

    useEffect(() => {
        if (!onCover) return undefined;
        const onKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openBook();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCover, openBook]);

    if (onCover) {
        return (
            <div className="ab-hybrid-3d-preview ab-hybrid-3d-preview--cover">
                <BookCover3DView
                    key={`${album?.id ?? 'album'}-cover-3d-r${photoRevision}`}
                    album={album}
                    totalPages={totalPages}
                    showSamples={showSamples}
                    onCoverOpen={openBook}
                />
            </div>
        );
    }

    return (
        <div className="ab-hybrid-3d-preview ab-hybrid-3d-preview--book">
            <AlbumBook
                key={`${album?.id ?? 'album'}-hybrid-book-r${photoRevision}`}
                album={album}
                totalPages={totalPages}
                initialPage={bookPage}
                onPageChange={onPageChange}
                external3DCover
                onExternalCoverRequest={returnToCover}
                {...albumBookProps}
            />
        </div>
    );
}
