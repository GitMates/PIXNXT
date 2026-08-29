import React from 'react';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import {
    getCommentAttachmentType,
    hasCommentAttachment,
    isCommentAudioAttachment,
} from './albumCommentAttachments';
import { resolveCrossOriginMediaUrl } from '../../lib/r2MediaProxy';

export default function CommentAttachmentContent({ comment, className = '' }) {
    if (!hasCommentAttachment(comment)) return null;

    const type = getCommentAttachmentType(comment);
    const mediaSrc = resolveCrossOriginMediaUrl(comment.attachment_url);
    const rootClass = `av-chat-bubble-attachment-wrap${className ? ` ${className}` : ''}`;

    if (type === 'audio' || isCommentAudioAttachment(comment)) {
        return (
            <div className={rootClass}>
                <VoiceMessagePlayer
                    src={mediaSrc}
                    className="av-voice-player--bubble"
                    ariaLabel={comment.attachment_name || 'Voice message'}
                />
            </div>
        );
    }

    return (
        <img
            src={mediaSrc}
            alt={comment.attachment_name || 'Attached image'}
            className="av-chat-bubble-attachment"
        />
    );
}