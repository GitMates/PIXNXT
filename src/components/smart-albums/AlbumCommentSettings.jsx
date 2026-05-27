import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { smartAlbumCommentsService } from '../../services/smartAlbumComments.service';
import './AlbumSpreadComments.css';

export default function AlbumCommentSettings({ album, photographerId, onUpdated }) {
    const [enabled, setEnabled] = useState(album?.comments_enabled !== false);
    const [busy, setBusy] = useState(false);
    const [publishBusy, setPublishBusy] = useState(false);

    const handleToggle = async () => {
        if (!photographerId || !album?.id) return;
        const next = !enabled;
        setBusy(true);
        try {
            await smartAlbumCommentsService.setCommentsEnabled(photographerId, album.id, next);
            setEnabled(next);
            onUpdated?.({ comments_enabled: next });
        } catch (e) {
            console.error(e);
            alert('Could not update comment settings.');
        } finally {
            setBusy(false);
        }
    };

    const handlePublish = async () => {
        if (!photographerId || !album?.id) return;
        setPublishBusy(true);
        try {
            const { error } = await supabase
                .from('smart_albums')
                .update({ status: 'published', updated_at: new Date().toISOString() })
                .eq('id', album.id);
            if (error) throw error;
            onUpdated?.({ status: 'published' });
        } catch (e) {
            console.error(e);
            alert('Could not publish album. Run the latest database migration if this is a new feature.');
        } finally {
            setPublishBusy(false);
        }
    };

    return (
        <section className="asc-settings">
            <h3 className="asc-settings-title">Comment settings</h3>
            <p className="asc-settings-note">
                Control client proofing feedback on the album preview. Comments are saved per spread.
            </p>
            <label className="asc-settings-toggle">
                <input
                    type="checkbox"
                    checked={enabled}
                    disabled={busy}
                    onChange={handleToggle}
                />
                <span>Allow comments on album preview</span>
            </label>
            {album?.status !== 'published' && (
                <div className="asc-settings-publish">
                    <p className="asc-settings-note">
                        Publish the album so clients can view the preview link and leave comments.
                    </p>
                    <button
                        type="button"
                        className="asc-btn asc-btn--primary"
                        disabled={publishBusy}
                        onClick={handlePublish}
                    >
                        {publishBusy ? 'Publishing…' : 'Publish album for clients'}
                    </button>
                </div>
            )}
        </section>
    );
}
