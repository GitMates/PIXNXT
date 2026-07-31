/**
 * Check if WebGL context can be created.
 * Handles disabled or failing WebGL (e.g., hardware acceleration disabled in browser/sandbox context).
 */
export function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch {
        return false;
    }
}
