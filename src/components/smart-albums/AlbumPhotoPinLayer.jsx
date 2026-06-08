import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAlbumBookPageContext } from './AlbumBookPageContext';

const SPOT_DRAFT_OPEN_EVENT = 'album-spot-draft-open';
const SPOT_PIN_OPEN_EVENT = 'album-spot-pin-open';

function broadcastSpotDraft(layerId) {
    window.dispatchEvent(new CustomEvent(SPOT_DRAFT_OPEN_EVENT, { detail: { layerId } }));
}

function broadcastPinOpen(layerId, pinId) {
    window.dispatchEvent(new CustomEvent(SPOT_PIN_OPEN_EVENT, { detail: { layerId, pinId } }));
}

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

function SpeechIcon({ className }) {
    return (
        <svg
            className={className}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
        >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h3l3.6 3.6c.4.4 1 .4 1.4 0L15 18h5c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14h-5.2l-.6.6L12 18.2l-2.2-1.6-.6-.6H4V4h16v12z" />
        </svg>
    );
}

function SwapIcon({ className, size = 20 }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
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
    const isComment = !isSwap;
    const swapGroup = isSwap ? String(pin?.swapGroup || '') : '';
    const swapToneIndex = isSwap && swapGroup
        ? Array.from(swapGroup).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 6
        : null;
    return (
        <div
            className={`ab-photo-pin${open ? ' ab-photo-pin--open' : ''}${isComment ? ' ab-photo-pin--comment' : ''}${isSwap ? ' ab-photo-pin--swap' : ''}${isSwap && swapToneIndex != null ? ` ab-photo-pin--swap-group-${swapToneIndex}` : ''}`}
            style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
        >
            <button
                type="button"
                className="ab-photo-pin-marker"
                aria-label={isSwap ? 'View swap' : 'View comment'}
                aria-expanded={open}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle?.();
                }}
            >
                <span className="ab-photo-pin-marker-body">
                    {isSwap ? (
                        <SwapIcon className="ab-photo-pin-swap-icon" size={11} />
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

function SpotInlineCommentComposer({ xPct, yPct, onSave, onClose }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    const resizeTextarea = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => textareaRef.current?.focus(), 40);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        resizeTextarea();
    }, [message, resizeTextarea]);

    return (
        <div
            className="ab-spot-inline-composer"
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Add comment at this spot"
        >
            <div className="ab-spot-inline-composer-bubble">
                <textarea
                    ref={textareaRef}
                    className="ab-spot-inline-composer-input"
                    rows={1}
                    placeholder="Add a comment…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            onClose?.();
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const text = message.trim();
                            if (text) onSave?.(text);
                        }
                    }}
                />
                <div className="ab-spot-inline-composer-actions">
                    <button
                        type="button"
                        className="ab-spot-inline-composer-btn ab-spot-inline-composer-btn--ghost"
                        onClick={() => onClose?.()}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ab-spot-inline-composer-btn ab-spot-inline-composer-btn--save"
                        disabled={!message.trim()}
                        onClick={() => onSave?.(message.trim())}
                    >
                        Save
                    </button>
                </div>
            </div>
            <span className="ab-spot-action-picker-ring ab-spot-action-picker-ring--small" aria-hidden />
        </div>
    );
}

