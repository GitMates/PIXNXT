import React, { useEffect, useMemo, useRef, useState } from 'react';
import { photoTransformStyle } from './albumPageTransforms';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import BookWrapSpineImage from './BookWrapSpineImage';
import { COVER_TEXT_CHANGED_EVENT, resolveFrontCoverDisplayText } from './albumCoverText';
import {
    COVER_COLOR_CHANGED_EVENT,
    getAlbumCoverColor,
} from './albumCoverColor';
import { getCoverLeatherSurfaceStyle } from './coverLeatherSurface';
import { parseGridSizeAspect } from './albumGridSize';
import {
    CSS_FLIP_SHEETS,
    cssFlipCountToCheckboxIds,
    resolveCssFlipPageFace,
} from './cssFlipBookPagePhotos';
import './CssFlipBook.css';

const FLIP_MS = 500;

export function isCoverSpread(spreadIndex) {
    return spreadIndex <= 0;
}

function PageFace({ face, spineLayout, coverText, showCoverText, leatherStyle }) {
    if (!face?.src) {
        if (face?.kind === 'cover-front' && showCoverText && coverText) {
            return (
                <div
                    className={`css-flip-book-cover css-flip-book-cover--blank${
                        leatherStyle ? ' ab-cover-leather-canvas ab-cover-leather--flat' : ''
                    }`}
                    style={leatherStyle || undefined}
                    aria-label={coverText}
                />
            );
        }
        return <div className="css-flip-book-page-empty" aria-hidden />;
    }

    if (face.kind === 'cover-front') {
        return (
            <div className="css-flip-book-cover">
                <BookWrapSpineImage
                    src={face.src}
                    side="front"
                    layout={spineLayout}
                    transform={face.transform}
                    className="css-flip-book-page-img"
                    panoramic={face.panoramic}
                />
                {showCoverText && coverText ? (
                    <div className="ab-cover-text-message" aria-hidden>
                        {coverText}
                    </div>
                ) : null}
            </div>
        );
    }

    if (face.kind === 'cover-back') {
        return (
            <div className="css-flip-book-cover">
                <BookWrapSpineImage
                    src={face.src}
                    side="back"
                    layout={spineLayout}
                    transform={face.transform}
                    className="css-flip-book-page-img"
                    panoramic={face.panoramic}
                />
            </div>
        );
    }

    if (face.panoramic && spineLayout) {
        return (
            <BookWrapSpineImage
                src={face.src}
                side={face.panoramic === 'left' ? 'back' : 'front'}
                layout={spineLayout}
                transform={face.transform}
                className="css-flip-book-page-img"
                panoramic={face.panoramic}
            />
        );
    }

    return (
        <img
            src={face.src}
            alt=""
            className="css-flip-book-page-img"
            draggable={false}
            style={photoTransformStyle(face.transform)}
        />
    );
}

