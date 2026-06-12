import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useSpring, a } from '@react-spring/three';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';
import { resolveCoverImageSrc } from '../albumPagePhotos';
import {
    getSpreadContext,
    getTotalSpreads,
    getSpreadPages,
    pageToSpreadIndex,
    normalizeStoragePageIndex,
} from '../albumSpreadUtils';
import { getBookWrapSpineLayout } from '../bookWrapSpine';
import {
    getBook3dDimensions,
    getSpineWidth,
    useBookTexture,
    shouldUseWrapCrop,
    isBlankCoverAlbum,
    HARDCOVER_GREEN,
    SPINE_DARK,
    PAGE_WHITE,
} from './book3dTextures';
import { resolveBook3dPageSlot, isPanoramicSpreadPair } from './book3dPageSlots';
import { useCanvasPageTexture, useCanvasSpreadTexture } from './book3dPageCanvas';

const COVER_THICK = 0.045;
const PAGE_Z = 0.012;
const SPINE_MASK_W = 0.014;
const FLIP_LIFT = 0.022;
const FLIP_CONFIG = { mass: 1, tension: 118, friction: 24 };
/** Unlit — shows texture pixels exactly as in the 2D preview (no glare or color shift). */
function CoverPhotoMaterial({ map, side = THREE.FrontSide, opacity = 1 }) {
    return (
        <meshBasicMaterial
            map={map}
            toneMapped={false}
            side={side}
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity >= 1}
        />
    );
}

function MatteMaterial({ color }) {
    return <meshStandardMaterial color={color} roughness={0.72} metalness={0.02} />;
}

function PageEdgeMaterial() {
    return <meshStandardMaterial color={PAGE_WHITE} roughness={0.92} metalness={0} />;
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
}) {
    const totalDepth = pageDepth + COVER_THICK * 2;
    const boardPad = 0.012;
    const coverW = width + boardPad;
    const coverH = height + boardPad;
    const halfCoverW = coverW / 2;
    const outerZ = pageDepth / 2 + COVER_THICK;
    const boardColor = blankCover ? HARDCOVER_GREEN : SPINE_DARK;

    return (
        <group>
            <mesh castShadow receiveShadow>
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
                    <CoverPhotoMaterial map={spineTexture} />
                ) : (
                    <MatteMaterial color={SPINE_DARK} />
                )}
            </mesh>

            <mesh position={[0, 0, outerZ + 0.002]} castShadow>
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

function wrapSideForSlot(slot) {
    if (slot?.panoramic === 'right') return 'front';
    if (slot?.panoramic === 'left') return 'back';
    if (slot?.panoramic === 'spine') return 'spine';
    return null;
}

/** Book-wrap UV crop only for the cover image — spread panoramics use applyPanoramic. */
function resolveTextureCrop(slot, coverSrc, useWrapCrop, wrapLayout) {
    const isCoverWrap =
        useWrapCrop &&
        coverSrc &&
        slot?.src === coverSrc &&
        (slot.panoramic === 'left' || slot.panoramic === 'right' || slot.panoramic === 'spine');
    if (!isCoverWrap) return { layout: null, side: null };
    const side = wrapSideForSlot(slot);
    return { layout: side ? wrapLayout : null, side };
}

function pagePosition(side, width) {
    return side === 'left' ? [-width / 2, 0, PAGE_Z] : [width / 2, 0, PAGE_Z];
}

/** Covers sub-pixel bleed at the spine — matches 2D .ab-spine-mask */
function SpineMask({ height }) {
    return (
        <mesh position={[0, 0, PAGE_Z + 0.003]} renderOrder={12}>
            <planeGeometry args={[SPINE_MASK_W, height]} />
            <meshBasicMaterial color={PAGE_WHITE} toneMapped={false} depthWrite depthTest />
        </mesh>
    );
}

/** One continuous plane for whole-spread photos — no seam at the spine. */
function PanoramicSpread({ src, width, height, pageAspect, opacity = 1, renderOrder = 0 }) {
    const texture = useCanvasSpreadTexture(src, pageAspect);
    const animated = typeof opacity !== 'number';

    return (
        <a.mesh position={[0, 0, PAGE_Z]} renderOrder={renderOrder}>
            <planeGeometry args={[width * 2, height]} />
            <a.meshBasicMaterial
                map={texture}
                toneMapped={false}
                transparent={animated || opacity < 1}
                opacity={opacity}
                depthWrite={!animated && opacity >= 1}
            />
        </a.mesh>
    );
}

