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
    (threads || []).forEach(({ root, replies }) => {
        if (hasCommentBody(root)) {
            items.push({ ...root, messageKind: 'comment' });
        }
        (replies || []).forEach((reply) => {
            if (hasCommentBody(reply)) {
                items.push({ ...reply, messageKind: 'reply' });
            }
        });
    });
    return items.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export default function AlbumMessageChat({
    threads = [],
    loading = false,
    spreadLabel = 'Spread',
    repliesEnabled = true,
    canCompose = false,
    canReply = false,
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
    replyToId = null,
    onReplyTo,
    onCancelReply,
}) {
    const scrollRef = useRef(null);
    const messages = useMemo(() => flattenThreadMessages(threads), [threads]);
    const replyTarget = replyToId
        ? threads.find((t) => t.root.id === replyToId)?.root
        : null;

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages.length, composerValue, replyToId]);

    const placeholder =
        composerPlaceholder ||
        (replyTarget
            ? `Reply to ${replyTarget.author_name}…`
            : canCompose
              ? 'Write a message…'
              : 'Messages');

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
                    <p className="asc-chat-empty">Loading messages…</p>
                ) : messages.length === 0 ? (
                    <p className="asc-chat-empty">No messages on this spread yet. Start the conversation below.</p>
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
                                        <span className="asc-chat-bubble-author">{msg.author_name}</span>
                                        <p className="asc-chat-bubble-text">{msg.body}</p>
                                        <time className="asc-chat-bubble-time" dateTime={msg.created_at}>
                                            {msg.messageKind === 'reply' ? 'Reply · ' : ''}
                                            {formatMessageTime(msg.created_at)}
                                        </time>
                                    </div>
                                    {canReply &&
                                        repliesEnabled &&
                                        msg.messageKind === 'comment' &&
                                        !isMine && (
                                            <button
                                                type="button"
                                                className="asc-chat-reply-link"
                                                onClick={() => onReplyTo?.(msg.id)}
                                            >
                                                Reply
                                            </button>
                                        )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {(canCompose || (canReply && repliesEnabled)) && (
                <footer className="asc-chat-composer">
                    {replyTarget && (
                        <div className="asc-chat-replying">
                            <span>
                                Replying to <strong>{replyTarget.author_name}</strong>
                            </span>
                            <button type="button" className="asc-chat-replying-cancel" onClick={onCancelReply}>
                                ×
                            </button>
                        </div>
                    )}
                    <form className="asc-chat-composer-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className="asc-chat-composer-input"
                            placeholder={placeholder}
                            value={composerValue}
                            onChange={(e) => onComposerChange?.(e.target.value)}
                            disabled={composerBusy}
                            aria-label="Message input"
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
                        <p className="asc-chat-composer-hint">Sending as {guestName}</p>
                    )}
                </footer>
            )}
        </div>
    );
}
