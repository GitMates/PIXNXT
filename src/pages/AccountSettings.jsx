import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, FileText, CreditCard, User, ChevronLeft, LogOut } from 'lucide-react';
import { galleryService } from '../services/gallery.service';
import { useAuth } from '../hooks/useAuth';
import { getUserDisplayLabel, getUserInitial } from '../lib/userInitials';
import { storageService } from '../services/storage.service';
import { supabase } from '../lib/supabase/client';
import AccountTopbarIcons from '../components/account/AccountTopbarIcons';
import { ClientGallerySubpageTabs } from '../components/features/ClientGallery/ClientGalleryPageShell';
import StudioIdentityPanel from '../components/features/Settings/StudioIdentityPanel';
import LegalConsentPanel from '../components/features/Settings/LegalConsentPanel';
import PlanBillingPanel from '../components/features/Settings/PlanBillingPanel';
import { getThemeMode, setThemeMode, THEME_CHANGE_EVENT } from '../lib/appearanceTheme';
import { userStorageService } from '../services/userStorage.service';
import { cn } from '../lib/utils';
import brandPng from '../assets/icons/client gallery.png';
import smartAlbumPng from '../assets/icons/smart album.png';
import dashboardPng from '../assets/icons/dashboard.png';
import '../components/portal/portal.css';
import '../styles/clientGalleryTheme.css';
import '../styles/accountSettingsTheme.css';
import '../components/SidebarLayout.css';
import '../pages/mobile-gallery/MobileGallery.css';

const ACCOUNT_TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'legal-consent', label: 'Legal & consent' },
    { id: 'studio-identity', label: 'Studio identity' },
    { id: 'account', label: 'Account' },
    { id: 'billing', label: 'Billing' },
    { id: 'advanced', label: 'Advanced Settings' },
    { id: 'refer', label: 'Refer a Friend' },
];

/** Tabs that use the Studio settings shell (image 1). */
const STUDIO_SHELL_TABS = new Set([
    'studio-identity',
    'legal-consent',
    'billing',
    'account',
    'profile',
]);

const STUDIO_NAV = [
    { id: 'studio-identity', label: 'Studio identity', icon: Home, section: 'STUDIO' },
    { id: 'legal-consent', label: 'Legal & consent', icon: FileText, section: 'STUDIO' },
    { id: 'billing', label: 'Plan & billing', icon: CreditCard, section: 'STUDIO' },
    { id: 'account', label: 'Your account', icon: User, section: 'YOU' },
];

const getDynamicShowcaseUrl = (slug) => {
    if (!slug) return '';
    const host = window.location.host;
    const protocol = window.location.protocol;
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        const baseHost = host.replace(/^[a-zA-Z0-9-]+\.localhost/, 'localhost');
        return `${protocol}//${slug.toLowerCase()}.${baseHost}/`;
    }
    
    if (host.endsWith('.vercel.app')) {
        return `${protocol}//${host}/p/${slug.toLowerCase()}`;
    }
    
    const hostWithoutSubdomain = host.replace(/^(www\.|[a-zA-Z0-9-]+\.)/i, '');
    return `${protocol}//${slug.toLowerCase()}.${hostWithoutSubdomain}/`;
};

