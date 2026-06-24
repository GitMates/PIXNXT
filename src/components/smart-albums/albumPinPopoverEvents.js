export const ALBUM_PIN_POPOVER_CLOSE_EVENT = 'album-pin-popover-close';

export function closeAlbumPinPopovers() {
    window.dispatchEvent(new CustomEvent(ALBUM_PIN_POPOVER_CLOSE_EVENT));
}