export default function CssFlipBook({
    album,
    totalPages = 0,
    showSamples = false,
    pageWidth,
    pageHeight,
    flipCount = 0,
    onFlipRequest,
    onFlippingChange,
    proofOverlay = null,
}) {
    const albumId = album?.id;
    const shellRef = useRef(null);
    const bookRef = useRef(null);
    const [coverTextTick, setCoverTextTick] = useState(0);
    const [coverColorTick, setCoverColorTick] = useState(0);
    const [measuredSize, setMeasuredSize] = useState(null);
    const isControlled = typeof onFlipRequest === 'function';

    const spineLayout = useMemo(() => {
        if (album?.has_covers !== true || album?.blank_covers === true) return null;
        return getBookWrapSpineLayout(album);
    }, [album]);

    const pageFaces = useMemo(() => {
        const faces = {};
        for (const sheet of CSS_FLIP_SHEETS) {
            faces[`${sheet.pageId}-front`] = resolveCssFlipPageFace(
                album,
                sheet.frontPage,
                totalPages,
                showSamples
            );
            faces[`${sheet.pageId}-back`] = resolveCssFlipPageFace(
                album,
                sheet.backPage,
                totalPages,
                showSamples
            );
        }
        return faces;
    }, [album, totalPages, showSamples]);

    void coverTextTick;
    void coverColorTick;
    const coverText = resolveFrontCoverDisplayText(album, albumId);
    const pageAspect = parseGridSizeAspect(album?.grid_size);
    const leatherStyle =
        album?.blank_covers === true && albumId
            ? getCoverLeatherSurfaceStyle(getAlbumCoverColor(albumId), {
                  aspect: pageAspect,
                  title: coverText,
              })
            : null;
    const flippedIds = cssFlipCountToCheckboxIds(flipCount);

    useEffect(() => {
        if (pageWidth && pageHeight) return undefined;
        const el = shellRef.current;
        if (!el) return undefined;

        const update = () => {
            const h = el.clientHeight;
            if (h < 80) return;
            const aspect = parseGridSizeAspect(album?.grid_size);
            const pageH = Math.max(280, Math.min(h * 0.88, 520));
            const pageW = Math.round(pageH * aspect);
            setMeasuredSize({ pageH, pageW, bookW: pageW * 2 });
        };

        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [album?.grid_size, pageWidth, pageHeight]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onChange = (e) => {
            if (e.detail?.albumId === albumId) setCoverTextTick((t) => t + 1);
        };
        window.addEventListener(COVER_TEXT_CHANGED_EVENT, onChange);
        return () => window.removeEventListener(COVER_TEXT_CHANGED_EVENT, onChange);
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onChange = (e) => {
            if (e.detail?.albumId === albumId) setCoverColorTick((t) => t + 1);
        };
        window.addEventListener(COVER_COLOR_CHANGED_EVENT, onChange);
        return () => window.removeEventListener(COVER_COLOR_CHANGED_EVENT, onChange);
    }, [albumId]);

    useEffect(() => {
        const book = bookRef.current;
        if (!book) return undefined;

        let activeTimer;
        const handleClick = () => {
            book.style.pointerEvents = 'none';
            onFlippingChange?.(true);
            if (activeTimer) window.clearTimeout(activeTimer);
            activeTimer = window.setTimeout(() => {
                book.style.pointerEvents = '';
                onFlippingChange?.(false);
            }, FLIP_MS);
        };

        book.addEventListener('click', handleClick);
        return () => {
            book.removeEventListener('click', handleClick);
            if (activeTimer) window.clearTimeout(activeTimer);
        };
    }, [onFlippingChange]);

    const pageH = pageHeight ?? measuredSize?.pageH;
    const pageW = pageWidth ?? measuredSize?.pageW;
    const bookW = pageW ? pageW * 2 : measuredSize?.bookW;
    const isFrontCoverClosed = flipCount <= 0;

    const shellStyle =
        pageH && pageW && bookW
            ? {
                  '--book-h': `${pageH}px`,
                  '--book-w': `${bookW}px`,
                  '--page-w': `${pageW}px`,
              }
            : undefined;

    const handleLabelClick = (e, checkboxId) => {
        if (!isControlled) return;
        if (flippedIds.has(checkboxId)) {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        onFlipRequest();
    };

    return (
        <div
            className={`css-flip-book-shell${
                isFrontCoverClosed ? ' css-flip-book-shell--front-cover' : ''
            }`}
            ref={shellRef}
            style={shellStyle}
        >
            <div id="book" ref={bookRef} className="css-flip-book">
                {CSS_FLIP_SHEETS.map(({ checkboxId, pageId, frontPage }) => (
                    <React.Fragment key={checkboxId}>
                        <input
                            type="checkbox"
                            id={checkboxId}
                            {...(isControlled
                                ? {
                                      checked: flippedIds.has(checkboxId),
                                      readOnly: true,
                                      onChange: () => {},
                                  }
                                : {})}
                        />
                        <div id={pageId} className="page">
                            <div className="front">
                                <PageFace
                                    face={pageFaces[`${pageId}-front`]}
                                    spineLayout={spineLayout}
                                    coverText={coverText}
                                    showCoverText={frontPage === 1}
                                    leatherStyle={
                                        frontPage === 1 &&
                                        album?.blank_covers === true &&
                                        !pageFaces[`${pageId}-front`]?.src
                                            ? leatherStyle
                                            : null
                                    }
                                />
                            </div>
                            <div className="back">
                                <PageFace
                                    face={pageFaces[`${pageId}-back`]}
                                    spineLayout={spineLayout}
                                    coverText={coverText}
                                    showCoverText={false}
                                />
                            </div>
                            <label
                                htmlFor={checkboxId}
                                onClick={(e) => handleLabelClick(e, checkboxId)}
                            />
                        </div>
                    </React.Fragment>
                ))}
            </div>
            {proofOverlay}
        </div>
    );
}
