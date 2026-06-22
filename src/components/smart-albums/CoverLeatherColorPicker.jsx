import React, { useCallback, useEffect, useState } from 'react';
import {
    COVER_COLOR_CHANGED_EVENT,
    COVER_LEATHER_PRESETS,
    getAlbumCoverColor,
    getCoverLeatherCssVars,
    setAlbumCoverColor,
} from './albumCoverColor';
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
                            className={`ae-cover-color-swatch ab-cover-leather${
                                isSelected ? ' ae-cover-color-swatch--selected' : ''
                            }`}
                            style={getCoverLeatherCssVars(preset.id)}
                            onClick={() => handleSelect(preset.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
