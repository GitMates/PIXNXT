import React, { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
    COVER_COLOR_CHANGED_EVENT,
    COVER_LEATHER_PRESETS,
    getAlbumCoverColor,
    setAlbumCoverColor,
} from './albumCoverColor';
import { getCoverLeatherSurfaceStyle } from './coverLeatherSurface';
import './CoverLeatherColorPicker.css';

export default function CoverLeatherColorPicker({ albumId }) {
    const [selectedId, setSelectedId] = useState(() => getAlbumCoverColor(albumId));

    useEffect(() => {
        setSelectedId(getAlbumCoverColor(albumId));
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) {
                setSelectedId(getAlbumCoverColor(albumId));
            }
        };
        window.addEventListener(COVER_COLOR_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(COVER_COLOR_CHANGED_EVENT, onChanged);
    }, [albumId]);

    const handleSelect = useCallback(
        (presetId) => {
            if (!albumId) return;
            setAlbumCoverColor(albumId, presetId);
            setSelectedId(presetId);
        },
        [albumId]
    );

    if (!albumId) return null;

    return (
        <div className="ae-cover-color">
            <div className="ae-cover-color-header">
                <span className="ae-cover-color-title">Cover color</span>
            </div>
            <p className="ae-cover-color-hint">
                Leather finish for blank covers — back, spine, and front.
            </p>
            <div className="ae-cover-color-swatches" role="listbox" aria-label="Cover leather color">
                {COVER_LEATHER_PRESETS.map((preset) => {
                    const isSelected = preset.id === selectedId;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            aria-label={preset.label}
                            title={preset.label}
                            className={`ae-cover-color-swatch ab-cover-leather-canvas${
                                isSelected ? ' ae-cover-color-swatch--selected' : ''
                            }`}
                            style={getCoverLeatherSurfaceStyle(preset.id, { aspect: 1 })}
                            onClick={() => handleSelect(preset.id)}
                        >
                            {isSelected ? (
                                <span className="ae-cover-color-swatch-check" aria-hidden>
                                    <Check size={14} strokeWidth={2.5} />
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
