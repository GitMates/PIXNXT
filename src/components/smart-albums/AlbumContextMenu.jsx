import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useContextMenuPortalLayout } from '../features/ClientGallery/useContextMenuPortalLayout';

const SUBMENU_WIDTH = 240;
const SUBMENU_GAP = 8;
const CLOSE_DELAY_MS = 220;

const IconShare = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);
const IconEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const IconEdit = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);
const IconSettings = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);
const IconDuplicate = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="14" height="14" rx="2" ry="2" />
        <path d="M4 16V4a2 2 0 0 1 2-2h12" />
    </svg>
);
const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
const IconMail = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);
const IconLink = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);
const IconQr = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <rect x="7" y="7" width="3" height="3" />
        <rect x="14" y="7" width="3" height="3" />
        <rect x="7" y="14" width="3" height="3" />
        <rect x="14" y="14" width="3" height="3" />
    </svg>
);
const IconWhatsApp = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);
const IconChevron = () => (
    <svg className="cg-ctx-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

function ShareSubmenu({
    shareBtnRef,
    shareOpen,
    cancelClose,
    scheduleClose,
    onShareByEmail,
    onGetDirectLink,
    onGetQrCode,
    onShareWhatsApp,
    onClose,
}) {
    const [layout, setLayout] = useState(null);

    const updatePosition = useCallback(() => {
        const anchor = shareBtnRef.current;
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        const viewportPad = 8;
        const submenuHeight = 4 * 48 + 8;

        let submenuLeft = rect.right + SUBMENU_GAP;
        let opensLeft = false;

        if (submenuLeft + SUBMENU_WIDTH > window.innerWidth - viewportPad) {
            submenuLeft = rect.left - SUBMENU_WIDTH - SUBMENU_GAP;
            opensLeft = true;
        }

        submenuLeft = Math.max(viewportPad, Math.min(submenuLeft, window.innerWidth - SUBMENU_WIDTH - viewportPad));

        const bridgeLeft = opensLeft ? submenuLeft + SUBMENU_WIDTH : rect.right;
        const bridgeWidth = opensLeft
            ? Math.max(SUBMENU_GAP, rect.left - bridgeLeft)
            : Math.max(SUBMENU_GAP, submenuLeft - rect.right);

        setLayout({
            submenuTop: rect.top,
            submenuLeft,
            bridgeTop: rect.top,
            bridgeLeft,
            bridgeWidth,
            bridgeHeight: Math.max(rect.height, submenuHeight),
        });
    }, [shareBtnRef]);

    useLayoutEffect(() => {
        if (!shareOpen) {
            setLayout(null);
            return undefined;
        }
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [shareOpen, updatePosition]);

    const run = (fn) => (e) => {
        e.stopPropagation();
        fn?.();
        onClose();
    };

    const pointerInside = () => cancelClose();
    const pointerOutside = () => scheduleClose();

    if (!shareOpen || !layout) return null;

    return createPortal(
        <>
            <div
                className="cg-ctx-submenu-bridge"
                style={{
                    top: layout.bridgeTop,
                    left: layout.bridgeLeft,
                    width: layout.bridgeWidth,
                    height: layout.bridgeHeight,
                }}
                onMouseEnter={pointerInside}
                onMouseLeave={pointerOutside}
                aria-hidden
            />
            <div
                className="cg-ctx-submenu cg-ctx-submenu--portal"
                style={{ top: layout.submenuTop, left: layout.submenuLeft }}
                role="menu"
                onMouseEnter={pointerInside}
                onMouseLeave={pointerOutside}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="cg-ctx-item" onMouseDown={(e) => e.stopPropagation()} onClick={run(onShareByEmail)}>
                    <IconMail />
                    Share by email
                </button>
                <button type="button" className="cg-ctx-item" onMouseDown={(e) => e.stopPropagation()} onClick={run(onGetDirectLink)}>
                    <IconLink />
                    Get direct link
                </button>
                <button type="button" className="cg-ctx-item" onMouseDown={(e) => e.stopPropagation()} onClick={run(onGetQrCode)}>
                    <IconQr />
                    Get QR code
                </button>
                <button type="button" className="cg-ctx-item cg-ctx-item--whatsapp" onMouseDown={(e) => e.stopPropagation()} onClick={run(onShareWhatsApp)}>
                    <IconWhatsApp />
                    Share on WhatsApp
                </button>
            </div>
        </>,
        document.body
    );
}

export function AlbumContextMenu({
    menuRef,
    anchorEl,
    variant = 'grid',
    onPreview,
    onQuickEdit,
    onAlbumSettings,
    onDuplicate,
    onDelete,
    onShareByEmail,
    onGetDirectLink,
    onGetQrCode,
    onShareWhatsApp,
}) {
    const [shareOpen, setShareOpen] = useState(false);
    const shareBtnRef = useRef(null);
    const closeTimerRef = useRef(null);
    const menuLayout = useContextMenuPortalLayout(anchorEl, variant);

    const cancelClose = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimerRef.current = window.setTimeout(() => setShareOpen(false), CLOSE_DELAY_MS);
    }, [cancelClose]);

    const closeShare = useCallback(() => {
        cancelClose();
        setShareOpen(false);
    }, [cancelClose]);

    const openShare = useCallback(() => {
        cancelClose();
        setShareOpen(true);
    }, [cancelClose]);

    const run = (fn) => (e) => {
        e.stopPropagation();
        closeShare();
        fn?.();
    };

    const toggleShare = (e) => {
        e.stopPropagation();
        setShareOpen((open) => !open);
    };

    if (!menuLayout) return null;

    const menuPanel = (
        <div
            className={`cg-ctx-menu cg-ctx-menu--portal ${variant === 'list' ? 'cg-ctx-menu--list' : ''} ${shareOpen ? 'cg-ctx-menu--share-open' : ''}`}
            ref={menuRef}
            style={{ top: menuLayout.top, left: menuLayout.left }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
        >
            <button
                type="button"
                ref={shareBtnRef}
                className={`cg-ctx-item cg-ctx-item--share ${shareOpen ? 'cg-ctx-item--active' : ''}`}
                onClick={toggleShare}
                onMouseEnter={openShare}
                onMouseLeave={scheduleClose}
                aria-expanded={shareOpen}
            >
                <span className="cg-ctx-item-main">
                    <IconShare />
                    Share
                </span>
                <IconChevron />
            </button>
            <button type="button" className="cg-ctx-item" onClick={run(onPreview)}>
                <IconEye />
                Preview
            </button>
            <button type="button" className="cg-ctx-item" onClick={run(onQuickEdit)}>
                <IconEdit />
                Quick edit
            </button>
            <button type="button" className="cg-ctx-item" onClick={run(onAlbumSettings)}>
                <IconSettings />
                Album settings
            </button>
            <button type="button" className="cg-ctx-item" onClick={run(onDuplicate)}>
                <IconDuplicate />
                Duplicate
            </button>
            <button type="button" className="cg-ctx-item cg-ctx-item--danger" onClick={run(onDelete)}>
                <IconTrash />
                Delete
            </button>
        </div>
    );

    return createPortal(
        <>
            {menuPanel}
            <ShareSubmenu
                shareBtnRef={shareBtnRef}
                shareOpen={shareOpen}
                cancelClose={cancelClose}
                scheduleClose={scheduleClose}
                onClose={closeShare}
                onShareByEmail={onShareByEmail}
                onGetDirectLink={onGetDirectLink}
                onGetQrCode={onGetQrCode}
                onShareWhatsApp={onShareWhatsApp}
            />
        </>,
        document.body
    );
}
