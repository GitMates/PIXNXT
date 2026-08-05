import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../../../services/storage.service';
import { CustomDomainPanel } from './CustomDomainPanel';
import '../../../pages/Settings.css';

/* ── helpers ────────────────────────────────────────────────────── */

function getSlug(profile) {
    return (
        profile?.slug ||
        profile?.display_name?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
        profile?.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
        ''
    );
}

function getGalleryHost() {
    const host = window.location.host;
    if (host.includes('localhost')) return 'pixnxt.in';
    if (host.endsWith('.vercel.app')) return host;
    return host.replace(/^(www\.)/i, '');
}

function formatBytes(bytes) {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileName(url) {
    if (!url) return '';
    try {
        const parts = new URL(url).pathname.split('/');
        const raw = parts[parts.length - 1] || '';
        // strip timestamp prefix (logo_1234567890_filename.ext → filename.ext)
        return raw.replace(/^(logo|cover_logo|favicon)_\d+_/, '');
    } catch {
        return url.split('/').pop() || '';
    }
}

/* ── component ──────────────────────────────────────────────────── */

export default function StudioIdentityPanel({ profile, updateProfile }) {
    const [pToggle, setPToggle] = useState(() => {
        if (profile?.hide_branding !== undefined && profile?.hide_branding !== null) {
            return !profile.hide_branding;
        }
        const saved = localStorage.getItem('hide_branding');
        return saved !== 'true';
    });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCoverLogo, setUploadingCoverLogo] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const logoInputRef = useRef(null);
    const coverLogoInputRef = useRef(null);
    const faviconInputRef = useRef(null);

    const slug = useMemo(() => getSlug(profile), [profile]);
    const baseHost = useMemo(() => getGalleryHost(), []);

    useEffect(() => {
        if (profile?.hide_branding !== undefined && profile?.hide_branding !== null) {
            setPToggle(!profile.hide_branding);
        }
    }, [profile?.hide_branding]);

    useEffect(() => {
        const localFavicon = localStorage.getItem('custom_favicon_url');
        if (profile && !profile.favicon_url && localFavicon) {
            void updateProfile({ favicon_url: localFavicon });
        }
    }, [profile, updateProfile]);

    /* ── save flash ──────────────────────────────────────────── */
    const flash = (msg = 'Saved a moment ago. Changes reach live deliveries within a minute.') => {
        setSaveMsg(msg);
        setTimeout(() => setSaveMsg(''), 6000);
    };

    /* ── handlers ────────────────────────────────────────────── */

    const handleBrandingToggle = () => {
        const nextVal = !pToggle;
        setPToggle(nextVal);
        localStorage.setItem('hide_branding', (!nextVal).toString());
        void updateProfile({ hide_branding: !nextVal });
        flash();
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingLogo(true);
            const path = `photographers/${profile.id}/logos/logo_${Date.now()}_${file.name}`;
            const result = await storageService.upload(path, file);
            await updateProfile({ logo_url: result.url });
            flash();
        } catch (err) {
            console.error('Error uploading logo:', err);
            alert(`Logo upload failed: ${err.message}`);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleLogoDelete = async () => {
        if (!window.confirm('Are you sure you want to remove your logo?')) return;
        try {
            await updateProfile({ logo_url: null });
            flash();
        } catch (err) {
            console.error('Error deleting logo:', err);
        }
    };

    const handleCoverLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingCoverLogo(true);
            const path = `photographers/${profile.id}/logos/cover_logo_${Date.now()}_${file.name}`;
            const result = await storageService.upload(path, file);
            await updateProfile({ cover_logo_url: result.url });
            flash();
        } catch (err) {
            console.error('Error uploading cover logo:', err);
            alert(`Cover logo upload failed: ${err.message}`);
        } finally {
            setUploadingCoverLogo(false);
        }
    };

    const handleCoverLogoDelete = async () => {
        if (!window.confirm('Are you sure you want to remove your cover logo?')) return;
        try {
            await updateProfile({ cover_logo_url: null });
            flash();
        } catch (err) {
            console.error('Error deleting cover logo:', err);
        }
    };

    const handleFaviconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingFavicon(true);
            const path = `photographers/${profile.id}/favicons/favicon_${Date.now()}_${file.name}`;
            const result = await storageService.upload(path, file);
            localStorage.setItem('custom_favicon_url', result.url);
            await updateProfile({ favicon_url: result.url });
            flash();
        } catch (err) {
            console.error('Error uploading site icon:', err);
            alert(`Site icon upload failed: ${err.message}`);
        } finally {
            setUploadingFavicon(false);
        }
    };

    const handleFaviconDelete = async () => {
        if (!window.confirm('Are you sure you want to remove your site icon?')) return;
        try {
            localStorage.removeItem('custom_favicon_url');
            await updateProfile({ favicon_url: null });
            flash();
        } catch (err) {
            console.error('Error deleting site icon:', err);
            alert(`Failed to delete site icon: ${err.message}`);
        }
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
        );
    }

    const galleryUrl = slug ? `${slug}.${baseHost}/g/` : '';
    const proofUrl = slug ? `${slug}.${baseHost}/proof/` : '';
    const faviconUrl = profile?.favicon_url || localStorage.getItem('custom_favicon_url');
    const logoFileName = getFileName(profile?.logo_url);
    const coverFileName = getFileName(profile?.cover_logo_url);
    const faviconFileName = getFileName(faviconUrl);

    return (
        <div className="si-panel">
            {/* ════════════════════════════════════════════════════════
                ADDRESSES
               ════════════════════════════════════════════════════════ */}
            <section className="si-section">
                <span className="si-overline">ADDRESSES</span>

                <h2 className="si-heading-2">Your addresses</h2>
                <p className="si-body-muted">
                    Every delivery you create is reachable at these addresses. Change
                    the first part by editing your studio handle in{' '}
                    <Link to="/account/account" className="si-link">Account</Link>.
                </p>

                {slug && (
                    <div className="si-address-cards">
                        {/* Client Gallery row */}
                        <div className="si-address-card">
                            <span className="si-address-url">
                                {slug}.{baseHost}/g/
                            </span>
                            <span className="si-address-badge">CLIENT GALLERY</span>
                        </div>

                        {/* Album Proofer row */}
                        <div className="si-address-card">
                            <span className="si-address-url">
                                {slug}.{baseHost}/proof/
                            </span>
                            <span className="si-address-badge">ALBUM PROOFER</span>
                        </div>
                    </div>
                )}
            </section>

            {/* Custom domain */}
            <section className="si-section">
                <h2 className="si-heading-2">Custom domain</h2>
                <p className="si-body-muted">
                    Use your own domain instead. All four modules move with it — one
                    certificate, one DNS record, every link.
                </p>
                <CustomDomainPanel profile={profile} updateProfile={updateProfile} />
            </section>

            <hr className="si-divider" />

            {/* ════════════════════════════════════════════════════════
                MARKS
               ════════════════════════════════════════════════════════ */}
            <section className="si-section">
                <span className="si-overline">MARKS</span>

                <p className="si-body-muted">
                    The main mark replaces your studio name in headers. The cover mark
                    sits over photographs, so a light version with a transparent background
                    reads best.
                </p>

                {/* ── LOGO row ──────────────────────────────────── */}
                <div className="si-mark-row">
                    <div className="si-mark-thumb" onClick={() => logoInputRef.current?.click()}>
                        {uploadingLogo ? (
                            <span className="si-mark-uploading">Uploading…</span>
                        ) : profile?.logo_url ? (
                            <img src={profile.logo_url} alt="Logo" className="si-mark-img" />
                        ) : (
                            <span className="si-mark-placeholder">+</span>
                        )}
                    </div>
                    <div className="si-mark-info">
                        <strong className="si-mark-title">LOGO</strong>
                        <span className="si-mark-desc">
                            Shown in headers on a light background. PNG or SVG.
                        </span>
                        {logoFileName && (
                            <span className="si-mark-meta">{logoFileName}</span>
                        )}
                    </div>
                    <div className="si-mark-actions">
                        <button
                            type="button"
                            className="si-btn si-btn--outline"
                            onClick={() => logoInputRef.current?.click()}
                        >
                            Replace
                        </button>
                        {profile?.logo_url && (
                            <button
                                type="button"
                                className="si-btn si-btn--outline"
                                onClick={handleLogoDelete}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={logoInputRef}
                        onChange={(e) => void handleLogoUpload(e)}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                </div>

                {/* ── COVER LOGO row ────────────────────────────── */}
                <div className="si-mark-row">
                    <div className="si-mark-thumb si-mark-thumb--dark" onClick={() => coverLogoInputRef.current?.click()}>
                        {uploadingCoverLogo ? (
                            <span className="si-mark-uploading">Uploading…</span>
                        ) : profile?.cover_logo_url ? (
                            <img src={profile.cover_logo_url} alt="Cover Logo" className="si-mark-img" />
                        ) : (
                            <span className="si-mark-placeholder">+</span>
                        )}
                    </div>
                    <div className="si-mark-info">
                        <strong className="si-mark-title">COVER LOGO</strong>
                        <span className="si-mark-desc">
                            Sits over photographs. A light version with a transparent
                            background reads best.
                        </span>
                        {coverFileName && (
                            <span className="si-mark-meta">{coverFileName}</span>
                        )}
                    </div>
                    <div className="si-mark-actions">
                        <button
                            type="button"
                            className="si-btn si-btn--outline"
                            onClick={() => coverLogoInputRef.current?.click()}
                        >
                            Replace
                        </button>
                        {profile?.cover_logo_url && (
                            <button
                                type="button"
                                className="si-btn si-btn--outline"
                                onClick={handleCoverLogoDelete}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={coverLogoInputRef}
                        onChange={(e) => void handleCoverLogoUpload(e)}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                </div>

                {/* ── Site icon row ─────────────────────────────── */}
                <div className="si-mark-row">
                    <div className="si-mark-thumb si-mark-thumb--icon" onClick={() => faviconInputRef.current?.click()}>
                        {uploadingFavicon ? (
                            <span className="si-mark-uploading">Uploading…</span>
                        ) : faviconUrl ? (
                            <img src={faviconUrl} alt="Site icon" className="si-mark-img si-mark-img--icon" />
                        ) : (
                            <span className="si-mark-placeholder">+</span>
                        )}
                    </div>
                    <div className="si-mark-info">
                        <strong className="si-mark-title">Site icon</strong>
                        <span className="si-mark-desc">
                            Square image, 32 px or larger. Shows in browser tabs and on a
                            guest&apos;s home screen.
                        </span>
                        {faviconFileName && (
                            <span className="si-mark-meta">{faviconFileName}</span>
                        )}
                    </div>
                    <div className="si-mark-actions">
                        <button
                            type="button"
                            className="si-btn si-btn--outline"
                            onClick={() => faviconInputRef.current?.click()}
                        >
                            Replace
                        </button>
                        {faviconUrl && (
                            <button
                                type="button"
                                className="si-btn si-btn--outline"
                                onClick={handleFaviconDelete}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={faviconInputRef}
                        onChange={(e) => void handleFaviconUpload(e)}
                        accept="image/x-icon,image/png,image/gif,image/svg+xml"
                        style={{ display: 'none' }}
                    />
                </div>
            </section>

            <hr className="si-divider" />

            {/* ════════════════════════════════════════════════════════
                PIXNXT BRANDING
               ════════════════════════════════════════════════════════ */}
            <section className="si-section">
                <span className="si-overline">PIXNXT BRANDING</span>

                <div className="si-branding-row">
                    <div className="si-branding-text">
                        <strong className="si-heading-2" style={{ fontSize: '16px' }}>
                            Show PIXNXT on your pages
                        </strong>
                        <p className="si-body-muted" style={{ marginTop: '4px' }}>
                            Turn this off to remove every mention of PIXNXT from your deliveries
                            and Showcase page.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`si-toggle ${pToggle ? 'si-toggle--on' : ''}`}
                        onClick={handleBrandingToggle}
                        aria-pressed={pToggle}
                    >
                        <span className="si-toggle-thumb" />
                    </button>
                </div>
            </section>

            {/* ── save status ───────────────────────────────────── */}
            {saveMsg && (
                <div className="si-save-status">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{saveMsg}</span>
                </div>
            )}
        </div>
    );
}
