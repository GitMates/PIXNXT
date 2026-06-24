export function getFullscreenElement() {
    return (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement ||
        null
    );
}

export async function requestElementFullscreen(element) {
    if (!element) return false;
    const request =
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.msRequestFullscreen;
    if (!request) return false;
    try {
        await request.call(element);
        return true;
    } catch {
        return false;
    }
}

export async function exitDocumentFullscreen() {
    const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen;
    if (!exit || !getFullscreenElement()) return false;
    try {
        await exit.call(document);
        return true;
    } catch {
        return false;
    }
}

export function onFullscreenChange(handler) {
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
        document.removeEventListener('fullscreenchange', handler);
        document.removeEventListener('webkitfullscreenchange', handler);
    };
}
