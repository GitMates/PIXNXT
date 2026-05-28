import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import './SmartAlbums.css';

const SPREAD_OPTIONS = [3, 4, 5, 6, 8, 11, 16, 21];

const GRID_SIZE_OPTIONS = [
    { value: 'square', label: 'Square pages (1:1)' },
    { value: 'portrait', label: 'Portrait pages (4:5)' },
    { value: 'landscape', label: 'Landscape pages (5:4)' },
    { value: 'wide', label: 'Wide pages (16:9)' },
];

const GRID_LAYOUT_OPTIONS = [
    { value: 'two-page', label: 'Two-page grid (left + right)' },
    { value: 'whole-spread', label: 'Whole-spread photo' },
];

const SmartAlbumsSettings = () => {
    const { user } = useAuth();
    const [spreads, setSpreads] = useState(11);
    const [gridSize, setGridSize] = useState('square');
    const [gridLayout, setGridLayout] = useState('two-page');
    const [savedLabel, setSavedLabel] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        const prefs = smartAlbumsService.getPreferences(user.id);
        setSpreads(Number(prefs.default_spreads) || 11);
        setGridSize(prefs.default_grid_size || 'square');
        setGridLayout(prefs.default_grid_layout || 'two-page');
    }, [user?.id]);

    const handleSave = () => {
        if (!user?.id) return;
        smartAlbumsService.savePreferences(user.id, {
            default_spreads: spreads,
            default_grid_size: gridSize,
            default_grid_layout: gridLayout,
        });
        setSavedLabel('Saved');
        window.setTimeout(() => setSavedLabel(''), 1800);
    };

    const handleReset = () => {
        if (!user?.id) return;
        const prefs = smartAlbumsService.resetPreferences(user.id);
        setSpreads(Number(prefs.default_spreads) || 11);
        setGridSize(prefs.default_grid_size || 'square');
        setGridLayout(prefs.default_grid_layout || 'two-page');
        setSavedLabel('Reset to defaults');
        window.setTimeout(() => setSavedLabel(''), 1800);
    };

    return (
        <main className="sa-main">
            <header className="sa-header">
                <h1 className="sa-title">Settings</h1>
            </header>
            <div className="sa-settings-content">
                <h2>Smart Albums preferences</h2>
                <p>Choose the default options used when you create a new smart album.</p>

                <div className="sa-settings-grid">
                    <label className="sa-setting-field">
                        <span>Default spread count</span>
                        <select
                            value={spreads}
                            onChange={(e) => setSpreads(Number(e.target.value))}
                        >
                            {SPREAD_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n} spreads
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="sa-setting-field">
                        <span>Default page size</span>
                        <select
                            value={gridSize}
                            onChange={(e) => setGridSize(e.target.value)}
                        >
                            {GRID_SIZE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="sa-setting-field">
                        <span>Default layout</span>
                        <select
                            value={gridLayout}
                            onChange={(e) => setGridLayout(e.target.value)}
                        >
                            {GRID_LAYOUT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="sa-settings-actions">
                    <button type="button" className="sa-btn-primary" onClick={handleSave}>
                        Save preferences
                    </button>
                    <button
                        type="button"
                        className="sa-btn-secondary"
                        onClick={handleReset}
                    >
                        Reset defaults
                    </button>
                    {savedLabel && <span className="sa-settings-saved">{savedLabel}</span>}
                </div>
            </div>
        </main>
    );
};

export default SmartAlbumsSettings;
