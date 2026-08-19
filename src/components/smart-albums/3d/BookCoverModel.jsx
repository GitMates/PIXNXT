import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COVER_TEXT_CHANGED_EVENT, resolveFrontCoverDisplayText } from '../albumCoverText';
import {
    COVER_COLOR_CHANGED_EVENT,
    getAlbumCoverColor,
    DEFAULT_COVER_COLOR_PRESET_ID,
    resolveCoverLeatherPreset,
} from '../albumCoverColor';
import {
    getGridSlotPhoto,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveBookWrapSpreadSrc,
} from '../albumPagePhotos';
import { getSpreadPhotoTransform } from '../albumPageTransforms';
import { getSpreadLeftPageIndex } from '../albumSpreadGrid';
import {
    albumShowsLeatherCover,
    getSpreadContext,
    getTotalSpreads,
    isWholeSpreadLayout,
} from '../albumSpreadUtils';
import { getBookWrapSpineLayout } from '../bookWrapSpine';
import { SPINE_BOUNDS_CHANGED_EVENT } from '../albumSpineSettings';
import { getSampleImageForPage } from '../sampleAlbumImages';
import {
    getBook3dDimensions,
    shouldUseWrapCrop,
    isBlankCoverAlbum,
    HARDCOVER_GREEN,
    SPINE_DARK,
    PAGE_WHITE,
} from './book3dTextures';
import {
    useBlankCoverTitleTexture,
    useBlankLeatherPanelTexture,
    useCanvasPageTexture,
    useCanvasSpreadTexture,
    useCanvasWrapTexture,
} from './book3dPageCanvas';

const COVER_THICK = 0.045;
const SPINE_EMPTY = '#e4e7ec';
/** Idle open angle (rad) for the turn-page invitation. */
const TURN_HINT_MAX_YAW = 0.28;
const TURN_HINT_SPEED = 1.05;

/**
 * First photo/spread visible when the front cover peels open in the 3D hint.
 * With covers: skip blank inside-left (page 2), prefer page 3 then later pages.
 */
function resolveFirstPeekContent(album, totalPages, showSamples = false) {
    const albumId = album?.id;
    if (!albumId) return null;
    const spreadOpts = getSpreadContext(album, totalPages);
    const startPage = spreadOpts.hasCovers ? 3 : 0;
    const lastPage = Math.max(0, totalPages - 1);

    for (let pageNum = startPage; pageNum <= lastPage; pageNum += 1) {
        if (spreadOpts.hasCovers && pageNum === 2) continue;
        const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
        if (pageNum === spreadLeft) {
            const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeft);
            if (spreadSrc) {
                return {
                    kind: 'spread',
                    src: spreadSrc,
                    left: spreadLeft,
                    transform: getSpreadPhotoTransform(albumId, spreadLeft),
                };
            }
        }
        const cellId = pageNum === spreadLeft ? 1 : 2;
        const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
            wholeSpread: isWholeSpreadLayout(album?.grid_layout),
            spreadOpts,
        });
        if (slot?.src) {
            return {
                kind: 'page',
                slot,
                page: pageNum,
                transform: getSpreadPhotoTransform(albumId, spreadLeft),
            };
        }
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) {
            return {
                kind: 'page',
                slot: { src: pageSrc },
                page: pageNum,
                transform: getSpreadPhotoTransform(albumId, spreadLeft),
            };
        }
    }

    if (showSamples) {
        return {
            kind: 'page',
            slot: { src: getSampleImageForPage(startPage) },
            page: startPage,
            transform: null,
        };
    }
    return null;
}

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

/** Soft breathing open of the front board so the page stack reads as turnable. */
function useFrontCoverTurnHint(hingeRef, enabled) {
    const reduceMotionRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => {
            reduceMotionRef.current = mq.matches;
        };
        sync();
        mq.addEventListener?.('change', sync);
        return () => mq.removeEventListener?.('change', sync);
    }, []);

    useFrame(({ clock }) => {
        const hinge = hingeRef.current;
        if (!hinge) return;
        if (!enabled || reduceMotionRef.current) {
            hinge.rotation.y = 0;
            return;
        }
        // Hold closed briefly, ease open, ease closed — readable as a page turn cue.
        const cycle = (clock.elapsedTime * TURN_HINT_SPEED) % (Math.PI * 2);
        const wave = Math.max(0, Math.sin(cycle));
        const amount = wave * wave;
        hinge.rotation.y = -amount * TURN_HINT_MAX_YAW;
    });
}

