import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import {
    Bell,
    Home,
    ChevronDown,
    Database,
    Plus,
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
import brandPng from '../assets/icons/client gallery.png';
import smartAlbumPng from '../assets/icons/smart album.png';
import dashboardPng from '../assets/icons/dashboard.png';
import '../styles/clientGalleryTheme.css';
import '../pages/ClientGallery.css';

const PRODUCT_IMAGES = {
    'client-gallery': brandPng,
    'smart-albums': smartAlbumPng,
};

/**
 * Shared product shell used by Client Gallery, Smart Albums, Mobile Gallery, etc.
 * Pass `productId` to switch the active product label + in-product nav.
 */
const SidebarLayout = ({ children, productId = 'client-gallery', headerActions = null }) => {
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

    const getProfileDisplayName = () => {
        const fromProfile =
            profile?.business_name?.trim() ||
            profile?.display_name?.trim() ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
        if (fromProfile) return fromProfile;
        if (user?.email) return user.email.split('@')[0];
        return 'Studio';
    };

    const splitBrandLines = (name) => {
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
    };

    const displayName = getProfileDisplayName();
    const { primary: brandPrimary, subtitle: brandSubtitle } = splitBrandLines(displayName);
    const profileIconUrl = profile?.profile_icon_url?.trim() || '';

    const renderBrandIcon = () =>
        profileIconUrl ? (
            <img src={profileIconUrl} alt="" className="w-10 h-10 rounded-[10px] object-cover shrink-0" />
        ) : (
            <span className="w-10 h-10 rounded-[10px] bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">{userInitial}</span>
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
        if (!bytes || bytes <= 0) return '0.00 MB';
        const tbLimit = 1024 * 1024 * 1024 * 1024;
        const gbLimit = 1024 * 1024 * 1024;

        if (bytes >= tbLimit) {
            return `${(bytes / tbLimit).toFixed(2)} TB`;
        }
        if (bytes >= gbLimit) {
            return `${(bytes / gbLimit).toFixed(2)} GB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

    const userInitial = getUserInitial(user);
    const userDisplayLabel = getUserDisplayLabel(user);

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

    const renderProfileDropdown = (positionClasses) => (
        <div className={`absolute ${positionClasses} w-[280px] rounded-2xl bg-white shadow-xl shadow-black/10 z-[500] py-1 animate-[cgFadeIn_0.15s_ease] border border-[#ECEAE6]`}>
            <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium bg-[#1A1A1A] text-white">
                    {userInitial}
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="text-base font-medium text-[#1A1A1A] truncate">{userDisplayLabel}</div>
                    <div className="text-sm text-[#71717A] truncate">{user?.email}</div>
                </div>
            </div>

            <div className="px-5 py-3 text-base text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 font-medium border-b border-[#eeeeee]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                Invite Friends & Get $20
            </div>

            {[
                { label: 'Profile', path: '/account/profile', icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /> },
                { label: 'Billing', path: '/account/billing', icon: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></> },
                { label: 'Advanced Settings', path: '/account/advanced', icon: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></> },
                { label: 'Account', path: '/account/details', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></> },
            ].map((item) => (
                <div
                    key={item.path}
                    className="px-5 py-3 text-base text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
                    onClick={() => {
                        navigate(item.path);
                        setShowProfileDropdown(false);
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                    {item.label}
                </div>
            ))}

            <div
                className="px-5 py-3 text-base text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mb-1 border-t border-[#eeeeee] mt-1"
                onClick={async () => {
                    try {
                        await logout();
                        navigate('/');
                    } catch (err) {
                        console.error('Logout failed', err);
                    }
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                Log Out
            </div>
        </div>
    );

    const AppSwitcherMenu = () => (
        <div ref={appDropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setShowAppDropdown((v) => !v)}
                className={cn(
                    'neu-circle inline-flex size-8 items-center justify-center rounded-full text-[#71717A] transition-colors hover:text-[#1A1A1A]',
                    showAppDropdown && 'neu-inset text-[#1A1A1A]',
                )}
                aria-label="Switch products"
                aria-expanded={showAppDropdown}
            >
                <Home className="size-4" />
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
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#F4F3F0]"
                        >
                            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#F4F3F0]">
                                <img src={dashboardPng} alt="" className="size-4 object-contain" />
                            </span>
                            Home
                        </button>

                        <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-[#71717A]">
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
                                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[#F4F3F0]',
                                        active && 'neu-glow-pill',
                                    )}
                                >
                                    <span className={cn(
                                        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
                                        active ? 'bg-[#1A1A1A] text-white' : 'bg-[#F4F3F0] text-[#1A1A1A]',
                                    )}>
                                        {renderProductIcon(product, active)}
                                    </span>
                                    <span className="min-w-0 flex-1 text-left">
                                        <span className="flex items-center gap-2">
                                            <span className="font-medium text-[#1A1A1A]">{product.name}</span>
                                            {active && (
                                                <span className="rounded-full bg-[#1A1A1A]/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-[#1A1A1A]">Current</span>
                                            )}
                                        </span>
                                        <span className="block truncate text-xs text-[#71717A]">{product.tagline}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="theme-mono cg-shell flex flex-col md:flex-row min-h-screen md:h-screen w-full max-w-[100vw] overflow-x-hidden md:overflow-hidden">
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
                'fixed md:static top-0 w-60 h-screen shrink-0 flex-col justify-between border-r border-[#ECEAE6] bg-[#F9F9F7] z-[1000] md:z-10 transition-[left] duration-300 overflow-visible',
                isMobileMenuOpen ? 'left-0 flex shadow-2xl' : '-left-60 hidden md:flex md:shadow-[4px_0_16px_-8px_rgba(0,0,0,0.12)]',
            )}>
                <div className="flex flex-1 flex-col min-h-0">
                    <div className="relative z-20 shrink-0 overflow-visible px-5 pt-5 pb-8 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {renderBrandIcon()}
                            <div className="flex flex-col leading-none min-w-0">
                                <span className="text-[13px] font-extrabold text-[#1a1a1a] tracking-wider uppercase truncate max-w-[95px]" title={brandPrimary}>{brandPrimary}</span>
                                <span className="text-[8px] font-extrabold text-[#71717A] tracking-widest uppercase mt-0.5 truncate max-w-[95px]" title={brandSubtitle}>{brandSubtitle}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {headerActions || (productId === 'client-gallery' ? (
                                <ClientGalleryNotifications userId={user?.id} variant="sidebar" />
                            ) : (
                                <button type="button" className="neu-circle relative inline-flex size-8 items-center justify-center rounded-full text-[#71717A] hover:text-[#1A1A1A]" aria-label="Notifications">
                                    <Bell className="size-4" />
                                </button>
                            ))}
                            <AppSwitcherMenu />
                        </div>
                    </div>

                    <nav className="flex flex-1 flex-col gap-1 px-3 py-4 neu-scroll overflow-y-auto min-h-0">
                        <div ref={contextDropdownRef} className="relative px-3 pb-3">
                            <button
                                type="button"
                                onClick={() => setShowContextDropdown((v) => !v)}
                                className="group flex w-full items-center justify-between gap-2 rounded-md py-1 text-lg font-bold text-[#1A1A1A] transition-colors hover:text-[#1A1A1A]/80"
                                aria-expanded={showContextDropdown}
                            >
                                <span className="truncate">{activeProduct.name}</span>
                                <ChevronDown className={cn('size-4 shrink-0 transition-transform', showContextDropdown && 'rotate-180')} />
                            </button>
                            {showContextDropdown && (
                                <div className="absolute left-3 right-3 top-full z-50 mt-1.5 overflow-hidden rounded-xl bg-white p-1.5 shadow-xl shadow-black/10 border border-[#ECEAE6]">
                                    {products.map((item) => {
                                        const active = isProductActive(item.href, path);
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => { navigate(item.href); setShowContextDropdown(false); setIsMobileMenuOpen(false); }}
                                                className={cn(
                                                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[#F4F3F0]',
                                                    active && 'neu-inset',
                                                )}
                                            >
                                                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[#F4F3F0]">
                                                    <Icon className="size-3.5" />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                                                {active && <span className="size-1.5 shrink-0 rounded-full bg-[#1A1A1A]" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {navItems.map((item) => {
                            const active = item.match(path);
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.href}
                                    type="button"
                                    onClick={() => {
                                        navigate(item.href);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left w-full border-0 cursor-pointer',
                                        active
                                            ? 'neu-inset text-[#1A1A1A]'
                                            : 'text-[#71717A]/80 hover:text-[#1A1A1A] bg-transparent',
                                    )}
                                >
                                    <Icon className="size-4 shrink-0" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4">
                    <div className="neu-inset rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
                                <Database className="size-3.5 text-[#1A1A1A]" />
                                Storage
                            </span>
                            <button type="button" className="inline-flex size-5 items-center justify-center rounded-md text-[#1A1A1A] hover:bg-[#1A1A1A]/10" aria-label="Upgrade storage">
                                <Plus className="size-3.5" />
                            </button>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#ECEAE6]">
                            <div className="h-full rounded-full bg-[#1A1A1A] transition-all duration-300" style={{ width: `${storagePct}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs text-[#71717A]">{formatStorage(usedBytes)} of {formatStorage(maxBytes)} used</p>
                    </div>

                    <div className="relative mt-3" ref={profileDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowProfileDropdown((v) => !v)}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#1A1A1A]/5"
                        >
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#1A1A1A] text-sm font-semibold text-white">
                                {userInitial}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1A1A1A]">{userDisplayLabel}</span>
                        </button>
                        {showProfileDropdown && renderProfileDropdown('bottom-full left-0 mb-2')}
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-h-screen md:h-screen w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto md:overflow-hidden bg-[#F9F9F7] pt-14 md:pt-0">
                {children}
            </div>
        </div>
    );
};

export default SidebarLayout;
