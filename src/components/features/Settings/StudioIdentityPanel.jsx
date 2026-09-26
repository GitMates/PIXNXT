import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../../../services/storage.service';
import { galleryService } from '../../../services/gallery.service';
import { userStorageService, getStorageLimitBytes, formatStorageMeter } from '../../../services/userStorage.service';
import {
    isNormalFeatureEnabled,
    isGuestFeatureEnabled,
} from '../../../services/photographerQuota.service';
import { useAuth } from '../../../hooks/useAuth';
import { AccountQuotaMeters } from '../../ui/AccountQuotaMeters';
import { CustomDomainPanel } from './CustomDomainPanel';
import {
    resolvePhotographerR2Folder,
    buildUserModulePath,
    R2_USER_MODULES,
    safeR2PathSegment,
} from '../../../lib/photographerR2FolderCore';
import '../../../pages/Settings.css';
import { AppLoader } from '../../ui/AppLoading';

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
    if (host.includes('localhost') || host.includes('127.0.0.1')) return 'pixnxt.com';
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

function studioAssetPath(profile, ...segments) {
    const folder = resolvePhotographerR2Folder(profile);
    return buildUserModulePath(folder, R2_USER_MODULES.STUDIO, ...segments);
}

function safeUploadFileName(name) {
    const raw = String(name || 'file').trim() || 'file';
    return safeR2PathSegment(raw.replace(/\.[^.]+$/, ''), 'file')
        + (raw.includes('.') ? `.${raw.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}` : '');
}

/* ── component ──────────────────────────────────────────────────── */

