import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useContextMenuPortalLayout } from './useContextMenuPortalLayout';

export function CollectionContextMenu({
    menuRef,
    anchorEl,
    variant = 'grid',
    collection,
    storageLabel = '',
    onOpen,
    onCopyLink,
    onPreviewAsClient,
    onStar,
    onDuplicate,
    onRename,
    onArchive,
    onDelete,
}) {
    const menuLayout = useContextMenuPortalLayout(anchorEl, variant);
    const run = (fn) => (e) => {
        e.stopPropagation();
        fn?.();
    };

    const stop = useCallback((e) => e.stopPropagation(), []);

    if (!menuLayout) return null;

    const heading = String(collection?.name || 'Delivery').trim() || 'Delivery';

    return createPortal(
        <div
            className={`cg-ctx-menu cg-ctx-menu--portal dl-more-menu ${variant === 'list' ? 'cg-ctx-menu--list' : ''}`}
            ref={menuRef}
            style={{ top: menuLayout.top, left: menuLayout.left }}
            onClick={stop}
            onMouseDown={stop}
            role="menu"
        >
            <p className="dl-more-menu__kicker">{heading}</p>
            <button type="button" className="dl-more-menu__item" onClick={run(onOpen)}>
                Open the delivery
            </button>
            <button type="button" className="dl-more-menu__item" onClick={run(onCopyLink)}>
                Copy link
            </button>
            <button type="button" className="dl-more-menu__item" onClick={run(onPreviewAsClient)}>
                Preview as the client
            </button>
            <button type="button" className="dl-more-menu__item" onClick={run(onStar)}>
                {collection?.is_starred ? 'Unstar this delivery' : 'Star this delivery'}
            </button>

            <div className="dl-more-menu__rule" />
            <button type="button" className="dl-more-menu__item" onClick={run(onDuplicate)}>
                Duplicate
            </button>
            <button type="button" className="dl-more-menu__item" onClick={run(onRename)}>
                Rename
            </button>

            <div className="dl-more-menu__rule" />
            <button type="button" className="dl-more-menu__item dl-more-menu__item--split" onClick={run(onArchive)}>
                <span>Archive</span>
                {storageLabel ? <span className="dl-more-menu__meta">{storageLabel}</span> : null}
            </button>
            <button type="button" className="dl-more-menu__item dl-more-menu__item--danger" onClick={run(onDelete)}>
                Delete delivery
            </button>
        </div>,
        document.body
    );
}
