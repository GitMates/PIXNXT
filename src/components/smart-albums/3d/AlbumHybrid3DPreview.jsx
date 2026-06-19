import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlbumBook from '../AlbumBook';
import { pageToSpreadIndex } from '../albumSpreadUtils';
import BookCover3DView from './BookCover3DView';
import './AlbumHybrid3DPreview.css';

/** Crossfade from 3D cover before the 2D page curl (matches Pixieset-style flip timing). */
const COVER_CROSSFADE_MS = 320;
const FLIP_TIME_MS = 900;

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
    const openingRef = useRef(false);
    const [phase, setPhase] = useState(() => (onCover ? 'cover' : 'book'));

    useEffect(() => {
        if (openingRef.current) return;
        setPhase(onCover ? 'cover' : 'book');
    }, [onCover]);

    const openBook = useCallback(() => {
        if (openingRef.current || phase !== 'cover') return;
        openingRef.current = true;
        setPhase('opening');
    }, [phase]);

    const returnToCover = useCallback(() => {
        openingRef.current = false;
        onPageChange?.(0);
        setPhase('cover');
    }, [onPageChange]);

    const handleCoverRevealFrom3DComplete = useCallback(() => {
        openingRef.current = false;
        setPhase('book');
    }, []);

    useEffect(() => {
        if (phase !== 'cover') return undefined;
        const onKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openBook();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [openBook, phase]);

    useEffect(() => {
        if (phase !== 'opening') return undefined;
        const timer = window.setTimeout(() => {
            if (!openingRef.current) return;
            openingRef.current = false;
            setPhase('book');
        }, COVER_CROSSFADE_MS + FLIP_TIME_MS + 400);
        return () => window.clearTimeout(timer);
    }, [phase]);

    const showCoverLayer = phase === 'cover' || phase === 'opening';
    const showBookLayer = phase === 'opening' || phase === 'book';

    if (!showBookLayer && showCoverLayer) {
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
        <div
            className={`ab-hybrid-3d-preview ab-hybrid-3d-preview--stacked${
                phase === 'opening' ? ' ab-hybrid-3d-preview--opening' : ''
            }`}
            style={{ '--ab-cover-crossfade-ms': `${COVER_CROSSFADE_MS}ms` }}
        >
            {showCoverLayer ? (
                <div
                    className={`ab-hybrid-3d-cover-layer${
                        phase === 'opening' ? ' ab-hybrid-3d-cover-layer--out' : ''
                    }`}
                    aria-hidden={phase !== 'cover'}
                >
                    <BookCover3DView
                        album={album}
                        totalPages={totalPages}
                        showSamples={showSamples}
                    />
                </div>
            ) : null}

            {showBookLayer ? (
                <div
                    className={`ab-hybrid-3d-book-layer${
                        phase === 'opening' ? ' ab-hybrid-3d-book-layer--in' : ''
                    }`}
                >
                    <AlbumBook
                        key={`${album?.id ?? 'album'}-hybrid-book-r${photoRevision}`}
                        album={album}
                        totalPages={totalPages}
                        initialPage={phase === 'opening' ? 0 : bookPage}
                        onPageChange={onPageChange}
                        external3DCover
                        coverRevealFrom3D={phase === 'opening'}
                        coverRevealDelayMs={COVER_CROSSFADE_MS}
                        onCoverRevealFrom3DComplete={handleCoverRevealFrom3DComplete}
                        onExternalCoverRequest={returnToCover}
                        {...albumBookProps}
                    />
                </div>
            ) : null}
        </div>
    );
}
