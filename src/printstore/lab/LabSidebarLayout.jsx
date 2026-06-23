import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import brandPng from '../../assets/icons/client gallery.png';
import smartAlbumPng from '../../assets/icons/smart album.png';
import dashboardPng from '../../assets/icons/dashboard.png';
import helpPng from '../../assets/icons/help.png';
import notificationPng from '../../assets/icons/notification.png';
import '../../pages/ClientGallery.css';

const LAB_COLOR = '#111111';
const LAB_COLOR_LIGHT = '#f1f5f9';
const LAB_HOVER = 'rgba(17, 17, 17, 0.04)';

const OrdersNavIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
);

const ProductionNavIcon = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const LabSidebarLayout = ({ children, labUser, onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const appDropdownRef = useRef(null);
    const profileDropdownRef = useRef(null);
    
    const isOrderDetailPage = /^\/lab\/orders\/[^/]+$/.test(path);
    
    const user = labUser;
    const logout = onLogout;
    const { orders } = useLabAuth();

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

    // Compute order counts per status for sidebar badges
    const statusCounts = useMemo(() => {
        const counts = {};
        (orders || []).forEach(o => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });
        return counts;
    }, [orders]);
    
    // Helper to check if a specific path is active
    const isActive = (targetPath) => {
        if (targetPath === '/lab/dashboard') {
            return path === '/lab' || path === '/lab/' || path.startsWith('/lab/dashboard');
        }
        if (targetPath === '/lab/queue') {
            return path.startsWith('/lab/queue') || (path.startsWith('/lab/orders') && !/^\/lab\/orders\/[^/]+$/.test(path));
        }
        return path.startsWith(targetPath);
    };

    const menuItems = [
        {
            label: 'Dashboard',
            path: '/lab/dashboard',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                </svg>
            )
        },
        // --- Orders Queue gets total count ---
        {
            label: 'Orders Queue',
            path: '/lab/queue',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
            )
        },
        {
            label: 'Production Board',
            path: '/lab/production',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <rect x="7" y="7" width="4" height="10" rx="1" />
                    <rect x="15" y="11" width="4" height="6" rx="1" />
                </svg>
            )
        },
        {
            label: 'Print Queue',
            path: '/lab/print-queue',
            countKey: 'pending',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                </svg>
            )
        },
        {
            label: 'Quality Control',
            path: '/lab/quality-control',
            countKey: 'printed',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 11 11 13 15 9" />
                </svg>
            )
        },
        {
            label: 'Reprints',
            path: '/lab/reprints',
            countKey: 'reprint',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
            )
        },
        {
            label: 'Worksheets',
            path: '/lab/worksheets',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            )
        },
        {
            label: 'Packaging Center',
            path: '/lab/packaging',
            countKey: 'packaging',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
            )
        },
        {
            label: 'Ready to Deliver',
            path: '/lab/ready-to-deliver',
            countKey: 'ready_to_ship',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
            )
        },
        {
            label: 'Dispatch History',
            path: '/lab/dispatch-history',
            countKeys: ['shipped', 'completed'],
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            )
        },
        {
            label: 'Inventory',
            path: '/lab/inventory',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                </svg>
            )
        },
        {
            label: 'Employees',
            path: '/lab/employees',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            )
        },
        {
            label: 'Reports',
            path: '/lab/reports',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            )
        },
        {
            label: 'Settings',
            path: '/lab/settings',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            )
        }
    ];

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
        `h-[42px] flex items-center pl-5 text-[14.5px] cursor-pointer font-bold hover:text-[#111] transition-all duration-150 rounded-md mx-2 ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-3'} ${
            active ? 'text-[#005c5a] bg-[#eefaf9]' : 'text-[#475569]'
        }`;

    const navIconClass = (active) => `shrink-0 ${active ? 'text-[#005c5a]' : 'text-[#64748b]'}`;

    const renderProfileDropdown = (positionClasses) => (
        <div className={`absolute ${positionClasses} w-[280px] bg-[#ffffff] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-[500] py-1 animate-[cgFadeIn_0.15s_ease]`}>
            <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center gap-3">
                <div
                    className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-[22px] font-medium"
                    style={{ background: LAB_COLOR_LIGHT, color: LAB_COLOR }}
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
                className="px-5 py-3 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mb-1"
                onClick={() => {
                    logout();
                }}
            >
                Log Out
            </div>
        </div>
    );

    const toggleAppDropdown = () => setShowAppDropdown((open) => !open);

    return (
        <div className="flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[#ffffff] md:overflow-hidden">
            <button
                className="fixed top-4 right-4 z-[1100] w-10 h-10 border-none rounded-none text-white cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center md:hidden"
                style={{ background: LAB_COLOR }}
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
                    >
                        <div className="w-[36px] h-[36px] rounded bg-[#111111] text-white flex items-center justify-center font-bold text-lg">
                            L
                        </div>
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <span className="text-[14px] font-bold text-[#444] uppercase tracking-[0.05em] whitespace-nowrap truncate">
                                Pixnxt Lab
                            </span>
                        )}
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <svg className="text-[#999] shrink-0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        )}
                        {showAppDropdown && (!isCollapsed || isMobileMenuOpen) && (
                            <div className="sa-app-dropdown absolute top-[calc(100%+8px)] left-0 md:w-[360px] bg-[#ffffff] rounded-none shadow-[0_12px_48px_rgba(0,0,0,0.15)] z-[9999] py-3 animate-[cgFadeIn_0.15s_ease] max-md:fixed max-md:top-[70px] max-md:left-3 max-md:right-3 max-md:w-auto max-md:max-h-[80vh] max-md:overflow-y-auto">
                                <div
                                    className="flex items-center gap-[14px] px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/dashboard');
                                        setShowAppDropdown(false);
                                    }}
                                >
                                    <img src={dashboardPng} alt="Dashboard" className="w-[18px] h-[18px] shrink-0 object-contain" />
                                    <span className="text-sm font-medium text-[#333]">Exit Lab to Dashboard</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {(!isCollapsed || isMobileMenuOpen) && (
                        <div className="flex items-center gap-2.5 shrink-0 ml-auto relative" ref={profileDropdownRef}>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]" aria-hidden>
                                <img src={helpPng} alt="" className="w-[18px] h-[18px] object-contain shrink-0" />
                            </div>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]" aria-hidden>
                                <img src={notificationPng} alt="" className="w-[18px] h-[18px] object-contain shrink-0" />
                            </div>
                            <div
                                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer max-md:hidden text-[#fff]"
                                style={{ background: LAB_COLOR }}
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                title={user?.email || 'Account'}
                            >
                                {userInitial}
                            </div>
                            {showProfileDropdown && renderProfileDropdown('top-[calc(100%+8px)] right-0')}
                        </div>
                    )}
                </div>

                <div 
                    className="flex-1 pt-2 flex flex-col gap-1.5 overflow-y-auto"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 transparent'
                    }}
                >
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        // Calculate badge count
                        let badgeCount = 0;
                        if (item.countKey) {
                            badgeCount = statusCounts[item.countKey] || 0;
                        } else if (item.countKeys) {
                            badgeCount = item.countKeys.reduce((sum, key) => sum + (statusCounts[key] || 0), 0);
                        }
                        return (
                            <div
                                key={item.path}
                                className={navItemClass(active)}
                                style={!active ? { ['--hover-bg']: LAB_HOVER } : undefined}
                                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = LAB_HOVER; }}
                                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ''; }}
                                onClick={() => navigate(item.path)}
                            >
                                <span className={navIconClass(active)}>
                                    {item.icon()}
                                </span>
                                {(!isCollapsed || isMobileMenuOpen) && (
                                    <>
                                        <span className="truncate tracking-[0.03em] font-bold" style={{ flex: 1 }}>
                                            {item.label}
                                        </span>
                                        {(item.countKey || item.countKeys) && (
                                            <span
                                                style={{
                                                    minWidth: '22px',
                                                    height: '22px',
                                                    borderRadius: '11px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    marginRight: '4px',
                                                    padding: '0 6px',
                                                    backgroundColor: badgeCount > 0 ? (active ? '#005c5a' : '#e6f4f3') : 'transparent',
                                                    color: badgeCount > 0 ? (active ? '#ffffff' : '#005c5a') : '#94a3b8',
                                                    letterSpacing: '0.02em',
                                                    lineHeight: 1,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {badgeCount}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
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

            <div className={`flex-1 flex flex-col min-h-screen md:h-screen w-full md:w-auto bg-white overflow-auto lab-content-container`}>
                {children}
            </div>
        </div>
    );
};

export default LabSidebarLayout;
