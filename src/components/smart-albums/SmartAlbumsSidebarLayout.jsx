import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import brandPng from '../../assets/icons/client gallery.png';
import smartAlbumPng from '../../assets/icons/smart album.png';
import dashboardPng from '../../assets/icons/dashboard.png';
import helpPng from '../../assets/icons/help.png';
import SmartAlbumNotifications from './SmartAlbumNotifications';
import '../../pages/ClientGallery.css';

const PURPLE = '#9b59b6';
const PURPLE_DARK = '#8e44ad';
const PURPLE_LIGHT = '#f3ebf8';
const PURPLE_HOVER = 'rgba(155, 89, 182, 0.08)';

const AlbumNavIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="14" y2="10" />
    </svg>
);

const StarNavIcon = ({ className }) => (
    <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const SettingsNavIcon = ({ className }) => (
    <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const SmartAlbumsSidebarLayout = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const appDropdownRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const { user, logout } = useAuth();

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
    const isAlbumsActive = path === '/smart-albums' || path === '/smart-albums/';
    const isStarredActive = path.startsWith('/smart-albums/starred');
    const isSettingsActive = path.startsWith('/smart-albums/settings');

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (appDropdownRef.current && !appDropdownRef.current.contains(e.target)) {
                setShowAppDropdown(false);
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
                setShowProfileDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItemClass = (active) =>
        `h-[52px] flex items-center pl-6 text-[17px] cursor-pointer font-medium hover:text-[#111] ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-4'} ${
            active ? 'text-[#111] bg-[#f3f4f6]' : 'text-[#444]'
        }`;

    const navIconClass = (active) => `shrink-0 ${active ? 'text-[#111]' : 'text-[#555]'}`;

    const renderProfileDropdown = (positionClasses) => (
        <div className={`absolute ${positionClasses} w-[280px] bg-[#ffffff] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-[500] py-1 animate-[cgFadeIn_0.15s_ease]`}>
            <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center gap-3">
                <div
                    className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-[22px] font-medium"
                    style={{ background: PURPLE_LIGHT, color: PURPLE }}
                >
                    {userInitial}
                </div>
                <div className="flex flex-col">
                    <div className="text-[17px] font-medium text-[#222] truncate w-[180px]">
                        {user?.email ? user.email.split('@')[0].toUpperCase() : 'USER'}
                    </div>
                    <div className="text-[15px] text-[#888] truncate w-[180px]">{user?.email || ''}</div>
                </div>
            </div>
            <div
                className="px-5 py-3 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
                onClick={() => {
                    navigate('/account/profile');
                    setShowProfileDropdown(false);
                }}
            >
                Profile
            </div>
            <div
                className="px-5 py-3 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mb-1"
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

    const toggleAppDropdown = () => setShowAppDropdown((open) => !open);

    return (
        <div
            className="flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[#ffffff] md:overflow-hidden"
        >
            <button
                className="fixed top-4 right-4 z-[1100] w-10 h-10 border-none rounded-none text-white cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center md:hidden"
                style={{ background: PURPLE }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                type="button"
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-[900] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            <aside
                className={`${isCollapsed ? 'md:w-[80px]' : 'md:w-[320px]'} ${isMobileMenuOpen ? 'left-0' : '-left-[320px]'} ${showAppDropdown ? 'z-[1200] md:z-[1200]' : 'z-[1000] md:z-10'} fixed md:static top-0 w-[280px] h-screen bg-[#ffffff] flex flex-col shrink-0 shadow-[4px_0_20px_rgba(0,0,0,0.15)] md:shadow-[1px_0_0_rgba(0,0,0,0.06)] border-r border-[#e0e0e0] transition-[width,left] duration-300 ease overflow-y-auto md:overflow-y-visible`}
            >
                <div
                    className={`sa-sidebar-header h-[80px] flex items-center px-4 shrink-0 overflow-visible ${isCollapsed ? 'md:justify-center md:px-0' : 'justify-between gap-3'}`}
                >
                    <div
                        className={`flex items-center gap-2 cursor-pointer relative sb-logo-container min-w-0 ${isCollapsed && !isMobileMenuOpen ? '' : 'flex-1'}`}
                        ref={appDropdownRef}
                        onClick={() => {
                            if (isCollapsed && !isMobileMenuOpen) return;
                            toggleAppDropdown();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleAppDropdown();
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={showAppDropdown}
                        aria-haspopup="true"
                    >
                        <img src={smartAlbumPng} alt="Pixnxt" className="w-[36px] h-[36px] object-contain shrink-0" />
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <span className="text-[14px] font-bold text-[#444] uppercase tracking-[0.05em] whitespace-nowrap truncate">
                                Smart Albums
                            </span>
                        )}
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <svg
                                className="text-[#999] shrink-0"
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
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
                        )}
                        {showAppDropdown && (!isCollapsed || isMobileMenuOpen) && (
                            <div className="sa-app-dropdown absolute top-[calc(100%+8px)] left-0 md:w-[360px] bg-[#ffffff] rounded-none shadow-[0_12px_48px_rgba(0,0,0,0.15)] z-[9999] py-3 animate-[cgFadeIn_0.15s_ease] max-md:fixed max-md:top-[70px] max-md:left-3 max-md:right-3 max-md:w-auto max-md:max-h-[80vh] max-md:overflow-y-auto">
                                <div
                                    className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/client-gallery');
                                        setShowAppDropdown(false);
                                    }}
                                >
                                    <img src={brandPng} alt="Client Gallery" className="w-11 h-11 object-contain shrink-0 mix-blend-multiply" />
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-[17px] font-semibold text-[#111]">Client Gallery</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Better way to share, deliver, proof and sell</span>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/smart-albums');
                                        setShowAppDropdown(false);
                                    }}
                                >
                                    <img src={smartAlbumPng} alt="Smart Albums" className="w-11 h-11 object-contain shrink-0 mix-blend-multiply" />
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-[17px] font-semibold text-[#111]">Smart Albums</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Design and deliver beautiful photo albums</span>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/mobile-gallery');
                                        setShowAppDropdown(false);
                                    }}
                                >
                                    <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f1c40f, #f39c12)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-[17px] font-semibold text-[#111]">Mobile Gallery App</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Simple, personalized mobile photo albums</span>
                                    </div>
                                </div>
                                <div className="h-px bg-[#f0f0f0] my-2" />
                                <div
                                    className="flex items-center gap-[14px] px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/dashboard');
                                        setShowAppDropdown(false);
                                    }}
                                >
                                    <img src={dashboardPng} alt="Dashboard" className="w-[18px] h-[18px] shrink-0 object-contain" />
                                    <span className="text-sm font-medium text-[#333]">View Dashboard</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {(!isCollapsed || isMobileMenuOpen) && (
                        <div className="flex items-center gap-2.5 shrink-0 ml-auto relative overflow-visible" ref={profileDropdownRef}>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]" aria-hidden>
                                <img src={helpPng} alt="" className="w-[18px] h-[18px] object-contain shrink-0" />
                            </div>
                            <SmartAlbumNotifications userId={user?.id} />
                            <div
                                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer max-md:hidden text-[#fff]"
                                style={{ background: PURPLE }}
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                title={user?.email || 'Account'}
                                aria-label="Account menu"
                            >
                                {userInitial}
                            </div>
                            {showProfileDropdown && renderProfileDropdown('top-[calc(100%+8px)] right-0')}
                        </div>
                    )}
                </div>

                <div className="flex-1 pt-2.5 flex flex-col gap-3">
                    <div
                        className={navItemClass(isAlbumsActive)}
                        style={!isAlbumsActive ? { ['--hover-bg']: PURPLE_HOVER } : undefined}
                        onMouseEnter={(e) => {
                            if (!isAlbumsActive) e.currentTarget.style.background = PURPLE_HOVER;
                        }}
                        onMouseLeave={(e) => {
                            if (!isAlbumsActive) e.currentTarget.style.background = '';
                        }}
                        onClick={() => navigate('/smart-albums')}
                    >
                        <span className={navIconClass(isAlbumsActive)}>
                            <AlbumNavIcon />
                        </span>
                        {(!isCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-[0.08em] text-[15px] font-bold">Albums</span>}
                    </div>
                    <div
                        className={navItemClass(isStarredActive)}
                        onMouseEnter={(e) => {
                            if (!isStarredActive) e.currentTarget.style.background = PURPLE_HOVER;
                        }}
                        onMouseLeave={(e) => {
                            if (!isStarredActive) e.currentTarget.style.background = '';
                        }}
                        onClick={() => navigate('/smart-albums/starred')}
                    >
                        <StarNavIcon className={navIconClass(isStarredActive)} />
                        {(!isCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-[0.08em] text-[15px] font-bold">Starred</span>}
                    </div>
                    <div
                        className={navItemClass(isSettingsActive)}
                        onMouseEnter={(e) => {
                            if (!isSettingsActive) e.currentTarget.style.background = PURPLE_HOVER;
                        }}
                        onMouseLeave={(e) => {
                            if (!isSettingsActive) e.currentTarget.style.background = '';
                        }}
                        onClick={() => {
                            navigate('/smart-albums/settings');
                            setIsMobileMenuOpen(false);
                        }}
                    >
                        <SettingsNavIcon className={navIconClass(isSettingsActive)} />
                        {(!isCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-[0.08em] text-[15px] font-bold">Settings</span>}
                    </div>
                </div>

                <div className="flex flex-col items-stretch p-6 gap-2">
                    {isCollapsed && !isMobileMenuOpen ? (
                        <div
                            className="w-11 h-11 rounded-none bg-[#f7f9fa] flex items-center justify-center cursor-pointer mt-1 text-[#555] transition-colors duration-200 hover:bg-[#edf0f2] mx-auto"
                            onClick={() => setIsCollapsed(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="13 17 18 12 13 7" />
                                <polyline points="6 17 11 12 6 7" />
                            </svg>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center justify-center text-[#444] cursor-pointer hover:text-[#111]" onClick={() => setIsCollapsed(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="11 17 6 12 11 7" />
                                    <polyline points="18 17 13 12 18 7" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-h-screen md:h-screen w-full md:w-auto bg-[#ffffff] overflow-auto">
                {children}
            </div>
        </div>
    );
};

export default SmartAlbumsSidebarLayout;
