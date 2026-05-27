import React from 'react';

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
                    <span>{comment.body}</span>
                </p>
            ))}
        </div>
    );
}
