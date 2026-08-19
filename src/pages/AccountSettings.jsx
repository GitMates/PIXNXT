import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, CreditCard, User, ChevronLeft, LogOut } from 'lucide-react';
import { galleryService } from '../services/gallery.service';
import { useAuth } from '../hooks/useAuth';
import { getUserDisplayLabel, getUserInitial } from '../lib/userInitials';
import { supabase } from '../lib/supabase/client';
import AccountTopbarIcons from '../components/account/AccountTopbarIcons';
import { ClientGallerySubpageTabs } from '../components/features/ClientGallery/ClientGalleryPageShell';
import StudioIdentityPanel from '../components/features/Settings/StudioIdentityPanel';
import LegalConsentPanel from '../components/features/Settings/LegalConsentPanel';
import PlanBillingPanel from '../components/features/Settings/PlanBillingPanel';
import YourAccountPanel from '../components/features/Settings/YourAccountPanel';
import { getThemeMode, setThemeMode, THEME_CHANGE_EVENT } from '../lib/appearanceTheme';
import { userStorageService, getStorageLimitBytes, formatStorageMeter } from '../services/userStorage.service';
import {
    readAccountBack,
    writeAccountBack,
    resolveAccountBack,
} from '../lib/accountBackNav';
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

export default function AccountSettings() {
    const { tab } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const activeTab = tab || 'account';
    const useStudioShell = STUDIO_SHELL_TABS.has(activeTab);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [toastMessage, setToastMessage] = useState('');
    const [studioProfile, setStudioProfile] = useState(null);
    const [themeMode, setThemeModeState] = useState(() => getThemeMode());
    const [usedBytes, setUsedBytes] = useState(() =>
        userStorageService.getCachedStorageBytes(user?.id),
    );
    const [backTarget, setBackTarget] = useState(
        () => readAccountBack() || { path: '/dashboard', label: 'Dashboard' },
    );

    useEffect(() => {
        if (activeTab === 'profile') {
            navigate('/account/account', { replace: true });
        }
    }, [activeTab, navigate]);

    useEffect(() => {
        const fromState = location.state?.from;
        if (fromState) {
            const resolved =
                typeof fromState === 'string'
                    ? resolveAccountBack(fromState)
                    : {
                          path: fromState.path || '/dashboard',
                          label: fromState.label || resolveAccountBack(fromState.path).label,
                      };
            if (resolved.path && !resolved.path.startsWith('/account')) {
                writeAccountBack(resolved);
                setBackTarget(resolved);
                return;
            }
        }
        const cached = readAccountBack();
        if (cached) setBackTarget(cached);
    }, [location.state]);

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

    const maxBytes = useMemo(() => getStorageLimitBytes(studioProfile), [studioProfile]);

    const storagePct = useMemo(() => {
        if (!maxBytes) return 0;
        return Math.min(100, (usedBytes / maxBytes) * 100);
    }, [usedBytes, maxBytes]);

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
    }, [user?.id, useStudioShell]);

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
            {(activeTab === 'profile' || activeTab === 'account') && (
                <YourAccountTab user={user} showToast={showToast} />
            )}
            {activeTab === 'legal-consent' && (
                <LegalConsentTab showToast={showToast} studioName={businessName} />
            )}
            {activeTab === 'studio-identity' && (
                <StudioIdentityTab user={user} showToast={showToast} embedded />
            )}
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
                        onClick={() => navigate(backTarget.path || '/dashboard')}
                    >
                        <ChevronLeft size={15} strokeWidth={2} />
                        Back to {backTarget.label || 'Dashboard'}
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
                                    {formatStorageMeter(usedBytes, maxBytes)}
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

function YourAccountTab({ user, showToast }) {
    return (
        <div className="ya-page">
            <h1 className="type-page-title si-page-title ya-page-title">Your account</h1>
            <p className="type-lede si-page-lead ya-page-lead">
                Your sign-in, your devices, what you get told.
            </p>
            <YourAccountPanel user={user} showToast={showToast} />
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
                            Copy
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
