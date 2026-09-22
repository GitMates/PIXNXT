import React, { useEffect, useRef, useState } from 'react';
import {
    extractImageDetails,
    exifDetailsToPatch,
    photoExifCameraLabel,
    photoExifDetails,
    splitCameraLabel,
} from '../../../../lib/exifCamera';
import { galleryService } from '../../../../services/gallery.service';
import { formatStorageBytes } from '../../../../utils/formatStorageBytes';
import './PhotoDetailsModal.css';

const RAW_LABELS = {
    arw: 'ARW File',
    cr2: 'CR2 File',
    cr3: 'CR3 File',
    nef: 'NEF File',
    nrw: 'NRW File',
    rw2: 'RW2 File',
    dng: 'DNG File',
    raf: 'RAF File',
    orf: 'ORF File',
    pef: 'PEF File',
    srw: 'SRW File',
    jpg: 'JPEG File',
    jpeg: 'JPEG File',
    png: 'PNG File',
    heic: 'HEIC File',
    heif: 'HEIF File',
    webp: 'WEBP File',
    tif: 'TIFF File',
    tiff: 'TIFF File',
    mp4: 'MP4 File',
    mov: 'MOV File',
};

function fileTypeLabel(photo) {
    const ext = String(photo?.filename || '')
        .split('.')
        .pop()
        ?.toLowerCase()
        .trim();
    if (ext && RAW_LABELS[ext]) return RAW_LABELS[ext];
    const mime = String(photo?.mime_type || photo?.mimeType || '').toLowerCase();
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG File';
    if (mime.includes('png')) return 'PNG File';
    if (mime.includes('heic')) return 'HEIC File';
    if (mime.includes('webp')) return 'WEBP File';
    if (mime.includes('video') || mime.includes('mp4')) return 'Video File';
    if (mime.includes('image')) return 'Image File';
    return 'File';
}

function formatAddedOn(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Truncate a storage path the way Windows truncates long file locations. */
function fileLocationLabel(photo) {
    const path =
        photo?.original_storage_path ||
        photo?.originalStoragePath ||
        photo?.full_url ||
        photo?.fullUrl ||
        '';
    if (!path) return 'In delivery storage';
    const text = String(path);
    if (text.length <= 42) return text;
    return `${text.slice(0, 28)}…${text.slice(-10)}`;
}

/**
 * Windows-style properties pane for one delivery photo: file facts from the
 * row plus shooting details from stored `exif_details` (or parsed on demand).
 */
export function PhotoDetailsModal({ photo, onClose, onCameraLabel }) {
    const [details, setDetails] = useState(() => photoExifDetails(photo));
    const [loadingExif, setLoadingExif] = useState(() => !photoExifDetails(photo));
    const cacheRef = useRef(new Map());

    useEffect(() => {
        if (!photo?.id) return undefined;
        let cancelled = false;

        const stored = photoExifDetails(photo);
        if (stored) {
            cacheRef.current.set(photo.id, stored);
            setDetails(stored);
            setLoadingExif(false);
            return undefined;
        }

        const cached = cacheRef.current.get(photo.id);
        if (cached !== undefined) {
            setDetails(cached);
            setLoadingExif(false);
            return undefined;
        }

        setDetails(null);
        setLoadingExif(true);
        (async () => {
            try {
                const blob = await galleryService.fetchPhotoOriginalBlob(photo);
                if (cancelled) return;
                const parsed = blob ? await extractImageDetails(blob) : null;
                if (cancelled) return;
                cacheRef.current.set(photo.id, parsed);
                setDetails(parsed);

                const patch = exifDetailsToPatch(parsed);
                if (patch && photo?.id) {
                    void galleryService.updatePhoto(photo.id, patch).catch(() => null);
                    if (patch.exifCamera) {
                        onCameraLabel?.(photo.id, patch.exifCamera, {
                            exif_details: patch.exifDetails,
                            exif_lens: patch.exifLens,
                            exif_taken_at: patch.exifTakenAt,
                        });
                    }
                }
            } catch {
                if (!cancelled) cacheRef.current.set(photo.id, null);
            } finally {
                if (!cancelled) setLoadingExif(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!photo) return null;

    const filename = photo.filename || photo.original_filename || 'Untitled';
    const dimensions =
        Number(photo.width) > 0 && Number(photo.height) > 0
            ? `${photo.width} x ${photo.height}`
            : details?.width && details?.height
              ? `${details.width} x ${details.height}`
              : '';
    const thumb = photo.thumbnail_url || photo.web_url || photo.full_url || '';
    const stored = splitCameraLabel(photoExifCameraLabel(photo));
    const cameraMaker = details?.cameraMaker || stored.maker;
    const cameraModel = details?.cameraModel || stored.model;

    // Order mirrors Windows File Explorer "Details" for photos (image 7).
    const rows = [
        ['Type', fileTypeLabel(photo)],
        [
            'Size',
            photo.size_bytes != null || photo.sizeBytes != null
                ? formatStorageBytes(photo.size_bytes ?? photo.sizeBytes)
                : '',
        ],
        ['File location', fileLocationLabel(photo)],
        [
            'Date modified',
            formatAddedOn(photo.updated_at || photo.updatedAt || photo.created_at || photo.createdAt),
        ],
        ['Date taken', details?.dateTaken || ''],
        ['Dimensions', dimensions],
        ['Camera maker', cameraMaker],
        ['Camera model', cameraModel],
        ['ISO speed', details?.iso || ''],
        ['F-stop', details?.fStop || ''],
        ['Exposure time', details?.exposureTime || ''],
        ['Exposure bias', details?.exposureBias || ''],
        ['Exposure program', details?.exposureProgram || ''],
        ['Metering mode', details?.meteringMode || ''],
        ['Flash mode', details?.flash || ''],
        ['Focal length', details?.focalLength || ''],
    ];

    const visibleRows = rows.filter(([, value]) => value !== '' && value != null);

    return (
        <div className="cd-photo-details-overlay" onClick={() => onClose?.()}>
            <div
                className="cd-photo-details"
                role="dialog"
                aria-modal="true"
                aria-label={`Details for ${filename}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="cd-photo-details__head">
                    <div className="cd-photo-details__identity">
                        <span className="cd-photo-details__file-icon" aria-hidden />
                        <p className="cd-photo-details__title" title={filename}>
                            {filename}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="cd-photo-details__close"
                        aria-label="Close details"
                        onClick={() => onClose?.()}
                    >
                        ×
                    </button>
                </div>
                {thumb ? (
                    <div className="cd-photo-details__preview">
                        <img src={thumb} alt="" loading="lazy" />
                    </div>
                ) : null}
                <p className="cd-photo-details__section">Details</p>
                {loadingExif ? (
                    <p className="cd-photo-details__muted">Reading image details…</p>
                ) : null}
                <dl className="cd-photo-details__rows">
                    {visibleRows.map(([label, value]) => (
                        <div className="cd-photo-details__row" key={label}>
                            <dt>{label}</dt>
                            <dd title={String(value)}>{value}</dd>
                        </div>
                    ))}
                </dl>
                {!loadingExif && !details && !cameraMaker && !cameraModel ? (
                    <p className="cd-photo-details__muted">
                        No camera data found in this file
                        {photo.media_type === 'video' ? ' (video)' : ''}.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
