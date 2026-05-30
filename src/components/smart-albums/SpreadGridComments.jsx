import React from 'react';
import { formatCommentDateTime } from '../../services/smartAlbumComments.service';

/** Client feedback shown on spread grid or overview thumbnails. */
export default function SpreadGridComments({ comments, className = '', variant = 'default' }) {
    if (!comments?.length) return null;

    if (variant === 'spreadBar') {
        return (
            <div
                className={`ab-grid-comments ab-grid-comments--spread-bar${className ? ` ${className}` : ''}`}
                aria-label="Client comments"
            >
                {comments.map((comment) => (
                    <p key={comment.id} className="ab-spread-comment-chip">
                        <span className="ab-spread-comment-author">{comment.author_name}</span>
                        <span className="ab-spread-comment-body">{comment.body}</span>
                        <time
                            className="ab-spread-comment-time"
                            dateTime={comment.created_at}
                        >
                            {formatCommentDateTime(comment.updated_at || comment.created_at)}
                        </time>
                    </p>
                ))}
            </div>
        );
    }
    return (
        <div className={`ab-grid-comments${className ? ` ${className}` : ''}`} aria-label="Client comments">
            {comments.map((comment) => (
                <p key={comment.id} className="ab-grid-comment">
                    <strong>{comment.author_name}</strong>
                    <time className="ab-grid-comment-time" dateTime={comment.created_at}>
                        {formatCommentDateTime(comment.updated_at || comment.created_at)}
                    </time>
                    <span>{comment.body}</span>
                </p>
            ))}
        </div>
    );
}
