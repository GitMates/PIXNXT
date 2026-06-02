import React, { useState } from 'react';

function CommentIcon({ className }) {
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

function SwapIcon({ className }) {
    return (
        <svg
            className={className}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M7 16V4M7 4 3 8M7 4l4 4" />
            <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
        </svg>
    );
}

function PinMarker({ pin, open, onToggle, onRemove, allowRemove }) {
    const isSwap = pin?.type === 'swap';
    return (
        <div
            className={`ab-photo-pin${open ? ' ab-photo-pin--open' : ''}${isSwap ? ' ab-photo-pin--swap' : ''}`}
            style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
        >
            <button
                type="button"
                className="ab-photo-pin-marker"
                aria-label="View comment"
                aria-expanded={open}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle?.();
                }}
            >
                <span className="ab-photo-pin-marker-body">
                    {isSwap ? (
                        <SwapIcon className="ab-photo-pin-swap-icon" />
                    ) : (
                        <CommentIcon className="ab-photo-pin-marker-icon" />
                    )}
                </span>
                <span className="ab-photo-pin-marker-tail" aria-hidden />
            </button>
            {open && (
                <div
                    className="ab-photo-pin-popover"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="Comment"
                >
                    <span className="ab-photo-pin-popover-label">
                        {isSwap ? 'Swap pin' : 'Comment'}
                    </span>
                    <p className="ab-photo-pin-message">
                        {isSwap
                            ? pin.message || 'Swap point selected'
                            : pin.message}
                    </p>
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
    onActivateSwapPinMode,
    swapPinModeActive = false,
    swapPinTargetStep = false,
    onPlaceSwapPin,
    swapPins = [],
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
        !swapPinModeActive &&
        (canSwap || onActivatePinMode || onActivateSwapPinMode);

    const handlePlaceClick = (e) => {
        if (!hasPhoto || !layerRef.current) return;
        e.stopPropagation();
        e.preventDefault();
        const rect = layerRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        if (swapPinModeActive) {
            onPlaceSwapPin?.(xPct, yPct);
            return;
        }
        if (pinModeActive) onPlacePin?.(xPct, yPct);
    };

    return (
        <div
            ref={layerRef}
            className={`ab-photo-pin-layer${
                pinModeActive && hasPhoto ? ' ab-photo-pin-layer--placing' : ''
            }${
                swapPinModeActive && hasPhoto ? ' ab-photo-pin-layer--placing-swap' : ''
            }${showTools ? ' ab-photo-pin-layer--tools' : ''}${className ? ` ${className}` : ''}`}
            onClick={(pinModeActive || swapPinModeActive) && hasPhoto ? handlePlaceClick : undefined}
            onKeyDown={undefined}
            role={(pinModeActive || swapPinModeActive) && hasPhoto ? 'button' : undefined}
            tabIndex={(pinModeActive || swapPinModeActive) && hasPhoto ? 0 : undefined}
            aria-label={
                swapPinModeActive && hasPhoto
                    ? 'Click to place a swap pin'
                    : pinModeActive && hasPhoto
                      ? 'Click to place a comment'
                      : undefined
            }
        >
            {children}
            {swapPinModeActive && hasPhoto && (
                <div className="ab-pin-placement-overlay ab-pin-placement-overlay--swap" aria-hidden>
                    <span className="ab-pin-placement-hint">
                        {swapPinTargetStep
                            ? 'Click target spot to complete swap'
                            : 'Click source spot to start swap'}
                    </span>
                </div>
            )}
            {pinModeActive && hasPhoto && (
                <div className="ab-pin-placement-overlay" aria-hidden>
                    <span className="ab-pin-placement-hint">Click to place comment</span>
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
                                if (onActivateSwapPinMode) onActivateSwapPinMode();
                                else onSwapRequest?.();
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
                            <CommentIcon className="ab-proof-tool-pin-icon" />
                            Comment
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
            {swapPins.map((pin) => (
                <PinMarker
                    key={pin.id}
                    pin={{ ...pin, type: 'swap' }}
                    open={openPinId === pin.id}
                    allowRemove={false}
                    onToggle={() =>
                        setOpenPinId((id) => (id === pin.id ? null : pin.id))
                    }
                />
            ))}
        </div>
    );
}
