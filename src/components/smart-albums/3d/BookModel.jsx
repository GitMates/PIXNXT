import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useSpring, a } from '@react-spring/three';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';
import { resolveBookWrapSpreadSrc } from '../albumPagePhotos';
import { getSpreadPhotoTransform, getPagePhotoTransform } from '../albumPageTransforms';
import {
    getSpreadContext,
    getTotalSpreads,
    getSpreadPages,
    pageToSpreadIndex,
    normalizeStoragePageIndex,
} from '../albumSpreadUtils';
import { getSpreadLeftPageIndex } from '../albumSpreadGrid';
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
import { resolveBook3dPageSlot } from './book3dPageSlots';
import { useCanvasPageTexture, useCanvasWrapTexture } from './book3dPageCanvas';

const COVER_THICK = 0.045;
const PAGE_Z = 0.012;
const SPINE_MASK_W = 0.014;
const SPINE_EMPTY = '#e4e7ec';
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

function resolveSlotTransform(albumId, slot, spreadLeft, pageNum) {
    if (!albumId) return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    if (slot?.panoramic != null && spreadLeft != null) {
        return getSpreadPhotoTransform(albumId, spreadLeft);
    }
    if (pageNum != null) return getPagePhotoTransform(albumId, pageNum);
    return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
}

