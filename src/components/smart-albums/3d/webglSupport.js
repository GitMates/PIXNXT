/**
 * Check if WebGL context can be created.
 * Handles disabled or failing WebGL (e.g., hardware acceleration disabled in browser/sandbox context).
 */
export function isWebGLAvailable() {
    if (typeof document === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        const gl =
            canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
            canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
            canvas.getContext('experimental-webgl');
        return Boolean(gl);
    } catch {
        return false;
    }
}
