import React, { useMemo, useState } from 'react';
import { R2_PUBLIC_URL } from '../../lib/r2';
import { storageService } from '../../services/storage.service';
import {
    albumStoragePathCandidates,
    storagePathFromUrlOrPath,
} from './albumStoragePathHeal';

function displayCandidates(src) {
    if (!src || typeof src !== 'string') return [];
    if (src.startsWith('data:') || src.startsWith('blob:')) return [src];
    const path = storagePathFromUrlOrPath(src, R2_PUBLIC_URL);
    const keys = path ? albumStoragePathCandidates(path) : [];
    const urls = [];
    const push = (url) => {
        if (url && !urls.includes(url)) urls.push(url);
    };
    push(src);
    for (const key of keys) {
        push(storageService.getPublicUrl(key));
    }
    return urls;
}

/**
 * Album photo <img> that retries alternate R2 key spellings on 404
 * (`.jpg` vs `-jpg` vs extensionless) and drops the broken-image icon
 * when every candidate fails.
 */
export default function AlbumDisplayImage({
    src,
    className,
    style,
    alt = '',
    draggable = false,
    onExhausted,
}) {
    const candidates = useMemo(() => displayCandidates(src), [src]);
    const [index, setIndex] = useState(0);
    const [trackedSrc, setTrackedSrc] = useState(src);
    if (src !== trackedSrc) {
        setTrackedSrc(src);
        setIndex(0);
    }

    const current = src === trackedSrc ? candidates[index] : candidates[0];
    if (!current) return null;

    return (
        <img
            src={current}
            alt={alt}
            className={className}
            style={style}
            draggable={draggable}
            onError={() => {
                setIndex((i) => {
                    const next = i + 1;
                    if (next >= candidates.length) {
                        queueMicrotask(() => onExhausted?.());
                    }
                    return next;
                });
            }}
        />
    );
}
