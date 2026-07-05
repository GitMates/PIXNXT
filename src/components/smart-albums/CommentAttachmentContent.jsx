import React from 'react';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import {
    getCommentAttachmentType,
    hasCommentAttachment,
    isCommentAudioAttachment,
} from './albumCommentAttachments';

export default function CommentAttachmentContent({ comment, className = '' }) {
    if (!hasCommentAttachment(comment)) return null;

    const type = getCommentAttachmentType(comment);
    const rootClass = `av-chat-bubble-attachment-wrap${className ? ` ${className}` : ''}`;

    if (type === 'audio' || isCommentAudioAttachment(comment)) {
        return (
            <div className={rootClass}>
                <VoiceMessagePlayer
                    src={comment.attachment_url}
                    className="av-voice-player--bubble"
                    ariaLabel={comment.attachment_name || 'Voice message'}
                />
            </div>
        );
    }

    return (
        <img
            src={comment.attachment_url}
            alt={comment.attachment_name || 'Attached image'}
            className="av-chat-bubble-attachment"
        />
    );
}