function PageFace({
    slot,
    width,
    height,
    pageAspect,
    side,
    coverSrc,
    wrapLayout,
    useWrapCrop,
    opacity = 1,
    renderOrder = 0,
}) {
    const { layout, side: wrapSide } = resolveTextureCrop(slot, coverSrc, useWrapCrop, wrapLayout);
    const isWrapCover = Boolean(layout && wrapSide);
    const canvasTexture = useCanvasPageTexture(isWrapCover ? { src: null } : slot, pageAspect);
    const wrapTexture = useBookTexture(
        isWrapCover ? slot : { src: null },
        isWrapCover ? layout : null,
        isWrapCover ? wrapSide : null
    );
    const texture = isWrapCover ? wrapTexture : canvasTexture;
    const hasPhoto = Boolean(slot?.src);
    const animated = typeof opacity !== 'number';

    return (
        <a.mesh
            position={pagePosition(side, width)}
            castShadow
            receiveShadow
            renderOrder={renderOrder}
        >
            <planeGeometry args={[width, height]} />
            {hasPhoto ? (
                <a.meshBasicMaterial
                    map={texture}
                    toneMapped={false}
                    transparent={animated || opacity < 1}
                    opacity={opacity}
                    depthWrite={!animated && opacity >= 1}
                />
            ) : (
                <a.meshBasicMaterial
                    color={PAGE_WHITE}
                    toneMapped={false}
                    transparent={animated || opacity < 1}
                    opacity={opacity}
                    depthWrite={!animated && opacity >= 1}
                />
            )}
        </a.mesh>
    );
}

/** Thin double-sided sheet — avoids box-edge distortion during rotation. */
function FlippingSheet({
    width,
    height,
    pageAspect,
    side,
    rotY,
    frontSlot,
    backSlot,
    coverSrc,
    wrapLayout,
    useWrapCrop,
}) {
    const xPivot = side === 'right' ? width / 2 : -width / 2;
    const frontCrop = resolveTextureCrop(frontSlot, coverSrc, useWrapCrop, wrapLayout);
    const backCrop = resolveTextureCrop(backSlot, coverSrc, useWrapCrop, wrapLayout);
    const frontWrap = Boolean(frontCrop.layout && frontCrop.side);
    const backWrap = Boolean(backCrop.layout && backCrop.side);
    const frontCanvas = useCanvasPageTexture(frontWrap ? { src: null } : frontSlot, pageAspect);
    // Back face uses BackSide — pre-mirror canvas so content reads correctly (matches prior mirrorX).
    const backCanvas = useCanvasPageTexture(backWrap ? { src: null } : backSlot, pageAspect, {
        mirror: true,
    });
    const frontWrapTex = useBookTexture(
        frontWrap ? frontSlot : { src: null },
        frontWrap ? frontCrop.layout : null,
        frontWrap ? frontCrop.side : null
    );
    const backWrapTex = useBookTexture(
        backWrap ? backSlot : { src: null },
        backWrap ? backCrop.layout : null,
        backWrap ? backCrop.side : null,
        { backFace: true, mirrorX: true }
    );
    const frontTexture = frontWrap ? frontWrapTex : frontCanvas;
    const backTexture = backWrap ? backWrapTex : backCanvas;

    return (
        <a.group rotation-y={rotY}>
            <a.group
                position-x={xPivot}
                position-z={rotY.to((r) => Math.sin(Math.abs(r)) * FLIP_LIFT + 0.018)}
            >
                <mesh position={[0, 0, 0.001]} renderOrder={3}>
                    <planeGeometry args={[width, height]} />
                    <CoverPhotoMaterial map={frontTexture} />
                </mesh>
                <mesh position={[0, 0, -0.001]} renderOrder={3}>
                    <planeGeometry args={[width, height]} />
                    <CoverPhotoMaterial map={backTexture} side={THREE.BackSide} />
                </mesh>
            </a.group>
        </a.group>
    );
}

