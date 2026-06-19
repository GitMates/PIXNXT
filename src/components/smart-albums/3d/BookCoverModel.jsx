import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { resolveBookWrapSpreadSrc } from '../albumPagePhotos';
import { getSpreadPhotoTransform } from '../albumPageTransforms';
import { getSpreadContext, getTotalSpreads } from '../albumSpreadUtils';
import { getBookWrapSpineLayout } from '../bookWrapSpine';
import { SPINE_BOUNDS_CHANGED_EVENT } from '../albumSpineSettings';
import {
    getBook3dDimensions,
    shouldUseWrapCrop,
    isBlankCoverAlbum,
    HARDCOVER_GREEN,
    SPINE_DARK,
    PAGE_WHITE,
} from './book3dTextures';
import { useCanvasWrapTexture } from './book3dPageCanvas';

const COVER_THICK = 0.045;
const SPINE_EMPTY = '#e4e7ec';

function CoverPhotoMaterial({ map, side = THREE.FrontSide }) {
    return (
        <meshBasicMaterial map={map} toneMapped={false} side={side} />
    );
}

function MatteMaterial({ color }) {
    return <meshStandardMaterial color={color} roughness={0.72} metalness={0.02} />;
}

function PageEdgeMaterial() {
    return <meshBasicMaterial color={PAGE_WHITE} toneMapped={false} />;
}

