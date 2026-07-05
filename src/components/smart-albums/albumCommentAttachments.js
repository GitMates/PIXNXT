import { compressImageForUpload } from '../../lib/prepareUploadFile';
import { isImageFile } from '../../lib/pdfToImages';

const COMMENT_ATTACHMENT_MAX_EDGE = 1280;

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
}

/** Compress a user-selected image for inline comment attachment storage. */
export async function prepareCommentAttachmentFromFile(file) {
    if (!file || !isImageFile(file)) {
        throw new Error('Please choose an image file.');
    }
    const compressed = await compressImageForUpload(file, {
        maxEdge: COMMENT_ATTACHMENT_MAX_EDGE,
    });
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

/** Store a recorded voice clip as an inline comment attachment. */
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
    const url = comment?.attachment_url || '';
    if (url.startsWith('data:audio/')) return 'audio';
    if (url.startsWith('data:image/')) return 'image';
    return hasCommentAttachment(comment) ? 'image' : null;
}

export function isCommentAudioAttachment(comment) {
    return getCommentAttachmentType(comment) === 'audio';
}