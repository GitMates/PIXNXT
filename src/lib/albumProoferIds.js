/**
 * Album Proofer identity: DB tables, R2 path segments, app routes.
 * Legacy smart-album names remain for dual-read / redirects during migration.
 */

export const ALBUM_PROOFER_ROUTE = '/album-proofer';
export const ALBUM_PROOFER_ROUTE_LEGACY = '/smart-albums';
export const ALBUM_PROOFER_PRODUCT_ID = 'album-proofer';
export const ALBUM_PROOFER_PRODUCT_ID_LEGACY = 'smart-albums';

/** Supabase table names (post rename migration). */
export const ALBUM_PROOFER_TABLES = {
    albums: 'album_proofer_albums',
    comments: 'album_proofer_comments',
    swapMarks: 'album_proofer_swap_marks',
    photoPins: 'album_proofer_photo_pins',
    proofReplies: 'album_proofer_proof_replies',
    feedbackSeen: 'album_proofer_feedback_seen',
    settings: 'album_proofer_settings',
};

/** R2 module folder under users/{photographer}/… */
export const ALBUM_PROOFER_R2_MODULE = 'album-proofer';
export const ALBUM_PROOFER_R2_MODULE_LEGACY = 'smart-album';

/** Flat feedback attachment prefix (comment audio/images). */
export const ALBUM_PROOFER_R2_FEEDBACK_PREFIX = 'album-proofer';
export const ALBUM_PROOFER_R2_FEEDBACK_PREFIX_LEGACY = 'smart-albums';

export function albumProoferAppPath(suffix = '') {
    const clean = String(suffix || '').replace(/^\/+/, '');
    return clean ? `${ALBUM_PROOFER_ROUTE}/${clean}` : ALBUM_PROOFER_ROUTE;
}

export function isAlbumProoferPath(pathname) {
    return (
        pathname === ALBUM_PROOFER_ROUTE ||
        pathname.startsWith(`${ALBUM_PROOFER_ROUTE}/`) ||
        pathname === ALBUM_PROOFER_ROUTE_LEGACY ||
        pathname.startsWith(`${ALBUM_PROOFER_ROUTE_LEGACY}/`)
    );
}
