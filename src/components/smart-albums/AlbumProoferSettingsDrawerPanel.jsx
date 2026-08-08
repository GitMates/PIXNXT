import React from 'react';
import { Eye, Edit2, Copy, Trash2, Link } from 'lucide-react';
import './AlbumProoferSettingsDrawer.css';

export default function AlbumProoferSettingsDrawerPanel({
    onPreview,
    onQuickEdit,
    onDuplicate,
    onDelete,
    onGetDirectLink,
}) {
    return (
        <div className="sa-album-settings-drawer__panel">
            <div className="sa-album-settings-drawer__scroll sa-album-settings-drawer__scroll--actions-only">
                <section className="sa-album-settings-drawer__section sa-album-settings-drawer__section--actions-only">
                    <div className="sa-album-settings-drawer__actions-list">
                        <button
                            type="button"
                            className="sa-album-settings-drawer__action-btn"
                            onClick={onPreview}
                        >
                            <Eye size={16} /> Preview Album
                        </button>
                        <button
                            type="button"
                            className="sa-album-settings-drawer__action-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onQuickEdit?.();
                            }}
                        >
                            <Edit2 size={16} /> Quick Edit Details
                        </button>
                        <button
                            type="button"
                            className="sa-album-settings-drawer__action-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDuplicate?.();
                            }}
                        >
                            <Copy size={16} /> Duplicate Album
                        </button>
                        <button
                            type="button"
                            className="sa-album-settings-drawer__action-btn"
                            onClick={onGetDirectLink}
                        >
                            <Link size={16} /> Get Direct Link
                        </button>
                        <button
                            type="button"
                            className="sa-album-settings-drawer__action-btn sa-album-settings-drawer__action-btn--danger"
                            onClick={onDelete}
                        >
                            <Trash2 size={16} /> Delete Album
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
