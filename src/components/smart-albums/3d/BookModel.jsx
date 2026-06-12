import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, a } from '@react-spring/three';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';
import { resolveCoverImageSrc, getGridSlotPhoto } from '../albumPagePhotos';
import { getSpreadLeftPageIndex } from '../albumSpreadGrid';
import {
    getSpreadContext,
    isWholeSpreadLayout,
    getTotalSpreads,
    getSpreadPages,
    pageToSpreadIndex,
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

const COVER_THICK = 0.045;
const PAGE_THICK = 0.012;

/** Unlit — shows texture pixels exactly as in the 2D preview (no glare or color shift). */
function CoverPhotoMaterial({ map, side = THREE.FrontSide }) {
    return <meshBasicMaterial map={map} toneMapped={false} side={side} />;
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
    spineWidth,
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
    const halfW = width / 2;
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

            <mesh position={[0, height / 2 + 0.005, 0]}>
                <boxGeometry args={[width, 0.012, totalDepth]} />
                <PageEdgeMaterial />
            </mesh>
            <mesh position={[0, -height / 2 - 0.005, 0]}>
                <boxGeometry args={[width, 0.012, totalDepth]} />
                <PageEdgeMaterial />
            </mesh>
            <mesh position={[halfW + 0.005, 0, 0]}>
                <boxGeometry args={[0.012, height, totalDepth]} />
                <PageEdgeMaterial />
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

const Leaf = ({
    index,
    totalLeaves,
    frontSlot,
    backSlot,
    isCover,
    targetSpread,
    width,
    height,
    wrapLayout,
    useWrapCrop,
}) => {
    const materialsRef = useRef([]);
    const frontSide = useWrapCrop ? wrapSideForSlot(frontSlot) : null;
    const backSide = useWrapCrop ? wrapSideForSlot(backSlot) : null;
    const frontTexture = useBookTexture(
        frontSlot,
        frontSide ? wrapLayout : null,
        frontSide
    );
    const backTexture = useBookTexture(
        backSlot,
        backSide ? wrapLayout : null,
        backSide
    );

    const thickness = isCover ? COVER_THICK : PAGE_THICK;
    const isTurned = index < targetSpread;
    const targetRotY = isTurned ? -Math.PI : 0;
    const pageZOffset = 0.004;
    const targetZ = isTurned
        ? index * pageZOffset
        : (totalLeaves - index) * pageZOffset;

    const { rotY, z } = useSpring({
        rotY: targetRotY,
        z: targetZ,
        config: { mass: 1, tension: 150, friction: 25 },
    });

    const onBeforeCompile = useMemo(() => {
        return (shader) => {
            shader.uniforms.uProgress = { value: 0 };
            shader.uniforms.uWidth = { value: width };
            shader.userData = shader.userData || {};
            shader.userData.uProgress = shader.uniforms.uProgress;

            shader.vertexShader = `
                uniform float uProgress;
                uniform float uWidth;
            ${shader.vertexShader}`;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                float u = (position.x + uWidth / 2.0) / uWidth;
                float curlAngle = sin(uProgress * 3.14159) * ${isCover ? '0.0' : '0.08'};
                if (abs(curlAngle) > 0.0001) {
                    float R = uWidth / curlAngle;
                    float theta = u * curlAngle;
                    transformed.x = R * sin(theta) - uWidth / 2.0;
                    transformed.z += R * (1.0 - cos(theta));
                }
                `
            );
        };
    }, [width, isCover]);

    const setMaterialRef = (el, i) => {
        if (el) {
            materialsRef.current[i] = el;
            el.onBeforeCompile = onBeforeCompile;
        }
    };

    useFrame(() => {
        const progress = Math.abs(rotY.get()) / Math.PI;
        materialsRef.current.forEach((mat) => {
            if (mat?.userData?.uProgress) {
                mat.userData.uProgress.value = progress;
            }
        });
    });

    const edgeProps = { color: '#e8e8e6', roughness: 0.9, onBeforeCompile };

    return (
        <a.group position-z={z} rotation-y={rotY}>
            <a.group position-z={rotY.to((r) => Math.sin(Math.abs(r)) * 0.015)}>
                <mesh position={[width / 2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width, height, thickness, 16, 1, 1]} />
                    <meshStandardMaterial ref={(el) => setMaterialRef(el, 0)} attach="material-0" {...edgeProps} />
                    <meshStandardMaterial ref={(el) => setMaterialRef(el, 1)} attach="material-1" {...edgeProps} />
                    <meshStandardMaterial ref={(el) => setMaterialRef(el, 2)} attach="material-2" {...edgeProps} />
                    <meshStandardMaterial ref={(el) => setMaterialRef(el, 3)} attach="material-3" {...edgeProps} />
                    <meshBasicMaterial
                        ref={(el) => setMaterialRef(el, 4)}
                        attach="material-4"
                        map={frontTexture}
                        color={!frontSlot?.src ? PAGE_WHITE : '#ffffff'}
                        toneMapped={false}
                        onBeforeCompile={onBeforeCompile}
                    />
                    <meshBasicMaterial
                        ref={(el) => setMaterialRef(el, 5)}
                        attach="material-5"
                        map={backTexture}
                        color={!backSlot?.src ? PAGE_WHITE : '#ffffff'}
                        toneMapped={false}
                        onBeforeCompile={onBeforeCompile}
                    />
                </mesh>
            </a.group>
        </a.group>
    );
};

export default function BookModel({ album, totalPages, initialPage, onPageChange }) {
    const groupRef = useRef();
    const [targetPage, setTargetPage] = useState(initialPage || 0);

    useEffect(() => {
        setTargetPage(initialPage);
    }, [initialPage]);

    const { width, height } = useMemo(() => getBook3dDimensions(album), [album]);
    const spreadOpts = useMemo(() => getSpreadContext(album, totalPages), [album, totalPages]);
    const totalSpreads = useMemo(() => getTotalSpreads(totalPages, spreadOpts), [totalPages, spreadOpts]);
    const targetSpread = useMemo(
        () => pageToSpreadIndex(targetPage, { ...spreadOpts, totalPages }),
        [targetPage, spreadOpts, totalPages]
    );

    const wrapLayout = useMemo(() => {
        if (!album) return null;
        return getBookWrapSpineLayout(album);
    }, [album]);

    const coverSrc = useMemo(() => (album ? resolveCoverImageSrc(album) : null), [album]);
    const blankCover = isBlankCoverAlbum(album);
    const useWrapCrop = shouldUseWrapCrop(album, coverSrc, wrapLayout);

    const coverSlot = useMemo(() => ({ src: coverSrc }), [coverSrc]);
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

    const leaves = useMemo(() => {
        const lvs = [];
        const numLeaves = Math.max(0, totalSpreads - 1);

        const getSlot = (pageNum) => {
            if (!album?.id || pageNum == null) return { src: null };
            if (pageNum === 0 && spreadOpts.hasCovers) return { src: null };
            if (pageNum === 1 && spreadOpts.hasCovers) {
                return { src: resolveCoverImageSrc(album), panoramic: 'right' };
            }
            const { left: endLeft } = getSpreadPages(totalSpreads - 1, totalPages, spreadOpts);
            if (pageNum === endLeft && spreadOpts.hasCovers) {
                return { src: resolveCoverImageSrc(album), panoramic: 'left' };
            }
            const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
            const cellId = pageNum === spreadLeft ? 1 : 2;
            return getGridSlotPhoto(album?.id, pageNum, cellId, spreadLeft, totalPages, {
                wholeSpread: isWholeSpreadLayout(album?.grid_layout),
                spreadOpts,
            });
        };

        for (let i = 0; i < numLeaves; i++) {
            const frontPageNum = getSpreadPages(i, totalPages, spreadOpts).right;
            const backPageNum = getSpreadPages(i + 1, totalPages, spreadOpts).left;
            lvs.push({
                id: i,
                frontSlot: getSlot(frontPageNum),
                backSlot: getSlot(backPageNum),
                isCover: i === 0 || i === numLeaves - 1,
            });
        }
        return lvs;
    }, [totalSpreads, totalPages, album, spreadOpts]);

    const pageDepth = Math.max(0.14, leaves.length * 0.006 + 0.06);
    const isClosedFront = targetSpread === 0;
    const isClosedBack =
        spreadOpts.hasCovers &&
        totalSpreads > 1 &&
        targetSpread >= totalSpreads - 1;
    const isOpen = !isClosedFront && !isClosedBack;

    const { positionX, closedRotY } = useSpring({
        positionX: isOpen ? -width / 2 : 0,
        closedRotY: isClosedBack ? Math.PI : 0,
        config: { mass: 1, tension: 140, friction: 28 },
    });

    const handleNextPage = () => {
        if (targetSpread < totalSpreads - 1) {
            const nextSpread = targetSpread + 1;
            const nextPage = getSpreadPages(nextSpread, totalPages, spreadOpts).left;
            setTargetPage(nextPage);
            onPageChange?.(nextPage);
        }
    };

    const handlePrevPage = () => {
        if (targetSpread > 0) {
            const prevSpread = targetSpread - 1;
            const prevPage = getSpreadPages(prevSpread, totalPages, spreadOpts).left;
            setTargetPage(prevPage);
            onPageChange?.(prevPage);
        }
    };

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
        if (e.point && groupRef.current) {
            if (e.point.x > groupRef.current.position.x) handleNextPage();
            else handlePrevPage();
        }
    };

    return (
        <a.group
            ref={groupRef}
            position-x={positionX}
            {...bind()}
            onClick={handleClick}
        >
            {(isClosedFront || isClosedBack) && (
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

            {isOpen &&
                leaves.map((leaf) => (
                    <Leaf
                        key={leaf.id}
                        index={leaf.id}
                        totalLeaves={leaves.length}
                        frontSlot={leaf.frontSlot}
                        backSlot={leaf.backSlot}
                        isCover={leaf.isCover}
                        targetSpread={targetSpread}
                        width={width}
                        height={height}
                        wrapLayout={wrapLayout}
                        useWrapCrop={useWrapCrop}
                    />
                ))}
        </a.group>
    );
}
