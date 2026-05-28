import React, { useState } from 'react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import './AlbumSpreadComments.css';

function SettingsSwitch({ id, checked, disabled, busy, onChange, label }) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            className={`asc-switch${checked ? ' asc-switch--on' : ''}${busy ? ' asc-switch--busy' : ''}`}
            disabled={disabled || busy}
            onClick={onChange}
        >
            <span className="asc-switch-handle" aria-hidden />
        </button>
    );
}

export default function AlbumCommentSettings({ album, photographerId, onUpdated }) {
    const commentsOn = album?.comments_enabled !== false;
    const published = album?.status === 'published';
    const [commentsBusy, setCommentsBusy] = useState(false);
    const [publishBusy, setPublishBusy] = useState(false);

    const handleCommentsToggle = async () => {
        if (!photographerId || !album?.id || commentsBusy) return;
        const next = !commentsOn;
        setCommentsBusy(true);
        try {
            const updated = await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                album.id,
                { comments_enabled: next }
            );
            onUpdated?.(updated);
        } catch (e) {
            console.error(e);
            alert('Could not update comment settings.');
        } finally {
            setCommentsBusy(false);
        }
    };

    const handlePublishToggle = async () => {
        if (!photographerId || !album?.id || publishBusy) return;
        const next = !published;
        const status = next ? 'published' : 'draft';
        setPublishBusy(true);
        try {
            const updated = await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                album.id,
                { status }
            );
            onUpdated?.(updated);
        } catch (e) {
            console.error(e);
            alert('Could not update publish status. Run the latest database migration if needed.');
        } finally {
            setPublishBusy(false);
        }
    };

    return (
        <div className="asc-settings asc-settings--panel">
            <p className="asc-settings-note asc-settings-note--lead">
                Control client proofing on the shared preview link. Comments are saved per spread.
            </p>

            <div className="asc-settings-row">
                <div className="asc-settings-row-main">
                    <span className="asc-settings-row-label">Allow comments</span>
                    <span className="asc-settings-row-desc">
                        Clients can leave feedback on each spread in the preview
                    </span>
                </div>
                <div className="asc-settings-row-control">
                    <span
                        className={`asc-settings-status${commentsOn ? ' asc-settings-status--on' : ''}`}
                    >
                        {commentsBusy ? '…' : commentsOn ? 'On' : 'Off'}
                    </span>
                    <SettingsSwitch
                        id="asc-comments-enabled"
                        checked={commentsOn}
                        busy={commentsBusy}
                        disabled={!photographerId}
                        onChange={handleCommentsToggle}
                        label="Allow comments on album preview"
                    />
                </div>
            </div>

            <div className="asc-settings-row">
                <div className="asc-settings-row-main">
                    <span className="asc-settings-row-label">Publish for clients</span>
                    <span className="asc-settings-row-desc">
                        {published
                            ? 'Share link is live — clients can open the album preview'
                            : 'Share link is off until you publish'}
                    </span>
                </div>
                <div className="asc-settings-row-control">
                    <span
                        className={`asc-settings-status${published ? ' asc-settings-status--on' : ''}`}
                    >
                        {publishBusy ? '…' : published ? 'On' : 'Off'}
                    </span>
                    <SettingsSwitch
                        id="asc-publish-album"
                        checked={published}
                        busy={publishBusy}
                        disabled={!photographerId}
                        onChange={handlePublishToggle}
                        label="Publish album for clients"
                    />
                </div>
            </div>

            {published && !commentsOn && (
                <p className="asc-settings-hint">
                    Album is published, but comments are off. Clients can view spreads but cannot
                    add feedback.
                </p>
            )}
        </div>
    );
}
