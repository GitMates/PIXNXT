import React from 'react';
import { X } from 'lucide-react';
import AlbumEditorSettingsPanel from './AlbumEditorSettingsPanel';
import './AlbumEditorSettings.css';

export default function AlbumSettingsSheet({
    isOpen,
    onClose,
    album,
    photographerId,
    onSaved,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[1400] bg-black/20 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div className="fixed right-0 top-0 z-[1500] flex h-screen w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-[#e8e4dc] px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[#222]">Album Settings</h2>
                        <p className="mt-0.5 text-xs text-[#888]">{album?.name || 'Album'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-8 items-center justify-center rounded-full text-[#222] hover:bg-[#f3f4f6]"
                        aria-label="Close settings"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                <div className="min-h-0 flex-1">
                    <AlbumEditorSettingsPanel
                        album={album}
                        photographerId={photographerId}
                        onAlbumUpdated={(updated) => {
                            onSaved?.(updated);
                        }}
                    />
                </div>
            </div>
        </>
    );
}