export default function AccountSettings() {
    const { tab } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const activeTab = tab || 'profile';
    const useStudioShell = STUDIO_SHELL_TABS.has(activeTab);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [toastMessage, setToastMessage] = useState('');
    const [studioProfile, setStudioProfile] = useState(null);
    const [themeMode, setThemeModeState] = useState(() => getThemeMode());
    const [usedBytes, setUsedBytes] = useState(() =>
        userStorageService.getCachedStorageBytes(user?.id),
    );

    const showToast = useCallback((msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    }, []);

    const userInitial = getUserInitial(user);
    const businessName = useMemo(() => {
        return (
            studioProfile?.business_name ||
            studioProfile?.display_name ||
            getUserDisplayLabel(user) ||
            'Studio'
        );
    }, [studioProfile, user]);

    const studioHandle = useMemo(() => {
        const slug =
            studioProfile?.slug ||
            studioProfile?.display_name?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
            user?.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
            '';
        return slug;
    }, [studioProfile, user]);

    const maxBytes = useMemo(() => {
        const gb = Number(studioProfile?.storage_limit_gb);
        if (gb && gb > 0) return gb * 1024 * 1024 * 1024;
        return 100 * 1024 * 1024 * 1024;
    }, [studioProfile]);

    const storagePct = useMemo(() => {
        if (!maxBytes) return 0;
        return Math.min(100, Math.round((usedBytes / maxBytes) * 100));
    }, [usedBytes, maxBytes]);

    const formatStorageDisplay = (used, max) => {
        if (!used || used <= 0) {
            const maxGb = max && max > 0 ? (max / (1024 * 1024 * 1024)).toFixed(0) : 100;
            return `0 / ${maxGb} GB`;
        }
        const gb = 1024 * 1024 * 1024;
        if (max >= gb) {
            const usedGb = (used / gb).toFixed(used / gb < 1 ? 1 : 0);
            const maxGb = (max / gb).toFixed(0);
            return `${usedGb} / ${maxGb} GB`;
        }
        const usedMb = (used / (1024 * 1024)).toFixed(0);
        const maxMb = (max / (1024 * 1024)).toFixed(0);
        return `${usedMb} / ${maxMb} MB`;
    };

    useEffect(() => {
        if (!user?.id || !useStudioShell) return;
        let cancelled = false;
        (async () => {
            try {
                const data = await galleryService.getPhotographerProfile(user.id);
                if (!cancelled) setStudioProfile(data || null);
            } catch (err) {
                console.error(err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, useStudioShell]);

    useEffect(() => {
        if (!user?.id || !useStudioShell) return;
        userStorageService
            .calculateUserStorageBytes(user, studioProfile)
            .then((bytes) => {
                if (typeof bytes === 'number' && bytes >= 0) setUsedBytes(bytes);
            })
            .catch(() => {});
    }, [user, studioProfile, useStudioShell]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const onTheme = () => setThemeModeState(getThemeMode());
        window.addEventListener(THEME_CHANGE_EVENT, onTheme);
        return () => window.removeEventListener(THEME_CHANGE_EVENT, onTheme);
    }, []);

    const handleThemeModeChange = (mode) => {
        setThemeMode(mode);
        setThemeModeState(mode);
    };

    const handleSignOut = async () => {
        try {
            await logout();
            navigate('/');
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    const renderTabContent = () => (
        <>
            {activeTab === 'profile' && <ProfileTab user={user} showToast={showToast} />}
            {activeTab === 'legal-consent' && (
                <LegalConsentTab showToast={showToast} studioName={businessName} />
            )}
            {activeTab === 'studio-identity' && (
                <StudioIdentityTab user={user} showToast={showToast} embedded />
            )}
            {activeTab === 'account' && <AccountTab user={user} showToast={showToast} />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'advanced' && <AdvancedTab user={user} showToast={showToast} />}
            {activeTab === 'refer' && <ReferTab user={user} showToast={showToast} />}
        </>
    );

    const toastEl = toastMessage ? (
        <div className="acct-toast">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
            {toastMessage}
        </div>
    ) : null;

    if (useStudioShell) {
        const studioItems = STUDIO_NAV.filter((i) => i.section === 'STUDIO');
        const youItems = STUDIO_NAV.filter((i) => i.section === 'YOU');
        const isNavActive = (id) => {
            if (id === 'account') {
                return activeTab === 'account' || activeTab === 'profile';
            }
            return activeTab === id;
        };

        return (
            <div className="theme-mono cg-shell studio-shell">
                <aside className="studio-shell__aside">
                    <button
                        type="button"
                        className="studio-shell__back"
                        onClick={() => navigate('/client-gallery')}
                    >
                        <ChevronLeft size={15} strokeWidth={2} />
                        Back to Client Gallery
                    </button>

                    <div className="studio-shell__brand">
                        <span className="studio-shell__brand-label type-group-label">STUDIO</span>
                        <h1 className="studio-shell__studio-name type-section-title">{businessName}</h1>
                        {studioHandle ? (
                            <p className="studio-shell__studio-handle type-meta">{studioHandle}</p>
                        ) : null}
                    </div>

                    <nav className="studio-shell__nav" aria-label="Studio settings">
                        <span className="studio-shell__nav-label">STUDIO</span>
                        {studioItems.map((item) => {
                            const Icon = item.icon;
                            const active = isNavActive(item.id);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={cn('studio-shell__nav-item', active && 'active')}
                                    onClick={() => navigate(`/account/${item.id}`)}
                                >
                                    <Icon size={17} strokeWidth={1.75} className="studio-shell__nav-icon" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}

                        <span className="studio-shell__nav-label studio-shell__nav-label--spaced">YOU</span>
                        {youItems.map((item) => {
                            const Icon = item.icon;
                            const active = isNavActive(item.id);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={cn('studio-shell__nav-item', active && 'active')}
                                    onClick={() => navigate(`/account/${item.id}`)}
                                >
                                    <Icon size={17} strokeWidth={1.75} className="studio-shell__nav-icon" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="studio-shell__aside-footer">
                        <div className="sb-appearance-track studio-shell__theme" role="group" aria-label="Appearance">
                            {[
                                { id: 'light', label: 'Light' },
                                { id: 'auto', label: 'Auto' },
                                { id: 'dark', label: 'Dark' },
                            ].map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    className={cn(
                                        'sb-appearance-btn',
                                        themeMode === id && 'sb-appearance-btn--active',
                                    )}
                                    aria-pressed={themeMode === id}
                                    onClick={() => handleThemeModeChange(id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="studio-shell__storage sb-storage">
                            <div className="flex items-center justify-between gap-2">
                                <span className="sb-storage__label">STORAGE</span>
                                <span className="sb-storage__meta">
                                    {formatStorageDisplay(usedBytes, maxBytes)}
                                </span>
                            </div>
                            <div className="sb-storage__bar">
                                <div
                                    className="sb-storage__bar-fill"
                                    style={{ width: `${storagePct}%` }}
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            className="studio-shell__signout"
                            onClick={handleSignOut}
                        >
                            <LogOut size={16} strokeWidth={1.75} />
                            <span className="studio-shell__signout-text">
                                <span className="studio-shell__signout-label">Sign out</span>
                                {user?.email ? (
                                    <span className="studio-shell__signout-email">{user.email}</span>
                                ) : null}
                            </span>
                        </button>
                    </div>
                </aside>

                <main className="studio-shell__main">
                    <div className="studio-shell__content">{renderTabContent()}</div>
                </main>
                {toastEl}
            </div>
        );
    }

    return (
        <div className="theme-mono cg-shell acct-shell w-full min-h-screen">
            <header className="acct-header">
                <div className="acct-header-inner">
                    <div className="acct-header-left">
                        <span
                            className="acct-brand"
                            onClick={() => navigate('/dashboard')}
                            onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
                            role="button"
                            tabIndex={0}
                        >
                            PIXNXT
                        </span>

                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                className="acct-app-switcher-trigger"
                                onClick={() => setShowDropdown(!showDropdown)}
                                aria-expanded={showDropdown}
                            >
                                Account
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><polyline points="6 9 12 15 18 9" /></svg>
                            </button>

                            {showDropdown && (
                                <div className="mg-app-dropdown acct-app-dropdown">
                                    <div
                                        className="mg-app-dropdown-item"
                                        onClick={() => { navigate('/client-gallery'); setShowDropdown(false); }}
                                    >
                                        <img src={brandPng} alt="" className="mg-app-dropdown-icon" />
                                        <div>
                                            <span className="mg-app-dropdown-title">Client Gallery</span>
                                            <span className="mg-app-dropdown-desc">Better way to share, deliver, proof and sell</span>
                                        </div>
                                    </div>
                                    <div
                                        className="mg-app-dropdown-item"
                                        onClick={() => { navigate('/album-proofer'); setShowDropdown(false); }}
                                    >
                                        <img src={smartAlbumPng} alt="" className="mg-app-dropdown-icon" />
                                        <div>
                                            <span className="mg-app-dropdown-title">Album Proofer</span>
                                            <span className="mg-app-dropdown-desc">Design and deliver beautiful photo albums</span>
                                        </div>
                                    </div>
                                    <div
                                        className="mg-app-dropdown-item"
                                        onClick={() => { navigate('/mobile-gallery'); setShowDropdown(false); }}
                                    >
                                        <div className="mg-app-dropdown-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F3F0', borderRadius: 10 }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                        </div>
                                        <div>
                                            <span className="mg-app-dropdown-title">Mobile Gallery App</span>
                                            <span className="mg-app-dropdown-desc">Simple, personalized mobile photo albums</span>
                                        </div>
                                    </div>
                                    <div className="mg-app-dropdown-divider" />
                                    <div
                                        className="mg-app-dropdown-item mg-app-dropdown-item--compact"
                                        onClick={() => { navigate('/dashboard'); setShowDropdown(false); }}
                                    >
                                        <img src={dashboardPng} alt="" className="mg-app-dropdown-icon-sm" />
                                        <span className="mg-app-dropdown-link">View Dashboard</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <AccountTopbarIcons userInitial={userInitial} />
                </div>
            </header>

            <nav className="acct-subnav">
                <ClientGallerySubpageTabs
                    tabs={ACCOUNT_TABS}
                    activeId={activeTab}
                    onChange={(id) => navigate(`/account/${id}`)}
                />
            </nav>

            <main className="acct-main">
                <div className="acct-content">{renderTabContent()}</div>
            </main>
            {toastEl}
        </div>
    );
}

/* ── Inline editable field with Save / Cancel ───────────────── */
function InlineField({ label, name, value, type = 'text', placeholder = '', hint, rows, maxLength, onSave }) {
    const [dirty, setDirty] = React.useState(false);
    const [original, setOriginal] = React.useState(value);
    const [current, setCurrent] = React.useState(value);
    const [saving, setSaving] = React.useState(false);

    // Only sync from DB on the very first non-empty load.
    // Never reset while the user is actively editing.
    const loadedRef = React.useRef(false);
    React.useEffect(() => {
        if (!loadedRef.current && value !== '') {
            loadedRef.current = true;
            setCurrent(value);
            setOriginal(value);
            setDirty(false);
        }
    }, [value]);

    const handleLocalChange = (e) => {
        const v = e.target.value;
        setCurrent(v);
        setDirty(v !== original);
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(name, current);
        setOriginal(current);
        setDirty(false);
        setSaving(false);
    };

    const handleCancel = () => {
        setCurrent(original);
        setDirty(false);
    };

    return (
        <div className="acct-field">
            <label className="acct-field-label">{label}</label>
            <div className={`acct-field-row${rows ? ' acct-field-row--top' : ''}`}>
                <div
                    className={`neu-inset acct-field-shell${rows ? ' cg-field-shell-textarea acct-field-shell--textarea' : ' cg-field-shell'}${dirty ? ' acct-field-shell--dirty' : ''}`}
                >
                    {rows ? (
                        <textarea
                            name={name}
                            value={current}
                            onChange={handleLocalChange}
                            rows={rows}
                            maxLength={maxLength}
                            placeholder={placeholder}
                            className="acct-field-textarea"
                        />
                    ) : (
                        <input
                            type={type}
                            name={name}
                            value={current}
                            onChange={handleLocalChange}
                            placeholder={placeholder}
                            className="acct-field-input"
                        />
                    )}
                </div>

                {dirty && (
                    <div className={`acct-field-actions${rows ? ' pt-1' : ''}`}>
                        <button type="button" className="acct-btn-text" onClick={handleCancel}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="neu-pill acct-btn-save"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                )}
            </div>
            {maxLength && <div className="w-full text-left text-[14px] text-[#71717A] mt-1">{current.length} / {maxLength}</div>}
            {hint && <p className="acct-field-help mt-2">{hint}</p>}
        </div>
    );
}

function LegalConsentTab({ showToast, studioName }) {
    return (
        <div className="lc-page">
            <h1 className="type-page-title si-page-title lc-page-title">
                Legal <span className="lc-amp" aria-hidden="true">&amp;</span> consent
            </h1>
            <p className="type-lede si-page-lead lc-page-lead">
                One set of documents across everything you deliver.
            </p>
            <LegalConsentPanel showToast={showToast} studioName={studioName} />
        </div>
    );
}

function StudioIdentityTab({ user, showToast, embedded = false }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await galleryService.getPhotographerProfile(user.id);
                if (!cancelled) setProfile(data || null);
            } catch (err) {
                console.error(err);
                if (!cancelled) showToast?.('Failed to load studio identity.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, showToast]);

    const updateProfile = async (updates) => {
        if (!user?.id) return;
        await galleryService.updatePhotographerProfile(user.id, updates);
        setProfile((prev) => ({ ...(prev || {}), ...updates }));
        showToast?.('Saved');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a1a1a]" />
            </div>
        );
    }

    return (
        <div className={embedded ? 'si-page' : undefined}>
            <h1 className="type-page-title si-page-title">Studio identity</h1>
            <p className="type-lede si-page-lead">Your marks and addresses.</p>
            <StudioIdentityPanel profile={profile} updateProfile={updateProfile} />
        </div>
    );
}

function ProfileTab({ user, showToast }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        profile_icon_url: '',
        business_name: '',
        first_name: '',
        last_name: '',
        contact_email: '',
        phone: '',
        website: '',
        biography: '',
        business_country: '',
        address_line_1: '',
        address_line_2: '',
        state_province: '',
        city: '',
        zip_postal_code: '',
        time_zone: '(GMT-08:00) Pacific Time (US & Canada)',
        preferred_date_format: 'MM/DD/YYYY',
        social_facebook: '',
        social_x_twitter: '',
        social_instagram: '',
        social_tiktok: '',
        social_pinterest: '',
        social_youtube: '',
        social_vimeo: '',
        social_linkedin: ''
    });

    useEffect(() => {
        if (!user?.id) return;
        
        galleryService.getPhotographerProfile(user.id)
            .then(data => {
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        profile_icon_url: data.profile_icon_url || '',
                        business_name: data.business_name || '',
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        contact_email: data.contact_email || '',
                        phone: data.phone || '',
                        website: data.website || '',
                        biography: data.biography || data.bio || '',
                        business_country: data.business_country || '',
                        address_line_1: data.address_line_1 || '',
                        address_line_2: data.address_line_2 || '',
                        state_province: data.state_province || '',
                        city: data.city || '',
                        zip_postal_code: data.zip_postal_code || '',
                        time_zone: data.time_zone || '(GMT-08:00) Pacific Time (US & Canada)',
                        preferred_date_format: data.preferred_date_format || 'MM/DD/YYYY',
                        social_facebook: data.social_facebook || '',
                        social_x_twitter: data.social_x_twitter || '',
                        social_instagram: data.social_instagram || '',
                        social_tiktok: data.social_tiktok || '',
                        social_pinterest: data.social_pinterest || '',
                        social_youtube: data.social_youtube || '',
                        social_vimeo: data.social_vimeo || '',
                        social_linkedin: data.social_linkedin || ''
                    }));
                }
            })
            .catch(err => console.error("Error fetching profile:", err))
            .finally(() => setLoading(false));
    }, [user]);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAutoSave = async (fieldName, value) => {
        if (!user?.id) return;
        setSaving(true);
        try {
            await galleryService.updatePhotographerProfile(user.id, { [fieldName]: value });
            showToast('Changes saved successfully!');
        } catch (err) {
            console.error("Failed to auto-save profile field:", fieldName, err);
        }
        setSaving(false);
    };

    const handleIconClick = () => {
        fileInputRef.current?.click();
    };

    const handleIconChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        setUploadingIcon(true);
        try {
            const ext = file.name.split('.').pop() || 'png';
            const path = `photographers/${user.id}/profile_icon_${Date.now()}.${ext}`;
            const uploadResult = await storageService.upload(path, file);
            const imageUrl = uploadResult.url;
            
            setFormData(prev => ({ ...prev, profile_icon_url: imageUrl }));
            await handleAutoSave('profile_icon_url', imageUrl);
        } catch (err) {
            console.error("Error uploading profile icon:", err);
            alert("Failed to upload profile icon. Please try again.");
        } finally {
            setUploadingIcon(false);
        }
    };

    const handleRemoveIcon = async (e) => {
        e.stopPropagation();
        if (!user?.id) return;
        
        setUploadingIcon(true);
        try {
            setFormData(prev => ({ ...prev, profile_icon_url: '' }));
            await handleAutoSave('profile_icon_url', '');
        } catch (err) {
            console.error("Error removing profile icon:", err);
        } finally {
            setUploadingIcon(false);
        }
    };

    if (loading) {
        return <div className="acct-loading">Loading profile...</div>;
    }

    return (
        <div className="flex flex-col gap-12 pb-20 relative">
            <div>
                <h1 className="cg-page-title text-3xl font-medium mb-8 pb-6 border-b border-[#ECEAE6]">Profile</h1>
                
                {/* Business Details */}
                <h2 className="acct-section-label mb-6">Business Details</h2>
                
                <div className="flex flex-col gap-8 w-full">
                    <div>
                        <label className="acct-field-label">Profile Icon</label>
                        <div 
                            className="profile-upload-box" 
                            onClick={handleIconClick}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleIconChange} 
                                style={{ display: 'none' }} 
                                accept="image/*" 
                            />
                            {uploadingIcon ? (
                                <div className="profile-upload-spinner"></div>
                            ) : formData.profile_icon_url ? (
                                <>
                                    <img src={formData.profile_icon_url} alt="Profile Icon" className="w-full h-full object-cover" />
                                    <div className="profile-upload-overlay">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-1"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2 2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                        Change
                                    </div>
                                    <button 
                                        className="profile-upload-remove-btn" 
                                        onClick={handleRemoveIcon}
                                        title="Remove Icon"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </>
                            ) : (
                                <div className="profile-upload-inner">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </div>
                            )}
                        </div>
                        <p className="acct-field-help leading-relaxed">Your profile icon is a center cropped square icon shown on your galleries, showcase<br/>and applicable places. Tip: make your image a square image before uploading.</p>
                    </div>

                    <InlineField
                        label="Business Name"
                        name="business_name"
                        value={formData.business_name}
                        onChange={handleChange}
                        onSave={handleAutoSave}
                        hint="Your business name is shown on your showcase, deliveries, email notifications and more."
                    />

                    <InlineField
                        label="First Name"
                        name="first_name"
                        value={formData.first_name}
                        placeholder="Your first name"
                        onChange={handleChange}
                        onSave={handleAutoSave}
                        hint="Your first name is shown on your Studio Manager documents including contract signatures."
                    />

                    <InlineField
                        label="Last Name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        onSave={handleAutoSave}
                        hint="Your last name is shown on your Studio Manager documents including contract signatures."
                    />

                    <InlineField
                        label="Contact Email"
                        name="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={handleChange}
                        onSave={handleAutoSave}
                        hint="This email is shown publicly to your clients. This is not your account login email."
                    />

                    <InlineField
                        label="Phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onSave={handleAutoSave}
                    />

                    <InlineField
                        label="Website"
                        name="website"
                        value={formData.website}
                        placeholder="https://"
                        onChange={handleChange}
                        onSave={handleAutoSave}
                        hint="Your client will find links back to your website in many places throughout Pixieset. It is important that you enter a valid website."
                    />

                    <InlineField
                        label="Biography"
                        name="biography"
                        value={formData.biography}
                        placeholder="Optional. Max 500 characters."
                        rows={4}
                        maxLength={500}
                        onChange={handleChange}
                        onSave={handleAutoSave}
                    />
                </div>
            </div>

            {/* Business Address */}
            <div className="mt-2">
                <h2 className="acct-section-label mb-4">BUSINESS ADDRESS</h2>
                
                <div className="flex flex-col gap-6 w-full">
                    <div>
                        <label className="acct-field-label">Business Country</label>
                        <select 
                            name="business_country"
                            value={formData.business_country}
                            onChange={(e) => { handleChange('business_country', e.target.value); handleAutoSave('business_country', e.target.value); }}
                            className="w-full acct-input"
                        >
                            <option value="">Select a country</option>
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="UK">United Kingdom</option>
                            <option value="AU">Australia</option>
                            <option value="IN">India</option>
                        </select>
                    </div>

                    <InlineField
                        label="Address Line 1"
                        name="address_line_1"
                        value={formData.address_line_1}
                        placeholder="Street Address"
                        onSave={handleAutoSave}
                    />

                    <InlineField
                        label="Address Line 2"
                        name="address_line_2"
                        value={formData.address_line_2}
                        placeholder="Unit / Apartment Number"
                        onSave={handleAutoSave}
                    />

                    <InlineField
                        label="State / Province"
                        name="state_province"
                        value={formData.state_province}
                        placeholder="State / Province"
                        onSave={handleAutoSave}
                    />

                    <InlineField
                        label="City"
                        name="city"
                        value={formData.city}
                        placeholder="City"
                        onSave={handleAutoSave}
                    />

                    <InlineField
                        label="Zip / Postal Code"
                        name="zip_postal_code"
                        value={formData.zip_postal_code}
                        placeholder="Zip / Postal"
                        onSave={handleAutoSave}
                    />
                </div>
            </div>

            {/* Standards & Formats */}
            <div className="mt-2">
                <h2 className="text-[14px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">STANDARDS & FORMATS</h2>
                
                <div className="flex flex-col gap-6 w-full">
                    <div>
                        <label className="acct-field-label">Time Zone</label>
                        <select 
                            name="time_zone"
                            value={formData.time_zone}
                            onChange={(e) => { handleChange('time_zone', e.target.value); handleAutoSave('time_zone', e.target.value); }}
                            className="w-full acct-input"
                        >
                            <option value="(GMT-08:00) Pacific Time (US & Canada)">(GMT-08:00) Pacific Time (US & Canada)</option>
                            <option value="(GMT-05:00) Eastern Time (US & Canada)">(GMT-05:00) Eastern Time (US & Canada)</option>
                            <option value="(GMT+00:00) London">(GMT+00:00) London</option>
                            <option value="(GMT+05:30) Asia, Kolkata">(GMT+05:30) Asia, Kolkata</option>
                            <option value="(GMT+05:30) India Standard Time">(GMT+05:30) India Standard Time</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="acct-field-label">Preferred Date Format</label>
                        <select 
                            name="preferred_date_format"
                            value={formData.preferred_date_format}
                            onChange={(e) => { handleChange('preferred_date_format', e.target.value); handleAutoSave('preferred_date_format', e.target.value); }}
                            className="w-full acct-input"
                        >
                            <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                            <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                            <option value="yyyy/mm/dd">yyyy/mm/dd</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Social */}
            <div className="mt-2">
                <h2 className="text-[14px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">SOCIAL</h2>
                
                <div className="flex flex-col gap-6 w-full">
                    {[
                        { 
                            label: 'Facebook', 
                            name: 'social_facebook',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                            )
                        },
                        { 
                            label: 'X (formerly Twitter)', 
                            name: 'social_x_twitter',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            )
                        },
                        { 
                            label: 'Instagram', 
                            name: 'social_instagram',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#111]"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                            )
                        },
                        { 
                            label: 'TikTok', 
                            name: 'social_tiktok',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11v-3.5a6.8 6.8 0 0 0-1.23-.1 6.35 6.35 0 0 0-6.1 6.3 6.27 6.27 0 0 0 6.1 6.25 6.27 6.27 0 0 0 6.1-6.25V7.95a10.6 10.6 0 0 0 4.45 1.01V5.51a8.38 8.38 0 0 1-4.21-1.18z"/></svg>
                            )
                        },
                        { 
                            label: 'Pinterest', 
                            name: 'social_pinterest',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.43 7.63 11.17-.1-.95-.19-2.4.04-3.44.22-.94 1.4-6 1.4-6s-.36-.72-.36-1.78c0-1.67.97-2.91 2.17-2.91 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.19.6 2.17 1.78 2.17 2.13 0 3.77-2.25 3.77-5.5 0-2.87-2.06-4.88-5.01-4.88-3.41 0-5.42 2.56-5.42 5.21 0 1.03.4 2.14.89 2.74.1.12.11.23.08.35l-.33 1.35c-.05.22-.17.27-.4.16-1.5-.7-2.44-2.89-2.44-4.65 0-3.79 2.75-7.26 7.93-7.26 4.16 0 7.4 2.97 7.4 6.93 0 4.14-2.61 7.46-6.23 7.46-1.22 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15C9.57 23.81 10.76 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z"/></svg>
                            )
                        },
                        { 
                            label: 'YouTube', 
                            name: 'social_youtube',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            )
                        },
                        { 
                            label: 'Vimeo', 
                            name: 'social_vimeo',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M22.396 7.158c-.092 2.037-1.514 4.824-4.264 8.363-2.85 3.69-5.26 5.534-7.234 5.534-1.22 0-2.257-1.123-3.112-3.37L5.03 8.96c-.642-2.385-1.33-3.578-2.064-3.578-.152 0-.68.322-1.586.966l-.95-.1.21-.99c.974-.853 1.93-1.7 2.87-2.54 1.285-1.077 2.215-1.65 2.793-1.723 1.343-.16 2.17.765 2.476 2.784.336 2.222.565 3.6.69 4.13.396 2.382.793 3.573 1.19 3.573.304 0 .762-.486 1.374-1.46.61-.97 1.258-2.072 1.942-3.298.672-1.218.992-2.116.96-2.697-.062-.83-.544-1.246-1.444-1.246-.427 0-.915.09-1.462.274 1.198-3.924 3.473-5.787 6.827-5.59 2.478.143 3.64 1.545 3.486 4.2z"/></svg>
                            )
                        },
                        { 
                            label: 'LinkedIn', 
                            name: 'social_linkedin',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>
                            )
                        }
                    ].map(social => (
                        <div key={social.name}>
                            <label className="flex items-center gap-2 text-[17px] font-bold text-[#111] mb-2">
                                <span className="flex items-center w-[18px] h-[18px] justify-center">{social.icon}</span>
                                <span>{social.label}</span>
                            </label>
                            <input 
                                type="text" 
                                name={social.name}
                                value={formData[social.name]}
                                onChange={handleChange}
                                onBlur={(e) => handleAutoSave(social.name, e.target.value)}
                                placeholder="e.g. mydomain.com"
                                className="w-full acct-input"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AccountTab({ user, showToast }) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Modals
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Forms
    const [modalUsername, setModalUsername] = useState('');
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleteSaving, setDeleteSaving] = useState(false);

    const fallbackSlug = user?.email ? user.email.split('@')[0] : 'poojz';

    const [formData, setFormData] = useState({
        showcase_slug: fallbackSlug,
        email: user?.email || 'poojaelango03@gmail.com',
        two_factor_enabled: false,
        google_connected: true,
        apple_connected: false,
        login_password_set: false,
        active_sessions: []
    });

    // Load dynamic data on mount
    useEffect(() => {
        if (!user?.id) return;
        
        galleryService.getPhotographerProfile(user.id)
            .then(async data => {
                if (data) {
                    let sessions = data.active_sessions || [];
                    const needsRedetect = sessions.length === 0 ||
                        (sessions.length > 0 && sessions[0].device === 'Windows 10, Chrome 148');

                    if (needsRedetect) {
                        // Detect browser name + version
                        const getBrowserInfo = () => {
                            const ua = navigator.userAgent;
                            let name = 'Browser';
                            let version = '';
                            if (ua.includes('Edg/')) {
                                name = 'Edge';
                                version = ua.match(/Edg\/([\d]+)/)?.[1] || '';
                            } else if (ua.includes('Chrome/')) {
                                name = 'Chrome';
                                version = ua.match(/Chrome\/([\d]+)/)?.[1] || '';
                            } else if (ua.includes('Firefox/')) {
                                name = 'Firefox';
                                version = ua.match(/Firefox\/([\d]+)/)?.[1] || '';
                            } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
                                name = 'Safari';
                                version = ua.match(/Version\/([\d]+)/)?.[1] || '';
                            }
                            return version ? `${name} ${version}` : name;
                        };

                        // Detect OS — use high-entropy hints for Windows 11 vs 10
                        const getOSName = async () => {
                            const ua = navigator.userAgent;
                            if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
                            if (ua.includes('Android')) return 'Android';
                            if (ua.includes('Macintosh') || ua.includes('Mac OS X')) return 'macOS';
                            if (ua.includes('Linux')) return 'Linux';

                            // Windows: UA always reports "Windows NT 10.0" for both Win10 and Win11
                            // Use userAgentData high-entropy hints (Chrome/Edge 90+)
                            if (navigator.userAgentData?.getHighEntropyValues) {
                                try {
                                    const hints = await navigator.userAgentData.getHighEntropyValues(['platformVersion']);
                                    const major = parseInt(hints.platformVersion?.split('.')?.[0] || '0', 10);
                                    if (major >= 13) return 'Windows 11';
                                    if (major > 0) return 'Windows 10';
                                } catch (_) { /* fallback */ }
                            }
                            return 'Windows';
                        };

                        const browser = getBrowserInfo();
                        const os = await getOSName();

                        sessions = [{
                            id: sessions[0]?.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                            device: `${os}, ${browser}`,
                            lastActive: 'Current session',
                            ip: sessions[0]?.ip || '—'
                        }];
                        galleryService.updatePhotographerProfile(user.id, { active_sessions: sessions })
                            .catch(err => console.error("Error updating session:", err));
                    }

                    setFormData(prev => ({
                        ...prev,
                        showcase_slug: data.showcase_slug || data.username || fallbackSlug,
                        email: data.contact_email || user?.email || 'poojaelango03@gmail.com',
                        two_factor_enabled: data.two_factor_enabled || false,
                        google_connected: data.google_connected !== undefined ? data.google_connected : true,
                        apple_connected: data.apple_connected || false,
                        login_password_set: data.login_password_set || false,
                        active_sessions: sessions
                    }));
                }
            })
            .catch(err => console.error("Error fetching account details:", err))
            .finally(() => setLoading(false));
    }, [user]);

    // Live IP detection
    useEffect(() => {
        if (!user?.id) return;
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => {
                if (data.ip) {
                    setFormData(prev => {
                        const updated = { ...prev };
                        if (updated.active_sessions && updated.active_sessions.length > 0) {
                            updated.active_sessions = updated.active_sessions.map((s, idx) => 
                                idx === 0 ? { ...s, ip: data.ip } : s
                            );
                            galleryService.updatePhotographerProfile(user.id, { active_sessions: updated.active_sessions })
                                .catch(err => console.error("Error saving session IP:", err));
                        }
                        return updated;
                    });
                }
            })
            .catch(() => {});
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAutoSave = async (fieldName, value) => {
        if (!user?.id) return;
        showToast('Changes saved successfully!');
        setSaving(true);
        try {
            await galleryService.updatePhotographerProfile(user.id, { [fieldName]: value });
        } catch (err) {
            console.error("Failed to auto-save account field:", fieldName, err);
        }
        setSaving(false);
    };

    const toggle2FA = async () => {
        const newValue = !formData.two_factor_enabled;
        setFormData(prev => ({ ...prev, two_factor_enabled: newValue }));
        showToast(`Two-factor authentication ${newValue ? 'enabled' : 'disabled'}`);
        try {
            await galleryService.updatePhotographerProfile(user.id, { two_factor_enabled: newValue });
        } catch (err) {
            console.error("Failed to toggle 2FA:", err);
        }
    };

    const handleSetPassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        if (!passwordForm.newPassword) {
            setPasswordError('Password cannot be empty.');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }
        setPasswordSaving(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
            if (authError) throw authError;

            await galleryService.updatePhotographerProfile(user.id, { login_password_set: true });
            setFormData(prev => ({ ...prev, login_password_set: true }));
            setShowPasswordModal(false);
            setPasswordForm({ newPassword: '', confirmPassword: '' });
            showToast('Password updated successfully!');
        } catch (err) {
            console.error("Error setting password:", err);
            setPasswordError(err.message || 'Failed to update password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        setDeleteError('');
        if (deleteConfirmEmail.toLowerCase() !== formData.email.toLowerCase()) {
            setDeleteError('Email does not match.');
            return;
        }
        setDeleteSaving(true);
        try {
            // Delete photographer record
            const { error: dbError } = await supabase
                .from('photographers')
                .delete()
                .eq('id', user.id);
            if (dbError) throw dbError;

            // Log out user
            await logout();
            navigate('/auth');
        } catch (err) {
            console.error("Error deleting account:", err);
            setDeleteError(err.message || 'Failed to delete account.');
        } finally {
            setDeleteSaving(false);
        }
    };

    const revokeSession = async (sessionId) => {
        const updated = formData.active_sessions.filter(s => s.id !== sessionId);
        setFormData(prev => ({ ...prev, active_sessions: updated }));
        await handleAutoSave('active_sessions', updated);
        showToast('Session terminated successfully.');
    };

    if (loading) {
        return <div className="py-8 text-[#888]">Loading account...</div>;
    }

    return (
        <div className="flex flex-col gap-12 pb-20 relative">
            <div>
                <h1 className="cg-page-title text-3xl font-medium mb-8 pb-6 border-b border-[#ECEAE6]">Account</h1>
                
                {/* Account Info */}
                <h2 className="acct-section-label mb-6">ACCOUNT INFO</h2>
                
                <div className="flex flex-col gap-8 w-full">
                    {/* Username */}
                    <div>
                        <label className="acct-field-label">Username</label>
                        <div className="w-full bg-[#f9f9f9] border border-[#f1f1f1] px-4 py-3 flex justify-between items-center group transition-colors hover:border-[#ddd]">
                            <span className="text-[17px] text-[#111]">{formData.showcase_slug}</span>
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                className="cursor-pointer opacity-80 hover:opacity-100 flex-shrink-0 ml-2"
                                onClick={() => {
                                    setModalUsername(formData.showcase_slug);
                                    setShowUsernameModal(true);
                                }}
                            >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                        <p className="text-[15px] text-[#888] mt-2">
                            Your Showcase will be at{' '}
                            <a 
                                href={getDynamicShowcaseUrl(formData.showcase_slug)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[#1A1A1A] hover:underline font-medium"
                            >
                                {getDynamicShowcaseUrl(formData.showcase_slug)}
                            </a>
                        </p>
                    </div>

                    {/* Account Email */}
                    <div>
                        <label className="acct-field-label">Account Email</label>
                        
                        <div className="bg-[#fff9e6] border border-[#ffecb3] p-4 flex gap-3 mb-4 rounded-[2px]">
                            <div className="mt-0.5">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#333" className="text-white">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                </svg>
                            </div>
                            <div className="text-[15px] text-[#333] font-medium leading-relaxed">
                                Your email address has not been verified. To keep your account safe and secure, we've sent an email to verify your email address and activate your account. <span className="text-[#1A1A1A] cursor-pointer hover:underline">Resend confirmation email.</span>
                            </div>
                        </div>

                        <div className="w-full bg-[#f9f9f9] border border-[#f1f1f1] px-4 py-3 flex justify-between items-center group transition-colors hover:border-[#ddd]">
                            <span className="text-[17px] text-[#111]">{formData.email}</span>
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                className="cursor-pointer opacity-80 hover:opacity-100 flex-shrink-0 ml-2"
                                onClick={() => setShowEmailModal(true)}
                            >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                        <p className="text-[15px] text-[#888] mt-2">You will receive important notifications at this email, and your client will see this email where applicable.</p>
                    </div>

                    {/* Account Password */}
                    <div>
                        <label className="acct-field-label">Account Password</label>
                        <div className="w-full border border-[#f1f1f1] p-2 flex justify-between items-center bg-white">
                            <span className={`text-[17px] px-2 ${formData.login_password_set ? 'text-[#111]' : 'text-[#999]'}`}>
                                {formData.login_password_set ? 'Password set' : 'No Password set'}
                            </span>
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[16px] font-medium px-4 py-2 transition-colors rounded-[2px]"
                            >
                                {formData.login_password_set ? 'Change Password' : 'Set a Password'}
                            </button>
                        </div>
                        <p className="text-[15px] text-[#888] mt-2">
                            {formData.login_password_set 
                                ? 'Your password is set, you can use it to log in alongside your social connections.' 
                                : "Your password is not set, once you create it you'll be able to log in using it as well."}
                        </p>
                    </div>

                    {/* Social Login */}
                    <div>
                        <label className="acct-field-label">Social Login</label>
                        <div className="border border-[#f1f1f1] bg-white flex flex-col">
                            {/* Google */}
                            <div className="flex justify-between items-center p-3 border-b border-[#f1f1f1]">
                                <div className="flex items-center gap-4 px-2">
                                    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span className="text-[17px] font-bold text-[#111]">Google</span>
                                    <span className="text-[16px] text-[#999]">{formData.google_connected ? 'Connected' : 'Not connected'}</span>
                                </div>
                                <button 
                                    className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[16px] font-medium px-4 py-2 transition-colors rounded-[2px] min-w-[120px]"
                                    onClick={async () => {
                                        const newValue = !formData.google_connected;
                                        setFormData(prev => ({ ...prev, google_connected: newValue }));
                                        await handleAutoSave('google_connected', newValue);
                                        showToast(`Google integration ${newValue ? 'connected' : 'disconnected'}`);
                                    }}
                                >
                                    {formData.google_connected ? 'Disconnect' : 'Connect'}
                                </button>
                            </div>
                            
                            {/* Apple */}
                            <div className="flex justify-between items-center p-3">
                                <div className="flex items-center gap-4 px-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.05 13.92c-.023-1.944 1.583-2.894 1.656-2.94-1.258-1.841-3.21-2.091-3.922-2.115-1.66-.17-3.242 1.002-4.088 1.002-.858 0-2.164-1.01-3.56-1.01-1.83 0-3.524 1.066-4.464 2.716-1.905 3.303-.487 8.2 1.365 10.876.908 1.31 1.977 2.775 3.407 2.723 1.385-.05 1.907-.893 3.525-.893 1.606 0 2.096.893 3.537.868 1.488-.025 2.417-1.318 3.313-2.636 1.037-1.517 1.464-2.983 1.484-3.058-.032-.014-2.222-.853-2.253-5.533zM15.467 4.966c.773-.935 1.293-2.235 1.15-3.533-1.11.045-2.455.74-3.25 1.67-.714.832-1.336 2.155-1.173 3.432 1.238.096 2.5-.66 3.273-1.569z"/>
                                    </svg>
                                    <span className="text-[17px] font-bold text-[#111]">Apple</span>
                                    <span className="text-[16px] text-[#999]">{formData.apple_connected ? 'Connected' : 'Not connected'}</span>
                                </div>
                                <button 
                                    className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[16px] font-medium px-4 py-2 transition-colors rounded-[2px] min-w-[120px]"
                                    onClick={async () => {
                                        const newValue = !formData.apple_connected;
                                        setFormData(prev => ({ ...prev, apple_connected: newValue }));
                                        await handleAutoSave('apple_connected', newValue);
                                        showToast(`Apple integration ${newValue ? 'connected' : 'disconnected'}`);
                                    }}
                                >
                                    {formData.apple_connected ? 'Disconnect' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Security */}
                <div className="mt-14">
                    <h2 className="acct-section-label mb-6">ACCOUNT SECURITY</h2>
                    
                    <div className="flex flex-col gap-10 w-full">
                        {/* Two-Factor Authentication */}
                        <div>
                            <h3 className="text-[17px] font-bold text-[#111] mb-4">Two-Factor Authentication</h3>
                            <div className="flex items-center gap-3 mb-4">
                                <button 
                                    className={`w-[48px] h-[24px] rounded-full relative transition-colors ${formData.two_factor_enabled ? 'bg-[#1A1A1A]' : 'bg-[#e0e0e0]'}`}
                                    onClick={toggle2FA}
                                >
                                    <div className={`absolute top-1 left-1 w-[16px] h-[16px] rounded-full bg-white transition-transform ${formData.two_factor_enabled ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
                                </button>
                                <span className={`text-[16px] ${formData.two_factor_enabled ? 'text-[#1A1A1A]' : 'text-[#999]'}`}>
                                    {formData.two_factor_enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <p className="text-[15px] text-[#888] leading-relaxed">
                                Two-factor authentication adds an extra layer of protection by requiring a verification code when you log in to your account with an email address and password. <span className="text-[#1A1A1A] cursor-pointer hover:underline">Learn more</span>
                            </p>
                        </div>

                        {/* Your Devices / Browsers */}
                        <div>
                            <h3 className="text-[17px] font-bold text-[#111] mb-6">Your Devices / Browsers</h3>
                            <div className="w-full">
                                <div className="flex items-center border-b border-[#f1f1f1] pb-3 text-[15px] font-bold text-[#111]">
                                    <div className="w-[40%]">Device</div>
                                    <div className="w-[30%]">Last Active</div>
                                    <div className="w-[30%]">IP Address</div>
                                </div>
                                
                                {formData.active_sessions.map((session, idx) => (
                                    <div key={session.id || idx} className="flex items-center border-b border-[#f1f1f1] py-4 text-[16px] group">
                                        <div className="w-[40%] text-[#333]">{session.device}</div>
                                        <div className={`w-[30%] ${idx === 0 ? 'text-[#1A1A1A]' : 'text-[#666]'}`}>
                                            {idx === 0 ? 'Current session' : session.lastActive}
                                        </div>
                                        <div className="w-[30%] text-[#666] flex justify-between items-center">
                                            {session.ip}
                                            {idx > 0 && (
                                                <svg 
                                                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                                    className="cursor-pointer hover:stroke-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => revokeSession(session.id)}
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Manage Account */}
                <div className="mt-14">
                    <h2 className="acct-section-label mb-6">MANAGE ACCOUNT</h2>
                    <p className="text-[16px] text-[#888] leading-relaxed">
                        Please understand that by deleting your account, all photos, deliveries, mobile apps and other account data will be permanently deleted. Yes, <span onClick={() => setShowDeleteModal(true)} className="text-[#1A1A1A] cursor-pointer hover:underline">delete</span> my account.
                    </p>
                </div>
            </div>

            {/* Set/Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <form onSubmit={handleSetPassword} className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[15px] font-bold text-[#333] tracking-[0.1em] uppercase">
                                {formData.login_password_set ? 'CHANGE PASSWORD' : 'SET A PASSWORD'}
                            </h2>
                        </div>
                        
                        <div className="p-8 flex flex-col gap-6">
                            {passwordError && (
                                <div className="text-[15px] text-red-500 bg-red-50 border border-red-200 px-4 py-3 rounded-[2px]">
                                    {passwordError}
                                </div>
                            )}
                            <div>
                                <label className="acct-field-label">New Password</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    className="w-full acct-input"
                                />
                            </div>
                            <div>
                                <label className="acct-field-label">Confirm Password</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="w-full acct-input"
                                />
                            </div>
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            <button 
                                type="button"
                                className="text-[16px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                                    setPasswordError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={passwordSaving}
                                className="neu-pill acct-btn-primary text-[16px] font-medium px-6 py-2 transition-colors disabled:opacity-50"
                            >
                                {passwordSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <form onSubmit={handleDeleteAccount} className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[15px] font-bold text-[#ff4d4f] tracking-[0.1em] uppercase">DELETE ACCOUNT</h2>
                        </div>
                        
                        <div className="p-8 flex flex-col gap-6">
                            <div className="text-[16px] text-[#333] bg-red-50 border border-red-200 px-4 py-3 rounded-[2px] leading-relaxed">
                                <strong>Warning:</strong> Deleting your account will permanently delete all of your photos, deliveries, client galleries, mobile apps, and other related data. This action is completely irreversible.
                            </div>
                            {deleteError && (
                                <div className="text-[15px] text-red-500 bg-red-50 border border-red-200 px-4 py-3 rounded-[2px]">
                                    {deleteError}
                                </div>
                            )}
                            <div>
                                <label className="acct-field-label">
                                    To confirm, type your account email: <strong className="select-all text-[#1A1A1A]">{formData.email}</strong>
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    value={deleteConfirmEmail}
                                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                                    placeholder={formData.email}
                                    className="w-full border border-[#ddd] px-4 py-2.5 text-[17px] text-[#111] focus:outline-none focus:border-[#ff4d4f] transition-colors"
                                />
                            </div>
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            <button 
                                type="button"
                                className="text-[16px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmEmail('');
                                    setDeleteError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={deleteSaving}
                                className="bg-[#ff4d4f] hover:bg-[#d9363e] text-white text-[16px] font-medium px-6 py-2 transition-colors rounded-[2px] disabled:opacity-50"
                            >
                                {deleteSaving ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Username Modal */}
            {showUsernameModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <div className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[15px] font-bold text-[#333] tracking-[0.1em] uppercase">EDIT USERNAME</h2>
                        </div>
                        
                        <div className="p-8">
                            <div className="flex gap-3 mb-6">
                                <div className="mt-0.5">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4d4f" className="text-white">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                    </svg>
                                </div>
                                <div className="text-[16px] text-[#333] leading-relaxed">
                                    Your username is directly tied to your Pixieset URL (e.g. https://yourusername.pixieset.com). If you change your username, your URLs for existing galleries, portfolio website, and booking site will be immediately changed as well.
                                </div>
                            </div>
                            
                            <div>
                                <label className="acct-field-label">New Username</label>
                                <input 
                                    type="text" 
                                    value={modalUsername}
                                    onChange={(e) => setModalUsername(e.target.value)}
                                    className="w-full acct-input"
                                />
                            </div>
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            <button 
                                className="text-[16px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                onClick={() => setShowUsernameModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="neu-pill acct-btn-primary text-[16px] font-medium px-6 py-2 transition-colors"
                                onClick={async () => {
                                    setFormData(prev => ({ ...prev, showcase_slug: modalUsername }));
                                    setShowUsernameModal(false);
                                    await handleAutoSave('showcase_slug', modalUsername);
                                    window.dispatchEvent(new CustomEvent('pixnxt:username-changed', { detail: { slug: modalUsername } }));
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <div className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[15px] font-bold text-[#333] tracking-[0.1em] uppercase">EDIT ACCOUNT EMAIL</h2>
                        </div>
                        
                        <div className="p-8">
                            {formData.google_connected ? (
                                <div className="flex gap-3">
                                    <div className="mt-0.5">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4d4f" className="text-white">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                        </svg>
                                    </div>
                                    <div className="text-[16px] text-[#333] leading-relaxed">
                                        Your Pixieset account is connected to your Google account. To update your email, you must first disconnect your Google account.
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="acct-field-label">New Account Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        onChange={handleChange}
                                        name="email"
                                        className="w-full acct-input"
                                    />
                                    <p className="text-[15px] text-[#888] mt-2">Updating your email will require re-verification.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            {formData.google_connected ? (
                                <button 
                                    className="text-[16px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                    onClick={() => setShowEmailModal(false)}
                                >
                                    Close
                                </button>
                            ) : (
                                <>
                                    <button 
                                        className="text-[16px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                        onClick={() => setShowEmailModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="neu-pill acct-btn-primary text-[16px] font-medium px-6 py-2 transition-colors"
                                        onClick={async () => {
                                            setShowEmailModal(false);
                                            await handleAutoSave('contact_email', formData.email);
                                        }}
                                    >
                                        Save
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function BillingTab() {
    return (
        <div className="pb-page">
            <h1 className="type-page-title si-page-title pb-page-title">Plan &amp; billing</h1>
            <p className="type-lede si-page-lead pb-page-lead">
                Next invoice 1 September · ₹1,499 plus usage
            </p>
            <PlanBillingPanel />
        </div>
    );
}

function AdvancedTab({ user, showToast }) {
    // Advanced Settings State
    const [settings, setSettings] = useState({
        // Client Gallery
        cgDownloadCollection: true,
        cgDownloadPhoto: true,
        cgDownloadVideo: true,
        cgCreateFavoriteList: true,
        cgEmailRegistration: true,
        cgMarkPrivate: true,
        cgGalleryExpiring: true,
        cgPhotoReprocessError: true,

        // Store
        storeNewOrder: true,
        storeLabProcessed: true,
        storeLabShipped: true,

        // Studio Manager Payments
        smPaymentMade: true,
        smPaymentPastDue: true,
        smPaymentFailed: true,
        // Studio Manager Documents
        smContractSigned: true,
        smQuoteAccepted: true,
        smQuestionnaireCompleted: true,
        smDocExpired: true,
        // Studio Manager Sessions
        smSessionInquiry: true,
        smSessionConfirmed: true,
        smSessionUpcoming: true,

        // Others
        othersEmailBounced: true,
        othersReferralCredit: true,
        othersReferralSignup: true,
        othersReferralEnd: true,

        // Language
        language: 'English (US)'
    });

    // Expand/Collapse States
    const [openCategories, setOpenCategories] = useState({
        cg: true,
        store: true,
        sm: true,
        others: true
    });

    // Language Dropdown Open State
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const langRef = useRef(null);

    const [savingField, setSavingField] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        const stored = localStorage.getItem(`pixnxt_advanced_${user.id}`);
        if (stored) {
            try {
                setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
            } catch (e) {
                console.error("Error parsing advanced settings:", e);
            }
        }
    }, [user]);

    // Handle clicks outside language dropdown to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (langRef.current && !langRef.current.contains(event.target)) {
                setLangDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const saveSettings = (updated) => {
        if (!user?.id) return;
        setSavingField('saving');
        localStorage.setItem(`pixnxt_advanced_${user.id}`, JSON.stringify(updated));
        setTimeout(() => {
            setSavingField('');
            setSaveStatus('All changes saved');
            showToast('Advanced settings saved successfully!');
            setTimeout(() => setSaveStatus(''), 2500);
        }, 500);
    };

    const handleToggle = (key) => {
        const updated = { ...settings, [key]: !settings[key] };
        setSettings(updated);
        saveSettings(updated);
    };

    const toggleCategory = (cat) => {
        setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const handleLanguageSelect = (lang) => {
        const updated = { ...settings, language: lang };
        setSettings(updated);
        saveSettings(updated);
        setLangDropdownOpen(false);
    };

    const renderToggleRow = (label, key) => (
        <div className="flex items-center justify-between py-3.5 border-b border-[#f9f9f9] text-[16px]">
            <span className="text-[#333] font-normal">{label}</span>
            <div className="flex items-center gap-3 select-none">
                <button
                    onClick={() => handleToggle(key)}
                    className={`w-[44px] h-[24px] rounded-full transition-colors relative focus:outline-none ${settings[key] ? 'bg-[#1A1A1A]' : 'bg-[#e4e4e4]'}`}
                >
                    <span className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform shadow-[0_1px_3px_rgba(0,0,0,0.15)] ${settings[key] ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                </button>
                <span className="text-[15px] text-[#888] w-7 font-normal">{settings[key] ? 'On' : 'Off'}</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 pb-20 text-[#111]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-5">
                <div>
                    <h1 className="cg-page-title text-3xl font-medium mb-2">Advanced Settings</h1>
                </div>
            </div>

            {/* Notifications Sub-header */}
            <div>
                <span className="text-[13px] font-bold text-[#888] tracking-[0.15em] uppercase block mb-1">NOTIFICATIONS</span>
                <h2 className="text-[19px] font-semibold text-[#222] mb-6">Email Notifications</h2>
            </div>

            {/* Email Notifications Collapsible Container */}
            <div className="flex flex-col gap-5">
                {/* Category 1: Client Gallery */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('cg')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#F4F3F0]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            <span className="font-semibold text-[17px] text-[#222]">Client Gallery</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.cg ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.cg && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[14px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {renderToggleRow("Someone downloads a Delivery", "cgDownloadCollection")}
                                {renderToggleRow("Someone downloads a single photo", "cgDownloadPhoto")}
                                {renderToggleRow("Someone downloads a single video", "cgDownloadVideo")}
                                {renderToggleRow("Someone creates a new Favorite list", "cgCreateFavoriteList")}
                                {renderToggleRow("Someone creates a new email registration", "cgEmailRegistration")}
                                {renderToggleRow("Someone marks a photo as private", "cgMarkPrivate")}
                                {renderToggleRow("A gallery is expiring", "cgGalleryExpiring")}
                                {renderToggleRow("A photo is unable to be reprocessed", "cgPhotoReprocessError")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Category 2: Store */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('store')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#fff1f0]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            </div>
                            <span className="font-semibold text-[17px] text-[#222]">Store</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.store ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.store && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[14px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {renderToggleRow("Someone places a new Store order", "storeNewOrder")}
                                {renderToggleRow("A lab-fulfillment order has been processed", "storeLabProcessed")}
                                {renderToggleRow("A lab-fulfillment order has been shipped", "storeLabShipped")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Category 3: Studio Manager */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('sm')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#e8f5e9]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            </div>
                            <span className="font-semibold text-[17px] text-[#222]">Studio Manager</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.sm ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.sm && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[14px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {/* PAYMENTS */}
                                <div className="text-[12px] font-bold text-[#888] tracking-[0.15em] uppercase mt-4 mb-2">PAYMENTS</div>
                                {renderToggleRow("An invoice payment has been made", "smPaymentMade")}
                                {renderToggleRow("An invoice payment is past due", "smPaymentPastDue")}
                                {renderToggleRow("An invoice bank payment has failed", "smPaymentFailed")}

                                {/* DOCUMENTS */}
                                <div className="text-[12px] font-bold text-[#888] tracking-[0.15em] uppercase mt-6 mb-2">DOCUMENTS</div>
                                {renderToggleRow("A contract has been signed", "smContractSigned")}
                                {renderToggleRow("A quote has been accepted", "smQuoteAccepted")}
                                {renderToggleRow("A questionnaire has been completed", "smQuestionnaireCompleted")}
                                {renderToggleRow("A contract, quote, or questionnaire has expired", "smDocExpired")}

                                {/* SESSIONS */}
                                <div className="text-[12px] font-bold text-[#888] tracking-[0.15em] uppercase mt-6 mb-2">SESSIONS</div>
                                {renderToggleRow("A session inquiry has been received", "smSessionInquiry")}
                                {renderToggleRow("A session is confirmed, canceled, or rescheduled", "smSessionConfirmed")}
                                {renderToggleRow("A session is upcoming tomorrow", "smSessionUpcoming")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Category 4: Others */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('others')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#222] text-white font-bold text-[14px] select-none shadow-sm">P</div>
                            <span className="font-semibold text-[17px] text-[#222]">Others</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.others ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.others && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[14px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {renderToggleRow("An email was unable to be delivered", "othersEmailBounced")}
                                {renderToggleRow("You receive credit as a referral reward", "othersReferralCredit")}
                                {renderToggleRow("Someone you referred has signed up", "othersReferralSignup")}
                                {renderToggleRow("You are reaching the end of a referral period and have not upgraded yet", "othersReferralEnd")}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Language Section at the bottom */}
            <div className="bg-white border border-[#eeeeee] rounded-[2px] p-8 mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-semibold text-[#222]">Language</h2>
                    <span className="text-[11px] font-bold text-[#1890ff] bg-[#e6f7ff] border border-[#bae7ff] px-1.5 py-0.5 rounded-[2px] select-none tracking-wide">BETA</span>
                </div>

                {/* Custom Language Select Dropdown */}
                <div className="relative w-full max-w-[480px]" ref={langRef}>
                    <div 
                        className="flex items-center justify-between border border-[#ddd] bg-white px-4 py-2.5 text-[17px] text-[#111] cursor-pointer hover:border-[#aaa] transition-colors rounded-[2px]"
                        onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                    >
                        <span>{settings.language}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" className="mt-0.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    {langDropdownOpen && (
                        <div className="absolute top-[105%] left-0 w-full bg-white border border-[#ccc] rounded-[2px] shadow-lg z-[600] py-1 text-[17px]">
                            <div 
                                className={`px-4 py-2 cursor-pointer transition-colors ${settings.language === 'English (US)' ? 'bg-[#1890ff] text-white' : 'hover:bg-[#f5f5f5] text-[#222]'}`}
                                onClick={() => handleLanguageSelect('English (US)')}
                            >
                                English (US)
                            </div>
                            <div 
                                className={`px-4 py-2 cursor-pointer transition-colors ${settings.language === 'Español (Latinoamérica)' ? 'bg-[#1890ff] text-white' : 'hover:bg-[#f5f5f5] text-[#222]'}`}
                                onClick={() => handleLanguageSelect('Español (Latinoamérica)')}
                            >
                                Español (Latinoamérica)
                            </div>
                            <div 
                                className={`px-4 py-2 cursor-pointer transition-colors ${settings.language === 'Português (Brasil)' ? 'bg-[#1890ff] text-white' : 'hover:bg-[#f5f5f5] text-[#222]'}`}
                                onClick={() => handleLanguageSelect('Português (Brasil)')}
                            >
                                Português (Brasil)
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-[14px] text-[#888] leading-relaxed mt-1">
                    Choose your preferred language for the Pixieset dashboard. During the beta phase, this setting applies only to Client Gallery.
                </p>
            </div>
        </div>
    );
}

function ReferTab({ user, showToast }) {
    const [email, setEmail] = useState('');
    const [referralCode, setReferralCode] = useState(() => {
        return localStorage.getItem(`referral_code_${user?.id}`) || '';
    });
    const [referrals, setReferrals] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(`referrals_${user?.id}`)) || [];
        } catch {
            return [];
        }
    });
    const [loading, setLoading] = useState(!referralCode);
    const [isTrackingOpen, setIsTrackingOpen] = useState(true); // Open by default based on screenshot

    const stats = {
        totalConversions: referrals.filter(r => r.status === 'signed_up' || r.status === 'upgraded').length,
        totalEarned: referrals.reduce((sum, r) => sum + (r.earned_reward || 0), 0),
        creditBalance: referrals.reduce((sum, r) => sum + (r.earned_reward || 0), 0)
    };

    useEffect(() => {
        if (user?.id) {
            fetchReferralData();
        }
    }, [user]);

    const fetchReferralData = async () => {
        try {
            // 1. Get or generate referral code
            let { data: profile } = await supabase
                .from('photographers')
                .select('referral_code')
                .eq('id', user.id)
                .single();

            let code = referralCode;
            if (profile && !profile.referral_code) {
                // Generate a random code
                const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                await supabase
                    .from('photographers')
                    .update({ referral_code: newCode })
                    .eq('id', user.id);
                code = newCode;
            } else if (profile) {
                code = profile.referral_code;
            }

            if (code) {
                setReferralCode(code);
                localStorage.setItem(`referral_code_${user.id}`, code);
            }

            // 2. Fetch referrals
            const { data: referralData } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false });

            if (referralData) {
                // Deduplicate emails in case of dirty data
                const uniqueRefs = [];
                const seenEmails = new Set();
                for (const r of referralData) {
                    if (!seenEmails.has(r.referred_email)) {
                        seenEmails.add(r.referred_email);
                        uniqueRefs.push(r);
                    }
                }
                setReferrals(uniqueRefs);
                localStorage.setItem(`referrals_${user.id}`, JSON.stringify(uniqueRefs));
            }
        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/ref/${referralCode || 'YOUR_CODE'}`;
        navigator.clipboard.writeText(link);
        showToast('Referral link copied to clipboard!');
    };

    const handleSendInvite = async () => {
        if (!email) return;
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            showToast('Please enter a valid email address');
            return;
        }

        try {
            // Check if already invited
            const { data: existing } = await supabase
                .from('referrals')
                .select('id, status')
                .eq('referrer_id', user.id)
                .eq('referred_email', email)
                .maybeSingle();

            if (existing) {
                if (existing.status !== 'invited') {
                    showToast('This person has already signed up or upgraded.');
                    return;
                }
                showToast('Resending invite to this email...');
                // We don't insert a new row, we just proceed to email sending
            } else {
                // First insert into database
                const { error: dbError } = await supabase
                    .from('referrals')
                    .insert([{
                        referrer_id: user.id,
                        referred_email: email,
                        status: 'invited'
                    }]);

                if (dbError) throw dbError;
            }

            // Fetch user's profile to get their name
            const { data: profile } = await supabase
                .from('photographers')
                .select('display_name')
                .eq('id', user.id)
                .single();

            // Invoke the Edge Function to send the email
            const { error: emailError } = await supabase.functions.invoke('send-referral-invite', {
                body: {
                    email: email,
                    referralCode: referralCode,
                    photographerName: profile?.display_name || '',
                    siteOrigin: window.location.origin
                }
            });

            if (emailError) {
                console.error('Error triggering email:', emailError);
                // We still sent the invite to the DB, so we don't throw completely
                showToast('Invite logged, but email delivery failed.');
            } else {
                showToast('Invite sent successfully!');
            }
            
            setEmail('');
            fetchReferralData();
        } catch (error) {
            console.error('Error sending invite:', error);
            showToast('Failed to send invite. Have you created the table in Supabase?');
        }
    };

    if (loading) {
        return <div className="py-8 text-[#888]">Loading referral dashboard...</div>;
    }

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div>
                <h1 className="cg-page-title text-3xl font-medium mb-8 pb-6 border-b border-[#ECEAE6]">Referral Dashboard</h1>
                
                <div className="mb-10">
                    <h2 className="text-[17px] font-bold text-[#111] mb-2">Refer a studio</h2>
                    <p className="text-[15px] text-[#555] leading-relaxed">
                        Refer a studio — both of you get ₹1,500 in credit once they publish their first delivery.
                    </p>
                </div>

                <div className="mb-10">
                    <label className="acct-field-label">Your Referral Link</label>
                    <div className="flex items-center">
                        <div className="flex-1 bg-[#f5f5f5] border border-r-0 border-[#ddd] px-4 py-3 text-[16px] text-[#555] select-all overflow-hidden text-ellipsis whitespace-nowrap">
                            {window.location.origin}/ref/{referralCode || 'YOUR_CODE'}
                        </div>
                        <button 
                            onClick={handleCopyLink}
                            className="neu-pill acct-btn-primary px-6 py-3 text-[16px] font-medium whitespace-nowrap"
                        >
                            Copy Link
                        </button>
                    </div>
                </div>

                <div className="mb-12">
                    <label className="acct-field-label">Share With Friends</label>
                    <div className="flex items-center">
                        <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. friend@mail.com"
                            className="flex-1 border border-r-0 border-[#ddd] px-4 py-3 text-[16px] text-[#111] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                        />
                        <button 
                            onClick={handleSendInvite}
                            className="neu-pill acct-btn-primary px-6 py-3 text-[16px] font-medium whitespace-nowrap"
                        >
                            Send Invite
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="text-[17px] font-bold text-[#111] mb-6">Analytics</h2>
                    
                    <div className="flex flex-wrap gap-x-20 gap-y-6 mb-8">
                        <div>
                            <div className="flex items-center gap-1.5 text-[#555] text-[15px] mb-2">
                                Total conversions
                                <div className="text-[#999] cursor-help" title="Number of friends who signed up and upgraded">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </div>
                            </div>
                            <div className="text-[24px] text-[#111]">{stats.totalConversions}</div>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-[#555] text-[15px] mb-2">
                                Total earned
                                <div className="text-[#999] cursor-help" title="Total amount of referral credit you have earned">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </div>
                            </div>
                            <div className="text-[24px] text-[#111]">${stats.totalEarned.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-[#555] text-[15px] mb-2">
                                Credit balance
                                <div className="text-[#999] cursor-help" title="Current available referral credit">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </div>
                            </div>
                            <div className="text-[24px] text-[#111]">${stats.creditBalance.toFixed(2)}</div>
                        </div>
                    </div>

                    <div 
                        className="inline-flex items-center gap-1.5 text-[15px] text-[#1A1A1A] font-medium cursor-pointer hover:text-[#2d2d2d] transition-colors"
                        onClick={() => setIsTrackingOpen(!isTrackingOpen)}
                    >
                        Track referrals status
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${isTrackingOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    {isTrackingOpen && (
                        <div className="mt-8 overflow-x-auto">
                            <table className="w-full min-w-[600px] border-collapse table-fixed">
                                <thead>
                                    <tr className="border-b border-[#eee]">
                                        <th className="text-left py-4 text-[13px] font-bold text-[#555] pb-8 w-[25%] align-bottom">Referral</th>
                                        <th className="text-center py-4 pb-8 w-[18%] relative align-top">
                                            <div className="absolute top-[64px] bottom-[-20px] left-1/2 w-px bg-[#f3f3f3] -translate-x-1/2 z-0"></div>
                                            <div className="relative z-10 flex flex-col items-center gap-2.5">
                                                <span className="text-[13px] font-normal text-[#888]">Invited</span>
                                                <div className="w-[34px] h-[34px] rounded-full bg-[#fffcf3] text-[#f59e0b] flex items-center justify-center border border-[#fde68a]">
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                                </div>
                                            </div>
                                        </th>
                                        <th className="text-center py-4 pb-8 w-[18%] relative align-top">
                                            <div className="absolute top-[64px] bottom-[-20px] left-1/2 w-px bg-[#f3f3f3] -translate-x-1/2 z-0"></div>
                                            <div className="relative z-10 flex flex-col items-center gap-2.5">
                                                <span className="text-[13px] font-normal text-[#888]">Signed up</span>
                                                <div className="w-[34px] h-[34px] rounded-full bg-[#fffcf3] text-[#f59e0b] flex items-center justify-center border border-[#fde68a]">
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                </div>
                                            </div>
                                        </th>
                                        <th className="text-center py-4 pb-8 w-[18%] relative align-top">
                                            <div className="absolute top-[64px] bottom-[-20px] left-1/2 w-px bg-[#f3f3f3] -translate-x-1/2 z-0"></div>
                                            <div className="relative z-10 flex flex-col items-center gap-2.5">
                                                <span className="text-[13px] font-normal text-[#888]">Upgraded to a<br/>paid account</span>
                                                <div className="w-[34px] h-[34px] rounded-full bg-[#fffcf3] text-[#f59e0b] flex items-center justify-center border border-[#fde68a]">
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                </div>
                                            </div>
                                        </th>
                                        <th className="text-right py-4 text-[13px] font-bold text-[#555] pb-8 w-[21%] align-bottom">Earned Rewards</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referrals.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-8 text-center text-[#888] text-[15px]">
                                                No referrals yet. Share your link to get started!
                                            </td>
                                        </tr>
                                    ) : (
                                        referrals.map(ref => {
                                            const isSignedUp = ref.status === 'signed_up' || ref.status === 'upgraded';
                                            const isUpgraded = ref.status === 'upgraded';
                                            
                                            return (
                                                <tr key={ref.id} className="border-b border-[#eee]">
                                                    <td className="py-[30px] text-[15px] font-medium text-[#ccc] truncate pr-4">{ref.referred_email}</td>
                                                    <td colSpan="3" className="py-[30px] relative">
                                                        {/* Vertical lines connecting the rows */}
                                                        <div className="absolute top-[-20px] bottom-[-20px] left-[16.66%] w-px bg-[#f3f3f3] -translate-x-1/2 z-0"></div>
                                                        <div className="absolute top-[-20px] bottom-[-20px] left-[50%] w-px bg-[#f3f3f3] -translate-x-1/2 z-0"></div>
                                                        <div className="absolute top-[-20px] bottom-[-20px] left-[83.33%] w-px bg-[#f3f3f3] -translate-x-1/2 z-0"></div>

                                                        <div className="relative w-full flex items-center z-10 h-8">
                                                            {/* Active Track */}
                                                            <div className={`absolute top-1/2 left-[16.66%] w-[33.33%] h-[18px] -translate-y-1/2 z-10 transition-colors ${isSignedUp ? 'bg-[#f5f5f5]' : 'bg-transparent'}`}></div>
                                                            <div className={`absolute top-1/2 left-[50%] w-[33.33%] h-[18px] -translate-y-1/2 z-10 transition-colors ${isUpgraded ? 'bg-[#f5f5f5]' : 'bg-transparent'}`}></div>

                                                            {/* Node 1: Invited */}
                                                            <div className="absolute top-1/2 left-[16.66%] w-[34px] h-[18px] bg-[#f5f5f5] rounded-[4px] -translate-x-1/2 -translate-y-1/2 z-20"></div>
                                                            
                                                            {/* Node 2: Signed up */}
                                                            <div className={`absolute top-1/2 left-[50%] w-[34px] -translate-x-1/2 -translate-y-1/2 z-20 transition-all ${isSignedUp && !isUpgraded ? 'h-[34px] bg-[#f1f1f1] rounded-[8px] shadow-sm border border-[#fff]' : isUpgraded ? 'h-[18px] bg-[#f5f5f5]' : 'bg-transparent'}`}></div>
                                                            
                                                            {/* Node 3: Upgraded */}
                                                            <div className={`absolute top-1/2 left-[83.33%] w-[34px] -translate-x-1/2 -translate-y-1/2 z-20 transition-all ${isUpgraded ? 'h-[34px] bg-[#f1f1f1] rounded-[8px] shadow-sm border border-[#fff]' : 'bg-transparent'}`}></div>
                                                        </div>
                                                    </td>
                                                    <td className="py-[30px] text-right">
                                                        <div className={`inline-flex items-center justify-center px-[22px] py-1.5 rounded-full text-[15px] font-medium transition-colors ${ref.earned_reward > 0 ? 'bg-[#F4F3F0] text-[#1A1A1A]' : 'bg-[#f2fcfa] text-[#1A1A1A] opacity-40'}`}>
                                                            ${(ref.earned_reward || 0).toFixed(2)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