function spreadLeftForPage(pageNum, spreadOpts, totalPages) {
    return getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
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

function PageFace({
    slot,
    pageNum,
    spreadLeft,
    albumId,
    width,
    height,
    pageAspect,
    side,
    coverSrc,
    wrapLayout,
    useWrapCrop,
    coverTransform,
    opacity = 1,
    renderOrder = 0,
}) {
    const { layout, side: wrapSide } = resolveTextureCrop(slot, coverSrc, useWrapCrop, wrapLayout);
    const isWrapCover = Boolean(layout && wrapSide);
    const transform = isWrapCover
        ? coverTransform
        : resolveSlotTransform(albumId, slot, spreadLeft, pageNum);
    const canvasTexture = useCanvasPageTexture(isWrapCover ? { src: null } : slot, pageAspect, {
        transform,
    });
    const wrapTexture = useCanvasWrapTexture(
        isWrapCover ? slot?.src : null,
        isWrapCover ? layout : null,
        isWrapCover ? wrapSide : null,
        transform,
        pageAspect
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
    frontPageNum,
    backPageNum,
    frontSpreadLeft,
    backSpreadLeft,
    albumId,
    coverSrc,
    wrapLayout,
    useWrapCrop,
    coverTransform,
}) {
    const xPivot = side === 'right' ? width / 2 : -width / 2;
    const frontCrop = resolveTextureCrop(frontSlot, coverSrc, useWrapCrop, wrapLayout);
    const backCrop = resolveTextureCrop(backSlot, coverSrc, useWrapCrop, wrapLayout);
    const frontWrap = Boolean(frontCrop.layout && frontCrop.side);
    const backWrap = Boolean(backCrop.layout && backCrop.side);
    const frontTransform = frontWrap
        ? coverTransform
        : resolveSlotTransform(albumId, frontSlot, frontSpreadLeft, frontPageNum);
    const backTransform = backWrap
        ? coverTransform
        : resolveSlotTransform(albumId, backSlot, backSpreadLeft, backPageNum);
    const frontCanvas = useCanvasPageTexture(frontWrap ? { src: null } : frontSlot, pageAspect, {
        transform: frontTransform,
    });
    const backCanvas = useCanvasPageTexture(backWrap ? { src: null } : backSlot, pageAspect, {
        mirror: true,
        transform: backTransform,
    });
    const frontWrapTex = useCanvasWrapTexture(
        frontWrap ? frontSlot?.src : null,
        frontWrap ? frontCrop.layout : null,
        frontWrap ? frontCrop.side : null,
        frontTransform,
        pageAspect
    );
    const backWrapTex = useCanvasWrapTexture(
        backWrap ? backSlot?.src : null,
        backWrap ? backCrop.layout : null,
        backWrap ? backCrop.side : null,
        backTransform,
        pageAspect
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

function SpreadPages({
    leftSlot,
    rightSlot,
    leftPageNum,
    rightPageNum,
    spreadLeft,
    albumId,
    width,
    height,
    pageAspect,
    coverSrc,
    wrapLayout,
    useWrapCrop,
    coverTransform,
    renderOrder = 0,
}) {
    return (
        <>
            <PageFace
                slot={leftSlot}
                pageNum={leftPageNum}
                spreadLeft={spreadLeft}
                albumId={albumId}
                width={width}
                height={height}
                pageAspect={pageAspect}
                side="left"
                coverSrc={coverSrc}
                wrapLayout={wrapLayout}
                useWrapCrop={useWrapCrop}
                coverTransform={coverTransform}
                renderOrder={renderOrder}
            />
            <PageFace
                slot={rightSlot}
                pageNum={rightPageNum}
                spreadLeft={spreadLeft}
                albumId={albumId}
                width={width}
                height={height}
                pageAspect={pageAspect}
                side="right"
                coverSrc={coverSrc}
                wrapLayout={wrapLayout}
                useWrapCrop={useWrapCrop}
                coverTransform={coverTransform}
                renderOrder={renderOrder}
            />
        </>
    );
}

function OpenSpread({
    leftSlot,
    rightSlot,
    leftPageNum,
    rightPageNum,
    spreadLeft,
    albumId,
    width,
    height,
    pageAspect,
    coverSrc,
    wrapLayout,
    useWrapCrop,
    coverTransform,
}) {
    return (
        <group>
            <SpreadPages
                leftSlot={leftSlot}
                rightSlot={rightSlot}
                leftPageNum={leftPageNum}
                rightPageNum={rightPageNum}
                spreadLeft={spreadLeft}
                albumId={albumId}
                width={width}
                height={height}
                pageAspect={pageAspect}
                coverSrc={coverSrc}
                wrapLayout={wrapLayout}
                useWrapCrop={useWrapCrop}
                coverTransform={coverTransform}
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
    albumId,
    coverSrc,
    wrapLayout,
    useWrapCrop,
    coverTransform,
    spreadOpts,
    totalPages,
    fromSpreadLeft,
    toSpreadLeft,
}) {
    const anchorLeftSpreadLeft = layout.anchorLeftPageNum != null
        ? spreadLeftForPage(layout.anchorLeftPageNum, spreadOpts, totalPages)
        : fromSpreadLeft;
    const anchorRightSpreadLeft = layout.anchorRightPageNum != null
        ? spreadLeftForPage(layout.anchorRightPageNum, spreadOpts, totalPages)
        : fromSpreadLeft;
    const underSpreadLeft = layout.underLeftPageNum != null
        ? spreadLeftForPage(layout.underLeftPageNum, spreadOpts, totalPages)
        : layout.underRightPageNum != null
          ? spreadLeftForPage(layout.underRightPageNum, spreadOpts, totalPages)
          : toSpreadLeft;

    return (
        <group>
            {layout.anchorLeft && (
                <PageFace
                    slot={layout.anchorLeft}
                    pageNum={layout.anchorLeftPageNum}
                    spreadLeft={anchorLeftSpreadLeft}
                    albumId={albumId}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    side="left"
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    coverTransform={coverTransform}
                    renderOrder={1}
                />
            )}
            {layout.anchorRight && (
                <PageFace
                    slot={layout.anchorRight}
                    pageNum={layout.anchorRightPageNum}
                    spreadLeft={anchorRightSpreadLeft}
                    albumId={albumId}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    side="right"
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    coverTransform={coverTransform}
                    renderOrder={1}
                />
            )}
            {layout.underLeft && (
                <PageFace
                    slot={layout.underLeft}
                    pageNum={layout.underLeftPageNum}
                    spreadLeft={underSpreadLeft}
                    albumId={albumId}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    side="left"
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    coverTransform={coverTransform}
                    renderOrder={0}
                />
            )}
            {layout.underRight && (
                <PageFace
                    slot={layout.underRight}
                    pageNum={layout.underRightPageNum}
                    spreadLeft={underSpreadLeft}
                    albumId={albumId}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    side="right"
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    coverTransform={coverTransform}
                    renderOrder={0}
                />
            )}
            <FlippingSheet
                width={width}
                height={height}
                pageAspect={pageAspect}
                side={layout.sheetSide}
                rotY={rotY}
                frontSlot={layout.sheetFront}
                backSlot={layout.sheetBack}
                frontPageNum={layout.sheetFrontPageNum}
                backPageNum={layout.sheetBackPageNum}
                frontSpreadLeft={layout.sheetFrontSpreadLeft}
                backSpreadLeft={layout.sheetBackSpreadLeft}
                albumId={albumId}
                coverSrc={coverSrc}
                wrapLayout={wrapLayout}
                useWrapCrop={useWrapCrop}
                coverTransform={coverTransform}
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
function buildFlipLayout(
    flip,
    from,
    to,
    coverFrontSlot,
    coverInsideSlot,
    spreadOpts,
    totalPages,
    coversOnly = false
) {
    const spreadLeft = (pageNum) => spreadLeftForPage(pageNum, spreadOpts, totalPages);
    const coverSheetFront = coversOnly ? coverInsideSlot : coverFrontSlot;

    if (flip.mode === 'cover-open') {
        return {
            direction: 'forward',
            anchorLeft: to.left,
            anchorLeftPageNum: to.leftPageNum,
            underRight: to.right,
            underRightPageNum: to.rightPageNum,
            sheetSide: 'right',
            sheetFront: coverSheetFront,
            sheetBack: coverInsideSlot,
            sheetFrontPageNum: 1,
            sheetBackPageNum: to.leftPageNum,
            sheetFrontSpreadLeft: 0,
            sheetBackSpreadLeft: spreadLeft(to.leftPageNum),
        };
    }

    if (flip.mode === 'cover-close') {
        return {
            direction: 'backward',
            anchorLeft: from.left,
            anchorLeftPageNum: from.leftPageNum,
            anchorRight: from.right,
            anchorRightPageNum: from.rightPageNum,
            sheetSide: 'right',
            sheetFront: coverFrontSlot,
            sheetBack: coverInsideSlot,
            sheetFrontPageNum: 1,
            sheetBackPageNum: from.leftPageNum,
            sheetFrontSpreadLeft: 0,
            sheetBackSpreadLeft: spreadLeft(from.leftPageNum),
        };
    }

    if (flip.mode === 'back-close') {
        return {
            direction: 'forward',
            anchorLeft: from.left,
            anchorLeftPageNum: from.leftPageNum,
            underRight: to.right,
            underRightPageNum: to.rightPageNum,
            sheetSide: 'right',
            sheetFront: from.right,
            sheetBack: to.left,
            sheetFrontPageNum: from.rightPageNum,
            sheetBackPageNum: to.leftPageNum,
            sheetFrontSpreadLeft: spreadLeft(from.rightPageNum),
            sheetBackSpreadLeft: spreadLeft(to.leftPageNum),
        };
    }

    if (flip.mode === 'back-open') {
        return {
            direction: 'backward',
            anchorRight: from.right,
            anchorRightPageNum: from.rightPageNum,
            underLeft: to.left,
            underLeftPageNum: to.leftPageNum,
            sheetSide: 'left',
            sheetFront: from.left,
            sheetBack: to.right,
            sheetFrontPageNum: from.leftPageNum,
            sheetBackPageNum: to.rightPageNum,
            sheetFrontSpreadLeft: spreadLeft(from.leftPageNum),
            sheetBackSpreadLeft: spreadLeft(to.rightPageNum),
        };
    }

    if (flip.forward) {
        return {
            direction: 'forward',
            anchorLeft: from.left,
            anchorLeftPageNum: from.leftPageNum,
            underRight: to.right,
            underRightPageNum: to.rightPageNum,
            sheetSide: 'right',
            sheetFront: from.right,
            sheetBack: to.left,
            sheetFrontPageNum: from.rightPageNum,
            sheetBackPageNum: to.leftPageNum,
            sheetFrontSpreadLeft: spreadLeft(from.rightPageNum),
            sheetBackSpreadLeft: spreadLeft(to.leftPageNum),
        };
    }

    return {
        direction: 'backward',
        anchorRight: from.right,
        anchorRightPageNum: from.rightPageNum,
        underLeft: to.left,
        underLeftPageNum: to.leftPageNum,
        sheetSide: 'left',
        sheetFront: from.left,
        sheetBack: to.right,
        sheetFrontPageNum: from.leftPageNum,
        sheetBackPageNum: to.rightPageNum,
        sheetFrontSpreadLeft: spreadLeft(from.leftPageNum),
        sheetBackSpreadLeft: spreadLeft(to.rightPageNum),
    };
}

export default function BookModel({
    album,
    totalPages,
    initialPage,
    onPageChange,
    showSamples = false,
    coversOnly = true,
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
    const [spineBoundsTick, setSpineBoundsTick] = useState(0);

    const [{ rotY }, flipApi] = useSpring(() => ({ rotY: 0 }));

    const { width, height, aspect: pageAspect } = useMemo(() => getBook3dDimensions(album), [album]);
    const totalSpreads = useMemo(() => getTotalSpreads(totalPages, spreadOpts), [totalPages, spreadOpts]);

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

    const coverSlot = useMemo(() => ({ src: coverSrc }), [coverSrc]);
    const coverFrontSlot = useMemo(
        () => (coverSrc ? { src: coverSrc, panoramic: 'right' } : { src: null }),
        [coverSrc]
    );
    const coverInsideSlot = useMemo(() => ({ src: null }), []);
    const pageDepth = Math.max(0.14, (totalSpreads - 1) * 0.006 + 0.06);
    const coverH = height + 0.012;
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
    const hasFrontPhoto = Boolean(coverSrc);
    const hasBackPhoto = Boolean(coverSrc && useWrapCrop);
    const hasSpinePhoto = Boolean(coverSrc && useWrapCrop && wrapLayout?.hasSpine);

    const resolveSlot = useCallback(
        (pageNum) => {
            if (!album || coversOnly) return { src: null };
            return resolveBook3dPageSlot(album, pageNum, totalPages, spreadOpts, { showSamples });
        },
        [album, totalPages, spreadOpts, showSamples, coversOnly]
    );

    const getSpreadSlots = useCallback(
        (spreadIndex) => {
            const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
            return {
                left: resolveSlot(left),
                right: resolveSlot(right),
                leftPageNum: left,
                rightPageNum: right,
                spreadLeft: left,
            };
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

    const finishFlip = useCallback((toSpread) => {
        flippingRef.current = false;
        setFlip(null);
        setDisplaySpread(toSpread);
    }, []);

    const startFlip = useCallback(
        (fromSpread, toSpread) => {
            if (flippingRef.current || fromSpread === toSpread) return;

            const forward = toSpread > fromSpread;
            let mode = 'page';

            if (fromSpread === 0 && toSpread === 1) mode = 'cover-open';
            else if (fromSpread === 1 && toSpread === 0) mode = 'cover-close';
            else if (isClosedBackSpread(toSpread, totalSpreads, spreadOpts)) mode = 'back-close';
            else if (isClosedBackSpread(fromSpread, totalSpreads, spreadOpts)) mode = 'back-open';

            // Inside pages are blank in coversOnly mode — snap past cover/back reveal flips.
            if (coversOnly && (mode === 'cover-open' || mode === 'back-open')) {
                flippingRef.current = false;
                setFlip(null);
                setDisplaySpread(toSpread);
                return;
            }

            flippingRef.current = true;

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
                onRest: () => {
                    finishFlip(toSpread);
                },
            });
        },
        [finishFlip, flipApi, spreadOpts, totalSpreads, coversOnly]
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
        return buildFlipLayout(
            flip,
            from,
            to,
            coverFrontSlot,
            coverInsideSlot,
            spreadOpts,
            totalPages,
            coversOnly
        );
    }, [flip, getSpreadSlots, coverFrontSlot, coverInsideSlot, spreadOpts, totalPages, coversOnly]);

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
                        frontTexture={closedFrontTex}
                        backTexture={closedBackTex}
                        spineTexture={closedSpineTex}
                        blankCover={blankCover}
                        hasFrontPhoto={hasFrontPhoto}
                        hasBackPhoto={hasBackPhoto}
                        hasSpinePhoto={hasSpinePhoto}
                        showSpinePanel={showSpinePanel}
                    />
                </a.group>
            )}

            {showOpenIdle && (
                <OpenSpread
                    leftSlot={displaySlots.left}
                    rightSlot={displaySlots.right}
                    leftPageNum={displaySlots.leftPageNum}
                    rightPageNum={displaySlots.rightPageNum}
                    spreadLeft={displaySlots.spreadLeft}
                    albumId={album?.id}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    coverTransform={coverTransform}
                />
            )}

            {flip && flipLayout && (
                <FlipSpread
                    layout={flipLayout}
                    rotY={rotY}
                    width={width}
                    height={height}
                    pageAspect={pageAspect}
                    albumId={album?.id}
                    coverSrc={coverSrc}
                    wrapLayout={wrapLayout}
                    useWrapCrop={useWrapCrop}
                    coverTransform={coverTransform}
                    spreadOpts={spreadOpts}
                    totalPages={totalPages}
                    fromSpreadLeft={getSpreadSlots(flip.from).spreadLeft}
                    toSpreadLeft={getSpreadSlots(flip.to).spreadLeft}
                />
            )}
        </a.group>
    );
}
