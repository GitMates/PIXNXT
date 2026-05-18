import { buildGmailComposeUrl } from './gmailComposeUrl';

export function getCollectionShareUrl(slug) {
    if (!slug) return `${window.location.origin}/gallery`;
    return `${window.location.origin}/gallery/${slug}`;
}

export function openShareByEmail(url, title = 'Photo Gallery') {
    const body = `Hi,\n\nI'd like to share my photo gallery with you:\n${url}\n\nEnjoy!`;
    window.open(buildGmailComposeUrl(body, { subject: title }), '_blank', 'noopener,noreferrer');
}

export function openWhatsAppShare(url, title = 'Gallery') {
    const text = `Check out ${title}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function getQrCodeImageUrl(url, size = 220) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}
