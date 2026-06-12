import React, { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import BookModel from './BookModel';
import { getBook3dDimensions } from './book3dTextures';
import './BookScene.css';

export default function BookScene({ album, totalPages, initialPage, onPageChange }) {
    const { height: bookHeight } = useMemo(() => getBook3dDimensions(album), [album]);
    const shadowY = -(bookHeight / 2 + 0.2);

    return (
        <div className="ab-book-scene">
            <Canvas
                shadows={{ enabled: true, type: THREE.PCFShadowMap }}
                dpr={[1, 2]}
                camera={{ position: [0, 0, 6], fov: 34 }}
                gl={{
                    outputColorSpace: THREE.SRGBColorSpace,
                    toneMapping: THREE.NoToneMapping,
                    toneMappingExposure: 1,
                }}
            >
                <color attach="background" args={['#efefef']} />

                {/* Soft fill — photos use unlit materials so lighting only affects boards/shadows */}
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
