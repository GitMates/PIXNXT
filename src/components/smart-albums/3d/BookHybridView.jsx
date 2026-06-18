import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import AlbumBook from '../AlbumBook';
import BookScene from './BookScene';
import useAlbumBookLayoutDims from '../useAlbumBookLayoutDims';
import { pagePxToBook3dWorld } from '../albumBookDimensions';
import {
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    pageToSpreadIndex,
} from '../albumSpreadUtils';
import '../AlbumBook.css';
import './BookHybridView.css';

const NavPrevIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const NavNextIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

/** Front or back cover spread — 3D closed book only. */
export function isCoverSpread(spreadIndex, totalSpreads) {
    return spreadIndex <= 0 || spreadIndex >= totalSpreads - 1;
}

const COVER_FADE_MS = 380;
const OPEN_REVEAL_MS = 520;
const CLOSE_EXIT_MS = 880;

/**
 * Hybrid preview: 3D cover open/close animation hands off to 2D AlbumBook inner spreads.
 */
export default function BookHybridView({
    album,
    totalPages,
    initialPage,
    onPageChange,
    showSamples = false,
    albumBookProps = {},
}) {
    const spreadOpts = useMemo(() => getSpreadContext(album, totalPages), [album, totalPages]);
    const totalSpreads = useMemo(
        () => getTotalSpreads(totalPages, spreadOpts),
        [totalPages, spreadOpts]
    );
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(initialPage ?? 0, { ...spreadOpts, totalPages }),
        [initialPage, spreadOpts, totalPages]
    );

    const shellRef = useRef(null);
    const stageRef = useRef(null);
    const layoutStructuralKey = useMemo(
        () =>
            `${album?.id ?? 'album'}-${album?.grid_size || 'square'}-${
                album?.grid_layout || 'two-page'
            }-${totalPages}`,
        [album?.grid_layout, album?.grid_size, album?.id, totalPages]
    );
    const pageLayoutDims = useAlbumBookLayoutDims(
        stageRef,
        shellRef,
        album?.grid_size,
        layoutStructuralKey
    );

    const [shellHeight, setShellHeight] = useState(0);
    const latchedWorldDimsRef = useRef(null);

    useLayoutEffect(() => {
        const el = shellRef.current;
        if (!el) return undefined;
        const update = () => setShellHeight(el.clientHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const pageWorldDims = useMemo(() => {
        if (!pageLayoutDims || !shellHeight) return null;
        return pagePxToBook3dWorld(
            pageLayoutDims.width,
            pageLayoutDims.height,
            shellHeight
        );
    }, [pageLayoutDims, shellHeight]);

    useLayoutEffect(() => {
        if (pageWorldDims) {
            latchedWorldDimsRef.current = pageWorldDims;
        }
    }, [pageWorldDims]);

    const resolvedPageWorldDims = pageWorldDims ?? latchedWorldDimsRef.current;

    const [handoff, setHandoff] = useState(null);
    const [coverFading, setCoverFading] = useState(false);
    const [postOpenBlend, setPostOpenBlend] = useState(false);
    const [innerBookReady, setInnerBookReady] = useState(false);
    const [blendTargetPage, setBlendTargetPage] = useState(null);
    const coverFadeTimerRef = useRef(null);
    const revealTimerRef = useRef(null);

    useEffect(() => () => {
        if (coverFadeTimerRef.current) window.clearTimeout(coverFadeTimerRef.current);
        if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    }, []);

    const onCoverSpread = spreadOpts.hasCovers && isCoverSpread(spreadIndex, totalSpreads);
    const isOpeningHandoff =
        handoff?.mode === 'cover-open' || handoff?.mode === 'back-open';
    const isClosingHandoff =
        handoff?.mode === 'cover-close' || handoff?.mode === 'back-close';
    const show3dScene = onCoverSpread || handoff != null || coverFading || postOpenBlend;
    const showInner = !onCoverSpread || isClosingHandoff || postOpenBlend || isOpeningHandoff;
    const navLocked = handoff != null || postOpenBlend || isClosingHandoff;
    const innerInitialPage = blendTargetPage ?? handoff?.targetPage ?? initialPage;
    const innerPreloading =
        (isOpeningHandoff && !postOpenBlend) || (postOpenBlend && !innerBookReady);
    const innerRevealing = postOpenBlend && innerBookReady;
    const showCoverNav = onCoverSpread && !showInner;
    const hideInnerNav =
        innerPreloading || innerRevealing || isClosingHandoff || isOpeningHandoff;

    const startCoverFade = useCallback(() => {
        setCoverFading(true);
        if (coverFadeTimerRef.current) window.clearTimeout(coverFadeTimerRef.current);
        coverFadeTimerRef.current = window.setTimeout(() => {
            coverFadeTimerRef.current = null;
            setCoverFading(false);
        }, COVER_FADE_MS);
    }, []);

    const startInnerReveal = useCallback(() => {
        setPostOpenBlend((active) => {
            if (active) return true;
            if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
            revealTimerRef.current = window.setTimeout(() => {
                revealTimerRef.current = null;
                setPostOpenBlend(false);
                setBlendTargetPage(null);
            }, OPEN_REVEAL_MS);
            return true;
        });
    }, []);

    const handleHandoffBlendStart = useCallback(
        (handoffData) => {
            if (handoffData?.mode === 'cover-open' || handoffData?.mode === 'back-open') {
                startCoverFade();
            }
        },
        [startCoverFade]
    );

    const handleInnerBookReady = useCallback(() => {
        setInnerBookReady(true);
    }, []);

    const prevNavDisabled = navLocked || spreadIndex <= 0;
    const nextNavDisabled = navLocked || spreadIndex >= totalSpreads - 1;

    const handleHandoffComplete = useCallback(
        (pageIdx, mode) => {
            setHandoff(null);
            if (mode === 'cover-open' || mode === 'back-open') {
                setBlendTargetPage(pageIdx);
                startInnerReveal();
            }
            onPageChange?.(pageIdx);
        },
        [onPageChange, startInnerReveal]
    );

    const handleCoverTransitionComplete = useCallback(
        (pageIdx) => {
            if (!handoff) {
                onPageChange?.(pageIdx);
            }
        },
        [handoff, onPageChange]
    );

    const beginHandoff = useCallback((mode, fromSpread, targetPage) => {
        if (mode === 'cover-open' || mode === 'back-open') {
            setInnerBookReady(false);
            setBlendTargetPage(targetPage);
        }
        setHandoff({ mode, fromSpread, targetPage });
    }, []);

    const handleInnerPageChange = useCallback(
        (pageIdx) => {
            const nextSpread = pageToSpreadIndex(pageIdx, { ...spreadOpts, totalPages });
            const closingFrontCover = spreadIndex === 1 && nextSpread === 0;
            const closingBackCover =
                spreadIndex === totalSpreads - 2 && nextSpread === totalSpreads - 1;

            if (closingFrontCover) {
                beginHandoff('cover-close', 1, pageIdx);
                return;
            }
            if (closingBackCover) {
                beginHandoff('back-close', totalSpreads - 2, pageIdx);
                return;
            }

            onPageChange?.(pageIdx);
        },
        [beginHandoff, onPageChange, spreadIndex, spreadOpts, totalPages, totalSpreads]
    );

    const goPrev = useCallback(() => {
        if (prevNavDisabled || !show3dScene) return;
        if (spreadIndex === totalSpreads - 1) {
            const { left } = getSpreadPages(totalSpreads - 2, totalPages, spreadOpts);
            beginHandoff('back-open', totalSpreads - 1, left);
        }
    }, [
        beginHandoff,
        prevNavDisabled,
        show3dScene,
        spreadIndex,
        spreadOpts,
        totalPages,
        totalSpreads,
    ]);

    const goNext = useCallback(() => {
        if (nextNavDisabled || !show3dScene) return;
        if (spreadIndex === 0) {
            const { left } = getSpreadPages(1, totalPages, spreadOpts);
            beginHandoff('cover-open', 0, left);
        }
    }, [beginHandoff, nextNavDisabled, show3dScene, spreadIndex, spreadOpts, totalPages]);

    const sceneInitialPage = initialPage;
    const sceneKey = `${album?.id ?? 'album'}-3d-cover`;
    const placementMode = albumBookProps?.placementMode ?? 'single';

    const coverLayerClassName = [
        'ab-book-hybrid',
        'ab-book-hybrid--cover',
        'ab-root',
        'ab-root--preview',
        handoff ? 'ab-book-hybrid--handoff' : '',
        coverFading || postOpenBlend ? 'ab-book-hybrid--cover-exit' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const innerLayerClassName = [
        'ab-book-hybrid',
        'ab-book-hybrid--inner',
        innerPreloading ? 'ab-book-hybrid--inner-preload' : '',
        innerRevealing ? 'ab-book-hybrid--inner-reveal' : '',
        isClosingHandoff ? 'ab-book-hybrid--inner-exit' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const innerLayerKey = `${album?.id ?? 'album'}-hybrid-inner`;

    return (
        <div className="ab-book-hybrid-shell" ref={shellRef}>
            <div className="ab-book-hybrid-measure ab-root ab-root--preview" aria-hidden="true">
                <div className="ab-book-stage">
                    <div className="ab-book-stage-inner" ref={stageRef} />
                </div>
            </div>

            <div
                className={`ab-book-hybrid-stack${
                    show3dScene && showInner ? ' ab-book-hybrid-stack--blending' : ''
                }`}
            >
                {show3dScene ? (
                    <div
                        className={coverLayerClassName}
                        style={
                            coverFading || postOpenBlend
                                ? {
                                      '--ab-hybrid-cover-fade-ms': `${COVER_FADE_MS}ms`,
                                  }
                                : undefined
                        }
                    >
                        {showCoverNav ? (
                            <button
                                type="button"
                                className={`ab-nav ab-nav--prev${
                                    !prevNavDisabled ? ' ab-nav--enabled' : ''
                                }`}
                                onClick={goPrev}
                                disabled={prevNavDisabled}
                                aria-label="Previous page"
                            >
                                <NavPrevIcon />
                            </button>
                        ) : null}

                        <div className="ab-book-stage">
                            <div className="ab-book-hybrid-cover-stage">
                                <BookScene
                                    key={sceneKey}
                                    album={album}
                                    totalPages={totalPages}
                                    initialPage={sceneInitialPage}
                                    onPageChange={handleCoverTransitionComplete}
                                    showSamples={showSamples}
                                    coversOnly
                                    placementMode={placementMode}
                                    pageWorldDims={resolvedPageWorldDims}
                                    handoff={handoff}
                                    onHandoffComplete={handleHandoffComplete}
                                    onHandoffBlendStart={handleHandoffBlendStart}
                                    lockCoverInteraction
                                    enableOrbit={false}
                                />
                            </div>
                        </div>

                        {showCoverNav ? (
                            <button
                                type="button"
                                className={`ab-nav ab-nav--next${
                                    !nextNavDisabled ? ' ab-nav--enabled' : ''
                                }`}
                                onClick={goNext}
                                disabled={nextNavDisabled}
                                aria-label="Next page"
                            >
                                <NavNextIcon />
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {showInner ? (
                    <div
                        key={innerLayerKey}
                        className={innerLayerClassName}
                        style={
                            isClosingHandoff
                                ? { '--ab-hybrid-blend-ms': `${CLOSE_EXIT_MS}ms` }
                                : innerRevealing
                                  ? { '--ab-hybrid-blend-ms': `${OPEN_REVEAL_MS}ms` }
                                  : undefined
                        }
                    >
                        <AlbumBook
                            album={album}
                            totalPages={totalPages}
                            initialPage={innerInitialPage}
                            onPageChange={handleInnerPageChange}
                            onBookReady={handleInnerBookReady}
                            showSamples={showSamples}
                            coverHandoff3d
                            hideNav={hideInnerNav}
                            {...albumBookProps}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
