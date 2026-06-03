import React, { useState } from 'react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { formatAlbumGridSizeDisplay, formatGridLayoutLabel } from './albumGridSize';
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
    const swapsOn = album?.messages_enabled !== false;
    const published = album?.status === 'published';
    const [commentsBusy, setCommentsBusy] = useState(false);
    const [swapsBusy, setSwapsBusy] = useState(false);
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

    const handleSwapsToggle = async () => {
        if (!photographerId || !album?.id || swapsBusy) return;
        const next = !swapsOn;
        setSwapsBusy(true);
        try {
            const updated = await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                album.id,
                { messages_enabled: next }
            );
            onUpdated?.(updated);
        } catch (e) {
            console.error(e);
            alert('Could not update swap settings.');
        } finally {
            setSwapsBusy(false);
        }
    };

    return (
        <div className="asc-settings asc-settings--panel">
            <div className="asc-settings-layout">
                <div className="asc-settings-row asc-settings-row--info asc-settings-row--grid-size">
                    <div className="asc-settings-row-main">
                        <span className="asc-settings-row-label">Grid size</span>
                        <span className="asc-settings-row-desc">
                            Detected from all uploaded images and PDF pages when the album was
                            created
                        </span>
                    </div>
                    <span className="asc-settings-value">{formatAlbumGridSizeDisplay(album)}</span>
                </div>
                <div className="asc-settings-row asc-settings-row--info">
                    <div className="asc-settings-row-main">
                        <span className="asc-settings-row-label">Covers</span>
                        <span className="asc-settings-row-desc">Set when the album was created</span>
                    </div>
                    <span className="asc-settings-value">
                        {album?.has_covers === true ? 'Front & end cover' : 'No covers'}
                    </span>
                </div>
                <div className="asc-settings-row asc-settings-row--info">
                    <div className="asc-settings-row-main">
                        <span className="asc-settings-row-label">Grid layout</span>
                        <span className="asc-settings-row-desc">Locked at creation</span>
                    </div>
                    <span className="asc-settings-value">
                        {formatGridLayoutLabel(album?.grid_layout)}
                    </span>
                </div>
            </div>

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
                    <span className="asc-settings-row-label">Allow swaps</span>
                    <span className="asc-settings-row-desc">
                        Clients can place swap requests on photos in the preview
                    </span>
                </div>
                <div className="asc-settings-row-control">
                    <span
                        className={`asc-settings-status${swapsOn ? ' asc-settings-status--on' : ''}`}
                    >
                        {swapsBusy ? '…' : swapsOn ? 'On' : 'Off'}
                    </span>
                    <SettingsSwitch
                        id="asc-swaps-enabled"
                        checked={swapsOn}
                        busy={swapsBusy}
                        disabled={!photographerId}
                        onChange={handleSwapsToggle}
                        label="Allow swap requests on album preview"
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
            {published && !swapsOn && (
                <p className="asc-settings-hint">
                    Swap requests are off. Clients can view spreads but cannot create swaps.
                </p>
            )}
        </div>
    );
}
