function clampPct(value) {
    return Math.max(0, Math.min(100, value));
}

function getPinPhotoElement(layerEl) {
    if (!layerEl) return null;
    return layerEl.querySelector(
        'img.ab-page-photo, img.ab-grid-cell-photo, img.ab-book-wrap-half'
    );
}

/** Map a viewport click to pin percentages within the photo pin layer. */
export function clientPointToLayerPinPct(layerEl, clientX, clientY) {
    const layerRect = layerEl.getBoundingClientRect();
    if (!layerRect.width || !layerRect.height) return null;

    const img = getPinPhotoElement(layerEl);
    if (img) {
        const imgRect = img.getBoundingClientRect();
        if (imgRect.width > 0 && imgRect.height > 0) {
            const xOnImg = ((clientX - imgRect.left) / imgRect.width) * 100;
            const yOnImg = ((clientY - imgRect.top) / imgRect.height) * 100;
            return {
                xPct: clampPct(
                    ((imgRect.left - layerRect.left) + (xOnImg / 100) * imgRect.width) /
                        layerRect.width *
                        100
                ),
                yPct: clampPct(
                    ((imgRect.top - layerRect.top) + (yOnImg / 100) * imgRect.height) /
                        layerRect.height *
                        100
                ),
            };
        }
    }

    return {
        xPct: clampPct(((clientX - layerRect.left) / layerRect.width) * 100),
        yPct: clampPct(((clientY - layerRect.top) / layerRect.height) * 100),
    };
}
