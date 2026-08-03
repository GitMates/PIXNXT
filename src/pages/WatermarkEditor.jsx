import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';
import { storageService } from '../services/storage.service';
import { galleryService } from '../services/gallery.service';
import './WatermarkEditor.css';

// ── Font options ──────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
    { value: 'Times New Roman', label: 'Times Roman' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Garamond', label: 'Garamond' },
    { value: 'Palatino Linotype', label: 'Palatino' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Lucida Console', label: 'Lucida Console' },
    { value: 'Brush Script MT', label: 'Brush Script' },
    { value: 'Comic Sans MS', label: 'Comic Sans' },
];

// ── Position grid layout ──────────────────────────────────────────────────────
const POSITIONS = [
    'top_left', 'top_center', 'top_right',
    'center_left', 'center', 'center_right',
    'bottom_left', 'bottom_center', 'bottom_right',
];

const WatermarkEditor = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const imageInputRef = useRef(null);

    // ── State ─────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileId, setProfileId] = useState(null);

    const [name, setName] = useState('My Watermark 1');
    const [type, setType] = useState('text');        // 'text' | 'image'
    const [text, setText] = useState('Text Watermark');
    const [font, setFont] = useState('Times New Roman');
    const [color, setColor] = useState('#ffffff');    // '#ffffff' | '#000000'
    const [scale, setScale] = useState(70);
    const [opacity, setOpacity] = useState(90);
    const [position, setPosition] = useState('center');
    const [imageUrl, setImageUrl] = useState(null);
    const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'

    // ── Load existing watermark settings ──────────────────────────────────────
    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) return;
            try {
                // Get photographer ID
                const { data, error } = await supabase
                    .from('photographers')
                    .select('id')
                    .eq('id', user.id)
                    .single();
                if (error) throw error;
                if (data) {
                    setProfileId(data.id);
                }

                if (id) {
                    const watermarkData = await galleryService.getWatermark(id);
                    if (watermarkData) {
                        setName(watermarkData.name || 'My Watermark 1');
                        setType(watermarkData.type || 'text');
                        setText(watermarkData.text || '');
                        setFont(watermarkData.font || 'Times New Roman');
                        setColor(watermarkData.color || '#ffffff');
                        setScale(watermarkData.scale != null ? watermarkData.scale : 50);
                        setOpacity(watermarkData.opacity != null ? watermarkData.opacity : 50);
                        setPosition(watermarkData.position || 'center');
                        setImageUrl(watermarkData.url || null);
                    }
                } else if (data?.id) {
                    // Creating new watermark: determine a unique default name
                    const existingWatermarks = await galleryService.getWatermarks(data.id);
                    let count = 1;
                    let newName = `My Watermark ${count}`;
                    const existingNames = existingWatermarks.map(w => w.name);
                    while (existingNames.includes(newName)) {
                        count++;
                        newName = `My Watermark ${count}`;
                    }
                    setName(newName);
                }
            } catch (e) {
                console.error('Error loading watermark settings:', e);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [user?.id, id]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!profileId) return;
        try {
            setSaving(true);
            const updates = {
                name: name,
                type: type,
                text: text,
                font: font,
                color: color,
                scale: Number(scale),
                opacity: Number(opacity),
                position: position,
                url: type === 'image' ? imageUrl : null
            };
            
            if (id) {
                await galleryService.updateWatermark(id, updates);
            } else {
                await galleryService.createWatermark({
                    photographer_id: profileId,
                    ...updates
                });
            }
            navigate('/settings/watermark');
        } catch (e) {
            console.error('Error saving watermark:', e);
            alert(`Failed to save: ${e.message}`);
        } finally {
            setSaving(false);
        }
    }, [profileId, id, name, type, text, font, color, scale, opacity, position, imageUrl, navigate]);

    // ── Image Upload ──────────────────────────────────────────────────────────
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !profileId) return;
        try {
            setUploading(true);
            const path = `photographers/${profileId}/watermarks/watermark_${Date.now()}_${file.name}`;
            const result = await storageService.upload(path, file);
            setImageUrl(result.url);
        } catch (err) {
            console.error('Error uploading watermark image:', err);
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleImageRemove = () => {
        setImageUrl(null);
    };

    // ── Computed preview font size ────────────────────────────────────────────
    const previewFontSize = Math.max(12, Math.round((scale / 100) * 72));

    if (loading) {
        return (
            <div className="wm-editor">
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="wm-editor">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="wm-header">
                <div className="wm-header-left">
                    <button
                        className="wm-close-btn"
                        onClick={() => navigate('/settings/watermark')}
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <input
                        className="wm-title-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Watermark name"
                    />
                </div>
                <button
                    className="wm-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* ── Body ───────────────────────────────────────── */}
            <div className="wm-body">

                {/* ── Left Sidebar ────────────────────────────── */}
                <div className="wm-sidebar">
                    <div>
                        <h3 className="wm-sidebar-title">Settings</h3>
                        <p className="wm-sidebar-help">
                            Watermarks are stripped from anything sent to the print lab, so ordered prints stay clean. Any watermark changes will only apply to photos uploaded moving forward.
                        </p>
                    </div>

                    {/* Watermark Type Toggle */}
                    <div className="wm-field">
                        <label className="wm-field-label">Watermark Type</label>
                        <div className="wm-type-toggle">
                            <button
                                className={`wm-type-btn ${type === 'text' ? 'active' : ''}`}
                                onClick={() => setType('text')}
                            >
                                Text
                            </button>
                            <button
                                className={`wm-type-btn ${type === 'image' ? 'active' : ''}`}
                                onClick={() => setType('image')}
                            >
                                Image
                            </button>
                        </div>
                    </div>

                    {/* ── TEXT Controls ────────────────────────── */}
                    {type === 'text' && (
                        <>
                            {/* Watermark Text */}
                            <div className="wm-field">
                                <label className="wm-field-label">Watermark Text</label>
                                <input
                                    className="wm-text-input"
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Enter watermark text"
                                />
                            </div>

                            {/* Font Style */}
                            <div className="wm-field">
                                <label className="wm-field-label">Font Style</label>
                                <select
                                    className="wm-font-select"
                                    value={font}
                                    onChange={(e) => setFont(e.target.value)}
                                    style={{ fontFamily: font }}
                                >
                                    {FONT_OPTIONS.map((f) => (
                                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Font Color */}
                            <div className="wm-field">
                                <label className="wm-field-label">Font Color</label>
                                <div className="wm-color-swatches">
                                    <button
                                        className={`wm-color-swatch white ${color === '#ffffff' ? 'active' : ''}`}
                                        onClick={() => setColor('#ffffff')}
                                        title="White"
                                    />
                                    <button
                                        className={`wm-color-swatch black ${color === '#000000' ? 'active' : ''}`}
                                        onClick={() => setColor('#000000')}
                                        title="Black"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── IMAGE Controls ───────────────────────── */}
                    {type === 'image' && (
                        <div className="wm-field">
                            <div
                                className="wm-image-upload"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <span style={{ fontSize: '11px', color: '#888' }}>Uploading...</span>
                                ) : imageUrl ? (
                                    <img src={imageUrl} alt="Watermark" />
                                ) : (
                                    <svg className="wm-image-upload-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                )}
                            </div>
                            {imageUrl && (
                                <button className="wm-remove-btn" onClick={handleImageRemove}>
                                    Remove
                                </button>
                            )}
                            <input
                                type="file"
                                ref={imageInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}

                    {/* ── Scale Slider ─────────────────────────── */}
                    <div className="wm-field">
                        <label className="wm-field-label">Scale</label>
                        <div className="wm-slider-row">
                            <input
                                type="range"
                                className="wm-slider"
                                min="10"
                                max="100"
                                value={scale}
                                onChange={(e) => setScale(Number(e.target.value))}
                                style={{
                                    background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${((scale - 10) / 90) * 100}%, #e0e0e0 ${((scale - 10) / 90) * 100}%, #e0e0e0 100%)`
                                }}
                            />
                            <span className="wm-slider-value">{scale}%</span>
                        </div>
                    </div>

                    {/* ── Opacity Slider ────────────────────────── */}
                    <div className="wm-field">
                        <label className="wm-field-label">Opacity</label>
                        <div className="wm-slider-row">
                            <input
                                type="range"
                                className="wm-slider"
                                min="10"
                                max="100"
                                value={opacity}
                                onChange={(e) => setOpacity(Number(e.target.value))}
                                style={{
                                    background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${((opacity - 10) / 90) * 100}%, #e0e0e0 ${((opacity - 10) / 90) * 100}%, #e0e0e0 100%)`
                                }}
                            />
                            <span className="wm-slider-value">{opacity}%</span>
                        </div>
                    </div>

                    {/* ── Position Grid ─────────────────────────── */}
                    <div className="wm-field">
                        <label className="wm-field-label">Position</label>
                        <div className="wm-position-grid">
                            {POSITIONS.map((pos) => (
                                <button
                                    key={pos}
                                    className={`wm-position-dot ${position === pos ? 'active' : ''}`}
                                    onClick={() => setPosition(pos)}
                                    title={pos.replace(/_/g, ' ')}
                                >
                                    <div className="wm-position-dot-inner" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right Preview Panel ─────────────────────── */}
                <div className="wm-preview-panel">
                    <div className={`wm-preview-container ${previewMode === 'mobile' ? 'mobile' : ''}`}>
                        <img
                            className="wm-preview-img"
                            src="/watermark-preview.jpg"
                            alt="Preview"
                        />
                        <div className={`wm-preview-overlay pos-${position}`}>
                            {type === 'text' && text && (
                                <span
                                    className="wm-preview-text"
                                    style={{
                                        fontFamily: font,
                                        fontSize: `${previewFontSize}px`,
                                        color: color,
                                        opacity: opacity / 100,
                                    }}
                                >
                                    {text}
                                </span>
                            )}
                            {type === 'image' && imageUrl && (
                                <img
                                    className="wm-preview-watermark-img"
                                    src={imageUrl}
                                    alt="Watermark"
                                    style={{
                                        opacity: opacity / 100,
                                        width: `${scale}%`,
                                        height: `${scale}%`,
                                        objectFit: 'contain'
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Desktop / Mobile toggle */}
                    <div className="wm-preview-mode-toggle">
                        <button
                            className={`wm-mode-btn ${previewMode === 'desktop' ? 'active' : ''}`}
                            onClick={() => setPreviewMode('desktop')}
                            title="Desktop preview"
                        >
                            {/* Monitor icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        </button>
                        <button
                            className={`wm-mode-btn ${previewMode === 'mobile' ? 'active' : ''}`}
                            onClick={() => setPreviewMode('mobile')}
                            title="Mobile preview"
                        >
                            {/* Phone icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatermarkEditor;
