import React, { useCallback, useEffect, useState } from 'react';
import { smartAlbumCommentsService } from '../../services/smartAlbumComments.service';

export default function EditorSpreadMessageCompose({
    albumId,
    spreadIndex,
    authorName = 'Photographer',
    disabled = false,
}) {
    const [draft, setDraft] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        setDraft('');
    }, [spreadIndex]);

    const handlePost = useCallback(async () => {
        const body = draft.trim();
        if (!body || !albumId || spreadIndex == null || posting || disabled) return;
        setPosting(true);
        try {
            await smartAlbumCommentsService.savePhotographerComment({
                albumId,
                spreadIndex,
                body,
                authorName,
            });
            setDraft('');
        } catch (e) {
            console.error(e);
        } finally {
            setPosting(false);
        }
    }, [albumId, spreadIndex, draft, authorName, posting, disabled]);

    const handleKeyDown = (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault();
        handlePost();
    };

    return (
        <div className="ae-spread-message-compose">
            <div className="ae-spread-message-compose-box">
                <textarea
                    className="ae-spread-message-compose-input"
                    rows={3}
                    placeholder="Add a comment to this spread…"
                    value={draft}
                    disabled={disabled || posting}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label="Message for client on this spread"
                />
                <button
                    type="button"
                    className="ae-spread-message-compose-post"
                    disabled={disabled || posting || !draft.trim()}
                    onClick={handlePost}
                >
                    {posting ? 'Posting…' : 'Post'}
                </button>
            </div>
        </div>
    );
}
