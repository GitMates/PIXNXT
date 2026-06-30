import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { galleryService } from '../../services/gallery.service';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { formatStorageBytes } from '../../utils/formatStorageBytes';
import { products } from '../../lib/products';
import SmartAlbumNotifications from './SmartAlbumNotifications';
import '../portal/portal.css';
import './SmartAlbumsSidebar.css';

const AlbumNavIcon = () => (
    <svg className="sa-sidebar-nav-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="14" y2="10" />
    </svg>
);

const AwaitingNavIcon = () => (
    <svg className="sa-sidebar-nav-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const ApprovedNavIcon = () => (
    <svg className="sa-sidebar-nav-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const SettingsNavIcon = () => (
    <svg className="sa-sidebar-nav-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const ModuleBookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

function getProfileDisplayName(profile, user) {
    const fromProfile =
        profile?.business_name?.trim() ||
        profile?.display_name?.trim() ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    if (fromProfile) return fromProfile;
    if (user?.email) return user.email.split('@')[0];
    return 'Studio';
}

function splitBrandLines(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { primary: 'STUDIO', subtitle: 'PHOTOGRAPHY' };
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        return { primary: parts[0].toUpperCase(), subtitle: 'PHOTOGRAPHY' };
    }
    return {
        primary: parts[0].toUpperCase(),
        subtitle: parts.slice(1).join(' ').toUpperCase(),
    };
}

function getProfileInitial(profile, user) {
    const name = getProfileDisplayName(profile, user);
    if (name) return name.charAt(0).toUpperCase();
    return 'N';
}

const NAV_ITEMS = [
    { key: 'albums', label: 'Albums', path: '/smart-albums', icon: AlbumNavIcon, match: (path) => path === '/smart-albums' || path === '/smart-albums/' },
    { key: 'awaiting', label: 'Awaiting feedback', path: '/smart-albums/awaiting', icon: AwaitingNavIcon, match: (path) => path.startsWith('/smart-albums/awaiting') },
    { key: 'approved', label: 'Approved', path: '/smart-albums/approved', icon: ApprovedNavIcon, match: (path) => path.startsWith('/smart-albums/approved') },
    { key: 'settings', label: 'Settings', path: '/smart-albums/settings', icon: SettingsNavIcon, match: (path) => path.startsWith('/smart-albums/settings') },
];

const STORAGE_LIMIT_BYTES = 100 * 1024 ** 3;

