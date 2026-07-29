import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import BookScene from './BookScene';
import useAlbumBookLayoutDims from '../useAlbumBookLayoutDims';
import {
    getFallbackBookDimensions,
    pagePxToBook3dWorld,
} from '../albumBookDimensions';
import '../AlbumBook.css';
import './BookCover3DView.css';

/** 3D album front cover with drag-to-rotate. Inner pages use the 2D book viewer. */
export default function BookCover3DView({
    album,
    totalPages,
    showSamples = false,
    onCoverOpen,
    playIntroAnimation = false,
    onCoverIntroComplete,
}) {
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
        const layoutDims =
            pageLayoutDims ?? getFallbackBookDimensions(shellRef.current, album?.grid_size);
        const canvasHeight =
            shellHeight ||
            shellRef.current?.clientHeight ||
            Math.max(360, window.innerHeight - 280);
        if (!layoutDims || !canvasHeight) return null;
        return pagePxToBook3dWorld(
            layoutDims.width,
            layoutDims.height,
            canvasHeight
        );
    }, [album?.grid_size, pageLayoutDims, shellHeight]);

    useLayoutEffect(() => {
        if (pageWorldDims) {
            latchedWorldDimsRef.current = pageWorldDims;
        }
    }, [pageWorldDims]);

    const resolvedPageWorldDims = pageWorldDims ?? latchedWorldDimsRef.current;

    return (
        <div className="ab-book-cover-3d-shell" ref={shellRef}>
            <div className="ab-book-cover-3d-measure ab-root ab-root--preview" aria-hidden="true">
                <div className="ab-book-stage">
                    <div className="ab-book-stage-inner" ref={stageRef} />
                </div>
            </div>

            <div className="ab-book-cover-3d ab-root ab-root--preview">
                <div className="ab-book-stage">
                    <div className="ab-book-cover-3d-stage">
                        <BookScene
                            key={`${album?.id ?? 'album'}-3d-cover`}
                            album={album}
                            totalPages={totalPages}
                            showSamples={showSamples}
                            pageWorldDims={resolvedPageWorldDims}
                            onCoverOpen={onCoverOpen}
                            playIntroAnimation={playIntroAnimation}
                            onIntroComplete={onCoverIntroComplete}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
