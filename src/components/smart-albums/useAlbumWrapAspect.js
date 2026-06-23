import { useEffect, useState } from 'react';
import { loadImageAspectFromUrl } from './albumGridSize';
import { resolveBookWrapSpreadSrc } from './albumPagePhotos';

/** Live wrap image aspect for spine layout (back | spine | front). */
export function useAlbumWrapAspect(album, albumId, revision = 0) {
    const [wrapAspect, setWrapAspect] = useState(null);

    useEffect(() => {
        if (!album?.has_covers || !albumId) {
            setWrapAspect(null);
            return undefined;
        }
        const src = resolveBookWrapSpreadSrc({ ...album, id: albumId }, { showSamples: false });
        if (!src) {
            setWrapAspect(null);
            return undefined;
        }
        let cancelled = false;
        loadImageAspectFromUrl(src).then((aspect) => {
            if (!cancelled && aspect > 0) setWrapAspect(aspect);
        });
        return () => {
            cancelled = true;
        };
    }, [album, albumId, album?.has_covers, album?.blank_covers, revision]);

    return wrapAspect;
}

export function withAlbumWrapAspect(album, albumId, wrapAspect) {
    if (!album) return null;
    return {
        ...album,
        id: albumId ?? album.id,
        ...(wrapAspect > 0 ? { __wrap_aspect: wrapAspect } : {}),
    };
}
