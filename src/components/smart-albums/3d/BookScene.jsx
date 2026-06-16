import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ArcballControls, ContactShadows } from '@react-three/drei';
import BookModel from './BookModel';
import {
    BOOK_SCENE_CAMERA_DISTANCE,
    BOOK_SCENE_CAMERA_FOV,
    pagePxToBook3dWorld,
} from '../albumBookDimensions';
import { getBook3dDimensions } from './book3dTextures';
import './BookScene.css';

const ORBIT_RETURN_MS = 520;
const PATH_SAMPLE_EPSILON = 1e-5;

const _fromPos = new THREE.Vector3();
const _fromQuat = new THREE.Quaternion();
const _fromScale = new THREE.Vector3();
const _toPos = new THREE.Vector3();
const _toQuat = new THREE.Quaternion();
const _toScale = new THREE.Vector3();
const _lerpCamMatrix = new THREE.Matrix4();
const _lerpGizmoMatrix = new THREE.Matrix4();

function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
}

function lerpMatrices(fromMatrix, toMatrix, amount, targetMatrix) {
    fromMatrix.decompose(_fromPos, _fromQuat, _fromScale);
    toMatrix.decompose(_toPos, _toQuat, _toScale);

    _fromPos.lerp(_toPos, amount);
    _fromQuat.slerp(_toQuat, amount);
    _fromScale.lerp(_toScale, amount);

    targetMatrix.compose(_fromPos, _fromQuat, _fromScale);
}

function matricesDiffer(a, b) {
    a.decompose(_fromPos, _fromQuat, _fromScale);
    b.decompose(_toPos, _toQuat, _toScale);

    return (
        _fromPos.distanceToSquared(_toPos) > PATH_SAMPLE_EPSILON ||
        Math.abs(_fromQuat.dot(_toQuat)) < 0.99999 ||
        _fromScale.distanceToSquared(_toScale) > PATH_SAMPLE_EPSILON
    );
}

function hasOrbitOffset(cameraMatrix, gizmoMatrix, restCameraMatrix, restGizmoMatrix, zoom, restZoom) {
    return (
        matricesDiffer(cameraMatrix, restCameraMatrix) ||
        matricesDiffer(gizmoMatrix, restGizmoMatrix) ||
        Math.abs(zoom - restZoom) > 0.0005
    );
}

function captureControlsPose(controls) {
    const camera = controls.camera;
    if (!camera) return null;

    camera.updateMatrix();
    controls._gizmos.updateMatrix();

    return {
        camera: camera.matrix.clone(),
        gizmo: controls._gizmos.matrix.clone(),
    };
}

function applyControlsMatrices(controls, cameraMatrix, gizmoMatrix) {
    const camera = controls.camera;
    if (!camera) return;

    cameraMatrix.decompose(camera.position, camera.quaternion, camera.scale);
    camera.updateMatrix();

    gizmoMatrix.decompose(controls._gizmos.position, controls._gizmos.quaternion, controls._gizmos.scale);
    controls._gizmos.updateMatrix();

    controls._cameraMatrixState.copy(camera.matrix);
    controls._gizmoMatrixState.copy(controls._gizmos.matrix);
}

function saveRestPose(controls) {
    if (!controls?.camera || !controls.saveState) return;

    controls.camera.updateMatrix();
    controls._gizmos.updateMatrix();
    controls.saveState();
    controls._cameraMatrixState.copy(controls.camera.matrix);
    controls._gizmoMatrixState.copy(controls._gizmos.matrix);
}

function sampleReversePath(path, progress, outCameraMatrix, outGizmoMatrix) {
    if (path.length === 0) return false;

    const last = path[path.length - 1];
    if (path.length === 1) {
        outCameraMatrix.copy(last.camera);
        outGizmoMatrix.copy(last.gizmo);
        return true;
    }

    const eased = easeOutCubic(progress);
    const segmentPos = eased * (path.length - 1);
    const segmentIndex = Math.min(Math.floor(segmentPos), path.length - 2);
    const segmentT = segmentPos - segmentIndex;
    const fromIndex = path.length - 1 - segmentIndex;
    const toIndex = Math.max(0, fromIndex - 1);
    const from = path[fromIndex];
    const to = path[toIndex];

    lerpMatrices(from.camera, to.camera, segmentT, outCameraMatrix);
    lerpMatrices(from.gizmo, to.gizmo, segmentT, outGizmoMatrix);
    return true;
}

