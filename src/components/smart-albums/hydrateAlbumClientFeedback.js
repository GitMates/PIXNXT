import { smartAlbumCommentsService, hydrateCommentSeen } from '../../services/smartAlbumComments.service';
import { hydrateSwapMarks, hydrateSwapMarksSeen } from './albumSwapMarks';
import { hydratePhotoPins, hydratePhotoPinsSeen } from './albumPhotoPins';
import { hydrateProofReplies } from './albumProofReplies';
import { resolveFeedbackViewerKey } from './albumFeedbackDb';

/**
 * Load all client proofing feedback from Supabase into memory caches
 * so client link and photographer share the same data.
 */
export async function hydrateAlbumClientFeedback(
    albumId,
    { viewerRole = 'photographer', viewerKey = 'default' } = {}
) {
    if (!albumId) return null;

    const resolvedKey = await resolveFeedbackViewerKey(viewerRole, viewerKey, albumId);

    const [comments, swaps, pins, replies] = await Promise.all([
        smartAlbumCommentsService.listAlbumComments(albumId),
        hydrateSwapMarks(albumId),
        hydratePhotoPins(albumId),
        hydrateProofReplies(albumId),
    ]);

    await Promise.all([
        hydrateCommentSeen(albumId, viewerRole, resolvedKey),
        hydrateSwapMarksSeen(albumId, viewerRole, resolvedKey),
        hydratePhotoPinsSeen(albumId, viewerRole, resolvedKey),
    ]);

    return { comments, swaps, pins, replies };
}