function ClosedBook({
    width,
    height,
    pageDepth,
    frontTexture,
    backTexture,
    spineTexture,
    insideTexture = null,
    hasInsidePhoto = false,
    blankCover,
    blankNoPhoto,
    leatherPreset,
    hasFrontPhoto,
    hasBackPhoto,
    hasSpinePhoto,
    showSpinePanel,
    showTurnHint = false,
}) {
    const frontHingeRef = useRef(null);
    useFrontCoverTurnHint(frontHingeRef, showTurnHint);

    const totalDepth = pageDepth + COVER_THICK * 2;
    const boardPad = 0.012;
    const coverW = width + boardPad;
    const coverH = height + boardPad;
    const halfCoverW = coverW / 2;
    const outerZ = pageDepth / 2 + COVER_THICK;
    const hasLeather = Boolean(leatherPreset);
    const boardColor = hasLeather
        ? leatherPreset.base
        : blankNoPhoto
          ? '#ffffff'
          : blankCover
            ? HARDCOVER_GREEN
            : SPINE_DARK;
    const backFallbackColor = hasLeather ? leatherPreset.base : blankNoPhoto ? '#eceef1' : boardColor;
    const spineFallback = hasLeather
        ? leatherPreset.spine
        : showSpinePanel
          ? SPINE_EMPTY
          : SPINE_DARK;

    const frontCover = (
        <>
            <mesh position={[0, 0, -COVER_THICK / 2]} castShadow>
                <boxGeometry args={[coverW, coverH, COVER_THICK]} />
                <MatteMaterial color={boardColor} />
            </mesh>
            {/* Underside peek when the cover lifts */}
            <mesh position={[0, 0, -COVER_THICK - 0.001]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[coverW, coverH]} />
                <meshBasicMaterial color="#f7f5f1" toneMapped={false} />
            </mesh>
            <mesh
                position={[0, 0, 0.002]}
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
        </>
    );

    return (
        <group>
            <mesh>
                <boxGeometry args={[width, height, pageDepth]} />
                <PageEdgeMaterial />
            </mesh>

            {/* First spread / page showing under the cover when it peels open */}
            <mesh position={[0, 0, pageDepth / 2 + 0.0015]} castShadow>
                <planeGeometry args={[width, height]} />
                {hasInsidePhoto && insideTexture ? (
                    <CoverPhotoMaterial map={insideTexture} />
                ) : (
                    <meshBasicMaterial color={PAGE_WHITE} toneMapped={false} />
                )}
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
                ) : showSpinePanel && hasLeather ? (
                    <CoverPhotoMaterial map={spineTexture} side={THREE.DoubleSide} />
                ) : showSpinePanel ? (
                    <meshBasicMaterial color={spineFallback} toneMapped={false} side={THREE.DoubleSide} />
                ) : (
                    <MatteMaterial color={SPINE_DARK} />
                )}
            </mesh>

            {/* Hinge at the spine edge so the front board can breathe open. */}
            <group
                ref={frontHingeRef}
                position={[-halfCoverW, 0, outerZ]}
            >
                <group position={[halfCoverW, 0, 0]}>{frontCover}</group>
            </group>

            <mesh
                position={[0, 0, -(outerZ + 0.002)]}
                rotation={[0, Math.PI, 0]}
                castShadow
            >
                <planeGeometry args={[coverW, coverH]} />
                {hasBackPhoto ? (
                    <CoverPhotoMaterial map={backTexture} />
                ) : hasLeather ? (
                    <CoverPhotoMaterial map={backTexture} />
                ) : (
                    <MatteMaterial color={backFallbackColor} />
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
    const [coverTextTick, setCoverTextTick] = useState(0);
    const [coverColorTick, setCoverColorTick] = useState(0);

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

    useEffect(() => {
        if (!album?.id) return undefined;
        const onCoverTextChanged = (e) => {
            if (e.detail?.albumId === album.id) setCoverTextTick((t) => t + 1);
        };
        window.addEventListener(COVER_TEXT_CHANGED_EVENT, onCoverTextChanged);
        return () => window.removeEventListener(COVER_TEXT_CHANGED_EVENT, onCoverTextChanged);
    }, [album?.id]);

    useEffect(() => {
        if (!album?.id) return undefined;
        const onCoverColorChanged = (e) => {
            if (e.detail?.albumId === album.id) setCoverColorTick((t) => t + 1);
        };
        window.addEventListener(COVER_COLOR_CHANGED_EVENT, onCoverColorChanged);
        return () => window.removeEventListener(COVER_COLOR_CHANGED_EVENT, onCoverColorChanged);
    }, [album?.id]);

    const wrapLayout = useMemo(() => {
        if (!album) return null;
        return getBookWrapSpineLayout(album);
    }, [album, album?.__wrap_aspect, spineBoundsTick]);

    const coverSrc = useMemo(
        () => (album ? resolveBookWrapSpreadSrc(album, { showSamples }) : null),
        [album, showSamples]
    );
    const coverTransform = useMemo(
        () => (album?.id ? getSpreadPhotoTransform(album.id, 0) : { x: 0, y: 0, scaleX: 1, scaleY: 1 }),
        [album?.id]
    );
    const blankCover = isBlankCoverAlbum(album);
    const blankNoPhoto = albumShowsLeatherCover(album, coverSrc);
    const coverColorId = useMemo(() => {
        void coverColorTick;
        return album?.id ? getAlbumCoverColor(album.id) : DEFAULT_COVER_COLOR_PRESET_ID;
    }, [album?.id, coverColorTick]);
    const leatherPreset = blankNoPhoto ? resolveCoverLeatherPreset(coverColorId) : null;
    const useWrapCrop = shouldUseWrapCrop(album, coverSrc, wrapLayout);
    const hasWrapSpineSlice = Boolean(
        wrapLayout?.hasSpine &&
        wrapLayout.spineEndFraction - wrapLayout.spineStartFraction > 0.004
    );
    const showSpinePanel = Boolean(blankNoPhoto || (coverSrc && hasWrapSpineSlice));

    const coverTitle = useMemo(
        () => (blankNoPhoto ? resolveFrontCoverDisplayText(album, album?.id) : ''),
        [album, blankNoPhoto, coverTextTick]
    );

    const spineBindingAspect = useMemo(() => {
        const totalDepth = pageDepth + COVER_THICK * 2;
        return totalDepth / coverH;
    }, [pageDepth, coverH]);

    const peekContent = useMemo(
        () => resolveFirstPeekContent(album, totalPages, showSamples),
        [album, totalPages, showSamples]
    );
    const peekPageSlot = peekContent?.kind === 'page' ? peekContent.slot : null;
    const peekSpreadSrc = peekContent?.kind === 'spread' ? peekContent.src : null;
    const peekTransform = peekContent?.transform || null;

    const blankTitleFrontTex = useBlankCoverTitleTexture(coverTitle, pageAspect, coverColorId);
    const blankLeatherBackTex = useBlankLeatherPanelTexture(pageAspect, coverColorId, { spine: false });
    const blankLeatherSpineTex = useBlankLeatherPanelTexture(spineBindingAspect, coverColorId, {
        spine: true,
    });
    const hasBlankLeatherFront = Boolean(blankNoPhoto);

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
    const peekPageTex = useCanvasPageTexture(peekPageSlot, pageAspect, {
        transform: peekTransform,
    });
    const peekSpreadTex = useCanvasSpreadTexture(peekSpreadSrc, pageAspect, peekTransform);
    const insideTexture = peekContent?.kind === 'spread' ? peekSpreadTex : peekPageTex;
    const hasInsidePhoto = Boolean(peekContent?.kind === 'spread' ? peekSpreadSrc : peekPageSlot?.src);

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
                frontTexture={coverSrc ? closedFrontTex : blankTitleFrontTex}
                backTexture={blankNoPhoto ? blankLeatherBackTex : closedBackTex}
                spineTexture={blankNoPhoto ? blankLeatherSpineTex : closedSpineTex}
                insideTexture={insideTexture}
                hasInsidePhoto={hasInsidePhoto}
                blankCover={blankCover}
                blankNoPhoto={blankNoPhoto}
                leatherPreset={leatherPreset}
                hasFrontPhoto={Boolean(coverSrc || hasBlankLeatherFront)}
                hasBackPhoto={Boolean(coverSrc && useWrapCrop) || blankNoPhoto}
                hasSpinePhoto={
                    Boolean(coverSrc && useWrapCrop && hasWrapSpineSlice) ||
                    (blankNoPhoto && showSpinePanel)
                }
                showSpinePanel={showSpinePanel}
                showTurnHint={Boolean(onCoverOpen)}
            />
        </group>
    );
}
