import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import BookScene from './BookScene';
import useAlbumBookLayoutDims from '../useAlbumBookLayoutDims';
import {
    getFallbackBookDimensions,
    pagePxToBook3dWorld,
} from '../albumBookDimensions';
import { getAlbumCoverColor } from '../albumCoverColor';
import { resolveFrontCoverDisplayText } from '../albumCoverText';
import { parseGridSizeAspect } from '../albumGridSize';
import { resolveBookWrapSpreadSrc } from '../albumPagePhotos';
import {
    createBlankCoverTitleTexture,
    createBlankLeatherPanelTexture,
} from './book3dPageCanvas';
import { isBlankCoverAlbum } from './book3dTextures';
import { isWebGLAvailable } from './webglSupport';
import Book3DErrorBoundary from './Book3DErrorBoundary';
import Book3DCoverFallback from './Book3DCoverFallback';
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
    on3DUnavailable,
}) {
    const shellRef = useRef(null);
    const stageRef = useRef(null);
    const [webglSupported] = useState(() => isWebGLAvailable());
    const unavailableNotifiedRef = useRef(false);

    const notifyUnavailable = (error) => {
        if (unavailableNotifiedRef.current) return;
        unavailableNotifiedRef.current = true;
        on3DUnavailable?.(error);
    };

    useEffect(() => {
        if (!webglSupported) {
            notifyUnavailable(new Error('WebGL unavailable'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- notify once when probe fails
    }, [webglSupported]);

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

    // Build leather/title textures before Canvas mounts so the first frame is not white.
    useMemo(() => {
        if (!album?.id) return null;
        const coverSrc = resolveBookWrapSpreadSrc(album, { showSamples });
        if (!isBlankCoverAlbum(album) || coverSrc) return null;
        const aspect = parseGridSizeAspect(album?.grid_size);
        const colorId = getAlbumCoverColor(album.id);
        const title = resolveFrontCoverDisplayText(album, album.id);
        createBlankCoverTitleTexture(title, aspect, colorId);
        createBlankLeatherPanelTexture(aspect, colorId, { spine: false });
        return null;
    }, [album, showSamples]);

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

    if (!webglSupported) {
        return (
            <Book3DCoverFallback
                album={album}
                showSamples={showSamples}
                onCoverOpen={onCoverOpen}
                message="3D preview unavailable — tap to open album"
            />
        );
    }

    return (
        <Book3DErrorBoundary
            album={album}
            showSamples={showSamples}
            onCoverOpen={onCoverOpen}
            on3DUnavailable={notifyUnavailable}
        >
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
                                onFatalWebglError={notifyUnavailable}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Book3DErrorBoundary>
    );
}
