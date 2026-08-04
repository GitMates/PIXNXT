import { compressImageForUpload } from '../../lib/prepareUploadFile';
import { isImageFile } from '../../lib/pdfToImages';

/** Keep comment attachments reasonably sized before R2 upload. */
const COMMENT_ATTACHMENT_MAX_EDGE = 1600;
const COMMENT_ATTACHMENT_QUALITY = 0.82;

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
}

async function compressToDataUrl(file, maxEdge, quality) {
    const compressed = await compressImageForUpload(file, { maxEdge, quality });
    const dataUrl = await fileToDataUrl(compressed);
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        throw new Error('Could not prepare image.');
    }
    return {
        url: dataUrl,
        name: compressed.name || file.name || 'attachment.jpg',
        type: 'image',
    };
}

/** Compress a user-selected image for comment attachment (uploaded to storage on save). */
export async function prepareCommentAttachmentFromFile(file) {
    if (!file || !isImageFile(file)) {
        throw new Error('Please choose an image file.');
    }

    return compressToDataUrl(file, COMMENT_ATTACHMENT_MAX_EDGE, COMMENT_ATTACHMENT_QUALITY);
}

/** Store a recorded voice clip as a temporary data URL (uploaded to storage on save). */
export async function prepareCommentAudioFromBlob(blob) {
    if (!blob || !blob.size) {
        throw new Error('Recording is empty. Please try again.');
    }
    const dataUrl = await fileToDataUrl(blob);
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:audio/')) {
        throw new Error('Could not prepare voice message.');
    }
    const mime = blob.type || 'audio/webm';
    const ext = mime.includes('mp4')
        ? 'm4a'
        : mime.includes('ogg')
          ? 'ogg'
          : 'webm';
    return {
        url: dataUrl,
        name: `voice-message.${ext}`,
        type: 'audio',
    };
}

export function hasCommentAttachment(comment) {
    return Boolean(comment?.attachment_url);
}

export function getCommentAttachmentType(comment) {
    if (comment?.attachment_type === 'audio' || comment?.attachment_type === 'image') {
        return comment.attachment_type;
    }
    const url = String(comment?.attachment_url || '').toLowerCase();
    const name = String(comment?.attachment_name || '').toLowerCase();
    if (url.startsWith('data:audio/') || name.startsWith('voice-message.')) {
        return 'audio';
    }
    if (/\.(webm|m4a|ogg|mp3|wav|aac)(\?|$)/.test(url) || /\.(webm|m4a|ogg|mp3|wav|aac)$/.test(name)) {
        return 'audio';
    }
    if (url.startsWith('data:image/')) return 'image';
    return hasCommentAttachment(comment) ? 'image' : null;
}

export function isCommentAudioAttachment(comment) {
    return getCommentAttachmentType(comment) === 'audio';
}

/** Badge label for client feedback items in the comment sidebar. */
export function getClientCommentBadgeLabel(comment) {
    if (isCommentAudioAttachment(comment)) return 'Audio';
    if (hasCommentAttachment(comment)) return 'Photo';
    return 'Comment';
}
