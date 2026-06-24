import React from 'react';
import { formatCommentDateTime } from '../../services/smartAlbumComments.service';
import { formatSpreadDisplayLabel } from './albumSpreadUtils';

export default function EditorSpreadMessagesPanel({
    messages = [],
    authorName = 'Photographer',
    spreadIndex,
    hasCovers = true,
}) {
    if (!messages.length) return null;

    const spreadLabel = formatSpreadDisplayLabel(spreadIndex, { hasCovers });

    return (
        <div className="ae-spread-sent-messages">
            <ul className="ae-spread-sent-messages-list">
                {messages.map((comment) => {
                    const createdAtLabel = comment.created_at
                        ? formatCommentDateTime(comment.updated_at || comment.created_at)
                        : null;
                    const messageSpreadLabel = formatSpreadDisplayLabel(comment.spread_index, {
                        hasCovers,
                    });
                    return (
                        <li key={comment.id} className="ae-spread-sent-message">
                            <p className="ae-spread-sent-message-author">
                                {authorName || comment.author_name}
                                {' · '}
                                {messageSpreadLabel}
                            </p>
                            <p className="ae-spread-sent-message-body">{comment.body}</p>
                            {createdAtLabel ? (
                                <time
                                    className="ae-spread-sent-message-time"
                                    dateTime={comment.updated_at || comment.created_at}
                                >
                                    {createdAtLabel}
                                </time>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
