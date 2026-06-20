import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlbumBook from '../AlbumBook';
import { pageToSpreadIndex } from '../albumSpreadUtils';
import useAlbumBookLayoutDims from '../useAlbumBookLayoutDims';
import BookCover3DView from './BookCover3DView';
import './AlbumHybrid3DPreview.css';

const FLIP_TIME_MS = 900;
const COVER_MOVE_MS = 480;

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
    const previewRef = useRef(null);
    const coverLayerRef = useRef(null);
    const bookLayerRef = useRef(null);
    const measureStageRef = useRef(null);
    const closingTimerRef = useRef(null);
    const closingAnimateRef = useRef(false);

    const layoutStructuralKey = useMemo(
        () =>
            `${album?.id ?? 'album'}-${album?.grid_size || 'square'}-${
                album?.grid_layout || 'two-page'
            }-${totalPages}`,
        [album?.grid_layout, album?.grid_size, album?.id, totalPages]
    );
    const pageDims = useAlbumBookLayoutDims(
        measureStageRef,
        previewRef,
        album?.grid_size,
        layoutStructuralKey
    );

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
    const [coverAtSpread, setCoverAtSpread] = useState(false);
    const [coverHandoff, setCoverHandoff] = useState(false);
    const [coverSnap, setCoverSnap] = useState(false);
    const [coverShiftPx, setCoverShiftPx] = useState(null);

    useEffect(() => {
        if (phase !== 'cover') return;
        openingRef.current = false;
        closingRef.current = false;
    }, [phase]);

    useEffect(() => {
        if (openingRef.current || closingRef.current) return;
        setPhase(onCover ? 'cover' : 'book');
    }, [onCover]);

    useEffect(
        () => () => {
            if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
        },
        []
    );

    const measureCoverShift = useCallback(() => {
        const coverStage = coverLayerRef.current?.querySelector('.ab-book-cover-3d-stage');
        const bookWrap = bookLayerRef.current?.querySelector('.ab-flipbook-wrap');
        if (coverStage && bookWrap) {
            const coverRect = coverStage.getBoundingClientRect();
            const bookRect = bookWrap.getBoundingClientRect();
            const targetCenterX = bookRect.left + bookRect.width * 0.75;
            const coverCenterX = coverRect.left + coverRect.width / 2;
            const measured = targetCenterX - coverCenterX;
            if (Math.abs(measured) > 0.5) return measured;
        }
        if (pageDims?.width) return pageDims.width / 2;
        return 0;
    }, [pageDims]);

    const resetCoverMotion = useCallback(() => {
        setCoverAtSpread(false);
        setCoverHandoff(false);
        setCoverSnap(false);
        setCoverShiftPx(null);
        closingAnimateRef.current = false;
    }, []);

    const openBook = useCallback(() => {
        if (openingRef.current || closingRef.current || phase !== 'cover') return;
        openingRef.current = true;
        closingAnimateRef.current = false;
        resetCoverMotion();
        setPhase('opening');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setCoverShiftPx(measureCoverShift());
                requestAnimationFrame(() => {
                    setCoverAtSpread(true);
                });
            });
        });
    }, [measureCoverShift, phase, resetCoverMotion]);

    /** Hide 3D during the 2D page flip back (mirror of opening handoff). */
    const handleCoverHideTo3DStart = useCallback(() => {
        if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
        closingRef.current = true;
        closingAnimateRef.current = false;
        setPhase('closing');
        setCoverSnap(false);
        setCoverAtSpread(false);
        setCoverHandoff(true);
    }, []);

    /** After 2D flip lands on cover: reveal 3D at right page, slide to center. */
    const handleCoverHideFlipComplete = useCallback(() => {
        if (closingAnimateRef.current) return;
        closingAnimateRef.current = true;
        closingRef.current = true;
        setPhase('closing');

        if (closingTimerRef.current) clearTimeout(closingTimerRef.current);

        const shift = measureCoverShift();
        setCoverShiftPx(shift);
        setCoverSnap(true);
        setCoverHandoff(false);
        setCoverAtSpread(true);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setCoverSnap(false);
                setCoverAtSpread(false);
            });
        });

        closingTimerRef.current = window.setTimeout(() => {
            closingRef.current = false;
            closingAnimateRef.current = false;
            onPageChange?.(0);
            setPhase('cover');
            resetCoverMotion();
            closingTimerRef.current = null;
        }, COVER_MOVE_MS);
    }, [measureCoverShift, onPageChange, resetCoverMotion]);

    const handleCoverRevealFrom3DComplete = useCallback(() => {
        openingRef.current = false;
        setPhase('book');
        resetCoverMotion();
    }, [resetCoverMotion]);

    useEffect(() => {
        if (phase !== 'opening') return undefined;
        const handoffTimer = window.setTimeout(() => setCoverHandoff(true), COVER_MOVE_MS);
        return () => window.clearTimeout(handoffTimer);
    }, [phase]);

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
                resetCoverMotion();
            }
            if (phase === 'closing' && closingRef.current) {
                closingRef.current = false;
                closingAnimateRef.current = false;
                onPageChange?.(0);
                setPhase('cover');
                resetCoverMotion();
            }
        }, FLIP_TIME_MS + COVER_MOVE_MS + 400);
        return () => window.clearTimeout(timer);
    }, [onPageChange, phase, resetCoverMotion]);

    const coverFullyHidden = phase === 'book';
    const bookVisible = phase !== 'cover';

    const coverLayerClassName = [
        'ab-hybrid-3d-cover-layer',
        coverAtSpread ? 'ab-hybrid-3d-cover-layer--at-spread' : '',
        coverSnap ? 'ab-hybrid-3d-cover-layer--snap' : '',
        coverHandoff ? 'ab-hybrid-3d-cover-layer--handoff' : '',
        coverFullyHidden ? 'ab-hybrid-3d-cover-layer--hidden' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const coverLayerStyle =
        coverShiftPx != null
            ? { '--ab-cover-shift-x': `${coverShiftPx}px` }
            : undefined;

    return (
        <div
            className="ab-hybrid-3d-preview ab-hybrid-3d-preview--stacked"
            ref={previewRef}
        >
            <div
                className="ab-hybrid-3d-measure ab-root ab-root--preview"
                aria-hidden="true"
            >
                <div className="ab-book-stage">
                    <div className="ab-book-stage-inner" ref={measureStageRef} />
                </div>
            </div>

            <div
                ref={coverLayerRef}
                className={coverLayerClassName}
                style={coverLayerStyle}
                aria-hidden={coverFullyHidden}
            >
                <BookCover3DView
                    key={`${album?.id ?? 'album'}-cover-3d-r${photoRevision}`}
                    album={album}
                    totalPages={totalPages}
                    showSamples={showSamples}
                    onCoverOpen={phase === 'cover' ? openBook : undefined}
                />
            </div>

            <div
                ref={bookLayerRef}
                className={`ab-hybrid-3d-book-layer${
                    bookVisible ? '' : ' ab-hybrid-3d-book-layer--hidden'
                }`}
                aria-hidden={!bookVisible}
            >
                <AlbumBook
                    key={`${album?.id ?? 'album'}-hybrid-book-r${photoRevision}`}
                    {...albumBookProps}
                    album={album}
                    totalPages={totalPages}
                    initialPage={bookPage}
                    onPageChange={onPageChange}
                    external3DCover
                    coverRevealFrom3D={phase === 'opening'}
                    coverRevealDelayMs={COVER_MOVE_MS}
                    coverHideTo3D={phase === 'closing'}
                    onCoverRevealFrom3DComplete={handleCoverRevealFrom3DComplete}
                    onCoverHideTo3DStart={handleCoverHideTo3DStart}
                    onExternalCoverRequest={handleCoverHideFlipComplete}
                />
            </div>
        </div>
    );
}
