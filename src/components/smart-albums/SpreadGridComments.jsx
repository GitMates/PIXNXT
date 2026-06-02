import React from 'react';
import {
    formatCommentDateTime,
    isCommentUnseen,
} from '../../services/smartAlbumComments.service';

function SpreadBarCommentChip({ comment, albumId }) {
    const body = comment.body || '';
    const unseen = albumId ? isCommentUnseen(albumId, comment) : false;

    return (
        <article
            className={`ab-spread-comment-chip${unseen ? ' ab-spread-comment-chip--unseen' : ''}`}
        >
            <header className="ab-spread-comment-head">
                <div className="ab-spread-comment-meta">
                    <span className="ab-spread-comment-author">{comment.author_name}</span>
                    {unseen && <span className="ab-spread-comment-new">New</span>}
                </div>
                <time className="ab-spread-comment-time" dateTime={comment.created_at}>
                    {formatCommentDateTime(comment.updated_at || comment.created_at)}
                </time>
            </header>
            <p className="ab-spread-comment-body">{body}</p>
        </article>
    );
}

/** Client feedback shown on spread grid or overview thumbnails. */
export default function SpreadGridComments({
    comments,
    className = '',
    variant = 'default',
    albumId = null,
    seenTick = 0,
}) {
    if (!comments?.length) return null;

    if (variant === 'spreadBar') {
        return (
            <div
                className={`ab-grid-comments ab-grid-comments--spread-bar${className ? ` ${className}` : ''}`}
                aria-label="Client comments"
            >
                {comments.map((comment) => (
                    <SpreadBarCommentChip
                        key={`${comment.id}-${seenTick}`}
                        comment={comment}
                        albumId={albumId}
                    />
                ))}
            </div>
        );
    }

    if (variant === 'overview') {
        return (
            <div
                className={`ab-overview-comments${className ? ` ${className}` : ''}`}
                aria-label="Comments for this spread"
                onClick={(e) => e.stopPropagation()}
            >
                {comments.map((comment) => (
                    <article key={comment.id} className="ab-overview-comment">
                        <header className="ab-overview-comment-head">
                            <span className="ab-overview-comment-author">{comment.author_name}</span>
                            <time
                                className="ab-overview-comment-time"
                                dateTime={comment.created_at}
                            >
                                {formatCommentDateTime(comment.updated_at || comment.created_at)}
                            </time>
                        </header>
                        <p className="ab-overview-comment-body">{comment.body}</p>
                    </article>
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
