import React, { useEffect, useMemo, useRef } from 'react';
import { hasCommentBody } from '../../services/smartAlbumComments.service';
import './AlbumSpreadComments.css';

function formatMessageTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function flattenThreadMessages(threads) {
    const items = [];
    (threads || []).forEach(({ root }) => {
        if (hasCommentBody(root)) {
            items.push(root);
        }
    });
    return items.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export default function AlbumMessageChat({
    threads = [],
    loading = false,
    spreadLabel = 'Spread',
    canCompose = false,
    isPhotographer = false,
    guestName = 'Guest',
    composerValue = '',
    onComposerChange,
    onSend,
    composerBusy = false,
    composerPlaceholder,
    syncedAt = null,
    syncing = false,
    onRefresh,
    canDelete,
    onDelete,
    deleteBusyId = null,
}) {
    const scrollRef = useRef(null);
    const messages = useMemo(() => flattenThreadMessages(threads), [threads]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages.length, composerValue]);

    const placeholder = composerPlaceholder || (canCompose ? 'Write a comment…' : 'Comments');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSend?.();
    };

    return (
        <div className="asc-chat">
            <header className="asc-chat-header">
                <div>
                    <h5 className="asc-chat-title">Messages</h5>
                    <p className="asc-chat-subtitle">{spreadLabel}</p>
                </div>
                <div className="asc-chat-header-actions">
                    <span className={`asc-chat-sync${syncing ? ' asc-chat-sync--busy' : ''}`}>
                        {syncing ? 'Syncing…' : syncedAt ? `Synced ${formatMessageTime(syncedAt)}` : 'Live'}
                    </span>
                    {onRefresh && (
                        <button type="button" className="asc-chat-refresh" onClick={onRefresh}>
                            Refresh
                        </button>
                    )}
                </div>
            </header>

            <div className="asc-chat-body" ref={scrollRef}>
                {loading ? (
                    <p className="asc-chat-empty">Loading comments…</p>
                ) : messages.length === 0 ? (
                    <p className="asc-chat-empty">No comments on this spread yet.</p>
                ) : (
                    <ul className="asc-chat-list">
                        {messages.map((msg) => {
                            const isMine =
                                (isPhotographer && msg.author_type === 'photographer') ||
                                (!isPhotographer && msg.author_type === 'client');
                            return (
                                <li
                                    key={msg.id}
                                    className={`asc-chat-bubble-wrap asc-chat-bubble-wrap--${
                                        isMine ? 'mine' : 'theirs'
                                    }`}
                                >
                                    <div
                                        className={`asc-chat-bubble asc-chat-bubble--${
                                            isMine ? 'mine' : 'theirs'
                                        }`}
                                    >
                                        <div className="asc-chat-bubble-head">
                                            <span className="asc-chat-bubble-author">{msg.author_name}</span>
                                            {canDelete?.(msg) && onDelete && (
                                                <button
                                                    type="button"
                                                    className="asc-chat-delete"
                                                    disabled={deleteBusyId === msg.id}
                                                    onClick={() => onDelete(msg)}
                                                    aria-label={`Delete comment from ${msg.author_name}`}
                                                >
                                                    {deleteBusyId === msg.id ? '…' : 'Delete'}
                                                </button>
                                            )}
                                        </div>
                                        <p className="asc-chat-bubble-text">{msg.body}</p>
                                        <time className="asc-chat-bubble-time" dateTime={msg.created_at}>
                                            {formatMessageTime(msg.created_at)}
                                        </time>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {canCompose && (
                <footer className="asc-chat-composer">
                    <form className="asc-chat-composer-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className="asc-chat-composer-input"
                            placeholder={placeholder}
                            value={composerValue}
                            onChange={(e) => onComposerChange?.(e.target.value)}
                            disabled={composerBusy}
                            aria-label="Comment input"
                        />
                        <button
                            type="submit"
                            className="asc-chat-composer-send"
                            disabled={composerBusy || !composerValue.trim()}
                        >
                            {composerBusy ? '…' : 'Send'}
                        </button>
                    </form>
                    {!isPhotographer && guestName && (
                        <p className="asc-chat-composer-hint">Commenting as {guestName}</p>
                    )}
                </footer>
            )}
        </div>
    );
}
