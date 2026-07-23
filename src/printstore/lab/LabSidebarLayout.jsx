import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { useLabAuth } from './LabApp';

const LAB_COLOR = '#0f766e';
const LAB_COLOR_LIGHT = '#eefaf9';

export default function LabSidebarLayout({ labUser, onLogout, children }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const appDropdownRef = useRef(null);
    
    const user = labUser;
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
            items: ['Print Queue', 'Quality Control', 'Reprints', 'Packaging Center', 'Ready to Deliver', 'Dispatch History']
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
            )
        },
        {
            label: 'Worksheets',
            path: '/lab/worksheets',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            )
        },
        {
            label: 'Inventory',
            path: '/lab/inventory',
            icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        `h-[38px] flex items-center pl-4 text-[13px] cursor-pointer font-bold transition-all duration-150 rounded-md mx-2 relative ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-2.5'} ${
            active ? 'text-[#005c5a] bg-[#eefaf9]' : 'text-[#475569] hover:bg-[#edf0f2]'
        }`;

    const navIconClass = (active) => `shrink-0 ${active ? 'text-[#005c5a]' : 'text-[#64748b]'}`;

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
                className={`${isCollapsed ? 'md:w-[64px]' : 'md:w-[220px]'} ${isMobileMenuOpen ? 'left-0' : '-left-[220px]'} ${showAppDropdown ? 'z-[1200] md:z-[1200]' : 'z-[1000] md:z-10'} fixed md:static top-0 w-[220px] h-screen bg-[#ffffff] flex flex-col shrink-0 shadow-[4px_0_20px_rgba(0,0,0,0.15)] md:shadow-[1px_0_0_rgba(0,0,0,0.06)] border-r border-[#e0e0e0] transition-[width,left] duration-300 ease overflow-y-auto md:overflow-y-visible`}
            >
                <div
                    className={`sa-sidebar-header h-[64px] flex items-center px-4 shrink-0 overflow-visible ${isCollapsed ? 'md:justify-center md:px-0' : 'justify-between gap-3'}`}
                >
                    <div
                        className={`flex items-center gap-2 cursor-pointer relative sb-logo-container min-w-0 ${isCollapsed && !isMobileMenuOpen ? '' : 'flex-1'}`}
                        ref={appDropdownRef}
                        onClick={() => {
                            if (isCollapsed && !isMobileMenuOpen) return;
                            toggleAppDropdown();
                        }}
                    >
                        <div className="w-[30px] h-[30px] rounded bg-[#111111] text-white flex items-center justify-center font-bold text-base">
                            L
                        </div>
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <span className="text-[12px] font-bold text-[#444] uppercase tracking-[0.05em] whitespace-nowrap truncate">
                                Pixnxt Lab
                            </span>
                        )}
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <svg className="text-[#999] shrink-0" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        )}
                         {showAppDropdown && (!isCollapsed || isMobileMenuOpen) && (
                            <div className="sa-app-dropdown absolute top-[calc(100%+4px)] left-0 bg-[#ffffff] rounded border border-[#e2e8f0] shadow-sm z-[9999] py-1 animate-[cgFadeIn_0.15s_ease]" style={{ width: 'max-content' }}>
                                <div
                                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#f3f4f6]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/dashboard');
                                        setShowAppDropdown(false);
                                    }}
                                >
                                    <span className="text-xs font-medium text-[#333] whitespace-nowrap">Exit Lab to Dashboard</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div 
                    className="flex-1 pt-2 flex flex-col gap-1 overflow-y-auto"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 transparent'
                    }}
                >
                    {isCollapsed && !isMobileMenuOpen ? (
                        menuItems.map((item) => {
                            const active = isActive(item.path);
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
                                                backgroundColor: '#005c5a',
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
                                    {idx > 0 && <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 16px 8px 16px' }} />}
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
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em' }}>
                                            {section.title}
                                        </span>
                                        <span style={{ fontSize: '8px', color: '#cbd5e1' }}>
                                            {isSectionCollapsed ? '▶' : '▼'}
                                        </span>
                                    </div>
                                    
                                    {!isSectionCollapsed && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '2px' }}>
                                            {menuItems
                                                .filter(item => section.items.includes(item.label))
                                                .map((item) => {
                                                    const active = isActive(item.path);
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
                                                            onClick={() => navigate(item.path)}
                                                        >
                                                            <span className={navIconClass(active)}>
                                                                {item.icon()}
                                                            </span>
                                                            <span className="truncate tracking-[0.03em] font-bold" style={{ flex: 1 }}>
                                                                {item.label}
                                                            </span>
                                                            {(item.countKey || item.countKeys) && badgeCount > 0 && (
                                                                <span
                                                                    style={{
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
                                                                        backgroundColor: active ? '#005c5a' : '#e6f4f3',
                                                                        color: active ? '#ffffff' : '#005c5a',
                                                                        letterSpacing: '0.02em',
                                                                        lineHeight: 1,
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
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

                <div className="flex flex-col items-stretch p-4 gap-2">
                    {isCollapsed && !isMobileMenuOpen ? (
                        <div
                            className="w-9 h-9 rounded-none bg-[#f7f9fa] flex items-center justify-center cursor-pointer mt-1 text-[#555] transition-colors duration-200 hover:bg-[#edf0f2] mx-auto"
                            onClick={() => setIsCollapsed(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="13 17 18 12 13 7" />
                                <polyline points="6 17 11 12 6 7" />
                            </svg>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center justify-center text-[#444] cursor-pointer hover:text-[#111]" onClick={() => setIsCollapsed(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
}
