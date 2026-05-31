import { duplicateAlbumCollection } from './albumCollection';
import { copyAlbumPagePhotos } from './albumPagePhotos';
import { copyAlbumTransforms } from './albumPageTransforms';

/** Copy collection, page placements, and transforms to a new album id. */
export async function duplicateAlbumAssets(sourceAlbumId, targetAlbumId, photographerId) {
    if (!sourceAlbumId || !targetAlbumId || sourceAlbumId === targetAlbumId) return;

    const idMap = await duplicateAlbumCollection(sourceAlbumId, targetAlbumId, photographerId);
    copyAlbumPagePhotos(sourceAlbumId, targetAlbumId, idMap);
    copyAlbumTransforms(sourceAlbumId, targetAlbumId);
}
