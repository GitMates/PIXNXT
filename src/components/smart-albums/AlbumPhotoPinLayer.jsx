import React, { useState } from 'react';

function PinIcon({ className }) {
    return (
        <svg
            className={className}
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
        >
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
        </svg>
    );
}

function PinMarker({ pin, open, onToggle, onRemove, allowRemove }) {
    return (
        <div
            className={`ab-photo-pin${open ? ' ab-photo-pin--open' : ''}`}
            style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
        >
            <button
                type="button"
                className="ab-photo-pin-marker"
                aria-label="View pin note"
                aria-expanded={open}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle?.();
                }}
            >
                <span className="ab-photo-pin-marker-body">
                    <PinIcon className="ab-photo-pin-marker-icon" />
                </span>
                <span className="ab-photo-pin-marker-tail" aria-hidden />
            </button>
            {open && (
                <div
                    className="ab-photo-pin-popover"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="Pin note"
                >
                    <span className="ab-photo-pin-popover-label">Note</span>
                    <p className="ab-photo-pin-message">{pin.message}</p>
                    {allowRemove && (
                        <button
                            type="button"
                            className="ab-photo-pin-remove"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove?.(pin.id);
                            }}
                        >
                            Remove
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AlbumPhotoPinLayer({
    className = '',
    hasPhoto = false,
    pinModeActive = false,
    proofToolsEnabled = false,
    proofToolsHover = true,
    canSwap = false,
    onSwapRequest,
    onActivatePinMode,
    pins = [],
    onPlacePin,
    onRemovePin,
    allowPinRemove = true,
    children,
}) {
    const [openPinId, setOpenPinId] = useState(null);
    const layerRef = React.useRef(null);

    const showTools =
        proofToolsHover &&
        proofToolsEnabled &&
        hasPhoto &&
        !pinModeActive &&
        (canSwap || onActivatePinMode);

    const handlePlaceClick = (e) => {
        if (!pinModeActive || !hasPhoto || !layerRef.current) return;
        e.stopPropagation();
        e.preventDefault();
        const rect = layerRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        onPlacePin?.(xPct, yPct);
    };

    return (
        <div
            ref={layerRef}
            className={`ab-photo-pin-layer${
                pinModeActive && hasPhoto ? ' ab-photo-pin-layer--placing' : ''
            }${showTools ? ' ab-photo-pin-layer--tools' : ''}${className ? ` ${className}` : ''}`}
            onClick={pinModeActive && hasPhoto ? handlePlaceClick : undefined}
            onKeyDown={undefined}
            role={pinModeActive && hasPhoto ? 'button' : undefined}
            tabIndex={pinModeActive && hasPhoto ? 0 : undefined}
            aria-label={pinModeActive && hasPhoto ? 'Click to place a pin' : undefined}
        >
            {children}
            {pinModeActive && hasPhoto && (
                <div className="ab-pin-placement-overlay" aria-hidden>
                    <span className="ab-pin-placement-hint">Click to place pin</span>
                </div>
            )}
            {showTools && (
                <div className="ab-proof-tools-hover ab-proof-tools-hover--with-swap">
                    {canSwap && (
                        <button
                            type="button"
                            className="ab-proof-tool-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSwapRequest?.();
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M7 16V4M7 4 3 8M7 4l4 4" />
                                <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
                            </svg>
                            Swap
                        </button>
                    )}
                    {onActivatePinMode && (
                        <button
                            type="button"
                            className="ab-proof-tool-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onActivatePinMode();
                            }}
                        >
                            <PinIcon className="ab-proof-tool-pin-icon" />
                            Pin
                        </button>
                    )}
                </div>
            )}
            {pins.map((pin) => (
                <PinMarker
                    key={pin.id}
                    pin={pin}
                    open={openPinId === pin.id}
                    allowRemove={allowPinRemove}
                    onToggle={() =>
                        setOpenPinId((id) => (id === pin.id ? null : pin.id))
                    }
                    onRemove={onRemovePin}
                />
            ))}
        </div>
    );
}
