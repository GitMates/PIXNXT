import { useLayoutEffect, useState } from 'react';
import { loadImageAspectFromUrl } from './albumGridSize';
import {
    collectionItemHasInnerPlacement,
    getSpreadPlacementCollectionItemId,
    resolveBookWrapSpreadSrc,
} from './albumPagePhotos';
import { getCollectionItem, isCoverWrapCollectionItem } from './albumCollection';

function readLiveWrapAspect(album, albumId) {
    if (!album?.has_covers || !albumId) return null;

    const coverItemId = getSpreadPlacementCollectionItemId(albumId, 0);
    const coverItem = coverItemId ? getCollectionItem(albumId, coverItemId) : null;
    if (!coverItem?.width || !coverItem?.height) return null;
    if (collectionItemHasInnerPlacement(albumId, coverItem.id)) return null;
    if (album?.blank_covers === true && !isCoverWrapCollectionItem(coverItem)) return null;
    return coverItem.width / coverItem.height;
}

/** Live wrap image aspect for spine layout (back | spine | front). */
export function useAlbumWrapAspect(album, albumId, revision = 0) {
    const [wrapAspect, setWrapAspect] = useState(() => readLiveWrapAspect(album, albumId));

    // useLayoutEffect so the first paint after upload uses the real wrap ratio
    // (avoids blank/wrong crops that use the blank-cover default aspect).
    useLayoutEffect(() => {
        if (!album?.has_covers || !albumId) {
            setWrapAspect(null);
            return undefined;
        }

        const fromDims = readLiveWrapAspect(album, albumId);
        if (fromDims > 0) {
            setWrapAspect(fromDims);
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