export default function StudioIdentityPanel({ profile, updateProfile }) {
    const { user } = useAuth();
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
    const [sampleDeliveries, setSampleDeliveries] = useState({ gallery: '', proof: '' });
    const [usedBytes, setUsedBytes] = useState(() =>
        userStorageService.getCachedStorageBytes(user?.id || profile?.id),
    );

    const slug = useMemo(() => getSlug(profile), [profile]);
    const baseHost = useMemo(() => getGalleryHost(), []);
    const maxBytes = useMemo(() => getStorageLimitBytes(profile), [profile]);
    const storagePct = useMemo(() => {
        if (!maxBytes) return 0;
        return Math.min(100, (usedBytes / maxBytes) * 100);
    }, [usedBytes, maxBytes]);
    const normalOn = isNormalFeatureEnabled(profile);
    const guestOn = isGuestFeatureEnabled(profile);

    useEffect(() => {
        if (!user?.id && !profile?.id) return undefined;
        let cancelled = false;
        userStorageService
            .calculateUserStorageBytes(user || { id: profile.id }, profile)
            .then((bytes) => {
                if (!cancelled && typeof bytes === 'number' && bytes >= 0) setUsedBytes(bytes);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [user, profile]);

    useEffect(() => {
        if (!profile?.id) return;
        let cancelled = false;
        (async () => {
            // Flag-aware: galleryService.getCollections hits
            // GET /v1/galleries/dashboard in Workers mode. Take 4 newest.
            try {
                const cols = await galleryService.getCollections(profile.id);
                if (cancelled || !cols?.length) return;
                const newest = [...cols].sort(
                    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
                ).slice(0, 4);
                const toSlug = (d) =>
                    d.slug ||
                    d.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
                    '';
                setSampleDeliveries({
                    gallery: toSlug(newest[0]) || '',
                    proof: toSlug(newest[1] || newest[0]) || '',
                });
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [profile?.id]);

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
        void updateProfile({ hide_branding: !nextVal }).catch((err) => {
            console.error('Failed to update PIXNXT branding', err);
            setPToggle(!nextVal);
        });
        flash();
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingLogo(true);
            const path = studioAssetPath(
                profile,
                'logos',
                `logo_${Date.now()}_${safeUploadFileName(file.name)}`,
            );
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
        if (!(await window.confirm('Are you sure you want to remove your logo?'))) return;
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
            const path = studioAssetPath(
                profile,
                'logos',
                `cover_logo_${Date.now()}_${safeUploadFileName(file.name)}`,
            );
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
        if (!(await window.confirm('Are you sure you want to remove your cover logo?'))) return;
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
            const path = studioAssetPath(
                profile,
                'favicons',
                `favicon_${Date.now()}_${safeUploadFileName(file.name)}`,
            );
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
        if (!(await window.confirm('Are you sure you want to remove your site icon?'))) return;
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
        return <AppLoader label="Loading studio identity" variant="page-short" />;
    }

    const galleryUrl = slug ? `${slug}.${baseHost}/g/` : '';
    const proofUrl = slug ? `${slug}.${baseHost}/proof/` : '';
    const faviconUrl = profile?.favicon_url || localStorage.getItem('custom_favicon_url');
    const logoFileName = getFileName(profile?.logo_url);
    const coverFileName = getFileName(profile?.cover_logo_url);
    const faviconFileName = getFileName(faviconUrl);

    return (
        <div className="si-panel">
            <div className="si-info-banner">
                <span className="si-info-banner__icon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                </span>
                <p className="si-info-banner__text">
                    Applies to <strong>Client Gallery</strong>, <strong>Album Proofer</strong>,{' '}
                    <strong>Mobile Gallery</strong> and <strong>Print Lab</strong>. A change here lands
                    on a proof, a print order and a guest gallery at the same time.
                </p>
            </div>

            <section className="si-section si-section--usage">
                <span className="si-overline type-group-label">USAGE</span>
                <h2 className="si-heading-2">Plan usage</h2>
                <p className="si-body-muted">
                    Storage and face AI limits for this studio. Ask an admin to raise a limit when
                    something shows over or at capacity.
                </p>
                <div className="si-usage-card">
                    <AccountQuotaMeters
                        className="si-usage-meters"
                        collapsible={false}
                        storageLabel={formatStorageMeter(usedBytes, maxBytes)}
                        storagePct={storagePct}
                        imageUsed={profile?.image_used_count}
                        imageLimit={profile?.image_limit}
                        faceUsed={profile?.face_matching_delivery_used}
                        faceLimit={profile?.face_matching_delivery_limit}
                        normalImageUsed={profile?.face_normal_image_used ?? profile?.image_used_count}
                        normalImageLimit={!normalOn ? -1 : (profile?.face_normal_image_limit ?? profile?.image_limit)}
                        guestImageUsed={profile?.face_guest_image_used}
                        guestImageLimit={!guestOn ? -1 : (profile?.face_guest_image_limit ?? profile?.image_limit)}
                        normalFaceUsed={profile?.face_normal_delivery_used}
                        normalFaceLimit={!normalOn ? -1 : profile?.face_normal_delivery_limit}
                        guestFaceUsed={profile?.face_guest_delivery_used ?? profile?.face_matching_delivery_used}
                        guestFaceLimit={!guestOn ? -1 : (profile?.face_guest_delivery_limit ?? profile?.face_matching_delivery_limit)}
                    />
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                ADDRESSES
               ════════════════════════════════════════════════════════ */}
            <section className="si-section">
            <span className="si-overline type-group-label">ADDRESSES</span>

                <h2 className="si-heading-2">Your addresses</h2>
                <p className="si-body-muted">
                    Every delivery you create is reachable at these addresses. Change
                    the first part by editing your studio handle in{' '}
                    <Link to="/account/account" className="si-link">Your account</Link>.
                </p>

                {slug && (
                    <div className="si-address-cards">
                        <div className="si-address-card">
                            <span className="si-address-url">
                                <span className="si-address-url__host">
                                    {slug}.{baseHost}/g/
                                </span>
                                <span className="si-address-url__slug">
                                    {sampleDeliveries.gallery || 'your-delivery'}
                                </span>
                            </span>
                            <span className="si-address-badge">CLIENT GALLERY</span>
                        </div>

                        <div className="si-address-card">
                            <span className="si-address-url">
                                <span className="si-address-url__host">
                                    {slug}.{baseHost}/proof/
                                </span>
                                <span className="si-address-url__slug">
                                    {sampleDeliveries.proof || 'your-album'}
                                </span>
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
                    Use your own domain instead. All modules move with it — one
                    certificate, one DNS record, every link.
                </p>
                <CustomDomainPanel profile={profile} compact />
            </section>

            <hr className="si-divider" />

            {/* ════════════════════════════════════════════════════════
                LOGO
               ════════════════════════════════════════════════════════ */}
            <section className="si-section">
            <span className="si-overline type-group-label">LOGO</span>

                <p className="si-body-muted">
                    The main logo replaces your studio name in headers. The cover logo
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
                        <strong className="si-mark-title">Logo</strong>
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
                    <div className="si-mark-thumb si-mark-thumb--cover" onClick={() => coverLogoInputRef.current?.click()}>
                        {uploadingCoverLogo ? (
                            <span className="si-mark-uploading">Uploading…</span>
                        ) : profile?.cover_logo_url ? (
                            <img src={profile.cover_logo_url} alt="Cover Logo" className="si-mark-img" />
                        ) : (
                            <span className="si-mark-placeholder">+</span>
                        )}
                    </div>
                    <div className="si-mark-info">
                        <strong className="si-mark-title">Cover logo</strong>
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
                        <strong className="si-mark-title">Favicon</strong>
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
            <span className="si-overline type-group-label">PIXNXT BRANDING</span>

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
