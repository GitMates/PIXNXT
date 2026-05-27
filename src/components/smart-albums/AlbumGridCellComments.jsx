import React from 'react';
import { hasCommentBody } from '../../services/smartAlbumComments.service';

export default function AlbumGridCellComments({ threads = [] }) {
    const visible = (threads || []).filter((t) => hasCommentBody(t.root));
    if (visible.length === 0) return null;

    return (
        <div className="ab-grid-cell-comments" role="list" aria-label="Client comments">
            {visible.map(({ root, replies }) => (
                <div key={root.id} className="ab-grid-cell-comment" role="listitem">
                    <p className="ab-grid-cell-comment-line">
                        <strong>{root.author_name || 'Guest'}</strong>
                        <span>{root.body}</span>
                    </p>
                    {replies.filter(hasCommentBody).map((reply) => (
                        <p key={reply.id} className="ab-grid-cell-comment-line ab-grid-cell-comment-line--reply">
                            <strong>{reply.author_name}</strong>
                            <span>{reply.body}</span>
                        </p>
                    ))}
                </div>
            ))}
        </div>
    );
}
