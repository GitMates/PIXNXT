import * as THREE from 'three';

/**
 * GL attribute profiles ordered from most compatible → more demanding.
 * `high-performance` fails on many client Chromes (dual-GPU, SwiftShader,
 * HW accel partially disabled) even when a tiny getContext() probe succeeds.
 */
export const BOOK3D_GL_PROFILES = [
    {
        id: 'default',
        antialias: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
        alpha: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
    },
    {
        id: 'default-no-aa',
        antialias: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
        alpha: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
    },
    {
        id: 'low-power',
        antialias: false,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: false,
        alpha: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
    },
    {
        id: 'high-performance',
        antialias: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        alpha: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
    },
];

function tryGetContext(canvas, profile) {
    const attrs = {
        antialias: profile.antialias,
        alpha: profile.alpha,
        depth: profile.depth,
        stencil: profile.stencil,
        powerPreference: profile.powerPreference,
        failIfMajorPerformanceCaveat: profile.failIfMajorPerformanceCaveat,
        preserveDrawingBuffer: profile.preserveDrawingBuffer,
    };
    return (
        canvas.getContext('webgl2', attrs) ||
        canvas.getContext('webgl', attrs) ||
        canvas.getContext('experimental-webgl', attrs)
    );
}

/**
 * Probe which GL profile can actually create a context on this device.
 * Returns the first working profile, or null if WebGL is unavailable.
 */
export function probeBook3dGlProfile() {
    if (typeof document === 'undefined') return null;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        for (const profile of BOOK3D_GL_PROFILES) {
            try {
                const gl = tryGetContext(canvas, profile);
                if (!gl) continue;
                // Prove the context can clear (some blocked GPUs return a zombie context).
                gl.viewport(0, 0, 8, 8);
                gl.clearColor(0, 0, 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
                const err = gl.getError?.();
                if (err != null && err !== gl.NO_ERROR) continue;
                const lose = gl.getExtension?.('WEBGL_lose_context');
                lose?.loseContext?.();
                return profile;
            } catch {
                /* try next */
            }
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Check if WebGL context can be created.
 * Handles disabled or failing WebGL (e.g., hardware acceleration disabled).
 */
export function isWebGLAvailable() {
    return Boolean(probeBook3dGlProfile());
}

/**
 * Build a Three.js WebGLRenderer with a known-good profile for R3F `<Canvas gl={fn}>`.
 */
export function createBook3dRenderer(profile, props = {}) {
    const attrs = profile || BOOK3D_GL_PROFILES[0];
    const renderer = new THREE.WebGLRenderer({
        ...props,
        antialias: attrs.antialias,
        alpha: attrs.alpha,
        depth: attrs.depth,
        stencil: attrs.stencil,
        powerPreference: attrs.powerPreference,
        failIfMajorPerformanceCaveat: attrs.failIfMajorPerformanceCaveat ?? false,
        preserveDrawingBuffer: attrs.preserveDrawingBuffer,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    return renderer;
}

export function dprForGlProfile(profile) {
    if (!profile || profile.id === 'low-power' || profile.id === 'default-no-aa') {
        return 1;
    }
    return [1, Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)];
}
