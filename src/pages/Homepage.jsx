import React, { useState, useEffect, useCallback } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import './Homepage.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const buildHomepageUrl = (profile, user) => {
    let slug = profile?.homepage_slug || profile?.username;
    if (!slug) {
        slug = user?.email ? user.email.split('@')[0] : 'poojz';
    }
    return `https://${slug.toLowerCase()}.pixnxt.com`;
};

const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

// ─── Component ───────────────────────────────────────────────────────────────

const Homepage = () => {
    const { user } = useAuth();

    // Remote data
    const [profile, setProfile] = useState(null);
    const [collections, setCollections] = useState([]);
    const [profileLoading, setProfileLoading] = useState(true);
    const [collectionsLoading, setCollectionsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [copyDone, setCopyDone] = useState(false);
    const [pwCopyDone, setPwCopyDone] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);

    // Editable fields (controlled inputs, seeded from DB)
    const [statusOn, setStatusOn] = useState(true);
    const [bio, setBio] = useState('');
    const [password, setPassword] = useState('');
    const [collectionSort, setCollectionSort] = useState('created-new');

    // Homepage info checkboxes (which fields to display publicly)
    const [showBio, setShowBio] = useState(true);
    const [showSocial, setShowSocial] = useState(true);
    const [showWebsite, setShowWebsite] = useState(false);
    const [showEmail, setShowEmail] = useState(true);
    const [showPhone, setShowPhone] = useState(true);
    const [showAddress, setShowAddress] = useState(true);

    // ── Fetch profile ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) {
            setProfileLoading(false); // stop spinner if no user
            return;
        }
        setProfileLoading(true);
        galleryService.getPhotographerProfile(user.id)
            .then((data) => {
                setProfile(data);
                // Seed editable fields from DB
                setStatusOn(data?.homepage_enabled ?? true);
                setBio(data?.bio || '');
                setPassword(data?.homepage_password || '');
                setCollectionSort(data?.homepage_sort || 'created-new');
                setShowBio(data?.show_bio ?? true);
                setShowSocial(data?.show_social ?? true);
                setShowWebsite(data?.show_website ?? false);
                setShowEmail(data?.show_email ?? true);
                setShowPhone(data?.show_phone ?? true);
                setShowAddress(data?.show_address ?? true);
            })
            .catch((err) => {
                console.error('Failed to load photographer profile:', err);
                setError('Could not load your profile. Please refresh.');
            })
            .finally(() => setProfileLoading(false));
    }, [user?.id]);

    // ── Fetch collections ────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;
        setCollectionsLoading(true);
        galleryService.getCollections(user.id)
            .then((data) => setCollections(data || []))
            .catch((err) => console.error('Failed to load collections:', err))
            .finally(() => setCollectionsLoading(false));
    }, [user?.id]);

    // ── Sorted preview collections ───────────────────────────────────────────
    const previewCollections = React.useMemo(() => {
        const published = collections.filter((c) => c.status === 'published' && c.show_on_homepage !== false);
        const sorted = [...published].sort((a, b) => {
            if (collectionSort === 'created-new') return new Date(b.created_at) - new Date(a.created_at);
            if (collectionSort === 'created-old') return new Date(a.created_at) - new Date(b.created_at);
            if (collectionSort === 'event-new') return new Date(b.event_date || 0) - new Date(a.event_date || 0);
            if (collectionSort === 'event-old') return new Date(a.event_date || 0) - new Date(b.event_date || 0);
            if (collectionSort === 'name-az') return (a.name || '').localeCompare(b.name || '');
            if (collectionSort === 'name-za') return (b.name || '').localeCompare(a.name || '');
            return 0;
        });
        return sorted.slice(0, 6);
    }, [collections, collectionSort]);

    // Refs to store the absolute latest state values to avoid stale closures in debounced saves
    const stateRef = React.useRef({});
    stateRef.current = {
        statusOn,
        bio,
        password,
        collectionSort,
        showBio,
        showSocial,
        showWebsite,
        showEmail,
        showPhone,
        showAddress
    };

    const saveTimeoutRef = React.useRef(null);

    const performSave = async (overrides = {}) => {
        if (!user?.id) return;
        setSaving(true);
        setError(null);
        try {
            const current = stateRef.current;
            const updates = {
                homepage_enabled: overrides.hasOwnProperty('homepage_enabled') ? overrides.homepage_enabled : current.statusOn,
                bio: overrides.hasOwnProperty('bio') ? overrides.bio : current.bio,
                homepage_password: overrides.hasOwnProperty('homepage_password') ? overrides.homepage_password : current.password,
                homepage_sort: overrides.hasOwnProperty('homepage_sort') ? overrides.homepage_sort : current.collectionSort,
                show_bio: overrides.hasOwnProperty('show_bio') ? overrides.show_bio : current.showBio,
                show_social: overrides.hasOwnProperty('show_social') ? overrides.show_social : current.showSocial,
                show_website: overrides.hasOwnProperty('show_website') ? overrides.show_website : current.showWebsite,
                show_email: overrides.hasOwnProperty('show_email') ? overrides.show_email : current.showEmail,
                show_phone: overrides.hasOwnProperty('show_phone') ? overrides.show_phone : current.showPhone,
                show_address: overrides.hasOwnProperty('show_address') ? overrides.show_address : current.showAddress,
            };

            // Normalize values
            if (typeof updates.bio === 'string') updates.bio = updates.bio.trim() || null;
            if (typeof updates.homepage_password === 'string') updates.homepage_password = updates.homepage_password.trim() || null;

            const updated = await galleryService.updatePhotographerProfile(user.id, updates);
            setProfile((prev) => ({ ...prev, ...updated }));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) {
            console.error('Failed to auto-save:', err);
            setError('Failed to auto-save changes.');
        } finally {
            setSaving(false);
        }
    };

    const autoSave = (overrides = {}, immediate = false) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        if (immediate) {
            performSave(overrides);
        } else {
            saveTimeoutRef.current = setTimeout(() => {
                performSave(overrides);
            }, 800);
        }
    };

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    // ── Generate password ────────────────────────────────────────────────────
    const generatePassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let pwd = '';
        for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
        setPassword(pwd);
        setShowPassword(true); // show generated password as plain text
        autoSave({ homepage_password: pwd }, true);
    };

    // ── Copy password ─────────────────────────────────────────────────────────
    const handleCopyPassword = () => {
        if (!password) return;
        navigator.clipboard.writeText(password).then(() => {
            setPwCopyDone(true);
            setTimeout(() => setPwCopyDone(false), 2000);
        });
    };

    // ── Clear password ────────────────────────────────────────────────────────
    const handleClearPassword = () => {
        setPassword('');
        setShowPassword(false);
        autoSave({ homepage_password: '' }, true);
    };

    // ── Copy URL ─────────────────────────────────────────────────────────────
    const handleCopyUrl = useCallback(() => {
        const url = buildHomepageUrl(profile, user);
        navigator.clipboard.writeText(url).then(() => {
            setCopyDone(true);
            setTimeout(() => setCopyDone(false), 2000);
        });
    }, [profile, user]);

    // ── View site ─────────────────────────────────────────────────────────────
    const handleViewSite = () => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let slug = profile?.homepage_slug || profile?.username || (user?.email ? user.email.split('@')[0] : 'poojz');
        const targetUrl = isLocal 
            ? `http://${slug.toLowerCase()}.localhost:5173` 
            : `https://${slug.toLowerCase()}.pixnxt.com`;
        window.open(targetUrl, '_blank');
    };

    // ── Derived display values ────────────────────────────────────────────────
    const photographerName = profile?.studio_name || profile?.full_name || profile?.name || user?.email?.split('@')[0]?.toUpperCase() || 'STUDIO';
    const displayEmail = profile?.contact_email || profile?.email || user?.email || '';
    const displayPhone = profile?.phone || '';
    const displayAddress = profile?.address || '';
    const displayWebsite = profile?.website || '';

    const homepageUrl = buildHomepageUrl(profile, user);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <SidebarLayout>
            <main className="hp-main">
                <header className="hp-header">
                    <h1 className="hp-title">Homepage</h1>
                    <div className="hp-header-actions">
                        <span className="hp-autosave-status">
                            {saving ? (
                                <span className="hp-status-saving">
                                    <div className="hp-spinner"></div>
                                    Saving...
                                </span>
                            ) : saveSuccess ? (
                                <span className="hp-status-saved">✓ Saved</span>
                            ) : null}
                        </span>
                        <button className="hp-view-btn" onClick={handleViewSite} disabled={profileLoading}>
                            View Site
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="hp-error-banner">{error}</div>
                )}

                {!user && (
                    <div className="hp-loading">
                        <span style={{ color: '#888', fontSize: 14 }}>Please log in to view and edit your homepage settings.</span>
                    </div>
                )}

                {profileLoading && user ? (
                    <div className="hp-loading">
                        <div className="hp-loading-spinner" />
                        <span>Loading your profile…</span>
                    </div>
                ) : user ? (
                    <div className="hp-content">
                        {/* ── LEFT COLUMN ── */}
                        <div className="hp-left-col">

                            {/* Homepage Status */}
                            <div className="hp-form-group">
                                <label className="hp-label">Homepage Status</label>
                                <div className="hp-toggle-row">
                                    <button
                                        className={`hp-toggle ${statusOn ? 'on' : 'off'}`}
                                        onClick={() => {
                                            const nextVal = !statusOn;
                                            setStatusOn(nextVal);
                                            autoSave({ homepage_enabled: nextVal }, true);
                                        }}
                                    >
                                        <div className="hp-toggle-handle"></div>
                                    </button>
                                    <span className="hp-toggle-label">{statusOn ? 'On' : 'Off'}</span>
                                </div>
                                <p className="hp-help-text">
                                    Your Homepage is a public page where your collections are listed. You can also select which collections will be shown here under each collection's setting. <a href="#learn">Learn more</a>
                                </p>
                            </div>

                            {/* Homepage URL */}
                            <div className="hp-form-group">
                                <label className="hp-label">Homepage URL</label>
                                <div className="hp-input-wrap">
                                    <div className="hp-input-read">{homepageUrl}</div>
                                    <button className="hp-input-action-btn" onClick={handleCopyUrl}>
                                        {copyDone ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        )}
                                        {copyDone ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            {/* Homepage Password */}
                            <div className="hp-form-group">
                                <label className="hp-label">Homepage Password</label>
                                <div className={`hp-input-wrap ${password ? 'hp-input-wrap--has-value' : ''}`}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="hp-input"
                                        placeholder="Add a password"
                                        value={password}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPassword(val);
                                            autoSave({ homepage_password: val }, false);
                                        }}
                                    />

                                    {password ? (
                                        /* Password exists: show eye-slash toggle + copy icon */
                                        <div className="hp-pw-actions">
                                            {/* Eye / Eye-slash toggle */}
                                            <button
                                                className="hp-pw-icon-btn"
                                                onClick={() => setShowPassword((v) => !v)}
                                                title={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? (
                                                    /* Password is VISIBLE → show crossed-eye (matches reference image 2) */
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                                    </svg>
                                                ) : (
                                                    /* Password is HIDDEN → show open eye (click to reveal) */
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                        <circle cx="12" cy="12" r="3"/>
                                                    </svg>
                                                )}
                                            </button>

                                            {/* Copy icon */}
                                            <button
                                                className={`hp-pw-icon-btn ${pwCopyDone ? 'hp-pw-icon-btn--done' : ''}`}
                                                onClick={handleCopyPassword}
                                                title="Copy password"
                                            >
                                                {pwCopyDone ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"/>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        /* No password: show teal Generate button */
                                        <button className="hp-pw-generate-btn" onClick={generatePassword} title="Generate a random password">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="23 4 23 10 17 10"/>
                                                <polyline points="1 20 1 14 7 14"/>
                                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                            </svg>
                                            Generate
                                        </button>
                                    )}
                                </div>
                                <p className={`hp-help-text ${password ? 'hp-help-text--active' : ''}`}>
                                    Protect your Homepage with a password
                                    {password && (
                                        <button className="hp-pw-clear-btn" onClick={handleClearPassword}>Remove</button>
                                    )}
                                </p>
                            </div>

                            {/* Biography */}
                            <div className="hp-form-group">
                                <label className="hp-label">Biography</label>
                                <div className="hp-textarea-wrap">
                                    <textarea
                                        className="hp-textarea"
                                        maxLength="500"
                                        placeholder="Tell your clients about yourself and your photography style…"
                                        value={bio}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setBio(val);
                                            autoSave({ bio: val }, false);
                                        }}
                                    ></textarea>
                                    <div className="hp-char-count">{bio.length} / 500</div>
                                </div>
                            </div>

                            {/* Homepage Info — which fields to show */}
                            <div className="hp-form-group">
                                <label className="hp-label">Homepage Info</label>
                                <div className="hp-info-banner">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a9b84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    <span>These values come from your <a href="/settings">Profile settings</a>. Tick the boxes to show them publicly.</span>
                                </div>

                                <div className="hp-checkbox-list">
                                    <CheckboxItem checked={showBio} onChange={(v) => { setShowBio(v); autoSave({ show_bio: v }, true); }} label="Biography" sublabel={bio ? `"${bio.slice(0, 40)}${bio.length > 40 ? '…' : ''}"` : 'No bio added yet'} />
                                    <CheckboxItem checked={showSocial} onChange={(v) => { setShowSocial(v); autoSave({ show_social: v }, true); }} label="Social Links" sublabel={profile?.social_links?.length ? 'Configured' : 'Not configured'} />
                                    <CheckboxItem checked={showWebsite} onChange={(v) => { setShowWebsite(v); autoSave({ show_website: v }, true); }} label="Website" sublabel={displayWebsite || 'Not set'} />
                                    <CheckboxItem checked={showEmail} onChange={(v) => { setShowEmail(v); autoSave({ show_email: v }, true); }} label="Contact Email" sublabel={displayEmail || 'Not set'} />
                                    <CheckboxItem checked={showPhone} onChange={(v) => { setShowPhone(v); autoSave({ show_phone: v }, true); }} label="Phone Number" sublabel={displayPhone || 'Not set'} />
                                    <CheckboxItem checked={showAddress} onChange={(v) => { setShowAddress(v); autoSave({ show_address: v }, true); }} label="Business Address" sublabel={displayAddress || 'Not set'} />
                                </div>

                                <p className="hp-help-text mt-2">
                                    To update any of the above details, please go to your <a href="/settings">profile</a>. Any information left blank will not appear on your homepage.
                                </p>
                            </div>

                            {/* Collection Sort Order */}
                            <div className="hp-form-group">
                                <label className="hp-label">Collection Sort Order</label>
                                <div className="set-select-wrap">
                                    <select
                                        className="set-select"
                                        value={collectionSort}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCollectionSort(val);
                                            autoSave({ homepage_sort: val }, true);
                                        }}
                                    >
                                        <option value="created-new">Date created: New to Old</option>
                                        <option value="created-old">Date created: Old to New</option>
                                        <option value="event-new">Event Date: New to Old</option>
                                        <option value="event-old">Event Date: Old to New</option>
                                        <option value="name-az">Name: A → Z</option>
                                        <option value="name-za">Name: Z → A</option>
                                    </select>
                                </div>
                                <p className="hp-help-text mt-2">Select the order you wish your collections to appear on your public homepage.</p>
                            </div>

                        </div>

                        {/* ── RIGHT COLUMN — Live Preview ── */}
                        <div className="hp-right-col">
                            <div className="hp-mockup-bg">
                                <div className="hp-mockup-card">

                                    {/* Social icons row — top left */}
                                    <div className="hp-mockup-social-row">
                                        {/* Facebook */}
                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                                        {/* Instagram */}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                                        {/* Pinterest */}
                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                                        {/* YouTube */}
                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                                    </div>

                                    {/* Photographer name */}
                                    <h3 className="hp-mockup-title">{photographerName.toUpperCase()}</h3>

                                    {/* Bio preview */}
                                    {showBio && bio && (
                                        <p className="hp-mockup-bio">
                                            {bio.slice(0, 80)}{bio.length > 80 ? '…' : ''}
                                        </p>
                                    )}

                                    {/* Contact info preview */}
                                    <div className="hp-mockup-contact">
                                        {showEmail && (
                                            <div className="hp-mockup-line">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                                <span>{displayEmail || 'poojaelango03@gmail.com'}</span>
                                            </div>
                                        )}
                                        {showAddress && (
                                            <div className="hp-mockup-line">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                                                <span>{displayAddress || '101 Main Street'}</span>
                                            </div>
                                        )}
                                        {showPhone && (
                                            <div className="hp-mockup-line">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                <span>{displayPhone || '9363090781'}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Collections grid — always 6 slots (wireframe mockup) */}
                                    <div className="hp-mockup-grid">
                                        {Array(6).fill(0).map((_, i) => (
                                            <div key={i} className="hp-mockup-item">
                                                <div className="hp-mockup-img hp-mockup-img--empty"></div>
                                                <div className="hp-mockup-text-1"></div>
                                                <div className="hp-mockup-text-2"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>
        </SidebarLayout>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CheckboxItem = ({ checked, onChange, label, sublabel }) => (
    <label className="hp-checkbox-item">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="chk-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </span>
        <span className="hp-checkbox-label-wrap">
            <span className="hp-checkbox-main">{label}</span>
            {sublabel && <span className="hp-checkbox-sub">{sublabel}</span>}
        </span>
    </label>
);

export default Homepage;
