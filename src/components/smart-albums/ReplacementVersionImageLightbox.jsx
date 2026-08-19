import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    getPhotoPinsForSpreadVersion,
    parseVersionTag,
    resolveReplacementPreviewUrl,
} from './albumImageReplacements';
import {
    filterSpreadVisiblePhotoPins,
    getPinsForSlot,
    mapPhotoPinToWholeSpreadImage,
} from './albumPhotoPins';
import CommentAttachmentContent from './CommentAttachmentContent';
import { resolveSpreadThumbVisual } from './albumSpreadThumbVisual';
import { getSpreadPages } from './albumSpreadUtils';
import './AlbumPhotoPins.css';
import './ReplacementVersionImageLightbox.css';

function CommentIcon({ className }) {
    return (
        <svg
            className={className}
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function VersionPinOverlay({ pins }) {
    const [openPinId, setOpenPinId] = useState(null);

    if (!pins?.length) return null;

    return (
        <div className="av-replacement-lightbox-pins">
            {pins.map((pin, index) => {
                const open = openPinId === pin.id;
                const label = pin.label || `Pin ${index + 1}`;
                return (
                    <div
                        key={pin.id}
                        className={`ab-photo-pin ab-photo-pin--comment${
                            open ? ' ab-photo-pin--open' : ''
                        }`}
                        style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                    >
                        <button
                            type="button"
                            className="ab-photo-pin-marker"
                            aria-label={`View ${label}`}
                            aria-expanded={open}
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpenPinId(open ? null : pin.id);
                            }}
                        >
                            <span className="ab-photo-pin-marker-body">
                                <CommentIcon className="ab-photo-pin-marker-icon" />
                            </span>
                            <span className="ab-photo-pin-marker-tail" aria-hidden />
                        </button>
                        {open ? (
                            <div
                                className="av-replacement-lightbox-pin-popover"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <span className="av-replacement-lightbox-pin-popover-label">
                                    {label}
                                </span>
                                {pin.message ? (
                                    <p className="av-replacement-lightbox-pin-popover-message">
                                        {pin.message}
                                    </p>
                                ) : null}
                                <CommentAttachmentContent
                                    comment={pin}
                                    className="av-replacement-lightbox-pin-popover-attachment"
                                />
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

function LiveSpreadLightboxStage({
    album,
    albumId,
    spreadIndex,
    totalPages,
    spreadOpts,
    pins,
}) {
    const visual = useMemo(
        () => resolveSpreadThumbVisual(album, spreadIndex, totalPages),
        [album, spreadIndex, totalPages]
    );
    const { left, right } = useMemo(
        () => getSpreadPages(spreadIndex, totalPages, spreadOpts),
        [spreadIndex, totalPages, spreadOpts]
    );
    const visiblePins = useMemo(
        () => filterSpreadVisiblePhotoPins(albumId, pins),
        [albumId, pins]
    );

    if (visual.showSpreadFull && visual.spreadSrc) {
        const mappedPins = visiblePins.map((pin) => {
            const mapped = mapPhotoPinToWholeSpreadImage(pin, left, right);
            return { ...pin, xPct: mapped.xPct, yPct: mapped.yPct };
        });
        return (
            <div className="av-replacement-lightbox-stage av-replacement-lightbox-stage--spread-full">
                <img
                    className="av-replacement-lightbox-image"
                    src={visual.spreadSrc}
                    alt=""
                    draggable={false}
                />
                <VersionPinOverlay pins={mappedPins} />
            </div>
        );
    }

    const leftPins = getPinsForSlot(visiblePins, left, 1, {
        placementMode: 'single',
        spreadLeft: left,
    });
    const rightPins = getPinsForSlot(visiblePins, right, 2, {
        placementMode: 'single',
        spreadLeft: left,
    });

    return (
        <div className="av-replacement-lightbox-stage av-replacement-lightbox-stage--split">
            <div className="av-replacement-lightbox-page">
                {visual.leftSrc ? (
                    <img src={visual.leftSrc} alt="" draggable={false} />
                ) : (
                    <span className="av-replacement-lightbox-page-ph" aria-hidden />
                )}
                <VersionPinOverlay pins={leftPins} />
            </div>
            <div className="av-replacement-lightbox-page">
                {visual.rightSrc ? (
                    <img src={visual.rightSrc} alt="" draggable={false} />
                ) : (
                    <span className="av-replacement-lightbox-page-ph" aria-hidden />
                )}
                <VersionPinOverlay pins={rightPins} />
            </div>
        </div>
    );
}

function FrozenSpreadLightboxStage({ src, pins, spreadLeft, rightPage, wholeSpread = true }) {
    const mappedPins = useMemo(() => {
        if (!wholeSpread) return pins;
        return pins.map((pin) => {
            const mapped = mapPhotoPinToWholeSpreadImage(pin, spreadLeft, rightPage);
            return { ...pin, xPct: mapped.xPct, yPct: mapped.yPct };
        });
    }, [pins, spreadLeft, rightPage, wholeSpread]);

    return (
        <div className="av-replacement-lightbox-stage av-replacement-lightbox-stage--spread-full">
            <img className="av-replacement-lightbox-image" src={src} alt="" draggable={false} />
            <VersionPinOverlay pins={mappedPins} />
        </div>
    );
}

function VersionImageLightbox({
    open,
    src,
    tag,
    pins = [],
    onClose,
    preferLive = false,
    album = null,
    albumId = null,
    spreadIndex = null,
    totalPages = 0,
    spreadOpts = {},
}) {
    const useLiveSpread = preferLive && album && spreadIndex != null && totalPages > 0;
    const { left, right } = useMemo(() => {
        if (spreadIndex == null || !totalPages) return { left: 0, right: 0 };
        return getSpreadPages(spreadIndex, totalPages, spreadOpts);
    }, [spreadIndex, totalPages, spreadOpts]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    const hasContent = useLiveSpread || src;

    return createPortal(
        <div
            className="av-replacement-lightbox-root"
            role="presentation"
            onClick={onClose}
        >
            <button
                type="button"
                className="av-replacement-lightbox-backdrop"
                aria-label="Close version preview"
                onClick={onClose}
            />
            <div
                className="av-replacement-lightbox"
                role="dialog"
                aria-label={tag ? `Version ${tag}` : 'Version preview'}
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="av-replacement-lightbox-close"
                    aria-label="Close"
                    onClick={onClose}
                >
                    ×
                </button>
                {tag ? (
                    <span className="av-replacement-lightbox-tag">{tag}</span>
                ) : null}
                {useLiveSpread ? (
                    <LiveSpreadLightboxStage
                        album={album}
                        albumId={albumId}
                        spreadIndex={spreadIndex}
                        totalPages={totalPages}
                        spreadOpts={spreadOpts}
                        pins={pins}
                    />
                ) : hasContent ? (
                    <FrozenSpreadLightboxStage
                        src={src}
                        pins={pins}
                        spreadLeft={left}
                        rightPage={right}
                        wholeSpread
                    />
                ) : (
                    <div className="av-replacement-lightbox-missing">Preview unavailable</div>
                )}
            </div>
        </div>,
        document.body
    );
}

/**
 * Clickable version thumbnail that opens a large centered preview lightbox.
 * Used in comment feed cards and spread version history (editor + client preview).
 */
export function ReplacementVersionShotButton({
    albumId,
    url,
    storagePath = null,
    itemId = null,
    preferLive = false,
    tag = null,
    variant = 'feed',
    current = false,
    spreadIndex = null,
    version = null,
    photoPins = [],
    imageReplacements = [],
    spreadOpts = {},
    album = null,
    totalPages = 0,
}) {
    const [open, setOpen] = useState(false);
    const src = resolveReplacementPreviewUrl(albumId, url, storagePath, {
        itemId,
        preferLive,
    });
    const close = useCallback(() => setOpen(false), []);

    const resolvedVersion = version ?? parseVersionTag(tag);
    const versionPins = useMemo(() => {
        if (spreadIndex == null || resolvedVersion == null) return [];
        return getPhotoPinsForSpreadVersion(
            photoPins,
            imageReplacements,
            spreadIndex,
            resolvedVersion,
            spreadOpts
        );
    }, [photoPins, imageReplacements, spreadIndex, resolvedVersion, spreadOpts]);

    const canOpen = preferLive
        ? Boolean(album && spreadIndex != null && totalPages > 0) || Boolean(src)
        : Boolean(src);

    const isFeed = variant === 'feed';
    const outerClass = isFeed
        ? 'quiet-proof-card__version-shot replacement-version-shot-btn'
        : `ae-version-history__thumb replacement-version-shot-btn${
              current ? ' ae-version-history__thumb--current' : ''
          }`;
    const placeholderClass = isFeed
        ? 'quiet-proof-card__version-shot-ph'
        : 'ae-version-history__thumb-ph';
    const tagClass = isFeed ? 'quiet-proof-card__version-shot-tag' : null;

    return (
        <>
            <button
                type="button"
                className={outerClass}
                disabled={!canOpen}
                aria-expanded={open}
                aria-label={tag ? `View ${tag}` : 'View version'}
                onClick={(event) => {
                    event.stopPropagation();
                    if (!canOpen) return;
                    setOpen(true);
                }}
            >
                {src ? (
                    <img src={src} alt="" draggable={false} />
                ) : (
                    <span className={placeholderClass} />
                )}
                {tag && tagClass ? <span className={tagClass}>{tag}</span> : null}
            </button>
            <VersionImageLightbox
                open={open}
                src={src}
                tag={tag}
                pins={versionPins}
                onClose={close}
                preferLive={preferLive}
                album={album}
                albumId={albumId}
                spreadIndex={spreadIndex}
                totalPages={totalPages}
                spreadOpts={spreadOpts}
            />
        </>
    );
}
