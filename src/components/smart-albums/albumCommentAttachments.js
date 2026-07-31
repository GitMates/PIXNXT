import { compressImageForUpload } from '../../lib/prepareUploadFile';
import { isImageFile } from '../../lib/pdfToImages';

/** Keep comment attachments small enough for localStorage (no DB attachment columns). */
const COMMENT_ATTACHMENT_MAX_EDGE = 960;
const COMMENT_ATTACHMENT_QUALITY = 0.72;
const COMMENT_ATTACHMENT_MAX_DATA_URL_CHARS = 450_000;

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

/** Compress a user-selected image for inline comment attachment storage. */
export async function prepareCommentAttachmentFromFile(file) {
    if (!file || !isImageFile(file)) {
        throw new Error('Please choose an image file.');
    }

    let prepared = await compressToDataUrl(
        file,
        COMMENT_ATTACHMENT_MAX_EDGE,
        COMMENT_ATTACHMENT_QUALITY
    );

    // If still too large for reliable localStorage, compress harder.
    if (prepared.url.length > COMMENT_ATTACHMENT_MAX_DATA_URL_CHARS) {
        prepared = await compressToDataUrl(file, 720, 0.62);
    }
    if (prepared.url.length > COMMENT_ATTACHMENT_MAX_DATA_URL_CHARS) {
        prepared = await compressToDataUrl(file, 520, 0.55);
    }
    if (prepared.url.length > COMMENT_ATTACHMENT_MAX_DATA_URL_CHARS) {
        throw new Error('That image is too large to attach. Please choose a smaller photo.');
    }

    return prepared;
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
