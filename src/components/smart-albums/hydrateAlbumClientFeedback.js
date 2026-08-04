import { smartAlbumCommentsService, hydrateCommentSeen } from '../../services/smartAlbumComments.service';
import { hydrateSwapMarks, hydrateSwapMarksSeen } from './albumSwapMarks';
import { hydratePhotoPins, hydratePhotoPinsSeen } from './albumPhotoPins';
import { hydrateProofReplies } from './albumProofReplies';

/**
 * Load all client proofing feedback from Supabase into memory caches
 * so client link and photographer share the same data.
 */
export async function hydrateAlbumClientFeedback(
    albumId,
    { viewerRole = 'photographer', viewerKey = 'default' } = {}
) {
    if (!albumId) return null;

    const [comments, swaps, pins, replies] = await Promise.all([
        smartAlbumCommentsService.listAlbumComments(albumId),
        hydrateSwapMarks(albumId),
        hydratePhotoPins(albumId),
        hydrateProofReplies(albumId),
    ]);

    await Promise.all([
        hydrateCommentSeen(albumId, viewerRole, viewerKey),
        hydrateSwapMarksSeen(albumId, viewerRole, viewerKey),
        hydratePhotoPinsSeen(albumId, viewerRole, viewerKey),
    ]);

    return { comments, swaps, pins, replies };
}