function SpotActionPicker({ xPct, yPct, canComment, canSwap, onComment, onSwap }) {
    const showComment = canComment;
    const showSwap = canSwap;
    const both = showComment && showSwap;

    return (
        <>
            <div className="ab-spot-action-picker-dim" aria-hidden />
            <div
                className="ab-spot-action-picker"
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
                onClick={(e) => e.stopPropagation()}
            >
                <span className="ab-spot-action-picker-ring" aria-hidden />
                <div
                    className={`ab-spot-action-picker-actions${
                        both ? ' ab-spot-action-picker-actions--dual' : ''
                    }`}
                >
                    {showComment && (
                        <button
                            type="button"
                            className="ab-spot-action-btn ab-spot-action-btn--comment"
                            aria-label="Add comment"
                            onClick={(e) => {
                                e.stopPropagation();
                                onComment?.();
                            }}
                        >
                            <SpeechIcon className="ab-spot-action-btn-icon" />
                        </button>
                    )}
                    {showSwap && (
                        <button
                            type="button"
                            className="ab-spot-action-btn ab-spot-action-btn--swap"
                            aria-label="Mark swap"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSwap?.();
                            }}
                        >
                            <SwapIcon className="ab-spot-action-btn-icon" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

export default function AlbumPhotoPinLayer({
    className = '',
    hasPhoto = false,
    swapPinPlacementEnabled = null,
    pinModeActive = false,
    proofToolsEnabled = false,
    proofToolsHover = true,
    canSwap = false,
    onSwapRequest,
    onActivateSwapPinMode,
    swapPinModeActive = false,
    swapPinTargetStep = false,
    swapPinHint = '',
    renderPlacementHint = false,
    onPlaceSwapPin,
    swapPins = [],
    onActivatePinMode,
    pins = [],
    onPlacePin,
    onRemovePin,
    allowPinRemove = true,
    onSaveSpotComment = null,
    spotActionPicker: spotActionPickerProp = false,
    spotCanComment: spotCanCommentProp = false,
    spotCanSwap: spotCanSwapProp = false,
    children,
}) {
    const ctx = useAlbumBookPageContext();
    const spotActionPicker = spotActionPickerProp || Boolean(ctx.spotActionPicker);
    const spotCanComment = spotCanCommentProp || Boolean(ctx.spotCanComment);
    const spotCanSwap = spotCanSwapProp || Boolean(ctx.spotCanSwap);
    const layerId = useId();
    const [openPinId, setOpenPinId] = useState(null);
    const [spotPicker, setSpotPicker] = useState(null);
    const [spotCommentComposer, setSpotCommentComposer] = useState(null);
    const layerRef = React.useRef(null);
    const [hintPosition, setHintPosition] = useState(null);

    const canPlaceSwapPin =
        swapPinPlacementEnabled != null
            ? swapPinPlacementEnabled
            : swapPinModeActive && hasPhoto;

    const showTools =
        proofToolsHover &&
        proofToolsEnabled &&
        hasPhoto &&
        !pinModeActive &&
        !swapPinModeActive &&
        !spotActionPicker &&
        (canSwap || onActivatePinMode || onActivateSwapPinMode);

    const spotPickerActive =
        spotActionPicker &&
        hasPhoto &&
        !pinModeActive &&
        !swapPinModeActive &&
        (spotCanComment || spotCanSwap);

    const handlePlaceClick = (e) => {
        if (
            (!hasPhoto && !canPlaceSwapPin) ||
            (pinModeActive && !hasPhoto) ||
            !layerRef.current
        ) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        const rect = layerRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        if (spotPickerActive) {
            setSpotCommentComposer(null);
            setOpenPinId(null);
            setSpotPicker({ xPct, yPct });
            broadcastSpotDraft(layerId);
            return;
        }
        if (swapPinModeActive) {
            onPlaceSwapPin?.(xPct, yPct);
            return;
        }
        if (pinModeActive) onPlacePin?.(xPct, yPct);
    };

    useEffect(() => {
        const onDraftOpen = (e) => {
            if (e.detail?.layerId !== layerId) {
                setSpotPicker(null);
                setSpotCommentComposer(null);
            }
            setOpenPinId(null);
        };
        const onPinOpen = (e) => {
            if (e.detail?.layerId !== layerId) {
                setOpenPinId(null);
                setSpotPicker(null);
                setSpotCommentComposer(null);
            }
        };
        window.addEventListener(SPOT_DRAFT_OPEN_EVENT, onDraftOpen);
        window.addEventListener(SPOT_PIN_OPEN_EVENT, onPinOpen);
        return () => {
            window.removeEventListener(SPOT_DRAFT_OPEN_EVENT, onDraftOpen);
            window.removeEventListener(SPOT_PIN_OPEN_EVENT, onPinOpen);
        };
    }, [layerId]);

    useEffect(() => {
        if (!spotPicker) return undefined;
        const onDocClick = (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('.ab-spot-action-picker, .ab-spot-inline-composer')) return;
            setSpotPicker(null);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setSpotPicker(null);
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('click', onDocClick);
        }, 0);
        window.addEventListener('keydown', onKey);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('click', onDocClick);
            window.removeEventListener('keydown', onKey);
        };
    }, [spotPicker]);

    useEffect(() => {
        if (!spotCommentComposer) return undefined;
        const onDocClick = (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('.ab-spot-inline-composer')) return;
            setSpotCommentComposer(null);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setSpotCommentComposer(null);
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('click', onDocClick);
        }, 0);
        window.addEventListener('keydown', onKey);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('click', onDocClick);
            window.removeEventListener('keydown', onKey);
        };
    }, [spotCommentComposer]);

    const placementHint = renderPlacementHint
        ? swapPinHint ||
          (swapPinModeActive && canPlaceSwapPin
              ? swapPinTargetStep
                  ? 'Click target spot to complete swap'
                  : 'Click source spot to start swap'
              : pinModeActive && hasPhoto
                ? 'Click to place comment'
                : '')
        : '';

    useLayoutEffect(() => {
        if (!placementHint || !layerRef.current) {
            setHintPosition(null);
            return undefined;
        }

        const updateHintPosition = () => {
            const rect = layerRef.current?.getBoundingClientRect();
            if (!rect || !rect.width || !rect.height) return;
            setHintPosition({
                left: rect.left + rect.width / 2,
                top: rect.bottom + 12,
            });
        };

        updateHintPosition();
        window.addEventListener('resize', updateHintPosition);
        window.addEventListener('scroll', updateHintPosition, true);
        return () => {
            window.removeEventListener('resize', updateHintPosition);
            window.removeEventListener('scroll', updateHintPosition, true);
        };
    }, [placementHint]);

    useEffect(() => {
        if (!placementHint) setHintPosition(null);
    }, [placementHint]);

    return (
        <div
            ref={layerRef}
            className={`ab-photo-pin-layer${
                pinModeActive && hasPhoto ? ' ab-photo-pin-layer--placing' : ''
            }${
                swapPinModeActive && canPlaceSwapPin ? ' ab-photo-pin-layer--placing-swap' : ''
            }${spotPickerActive ? ' ab-photo-pin-layer--spot-picker' : ''}${
                spotPicker ? ' ab-photo-pin-layer--picker-open' : ''
            }${showTools ? ' ab-photo-pin-layer--tools' : ''}${className ? ` ${className}` : ''}`}
            onClick={
                spotPickerActive ||
                (pinModeActive && hasPhoto) ||
                (swapPinModeActive && canPlaceSwapPin)
                    ? handlePlaceClick
                    : undefined
            }
            onKeyDown={undefined}
            role={
                spotPickerActive ||
                (pinModeActive && hasPhoto) ||
                (swapPinModeActive && canPlaceSwapPin)
                    ? 'button'
                    : undefined
            }
            tabIndex={
                spotPickerActive ||
                (pinModeActive && hasPhoto) ||
                (swapPinModeActive && canPlaceSwapPin)
                    ? 0
                    : undefined
            }
            aria-label={
                spotPickerActive
                    ? 'Click to choose comment or swap'
                    : swapPinModeActive && canPlaceSwapPin
                      ? 'Click to place a swap pin'
                      : pinModeActive && hasPhoto
                        ? 'Click to place a comment'
                        : undefined
            }
        >
            {children}
            {placementHint && hintPosition && createPortal(
                <div
                    className={`ab-pin-placement-floating${
                        swapPinModeActive ? ' ab-pin-placement-floating--swap' : ''
                    }`}
                    style={{
                        left: `${hintPosition.left}px`,
                        top: `${hintPosition.top}px`,
                    }}
                    aria-hidden
                >
                    <span className="ab-pin-placement-hint">{placementHint}</span>
                </div>,
                document.body
            )}
            {spotPicker && (
                <SpotActionPicker
                    xPct={spotPicker.xPct}
                    yPct={spotPicker.yPct}
                    canComment={spotCanComment}
                    canSwap={spotCanSwap}
                    onComment={() => {
                        const { xPct, yPct } = spotPicker;
                        setSpotPicker(null);
                        setOpenPinId(null);
                        if (onSaveSpotComment) {
                            setSpotCommentComposer({ xPct, yPct });
                            broadcastSpotDraft(layerId);
                        } else {
                            onPlacePin?.(xPct, yPct);
                        }
                    }}
                    onSwap={() => {
                        onPlaceSwapPin?.(spotPicker.xPct, spotPicker.yPct);
                        setSpotPicker(null);
                    }}
                />
            )}
            {spotCommentComposer && onSaveSpotComment && (
                <SpotInlineCommentComposer
                    xPct={spotCommentComposer.xPct}
                    yPct={spotCommentComposer.yPct}
                    onSave={(message) => {
                        onSaveSpotComment(
                            spotCommentComposer.xPct,
                            spotCommentComposer.yPct,
                            message
                        );
                        setSpotCommentComposer(null);
                    }}
                    onClose={() => setSpotCommentComposer(null)}
                />
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
                    onToggle={() => {
                        setSpotPicker(null);
                        setSpotCommentComposer(null);
                        const opening = openPinId !== pin.id;
                        setOpenPinId(opening ? pin.id : null);
                        if (opening) broadcastPinOpen(layerId, pin.id);
                    }}
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