const SmartAlbumsSidebarLayout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showEcosystemMenu, setShowEcosystemMenu] = useState(false);
    const [profile, setProfile] = useState(null);
    const [storageUsed, setStorageUsed] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const ecosystemMenuRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const { user, logout } = useAuth();

    const displayName = getProfileDisplayName(profile, user);
    const { primary: brandPrimary, subtitle: brandSubtitle } = splitBrandLines(displayName);
    const profileIconUrl = profile?.profile_icon_url?.trim() || '';
    const profileInitial = getProfileInitial(profile, user);
    const storagePct = Math.min(100, (storageUsed / STORAGE_LIMIT_BYTES) * 100);

    useEffect(() => {
        if (!user?.id) {
            setProfile(null);
            return undefined;
        }
        let cancelled = false;
        galleryService
            .getPhotographerProfile(user.id)
            .then((data) => {
                if (!cancelled) setProfile(data);
            })
            .catch(() => {
                if (!cancelled) setProfile(null);
            });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) {
            setStorageUsed(0);
            return undefined;
        }
        let cancelled = false;
        smartAlbumsService
            .getAlbums(user.id)
            .then((albums) => {
                if (cancelled) return;
                const total = (albums || []).reduce(
                    (sum, album) => sum + (Number(album.storage_bytes) || 0),
                    0
                );
                setStorageUsed(total);
            })
            .catch(() => {
                if (!cancelled) setStorageUsed(0);
            });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ecosystemMenuRef.current && !ecosystemMenuRef.current.contains(e.target)) {
                setShowEcosystemMenu(false);
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
                setShowProfileDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const renderBrandIcon = (className) =>
        profileIconUrl ? (
            <img src={profileIconUrl} alt="" className={className} />
        ) : (
            <span className={`${className} sa-sidebar-brand-icon--fallback`}>{profileInitial}</span>
        );

    const renderProfileDropdown = () => (
        <div className="sa-profile-dropdown">
            <div className="sa-profile-dropdown-header">
                {renderBrandIcon('sa-sidebar-brand-icon')}
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1A1A1A] truncate">{displayName}</div>
                    <div className="text-xs text-[#888] truncate">{user?.email || ''}</div>
                </div>
            </div>
            <div
                className="sa-profile-dropdown-item"
                onClick={() => {
                    navigate('/account/profile');
                    setShowProfileDropdown(false);
                    setIsMobileMenuOpen(false);
                }}
            >
                Profile
            </div>
            <div
                className="sa-profile-dropdown-item"
                onClick={async () => {
                    try {
                        await logout();
                        navigate('/auth');
                    } catch (err) {
                        console.error('Logout failed', err);
                    }
                }}
            >
                Log Out
            </div>
        </div>
    );

    const handleGoToDashboard = () => {
        navigate('/dashboard');
        setIsMobileMenuOpen(false);
    };

    const isProductActive = (href) => {
        if (href === '/smart-albums') {
            return path === '/smart-albums' || path.startsWith('/smart-albums/');
        }
        return path.startsWith(href);
    };

    const handleEcosystemNavigate = (href) => {
        navigate(href);
        setShowEcosystemMenu(false);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="theme-mono flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[oklch(0.968_0.006_85)] md:overflow-hidden">
            <button
                className="fixed top-4 right-4 z-[1100] w-10 h-10 border-none rounded-full bg-[#1A1A1A] text-white cursor-pointer shadow-lg flex items-center justify-center md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                type="button"
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-[900] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            <aside
                className={`sa-sidebar fixed md:static top-0 h-screen flex flex-col shrink-0 z-[1000] transition-[left] duration-300 ease ${
                    isMobileMenuOpen ? 'left-0' : '-left-[280px]'
                } md:left-0 overflow-y-auto neu-scroll`}
            >
                <div className="sa-sidebar-header">
                    <div className="sa-sidebar-brand">
                        {renderBrandIcon('sa-sidebar-brand-icon')}
                        <div className="sa-sidebar-brand-text">
                            <span className="sa-sidebar-brand-name">{brandPrimary}</span>
                            <span className="sa-sidebar-brand-sub">{brandSubtitle}</span>
                        </div>
                    </div>
                    <div className="sa-sidebar-actions">
                        <SmartAlbumNotifications userId={user?.id} variant="sidebar" />
                        <button
                            type="button"
                            className="sa-sidebar-grid-btn neu-circle"
                            onClick={handleGoToDashboard}
                            aria-label="Go to dashboard"
                            title="Dashboard"
                        >
                            <GridIcon />
                        </button>
                    </div>
                </div>

                <div className="sa-sidebar-module-wrap" ref={ecosystemMenuRef}>
                    <button
                        type="button"
                        className={`sa-sidebar-module${showEcosystemMenu ? ' sa-sidebar-module--open' : ''}`}
                        onClick={() => setShowEcosystemMenu((open) => !open)}
                        aria-expanded={showEcosystemMenu}
                        aria-haspopup="menu"
                    >
                        <span className="sa-sidebar-module-icon">
                            <ModuleBookIcon />
                        </span>
                        <span className="sa-sidebar-module-label">Album Proofer</span>
                        <svg
                            className={`sa-sidebar-module-chevron${showEcosystemMenu ? ' sa-sidebar-module-chevron--open' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {showEcosystemMenu && (
                        <div className="sa-ecosystem-menu" role="menu" aria-label="Pixnxt Ecosystem">
                            <p className="sa-ecosystem-menu__heading">Pixnxt Ecosystem</p>
                            <ul className="sa-ecosystem-menu__list">
                                {products.map((product) => {
                                    const active = isProductActive(product.href);
                                    const ProductIcon = product.icon;
                                    return (
                                        <li key={product.id}>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={`sa-ecosystem-menu__item${active ? ' sa-ecosystem-menu__item--active' : ''}`}
                                                onClick={() => handleEcosystemNavigate(product.href)}
                                            >
                                                <span
                                                    className={`sa-ecosystem-menu__icon${active ? ' sa-ecosystem-menu__icon--active' : ''}`}
                                                >
                                                    <ProductIcon size={16} strokeWidth={1.75} aria-hidden />
                                                </span>
                                                <span className="sa-ecosystem-menu__text">
                                                    <span className="sa-ecosystem-menu__title-row">
                                                        <span className="sa-ecosystem-menu__name">{product.name}</span>
                                                        {active ? (
                                                            <span className="sa-ecosystem-menu__badge">Current</span>
                                                        ) : null}
                                                    </span>
                                                    <span className="sa-ecosystem-menu__tagline">{product.tagline}</span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="sa-sidebar-divider" />

                <nav className="sa-sidebar-nav">
                    {NAV_ITEMS.map((item) => {
                        const active = item.match(path);
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                className={`sa-sidebar-nav-item${active ? ' sa-sidebar-nav-item--active' : ''}`}
                                onClick={() => {
                                    navigate(item.path);
                                    setIsMobileMenuOpen(false);
                                }}
                            >
                                <Icon />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="sa-sidebar-footer">
                    <div className="sa-sidebar-divider sa-sidebar-divider--footer" />
                    <div className="sa-sidebar-storage neu-raised">
                        <div className="sa-sidebar-storage__head">
                            <span className="sa-sidebar-storage__label">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                </svg>
                                Storage
                            </span>
                            <button type="button" className="sa-sidebar-storage__add" aria-label="Upgrade storage">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        </div>
                        <div className="sa-sidebar-storage__bar">
                            <div className="sa-sidebar-storage__fill" style={{ width: `${storagePct}%` }} />
                        </div>
                        <p className="sa-sidebar-storage__text">
                            {formatStorageBytes(storageUsed)} of 100 GB used
                        </p>
                    </div>
                    <div className="sa-sidebar-profile-row" ref={profileDropdownRef}>
                        <button
                            type="button"
                            className="sa-sidebar-profile-btn"
                            onClick={() => setShowProfileDropdown((open) => !open)}
                            aria-label="Account menu"
                            title={displayName}
                        >
                            {profileInitial}
                        </button>
                        {showProfileDropdown && renderProfileDropdown()}
                    </div>
                </div>
            </aside>

            <div className="sa-sidebar-main flex-1 flex flex-col min-h-screen md:h-screen w-full md:w-auto overflow-auto">
                {children}
            </div>
        </div>
    );
};

export default SmartAlbumsSidebarLayout;
