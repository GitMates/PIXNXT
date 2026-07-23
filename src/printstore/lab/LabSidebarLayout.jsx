import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import './labTheme.css';

export default function LabSidebarLayout({ labUser, onLogout, children }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const appDropdownRef = useRef(null);

    const logout = onLogout;
    const { orders } = useLabAuth();

    const [collapsedSections, setCollapsedSections] = useState({});

    const sidebarSections = useMemo(() => [
        {
            id: 'overview',
            title: 'OVERVIEW',
            items: ['Dashboard']
        },
        {
            id: 'order_management',
            title: 'ORDER MANAGEMENT',
            items: ['Orders Queue', 'Artwork Review', 'Production Board']
        },
        {
            id: 'production_workflow',
            title: 'PRODUCTION WORKFLOW',
            items: ['Print Queue', 'Quality Control', 'Frame Workshop', 'Reprints', 'Packaging Center', 'Ready to Deliver', 'Dispatch History']
        },
        {
            id: 'operations',
            title: 'OPERATIONS',
            items: ['Worksheets', 'Inventory', 'Employees']
        },
        {
            id: 'administration',
            title: 'ADMINISTRATION',
            items: ['Reports', 'Settings']
        }
    ], []);

    const statusCounts = useMemo(() => {
        const counts = {};
        (orders || []).forEach(o => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });
        return counts;
    }, [orders]);

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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                </svg>
            )
        },
        {
            label: 'Orders Queue',
            path: '/lab/queue',
            countKey: 'pending',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
            )
        },
        {
            label: 'Artwork Review',
            path: '/lab/artwork-review',
            countKey: 'artwork_review',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                </svg>
            )
        },
        {
            label: 'Production Board',
            path: '/lab/production',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <rect x="7" y="7" width="4" height="10" rx="1" />
                    <rect x="15" y="11" width="4" height="6" rx="1" />
                </svg>
            )
        },
        {
            label: 'Print Queue',
            path: '/lab/print-queue',
            countKey: 'printing',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 11 11 13 15 9" />
                </svg>
            )
        },
        {
            label: 'Frame Workshop',
            path: '/lab/frame-workshop',
            countKey: 'framing',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <rect x="7" y="7" width="10" height="10" />
                </svg>
            )
        },
        {
            label: 'Reprints',
            path: '/lab/reprints',
            countKey: 'reprint',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                </svg>
            )
        },
        {
            label: 'Worksheets',
            path: '/lab/worksheets',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
            )
        },
        {
            label: 'Packaging Center',
            path: '/lab/packaging',
            countKey: 'packaging',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            )
        },
        {
            label: 'Inventory',
            path: '/lab/inventory',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItemClass = (active) =>
        `h-[38px] flex items-center pl-4 text-[13px] cursor-pointer font-medium transition-all duration-150 rounded-xl mx-2 relative ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-2.5'} ${
            active ? 'text-[#1A1A1A] bg-[#F4F3F0]' : 'text-[#71717A] hover:bg-[#F4F3F0] hover:text-[#1A1A1A]'
        }`;

    const navIconClass = (active) => `shrink-0 ${active ? 'text-[#1A1A1A]' : 'text-[#71717A]'}`;

    const badgeStyle = (active) => ({
        minWidth: '18px',
        height: '18px',
        borderRadius: '9px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        fontWeight: 700,
        marginRight: '4px',
        padding: '0 5px',
        backgroundColor: active ? '#1A1A1A' : '#ECEAE6',
        color: active ? '#ffffff' : '#1A1A1A',
        letterSpacing: '0.02em',
        lineHeight: 1,
        flexShrink: 0,
    });

    const getBadgeCount = (item) => {
        if (item.countKey) return statusCounts[item.countKey] || 0;
        if (item.countKeys) return item.countKeys.reduce((sum, key) => sum + (statusCounts[key] || 0), 0);
        return 0;
    };

    return (
        <div className="theme-mono lab-shell flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[#F9F9F7] md:overflow-hidden">
            <button
                className="fixed top-4 right-4 z-[1100] w-10 h-10 border-none rounded-full text-white cursor-pointer flex items-center justify-center md:hidden neu-pill"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                type="button"
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/20 z-[900] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            <aside
                className={`${isCollapsed ? 'md:w-[64px]' : 'md:w-[230px]'} ${isMobileMenuOpen ? 'left-0' : '-left-[230px]'} ${showAppDropdown ? 'z-[1200] md:z-[1200]' : 'z-[1000] md:z-10'} fixed md:static top-0 w-[230px] h-screen bg-[#FAFAF8] flex flex-col shrink-0 border-r border-[#ECEAE6] transition-[width,left] duration-300 ease overflow-y-auto md:overflow-y-visible`}
            >
                <div
                    className={`h-[64px] flex items-center px-4 shrink-0 overflow-visible ${isCollapsed ? 'md:justify-center md:px-0' : 'justify-between gap-3'}`}
                >
                    <div
                        className={`flex items-center gap-2.5 cursor-pointer relative min-w-0 ${isCollapsed && !isMobileMenuOpen ? '' : 'flex-1'}`}
                        ref={appDropdownRef}
                        onClick={() => {
                            if (isCollapsed && !isMobileMenuOpen) return;
                            setShowAppDropdown((open) => !open);
                        }}
                    >
                        <div className="w-[30px] h-[30px] rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-semibold text-sm shrink-0">
                            L
                        </div>
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <span
                                className="text-[15px] text-[#1A1A1A] whitespace-nowrap truncate"
                                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}
                            >
                                Pixnxt Lab
                            </span>
                        )}
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <svg className="text-[#71717A] shrink-0" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        )}
                        {showAppDropdown && (!isCollapsed || isMobileMenuOpen) && (
                            <div
                                className="absolute top-[calc(100%+8px)] left-0 bg-white rounded-2xl border border-[#ECEAE6] z-[9999] py-1.5 px-1"
                                style={{ width: 'max-content', minWidth: 180, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
                            >
                                <div
                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#F4F3F0] rounded-xl"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/dashboard');
                                        setShowAppDropdown(false);
                                    }}
                                >
                                    <span className="text-xs font-medium text-[#1A1A1A] whitespace-nowrap">Exit Lab to Dashboard</span>
                                </div>
                                {typeof logout === 'function' && (
                                    <div
                                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#F4F3F0] rounded-xl"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            logout();
                                            setShowAppDropdown(false);
                                        }}
                                    >
                                        <span className="text-xs font-medium text-[#71717A] whitespace-nowrap">Sign out</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="flex-1 pt-1 flex flex-col gap-1 overflow-y-auto neu-scroll"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#d4d4d8 transparent' }}
                >
                    {isCollapsed && !isMobileMenuOpen ? (
                        menuItems.map((item) => {
                            const active = isActive(item.path);
                            const badgeCount = getBadgeCount(item);
                            return (
                                <div
                                    key={item.path}
                                    className={navItemClass(active)}
                                    onClick={() => navigate(item.path)}
                                    title={item.label}
                                >
                                    <span className={navIconClass(active)}>
                                        {item.icon()}
                                    </span>
                                    {(item.countKey || item.countKeys) && badgeCount > 0 && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '8px',
                                                minWidth: '14px',
                                                height: '14px',
                                                borderRadius: '7px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '8px',
                                                fontWeight: 700,
                                                backgroundColor: '#1A1A1A',
                                                color: '#ffffff',
                                                padding: '0 3px',
                                            }}
                                        >
                                            {badgeCount}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        sidebarSections.map((section, idx) => {
                            const isSectionCollapsed = collapsedSections[section.id];
                            return (
                                <div key={section.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '6px' }}>
                                    {idx > 0 && <hr style={{ border: 'none', borderTop: '1px solid #ECEAE6', margin: '4px 16px 8px 16px' }} />}
                                    <div
                                        onClick={() => setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '4px 16px 4px 20px',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#A1A1AA', letterSpacing: '0.08em' }}>
                                            {section.title}
                                        </span>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="10"
                                            height="10"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#A1A1AA"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ transform: isSectionCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>

                                    {!isSectionCollapsed && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '2px' }}>
                                            {menuItems
                                                .filter(item => section.items.includes(item.label))
                                                .map((item) => {
                                                    const active = isActive(item.path);
                                                    const badgeCount = getBadgeCount(item);
                                                    return (
                                                        <div
                                                            key={item.path}
                                                            className={navItemClass(active)}
                                                            onClick={() => {
                                                                navigate(item.path);
                                                                setIsMobileMenuOpen(false);
                                                            }}
                                                        >
                                                            <span className={navIconClass(active)}>
                                                                {item.icon()}
                                                            </span>
                                                            <span className="truncate tracking-[0.01em]" style={{ flex: 1, fontWeight: active ? 600 : 500 }}>
                                                                {item.label}
                                                            </span>
                                                            {(item.countKey || item.countKeys) && badgeCount > 0 && (
                                                                <span style={badgeStyle(active)}>
                                                                    {badgeCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex flex-col items-stretch p-4 gap-2 border-t border-[#ECEAE6]">
                    {isCollapsed && !isMobileMenuOpen ? (
                        <div
                            className="w-9 h-9 rounded-full bg-[#F4F3F0] flex items-center justify-center cursor-pointer mt-1 text-[#555] transition-colors duration-200 hover:bg-[#ECEAE6] mx-auto"
                            onClick={() => setIsCollapsed(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="13 17 18 12 13 7" />
                                <polyline points="6 17 11 12 6 7" />
                            </svg>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center justify-center text-[#71717A] cursor-pointer hover:text-[#1A1A1A]" onClick={() => setIsCollapsed(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="11 17 6 12 11 7" />
                                    <polyline points="18 17 13 12 18 7" />
                                </svg>
                            </div>
                            {labUser?.email && (
                                <span className="text-[11px] text-[#71717A] truncate flex-1">{labUser.email}</span>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-h-screen md:h-screen w-full md:w-auto bg-[#F9F9F7] overflow-auto lab-content-container">
                {children}
            </div>
        </div>
    );
}
