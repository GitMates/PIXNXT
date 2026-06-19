import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlbumBook from '../AlbumBook';
import { pageToSpreadIndex } from '../albumSpreadUtils';
import BookCover3DView from './BookCover3DView';
import './AlbumHybrid3DPreview.css';

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
    const closingRef = useRef(false);
    const [phase, setPhase] = useState(() => (onCover ? 'cover' : 'book'));

    useEffect(() => {
        if (openingRef.current || closingRef.current) return;
        setPhase(onCover ? 'cover' : 'book');
    }, [onCover]);

    const openBook = useCallback(() => {
        if (openingRef.current || closingRef.current || phase !== 'cover') return;
        openingRef.current = true;
        setPhase('opening');
    }, [phase]);

    const handleCoverHideTo3DStart = useCallback(() => {
        closingRef.current = true;
        setPhase('closing');
    }, []);

    const returnToCover = useCallback(() => {
        openingRef.current = false;
        closingRef.current = false;
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
        if (phase !== 'opening' && phase !== 'closing') return undefined;
        const timer = window.setTimeout(() => {
            if (phase === 'opening' && openingRef.current) {
                openingRef.current = false;
                setPhase('book');
            }
            if (phase === 'closing' && closingRef.current) {
                closingRef.current = false;
                onPageChange?.(0);
                setPhase('cover');
            }
        }, FLIP_TIME_MS + 400);
        return () => window.clearTimeout(timer);
    }, [onPageChange, phase]);

    const coverVisible = phase === 'cover';
    const bookVisible = phase !== 'cover';

    return (
        <div className="ab-hybrid-3d-preview ab-hybrid-3d-preview--stacked">
            <div
                className={`ab-hybrid-3d-cover-layer${
                    coverVisible ? '' : ' ab-hybrid-3d-cover-layer--hidden'
                }`}
                aria-hidden={!coverVisible}
            >
                <BookCover3DView
                    key={`${album?.id ?? 'album'}-cover-3d-r${photoRevision}`}
                    album={album}
                    totalPages={totalPages}
                    showSamples={showSamples}
                    onCoverOpen={openBook}
                />
            </div>

            <div
                className={`ab-hybrid-3d-book-layer${
                    bookVisible ? '' : ' ab-hybrid-3d-book-layer--hidden'
                }`}
                aria-hidden={!bookVisible}
            >
                <AlbumBook
                    key={`${album?.id ?? 'album'}-hybrid-book-r${photoRevision}`}
                    album={album}
                    totalPages={totalPages}
                    initialPage={bookPage}
                    onPageChange={onPageChange}
                    external3DCover
                    coverRevealFrom3D={phase === 'opening'}
                    onCoverRevealFrom3DComplete={handleCoverRevealFrom3DComplete}
                    onCoverHideTo3DStart={handleCoverHideTo3DStart}
                    onExternalCoverRequest={returnToCover}
                    {...albumBookProps}
                />
            </div>
        </div>
    );
}
