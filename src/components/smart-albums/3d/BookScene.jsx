import React, { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import BookModel from './BookModel';
import {
    BOOK_SCENE_CAMERA_DISTANCE,
    BOOK_SCENE_CAMERA_FOV,
    pagePxToBook3dWorld,
} from '../albumBookDimensions';
import { getBook3dDimensions } from './book3dTextures';
import './BookScene.css';

export default function BookScene({
    album,
    totalPages,
    initialPage,
    onPageChange,
    showSamples = false,
    coversOnly = false,
    placementMode = 'single',
    onDisplaySpreadChange,
    onFlipStateChange,
    pageLayoutDims = null,
    pageWorldDims = null,
    matchAlbumBookLayout = false,
    handoff = null,
    onHandoffComplete,
    lockCoverInteraction = false,
}) {
    const sceneWrapRef = useRef(null);
    const [canvasHeight, setCanvasHeight] = useState(0);
    const latchedWorldDimsRef = useRef(null);

    useLayoutEffect(() => {
        const el = sceneWrapRef.current;
        if (!el) return undefined;
        const update = () => setCanvasHeight(el.clientHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const derivedWorldDims = useMemo(() => {
        if (pageWorldDims) return pageWorldDims;
        if (!pageLayoutDims || !canvasHeight) return null;
        return pagePxToBook3dWorld(
            pageLayoutDims.width,
            pageLayoutDims.height,
            canvasHeight,
            {
                fovDeg: BOOK_SCENE_CAMERA_FOV,
                cameraDistance: BOOK_SCENE_CAMERA_DISTANCE,
            }
        );
    }, [pageWorldDims, pageLayoutDims, canvasHeight]);

    useLayoutEffect(() => {
        if (derivedWorldDims) {
            latchedWorldDimsRef.current = derivedWorldDims;
        }
    }, [derivedWorldDims]);

    const resolvedWorldDims =
        derivedWorldDims ??
        (matchAlbumBookLayout ? latchedWorldDimsRef.current : null);

    const fallbackDims = useMemo(() => getBook3dDimensions(album), [album]);
    const bookHeight = resolvedWorldDims?.height ?? fallbackDims.height;
    const shadowY = -(bookHeight / 2 + 0.2);

    return (
        <div className="ab-book-scene" ref={sceneWrapRef}>
            <Canvas
                shadows={{ enabled: true, type: THREE.PCFShadowMap }}
                dpr={[1, 2]}
                camera={{
                    position: [0, 0, BOOK_SCENE_CAMERA_DISTANCE],
                    fov: BOOK_SCENE_CAMERA_FOV,
                }}
                gl={{
                    outputColorSpace: THREE.SRGBColorSpace,
                    toneMapping: THREE.NoToneMapping,
                    toneMappingExposure: 1,
                }}
            >
                <color attach="background" args={['#efefef']} />

                <ambientLight intensity={0.65} />
                <directionalLight
                    castShadow
                    position={[2, 4, 5]}
                    intensity={0.35}
                    shadow-mapSize={[1024, 1024]}
                    shadow-camera-near={0.5}
                    shadow-camera-far={18}
                    shadow-camera-left={-6}
                    shadow-camera-right={6}
                    shadow-camera-top={6}
                    shadow-camera-bottom={-6}
                    shadow-bias={-0.0002}
                />

                <Suspense fallback={null}>
                    <BookModel
                        album={album}
                        totalPages={totalPages}
                        initialPage={initialPage}
                        onPageChange={onPageChange}
                        showSamples={showSamples}
                        coversOnly={coversOnly}
                        placementMode={placementMode}
                        onDisplaySpreadChange={onDisplaySpreadChange}
                        onFlipStateChange={onFlipStateChange}
                        pageWorldDims={resolvedWorldDims}
                        handoff={handoff}
                        onHandoffComplete={onHandoffComplete}
                        lockCoverInteraction={lockCoverInteraction}
                    />
                </Suspense>

                <ContactShadows
                    position={[0, shadowY, 0]}
                    opacity={0.35}
                    scale={12}
                    blur={2.8}
                    far={3}
                    color="#1a1a1a"
                />

                <OrbitControls
                    enablePan={false}
                    minPolarAngle={Math.PI / 2.2}
                    maxPolarAngle={Math.PI / 1.95}
                    minDistance={4}
                    maxDistance={10}
                    target={[0, 0, 0]}
                />
            </Canvas>
        </div>
    );
}