function BookArcballControls() {
    const controlsRef = useRef(null);
    const invalidate = useThree((state) => state.invalidate);
    const draggingRef = useRef(false);
    const returningRef = useRef(false);
    const returnStartRef = useRef(0);
    const dragPathRef = useRef([]);
    const fromZoomRef = useRef(1);

    useEffect(() => {
        let frame2;
        const frame1 = requestAnimationFrame(() => {
            frame2 = requestAnimationFrame(() => {
                const controls = controlsRef.current;
                if (controls) saveRestPose(controls);
            });
        });
        return () => {
            cancelAnimationFrame(frame1);
            if (frame2) cancelAnimationFrame(frame2);
        };
    }, []);

    const cancelReturn = useCallback(() => {
        returningRef.current = false;
        const controls = controlsRef.current;
        if (controls) controls.enabled = true;
    }, []);

    const recordPathSample = useCallback((controls) => {
        const sample = captureControlsPose(controls);
        if (!sample) return;

        const path = dragPathRef.current;
        const last = path[path.length - 1];
        if (!last || matricesDiffer(last.camera, sample.camera) || matricesDiffer(last.gizmo, sample.gizmo)) {
            path.push(sample);
        }
    }, []);

    const beginReturn = useCallback(() => {
        const controls = controlsRef.current;
        if (!controls || returningRef.current) return;

        recordPathSample(controls);

        const path = dragPathRef.current;
        const restCameraMatrix = controls._cameraMatrixState0;
        const restGizmoMatrix = controls._gizmoMatrixState0;
        const restZoom = controls._zoom0;
        const currentPose = captureControlsPose(controls);

        if (
            !currentPose ||
            !hasOrbitOffset(
                currentPose.camera,
                currentPose.gizmo,
                restCameraMatrix,
                restGizmoMatrix,
                controls.camera?.zoom ?? 1,
                restZoom
            )
        ) {
            dragPathRef.current = [];
            return;
        }

        if (path.length < 2) {
            path.length = 0;
            path.push(
                {
                    camera: restCameraMatrix.clone(),
                    gizmo: restGizmoMatrix.clone(),
                },
                {
                    camera: currentPose.camera.clone(),
                    gizmo: currentPose.gizmo.clone(),
                }
            );
        }

        if (controls._animationId !== -1) {
            cancelAnimationFrame(controls._animationId);
            controls._animationId = -1;
        }

        fromZoomRef.current = controls.camera?.zoom ?? 1;
        returningRef.current = true;
        returnStartRef.current = performance.now();
        controls.enabled = false;
    }, [recordPathSample]);

    const handleStart = useCallback(() => {
        cancelReturn();
        draggingRef.current = true;
        dragPathRef.current = [];

        const controls = controlsRef.current;
        if (controls) {
            recordPathSample(controls);
        }
    }, [cancelReturn, recordPathSample]);

    const handleChange = useCallback(() => {
        if (!draggingRef.current || returningRef.current) return;
        const controls = controlsRef.current;
        if (controls) recordPathSample(controls);
    }, [recordPathSample]);

    const handleEnd = useCallback(() => {
        draggingRef.current = false;
        requestAnimationFrame(() => {
            beginReturn();
        });
    }, [beginReturn]);

    useFrame(() => {
        if (!returningRef.current) return;

        const controls = controlsRef.current;
        const camera = controls?.camera;
        if (!controls || !camera) return;

        const elapsed = performance.now() - returnStartRef.current;
        const progress = Math.min(1, elapsed / ORBIT_RETURN_MS);

        if (
            sampleReversePath(
                dragPathRef.current,
                progress,
                _lerpCamMatrix,
                _lerpGizmoMatrix
            )
        ) {
            applyControlsMatrices(controls, _lerpCamMatrix, _lerpGizmoMatrix);
        }

        camera.zoom = THREE.MathUtils.lerp(fromZoomRef.current, controls._zoom0, progress);
        camera.updateProjectionMatrix();
        controls.dispatchEvent({ type: 'change' });
        invalidate();

        if (progress >= 1) {
            controls.reset();
            controls.enabled = true;
            returningRef.current = false;
            dragPathRef.current = [];
        }
    });

    return (
        <ArcballControls
            ref={controlsRef}
            makeDefault
            enableZoom={false}
            enablePan={false}
            enableAnimations={false}
            onStart={handleStart}
            onChange={handleChange}
            onEnd={handleEnd}
        />
    );
}

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
    enableOrbit = true,
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
        <div className={`ab-book-scene${enableOrbit ? ' ab-book-scene--orbit' : ''}`} ref={sceneWrapRef}>
            {enableOrbit ? (
                <p className="ab-book-scene-orbit-hint">Drag to rotate</p>
            ) : null}
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

                {enableOrbit ? <BookArcballControls /> : null}
            </Canvas>
        </div>
    );
}