function OpenSpread({
    leftSlot,
    rightSlot,
    width,
    height,
    pageAspect,
    coverSrc,
    wrapLayout,
    useWrapCrop,
}) {
    if (isPanoramicSpreadPair(leftSlot, rightSlot)) {
        return (
            <group>
                <PanoramicSpread
                    src={leftSlot.src}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                />
                <SpineMask height={height} />
            </group>
        );
    }

    return (
        <group>
            <PageFace
                slot={leftSlot}
                width={width}
                height={height}
                pageAspect={pageAspect}
                side="left"
                coverSrc={coverSrc}
                wrapLayout={wrapLayout}
                useWrapCrop={useWrapCrop}
            />
            <PageFace
                slot={rightSlot}
                width={width}
                height={height}
                pageAspect={pageAspect}
                side="right"
                coverSrc={coverSrc}
                wrapLayout={wrapLayout}
                useWrapCrop={useWrapCrop}
            />
            <SpineMask height={height} />
        </group>
    );
}

function FlipSpread({
    layout,
    rotY,
    width,
    height,
    pageAspect,
    coverSrc,
    wrapLayout,
    useWrapCrop,
}) {
    const underPair =
        layout.underLeft &&
        layout.underRight &&
        isPanoramicSpreadPair(layout.underLeft, layout.underRight);

    return (
        <group>
            {layout.anchorLeft && (
                <PageFace
                    slot={layout.anchorLeft}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    side="left"
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    renderOrder={1}
                />
            )}
            {layout.anchorRight && (
                <PageFace
                    slot={layout.anchorRight}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    side="right"
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    renderOrder={1}
                />
            )}
            {underPair ? (
                <PanoramicSpread
                    src={layout.underLeft.src}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    renderOrder={0}
                />
            ) : (
                <>
                    {layout.underLeft && (
                        <PageFace
                            slot={layout.underLeft}
                            width={width}
                            height={height}
                            pageAspect={pageAspect}
                            side="left"
                            coverSrc={coverSrc}
                            wrapLayout={wrapLayout}
                            useWrapCrop={useWrapCrop}
                            renderOrder={0}
                        />
                    )}
                    {layout.underRight && (
                        <PageFace
                            slot={layout.underRight}
                            width={width}
                            height={height}
                            pageAspect={pageAspect}
                            side="right"
                            coverSrc={coverSrc}
                            wrapLayout={wrapLayout}
                            useWrapCrop={useWrapCrop}
                            renderOrder={0}
                        />
                    )}
                </>
            )}
            <FlippingSheet
                width={width}
                height={height}
                pageAspect={pageAspect}
                side={layout.sheetSide}
                rotY={rotY}
                frontSlot={layout.sheetFront}
                backSlot={layout.sheetBack}
                coverSrc={coverSrc}
                wrapLayout={wrapLayout}
                useWrapCrop={useWrapCrop}
            />
            <SpineMask height={height} />
        </group>
    );
}

function isClosedBackSpread(spreadIndex, totalSpreads, spreadOpts) {
    return (
        spreadOpts.hasCovers &&
        totalSpreads > 1 &&
        spreadIndex >= totalSpreads - 1
    );
}

function isClosedFrontSpread(spreadIndex) {
    return spreadIndex === 0;
}

function isOpenSpread(spreadIndex, totalSpreads, spreadOpts) {
    return !isClosedFrontSpread(spreadIndex) && !isClosedBackSpread(spreadIndex, totalSpreads, spreadOpts);
}

/** Layer layout matches 2D AlbumPageFlipAnimation (static + under + leaf). */
function buildFlipLayout(flip, from, to, coverFrontSlot, coverInsideSlot) {
    const forward = flip.forward;

    if (flip.mode === 'cover-open') {
        return {
            direction: 'forward',
            anchorLeft: to.left,
            underRight: to.right,
            sheetSide: 'right',
            sheetFront: coverFrontSlot,
            sheetBack: coverInsideSlot,
        };
    }

    if (flip.mode === 'cover-close') {
        return {
            direction: 'backward',
            anchorLeft: from.left,
            anchorRight: from.right,
            sheetSide: 'right',
            sheetFront: coverFrontSlot,
            sheetBack: coverInsideSlot,
        };
    }

    if (flip.mode === 'back-close') {
        return {
            direction: 'forward',
            anchorLeft: from.left,
            underRight: to.right,
            sheetSide: 'right',
            sheetFront: from.right,
            sheetBack: to.left,
        };
    }

    if (flip.mode === 'back-open') {
        return {
            direction: 'backward',
            anchorRight: from.right,
            underLeft: to.left,
            sheetSide: 'left',
            sheetFront: from.left,
            sheetBack: to.right,
        };
    }

    if (forward) {
        return {
            direction: 'forward',
            anchorLeft: from.left,
            underRight: to.right,
            sheetSide: 'right',
            sheetFront: from.right,
            sheetBack: to.left,
        };
    }

    return {
        direction: 'backward',
        anchorRight: from.right,
        underLeft: to.left,
        sheetSide: 'left',
        sheetFront: from.left,
        sheetBack: to.right,
    };
}