function ClosedBook({
    width,
    height,
    pageDepth,
    frontTexture,
    backTexture,
    spineTexture,
    blankCover,
    hasFrontPhoto,
    hasBackPhoto,
    hasSpinePhoto,
    showSpinePanel,
}) {
    const totalDepth = pageDepth + COVER_THICK * 2;
    const boardPad = 0.012;
    const coverW = width + boardPad;
    const coverH = height + boardPad;
    const halfCoverW = coverW / 2;
    const outerZ = pageDepth / 2 + COVER_THICK;
    const boardColor = blankCover ? HARDCOVER_GREEN : SPINE_DARK;
    const spineFallback = showSpinePanel ? SPINE_EMPTY : SPINE_DARK;

    return (
        <group>
            <mesh>
                <boxGeometry args={[width, height, pageDepth]} />
                <PageEdgeMaterial />
            </mesh>

            <mesh position={[0, 0, outerZ - COVER_THICK / 2]} castShadow>
                <boxGeometry args={[coverW, coverH, COVER_THICK]} />
                <MatteMaterial color={boardColor} />
            </mesh>

            <mesh position={[0, 0, -(outerZ - COVER_THICK / 2)]} castShadow>
                <boxGeometry args={[coverW, coverH, COVER_THICK]} />
                <MatteMaterial color={boardColor} />
            </mesh>

            <mesh
                position={[-halfCoverW - 0.001, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                castShadow
            >
                <planeGeometry args={[totalDepth, coverH]} />
                {hasSpinePhoto ? (
                    <CoverPhotoMaterial map={spineTexture} side={THREE.DoubleSide} />
                ) : showSpinePanel ? (
                    <meshBasicMaterial color={spineFallback} toneMapped={false} side={THREE.DoubleSide} />
                ) : (
                    <MatteMaterial color={SPINE_DARK} />
                )}
            </mesh>

            <mesh
                position={[0, 0, outerZ + 0.002]}
                castShadow
                userData={{ isFrontCover: true }}
            >
                <planeGeometry args={[coverW, coverH]} />
                {hasFrontPhoto ? (
                    <CoverPhotoMaterial map={frontTexture} />
                ) : (
                    <MatteMaterial color={boardColor} />
                )}
            </mesh>

            <mesh
                position={[0, 0, -(outerZ + 0.002)]}
                rotation={[0, Math.PI, 0]}
                castShadow
            >
                <planeGeometry args={[coverW, coverH]} />
                {hasBackPhoto ? (
                    <CoverPhotoMaterial map={backTexture} />
                ) : (
                    <MatteMaterial color={boardColor} />
                )}
            </mesh>
        </group>
    );
}

/** Static closed front cover — no page flips or inner spreads. */
export default function BookCoverModel({
    album,
    totalPages,
    showSamples = false,
    pageWorldDims = null,
    onCoverOpen,
}) {
    const groupRef = useRef();
    const spreadOpts = useMemo(() => getSpreadContext(album, totalPages), [album, totalPages]);
    const [spineBoundsTick, setSpineBoundsTick] = useState(0);

    const { width, height, aspect: pageAspect } = useMemo(() => {
        if (pageWorldDims?.width > 0 && pageWorldDims?.height > 0) {
            return pageWorldDims;
        }
        return getBook3dDimensions(album);
    }, [album, pageWorldDims]);

    const totalSpreads = useMemo(() => getTotalSpreads(totalPages, spreadOpts), [totalPages, spreadOpts]);
    const pageDepth = Math.max(0.14, (totalSpreads - 1) * 0.006 + 0.06);
    const coverH = height + 0.012;

    useEffect(() => {
        if (!album?.id) return undefined;
        const onSpineBoundsChanged = (e) => {
            if (e.detail?.albumId === album.id) setSpineBoundsTick((t) => t + 1);
        };
        window.addEventListener(SPINE_BOUNDS_CHANGED_EVENT, onSpineBoundsChanged);
        return () => window.removeEventListener(SPINE_BOUNDS_CHANGED_EVENT, onSpineBoundsChanged);
    }, [album?.id]);

    const wrapLayout = useMemo(() => {
        if (!album) return null;
        return getBookWrapSpineLayout(album);
    }, [album, spineBoundsTick]);

    const coverSrc = useMemo(
        () => (album ? resolveBookWrapSpreadSrc(album, { showSamples }) : null),
        [album, showSamples]
    );
    const coverTransform = useMemo(
        () => (album?.id ? getSpreadPhotoTransform(album.id, 0) : { x: 0, y: 0, scaleX: 1, scaleY: 1 }),
        [album?.id]
    );
    const blankCover = isBlankCoverAlbum(album);
    const useWrapCrop = shouldUseWrapCrop(album, coverSrc, wrapLayout);
    const showSpinePanel = Boolean(useWrapCrop && wrapLayout?.hasSpine);

    const spineBindingAspect = useMemo(() => {
        const totalDepth = pageDepth + COVER_THICK * 2;
        return totalDepth / coverH;
    }, [pageDepth, coverH]);

    const closedFrontTex = useCanvasWrapTexture(
        useWrapCrop ? coverSrc : null,
        useWrapCrop ? wrapLayout : null,
        useWrapCrop ? 'front' : null,
        coverTransform,
        pageAspect
    );
    const closedBackTex = useCanvasWrapTexture(
        useWrapCrop ? coverSrc : null,
        useWrapCrop ? wrapLayout : null,
        useWrapCrop ? 'back' : null,
        coverTransform,
        pageAspect
    );
    const closedSpineTex = useCanvasWrapTexture(
        useWrapCrop ? coverSrc : null,
        useWrapCrop ? wrapLayout : null,
        useWrapCrop ? 'spine' : null,
        coverTransform,
        spineBindingAspect
    );

    useLayoutEffect(() => {
        const root = groupRef.current;
        if (!root || onCoverOpen) return undefined;

        const originals = [];
        root.traverse((obj) => {
            if (typeof obj.raycast === 'function') {
                originals.push([obj, obj.raycast]);
                obj.raycast = () => {};
            }
        });

        return () => {
            for (const [obj, fn] of originals) {
                obj.raycast = fn;
            }
        };
    }, [onCoverOpen]);

    return (
        <group ref={groupRef}>
            <ClosedBook
                width={width}
                height={height}
                pageDepth={pageDepth}
                frontTexture={closedFrontTex}
                backTexture={closedBackTex}
                spineTexture={closedSpineTex}
                blankCover={blankCover}
                hasFrontPhoto={Boolean(coverSrc)}
                hasBackPhoto={Boolean(coverSrc && useWrapCrop)}
                hasSpinePhoto={Boolean(coverSrc && useWrapCrop && wrapLayout?.hasSpine)}
                showSpinePanel={showSpinePanel}
            />
        </group>
    );
}
