import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import {
    Bell,
    Home,
    ChevronDown,
    User,
    CreditCard,
    UserPlus,
    LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getUserDisplayLabel, getUserInitial } from '../lib/userInitials';
import { cn } from '../lib/utils';
import {
    products,
    getProductById,
    getProductNavItems,
    isProductActive,
} from '../lib/products';
import ClientGalleryNotifications from './features/ClientGallery/ClientGalleryNotifications';
import { userStorageService } from '../services/userStorage.service';
import { getThemeMode, setThemeMode, THEME_CHANGE_EVENT } from '../lib/appearanceTheme';
import brandPng from '../assets/icons/client gallery.png';
import smartAlbumPng from '../assets/icons/smart album.png';
import dashboardPng from '../assets/icons/dashboard.png';
import '../styles/clientGalleryTheme.css';
import '../pages/ClientGallery.css';
import './SidebarLayout.css';

const PRODUCT_IMAGES = {
    'client-gallery': brandPng,
    'album-proofer': smartAlbumPng,
    'smart-albums': smartAlbumPng,
};

/**
 * Shared product shell used by Client Gallery, Album Proofer, Mobile Gallery, etc.
 * Pass `productId` to switch the active product label + in-product nav.
 */
const SidebarLayout = ({
    children,
    productId = 'client-gallery',
    headerActions = null,
    shellClassName = '',
    navCounts = null,
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const [showContextDropdown, setShowContextDropdown] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const appDropdownRef = useRef(null);
    const contextDropdownRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const { user, logout } = useAuth();
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [themeMode, setThemeModeState] = useState(() => getThemeMode());
    const [profile, setProfile] = useState(() => {
        if (typeof window !== 'undefined' && user?.id) {
            const cached = localStorage.getItem(`photographer_profile_${user.id}`);
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    });

    const activeProduct = useMemo(
        () => getProductById(productId) || products[0],
        [productId],
    );
    const navItems = useMemo(() => getProductNavItems(productId), [productId]);

    const workNavItems = useMemo(
        () => navItems.filter((item) => item.section === 'work' || !item.section),
        [navItems],
    );
    const studioNavItems = useMemo(
        () => navItems.filter((item) => item.section === 'studio'),
        [navItems],
    );
    const hasSections = studioNavItems.length > 0;

    const profileIconUrl = profile?.profile_icon_url?.trim() || '';
    const userInitial = getUserInitial(user);
    const userDisplayLabel = getUserDisplayLabel(user);

    useEffect(() => {
        const sync = () => setThemeModeState(getThemeMode());
        window.addEventListener(THEME_CHANGE_EVENT, sync);
        return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
    }, []);

    const handleThemeModeChange = (mode) => {
        setThemeModeState(setThemeMode(mode));
    };

    const renderBrandIcon = () =>
        profileIconUrl ? (
            <img
                src={profileIconUrl}
                alt=""
                className="sb-brand__logo"
            />
        ) : (
            <span className="sb-brand__mark" aria-hidden>{userInitial}</span>
        );

    const [realStorageBytes, setRealStorageBytes] = useState(() => {
        return userStorageService.getCachedStorageBytes(user?.id);
    });

    useEffect(() => {
        if (!user?.id) {
            setProfile(null);
            return;
        }

        const cached = localStorage.getItem(`photographer_profile_${user.id}`);
        if (cached) {
            try {
                setProfile(JSON.parse(cached));
            } catch (e) {
                console.warn('Failed to parse cached photographer profile:', e);
            }
        }

        supabase
            .from('photographers')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    setProfile(data);
                    localStorage.setItem(`photographer_profile_${user.id}`, JSON.stringify(data));
                }
            })
            .catch((err) => console.error('Error loading photographer profile:', err));
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        userStorageService
            .calculateUserStorageBytes(user, profile)
            .then((bytes) => {
                if (typeof bytes === 'number' && bytes >= 0) {
                    setRealStorageBytes(bytes);
                }
            })
            .catch((err) => console.error('Error calculating real storage:', err));
    }, [user, profile?.display_name, profile?.email]);

    const usedBytes = realStorageBytes || profile?.storage_used_bytes || 0;
    const limitBytes = profile?.storage_limit_bytes;

    const formatStorage = (bytes) => {
        if (!bytes || bytes <= 0) return '0 MB';
        const tbLimit = 1024 * 1024 * 1024 * 1024;
        const gbLimit = 1024 * 1024 * 1024;

        if (bytes >= tbLimit) {
            return `${(bytes / tbLimit).toFixed(2)} TB`.replace(/\.00 /, ' ');
        }
        if (bytes >= gbLimit) {
            return `${(bytes / gbLimit).toFixed(2)} GB`.replace(/\.00 /, ' ');
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`.replace(/\.00 /, ' ');
    };

    const getLimitBytes = () => {
        if (limitBytes) return limitBytes;
        const tier = String(profile?.plan || '').toLowerCase();
        if (tier === 'pro') return 100 * 1024 * 1024 * 1024;
        if (tier === 'premium') return 500 * 1024 * 1024 * 1024;
        if (tier === 'free') return 5 * 1024 * 1024 * 1024;
        return 10 * 1024 * 1024 * 1024;
    };

    const maxBytes = getLimitBytes();
    const storagePct = Math.min(100, maxBytes > 0 ? (usedBytes / maxBytes) * 100 : 0);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (appDropdownRef.current && !appDropdownRef.current.contains(e.target)) {
                setShowAppDropdown(false);
            }
            if (contextDropdownRef.current && !contextDropdownRef.current.contains(e.target)) {
                setShowContextDropdown(false);
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
                setShowProfileDropdown(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowAppDropdown(false);
                setShowContextDropdown(false);
                setShowProfileDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const renderProductIcon = (product, active) => {
        const img = PRODUCT_IMAGES[product.id];
        if (img) {
            return <img src={img} alt="" className="size-5 object-contain mix-blend-multiply" />;
        }
        const Icon = product.icon;
        return <Icon className={cn('size-4', active ? 'text-white' : 'text-[#1A1A1A]')} />;
    };

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

    const renderProfileDropdown = (positionClasses) => {
        const isProfileActive = location.pathname.startsWith('/account/profile') || location.pathname === '/account' || (!location.pathname.startsWith('/account/billing') && !location.pathname.startsWith('/account/team'));

        return (
            <div className={cn("sb-profile-menu absolute", positionClasses)}>
                {/* STUDIO SECTION */}
                <span className="sb-profile-menu__section-title">STUDIO</span>

                <div className="flex flex-col gap-0.5">
                    <button
                        type="button"
                        onClick={() => { navigate('/account/profile'); setShowProfileDropdown(false); }}
                        className={cn(
                            "sb-profile-menu__item",
                            isProfileActive && "sb-profile-menu__item--active"
                        )}
                    >
                        <User className="size-4 shrink-0 text-[#2C2825]" strokeWidth={1.75} />
                        <span>Profile</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { navigate('/account/billing'); setShowProfileDropdown(false); }}
                        className={cn(
                            "sb-profile-menu__item",
                            location.pathname.startsWith('/account/billing') && "sb-profile-menu__item--active"
                        )}
                    >
                        <CreditCard className="size-4 shrink-0 text-[#2C2825]" strokeWidth={1.75} />
                        <span>Plan &amp; billing</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { navigate('/account/team'); setShowProfileDropdown(false); }}
                        className={cn(
                            "sb-profile-menu__item",
                            location.pathname.startsWith('/account/team') && "sb-profile-menu__item--active"
                        )}
                    >
                        <UserPlus className="size-4 shrink-0 text-[#2C2825]" strokeWidth={1.75} />
                        <span>Team</span>
                    </button>
                </div>

                {/* DIVIDER 1 */}
                <div className="sb-profile-menu__divider" />

                {/* APPEARANCE SECTION */}
                <span className="sb-profile-menu__section-title">APPEARANCE</span>

                <div className="sb-appearance-track" role="group" aria-label="Appearance">
                    {[
                        { id: 'light', label: 'Light' },
                        { id: 'auto', label: 'Auto' },
                        { id: 'dark', label: 'Dark' },
                    ].map(({ id, label }) => {
                        const isActive = themeMode === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                className={cn(
                                    "sb-appearance-btn",
                                    isActive && "sb-appearance-btn--active"
                                )}
                                aria-pressed={isActive}
                                onClick={() => handleThemeModeChange(id)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* DIVIDER 2 */}
                <div className="sb-profile-menu__divider" />

                {/* SIGN OUT */}
                <button
                    type="button"
                    onClick={async () => {
                        try {
                            await logout();
                            navigate('/');
                        } catch (err) {
                            console.error('Logout failed', err);
                        }
                    }}
                    className="sb-profile-menu__item"
                >
                    <LogOut className="size-4 shrink-0 text-[#2C2825]" strokeWidth={1.75} />
                    <span>Sign out</span>
                </button>
            </div>
        );
    };

    const HomeMenu = () => (
        <div ref={appDropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setShowAppDropdown((v) => !v)}
                className="sb-icon-btn"
                aria-label="Home / switch products"
                aria-expanded={showAppDropdown}
            >
                <Home className="size-4" strokeWidth={1.75} />
            </button>

            {showAppDropdown && (
                <>
                    <div
                        className="cg-app-switcher-backdrop md:hidden"
                        onClick={() => setShowAppDropdown(false)}
                        aria-hidden
                    />
                    <div className="cg-app-switcher-dropdown" role="menu">
                        <button
                            type="button"
                            onClick={() => { navigate('/dashboard'); setShowAppDropdown(false); setIsMobileMenuOpen(false); }}
                            className="cg-app-switcher-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#F4F3F0]"
                        >
                            <span className="cg-app-switcher-item__icon inline-flex size-9 items-center justify-center rounded-lg bg-[#F4F3F0]">
                                <img src={dashboardPng} alt="" className="size-4 object-contain" />
                            </span>
                            Home
                        </button>

                        <p className="cg-app-switcher-label px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-[#71717A]">
                            Pixnxt Ecosystem
                        </p>

                        {products.map((product) => {
                            const active = isProductActive(product.href, path);
                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => { navigate(product.href); setShowAppDropdown(false); setIsMobileMenuOpen(false); }}
                                    className={cn(
                                        'cg-app-switcher-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[#F4F3F0]',
                                        active && 'cg-app-switcher-item--active neu-glow-pill',
                                    )}
                                >
                                    <span className={cn(
                                        'cg-app-switcher-item__icon inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
                                        active ? 'cg-app-switcher-item__icon--on bg-[#1A1A1A] text-white' : 'bg-[#F4F3F0] text-[#1A1A1A]',
                                    )}>
                                        {renderProductIcon(product, active)}
                                    </span>
                                    <span className="min-w-0 flex-1 text-left">
                                        <span className="flex items-center gap-2">
                                            <span className="cg-app-switcher-item__name font-medium text-[#1A1A1A]">{product.name}</span>
                                            {active && (
                                                <span className="cg-app-switcher-item__badge rounded-full bg-[#1A1A1A]/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-[#1A1A1A]">Current</span>
                                            )}
                                        </span>
                                        <span className="cg-app-switcher-item__tagline block truncate text-xs text-[#71717A]">{product.tagline}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    const defaultNotifications =
        productId === 'client-gallery' ? (
            <ClientGalleryNotifications userId={user?.id} variant="sidebar" />
        ) : (
            <button type="button" className="sb-icon-btn" aria-label="Notifications">
                <Bell className="size-4" strokeWidth={1.75} />
            </button>
        );

    const renderNavButton = (item) => {
        const active = item.match(path);
        const Icon = item.icon;
        const count =
            item.countKey && navCounts && typeof navCounts[item.countKey] === 'number'
                ? navCounts[item.countKey]
                : null;
        return (
            <button
                key={item.href}
                type="button"
                onClick={() => {
                    navigate(item.href);
                    setIsMobileMenuOpen(false);
                }}
                className={cn('sb-nav-item', active && 'sb-nav-item--active')}
            >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="sb-nav-item__label">{item.label}</span>
                {count != null && (
                    <span className="sb-nav-item__count">{count}</span>
                )}
            </button>
        );
    };

    return (
        <div className={cn(
            'theme-mono cg-shell flex flex-col md:flex-row min-h-screen md:h-screen w-full max-w-[100vw] overflow-x-hidden md:overflow-hidden',
            shellClassName,
        )}>
            <button
                type="button"
                className="fixed top-4 right-4 z-[1100] neu-circle size-10 items-center justify-center text-[#1A1A1A] cursor-pointer flex md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[900] md:hidden" onClick={() => setIsMobileMenuOpen(false)} aria-hidden />
            )}

            <aside className={cn(
                'sb-aside fixed md:static top-0 h-screen shrink-0 flex-col justify-between z-[1000] md:z-10 transition-[left] duration-300 overflow-visible',
                isMobileMenuOpen ? 'left-0 flex shadow-2xl' : '-left-60 hidden md:flex',
            )}>
                <div className="flex flex-1 flex-col min-h-0">
                    <div className="sb-aside__header relative z-20 shrink-0 overflow-visible flex items-center justify-between gap-2">
                        <div className="sb-brand min-w-0">
                            {renderBrandIcon()}
                        </div>
                        <div className="sb-header-actions">
                            {headerActions || defaultNotifications}
                            <HomeMenu />
                        </div>
                    </div>

                    <nav className="sb-nav flex flex-1 flex-col neu-scroll overflow-y-auto min-h-0">
                        <div ref={contextDropdownRef} className="sb-product-wrap relative">
                            <button
                                type="button"
                                onClick={() => setShowContextDropdown((v) => !v)}
                                className="sb-product-btn"
                                aria-expanded={showContextDropdown}
                            >
                                <span className="truncate">{activeProduct.name}</span>
                                <span className="sb-product-btn__chevron" aria-hidden>
                                    <ChevronDown className="size-3.5" strokeWidth={2} />
                                </span>
                            </button>
                            {showContextDropdown && (
                                <div className="sb-product-menu absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl bg-white p-1.5 shadow-xl shadow-black/10 border border-[#ECEAE6]">
                                    {products.map((item) => {
                                        const active = isProductActive(item.href, path);
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => { navigate(item.href); setShowContextDropdown(false); setIsMobileMenuOpen(false); }}
                                                className={cn(
                                                    'sb-product-menu__item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[#F4F3F0]',
                                                    active && 'sb-product-menu__item--active bg-[#F4F3F0]',
                                                )}
                                            >
                                                <span className="sb-product-menu__icon inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[#F4F3F0]">
                                                    <Icon className="size-3.5" />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                                                {active && <span className="sb-product-menu__dot size-1.5 shrink-0 rounded-full bg-[#1A1A1A]" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {hasSections ? (
                            <>
                                <p className="sb-nav-section">Work</p>
                                {workNavItems.map(renderNavButton)}
                                <p className="sb-nav-section sb-nav-section--studio">Studio</p>
                                {studioNavItems.map(renderNavButton)}
                            </>
                        ) : (
                            workNavItems.map(renderNavButton)
                        )}
                    </nav>
                </div>

                <div className="sb-aside__footer">
                    <div className="relative" ref={profileDropdownRef}>
                        {showProfileDropdown && renderProfileDropdown('bottom-full left-0 mb-2.5')}

                        <div className="sb-storage">
                            <div className="flex items-center justify-between gap-2">
                                <span className="sb-storage__label">STORAGE</span>
                                <span className="sb-storage__meta">
                                    {formatStorageDisplay(usedBytes, maxBytes)}
                                </span>
                            </div>
                            <div className="sb-storage__bar">
                                <div className="sb-storage__bar-fill" style={{ width: `${storagePct}%` }} />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowProfileDropdown((v) => !v)}
                            className="sb-profile-btn"
                        >
                            <span className="sb-profile-btn__avatar">{userInitial}</span>
                            <span className="min-w-0 flex-1">
                                <span className="sb-profile-btn__name">{userDisplayLabel}</span>
                                <span className="sb-profile-btn__role">Studio owner</span>
                            </span>
                            <ChevronDown className={cn('size-4 shrink-0 text-[#8C827A] transition-transform duration-200', showProfileDropdown && 'rotate-180')} />
                        </button>
                    </div>
                </div>
            </aside>

            <div className="sb-main flex-1 flex flex-col min-h-screen md:h-screen w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto md:overflow-hidden pt-14 md:pt-0">
                {children}
            </div>
        </div>
    );
};

export default SidebarLayout;