export default function BookModel({
    album,
    totalPages,
    initialPage,
    onPageChange,
    showSamples = false,
}) {
    const groupRef = useRef();
    const flippingRef = useRef(false);
    const spreadOpts = useMemo(() => getSpreadContext(album, totalPages), [album, totalPages]);

    const normalizedInitial = useMemo(
        () => normalizeStoragePageIndex(initialPage ?? 0, totalPages, spreadOpts),
        [initialPage, totalPages, spreadOpts]
    );

    const initialSpread = useMemo(
        () => pageToSpreadIndex(normalizedInitial, { ...spreadOpts, totalPages }),
        [normalizedInitial, spreadOpts, totalPages]
    );

    const [displaySpread, setDisplaySpread] = useState(initialSpread);
    const [flip, setFlip] = useState(null);

    const [{ rotY }, flipApi] = useSpring(() => ({ rotY: 0 }));

    const { width, height, aspect: pageAspect } = useMemo(() => getBook3dDimensions(album), [album]);
    const totalSpreads = useMemo(() => getTotalSpreads(totalPages, spreadOpts), [totalPages, spreadOpts]);

    const wrapLayout = useMemo(() => {
        if (!album) return null;
        return getBookWrapSpineLayout(album);
    }, [album]);

    const coverSrc = useMemo(() => (album ? resolveCoverImageSrc(album) : null), [album]);
    const blankCover = isBlankCoverAlbum(album);
    const useWrapCrop = shouldUseWrapCrop(album, coverSrc, wrapLayout);

    const coverSlot = useMemo(() => ({ src: coverSrc }), [coverSrc]);
    const coverFrontSlot = useMemo(
        () => (coverSrc ? { src: coverSrc, panoramic: 'right' } : { src: null }),
        [coverSrc]
    );
    const coverInsideSlot = useMemo(() => ({ src: null }), []);
    const closedFrontTex = useBookTexture(
        coverSlot,
        useWrapCrop ? wrapLayout : null,
        useWrapCrop ? 'front' : null
    );
    const closedBackTex = useBookTexture(
        coverSlot,
        useWrapCrop ? wrapLayout : null,
        useWrapCrop ? 'back' : null
    );
    const closedSpineTex = useBookTexture(
        coverSlot,
        useWrapCrop ? wrapLayout : null,
        useWrapCrop ? 'spine' : null
    );
    const hasFrontPhoto = Boolean(coverSrc);
    const hasBackPhoto = Boolean(coverSrc && useWrapCrop);
    const hasSpinePhoto = Boolean(coverSrc && useWrapCrop && wrapLayout?.hasSpine);

    const spineWidth = useMemo(() => getSpineWidth(width, album), [width, album]);
    const pageDepth = Math.max(0.14, (totalSpreads - 1) * 0.006 + 0.06);

    const resolveSlot = useCallback(
        (pageNum) => {
            if (!album) return { src: null };
            return resolveBook3dPageSlot(album, pageNum, totalPages, spreadOpts, { showSamples });
        },
        [album, totalPages, spreadOpts, showSamples]
    );

    const getSpreadSlots = useCallback(
        (spreadIndex) => {
            const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
            return { left: resolveSlot(left), right: resolveSlot(right) };
        },
        [totalPages, spreadOpts, resolveSlot]
    );

    const isClosedBack = isClosedBackSpread(displaySpread, totalSpreads, spreadOpts);
    const isClosedFront = isClosedFrontSpread(displaySpread);
    const isOpen = isOpenSpread(displaySpread, totalSpreads, spreadOpts);

    const { closedRotY } = useSpring({
        closedRotY: isClosedBack ? Math.PI : 0,
        config: FLIP_CONFIG,
    });

    const displaySlots = useMemo(
        () => getSpreadSlots(displaySpread),
        [displaySpread, getSpreadSlots]
    );

    const finishFlip = useCallback(
        (toSpread) => {
            flippingRef.current = false;
            setDisplaySpread(toSpread);
            setFlip(null);
            flipApi.set({ rotY: 0 });
        },
        [flipApi]
    );

    const startFlip = useCallback(
        (fromSpread, toSpread) => {
            if (flippingRef.current || fromSpread === toSpread) return;
            flippingRef.current = true;

            const forward = toSpread > fromSpread;
            let mode = 'page';

            if (fromSpread === 0 && toSpread === 1) mode = 'cover-open';
            else if (fromSpread === 1 && toSpread === 0) mode = 'cover-close';
            else if (isClosedBackSpread(toSpread, totalSpreads, spreadOpts)) mode = 'back-close';
            else if (isClosedBackSpread(fromSpread, totalSpreads, spreadOpts)) mode = 'back-open';

            setFlip({ from: fromSpread, to: toSpread, mode, forward });

            const opening = mode === 'cover-close' || mode === 'back-open';
            const closing = mode === 'cover-open' || mode === 'back-close' || (mode === 'page' && forward);
            let startRot = 0;
            let endRot = -Math.PI;
            if (opening) {
                startRot = -Math.PI;
                endRot = 0;
            } else if (!closing) {
                endRot = Math.PI;
            }

            flipApi.set({ rotY: startRot });
            flipApi.start({
                rotY: endRot,
                config: FLIP_CONFIG,
                onRest: (result) => {
                    if (result.finished) finishFlip(toSpread);
                },
            });
        },
        [finishFlip, flipApi, spreadOpts, totalSpreads]
    );

    useEffect(() => {
        const externalPage = normalizeStoragePageIndex(initialPage ?? 0, totalPages, spreadOpts);
        const externalSpread = pageToSpreadIndex(externalPage, { ...spreadOpts, totalPages });
        if (!flippingRef.current && externalSpread !== displaySpread) {
            startFlip(displaySpread, externalSpread);
        }
    }, [initialPage, totalPages, spreadOpts, displaySpread, startFlip]);

    const navigate = useCallback(
        (direction) => {
            const nextSpread = displaySpread + direction;
            if (nextSpread < 0 || nextSpread >= totalSpreads) return;
            const nextPage = getSpreadPages(nextSpread, totalPages, spreadOpts).left;
            startFlip(displaySpread, nextSpread);
            onPageChange?.(nextPage);
        },
        [displaySpread, totalSpreads, totalPages, spreadOpts, startFlip, onPageChange]
    );

    const handleNextPage = useCallback(() => navigate(1), [navigate]);
    const handlePrevPage = useCallback(() => navigate(-1), [navigate]);

    const bind = useDrag(
        ({ down, movement: [mx], cancel, event }) => {
            if (!down && Math.abs(mx) > 30) {
                event?.stopPropagation?.();
                if (mx > 0) handlePrevPage();
                else handleNextPage();
                cancel();
            }
        },
        { filterTaps: true }
    );

    const handleClick = (e) => {
        e.stopPropagation?.();
        if (flippingRef.current) return;
        if (e.point) {
            if (e.point.x > 0) handleNextPage();
            else handlePrevPage();
        }
    };

    const flipLayout = useMemo(() => {
        if (!flip) return null;
        const from = getSpreadSlots(flip.from);
        const to = getSpreadSlots(flip.to);
        return buildFlipLayout(flip, from, to, coverFrontSlot, coverInsideSlot);
    }, [flip, getSpreadSlots, coverFrontSlot, coverInsideSlot]);

    const showClosedIdle = !flip && (isClosedFront || isClosedBack);
    const showOpenIdle = !flip && isOpen;

    return (
        <a.group ref={groupRef} {...bind()} onClick={handleClick}>
            {showClosedIdle && (
                <a.group rotation-y={closedRotY}>
                    <ClosedBook
                        width={width}
                        height={height}
                        pageDepth={pageDepth}
                        spineWidth={spineWidth}
                        frontTexture={closedFrontTex}
                        backTexture={closedBackTex}
                        spineTexture={closedSpineTex}
                        blankCover={blankCover}
                        hasFrontPhoto={hasFrontPhoto}
                        hasBackPhoto={hasBackPhoto}
                        hasSpinePhoto={hasSpinePhoto}
                    />
                </a.group>
            )}

            {showOpenIdle && (
                <OpenSpread
                    leftSlot={displaySlots.left}
                    rightSlot={displaySlots.right}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                />
            )}

            {flip && flipLayout && (
                <FlipSpread
                    layout={flipLayout}
                    rotY={rotY}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                />
            )}
        </a.group>
    );
}
