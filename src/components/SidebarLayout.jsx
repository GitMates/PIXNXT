import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import brandPng from '../assets/icons/clientgallery.png';

const SidebarLayout = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const appDropdownRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const { user, logout } = useAuth();
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

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

    const renderProfileDropdown = (positionClasses) => (
        <div className={`absolute ${positionClasses} w-[280px] bg-[#ffffff] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-[500] py-1 animate-[cgFadeIn_0.15s_ease]`}>
            {/* Profile Header */}
            <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center gap-3">
                <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-[20px] font-medium bg-[#e8f7f2] text-[#1a9b84]">
                    {userInitial}
                </div>
                <div className="flex flex-col">
                    <div className="text-[15px] font-medium text-[#222] truncate w-[180px]">{user?.email ? user.email.split('@')[0].toUpperCase() : 'POOJA'}</div>
                    <div className="text-[13px] text-[#888] truncate w-[180px]">{user?.email || 'poojaelango03@gmail.com'}</div>
                </div>
            </div>
            
            {/* Invite Friends */}
            <div className="px-5 py-3.5 text-[15px] text-[#333] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 font-medium border-b border-[#eeeeee]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                Invite Friends & Get $20
            </div>

            {/* Profile */}
            <div 
                className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mt-1"
                onClick={() => {
                    navigate('/account/profile');
                    setShowProfileDropdown(false);
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Profile
            </div>

            {/* Billing */}
            <div 
                className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
                onClick={() => {
                    navigate('/account/billing');
                    setShowProfileDropdown(false);
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Billing
            </div>

            {/* Advanced Settings */}
            <div 
                className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 pb-4 border-b border-[#eeeeee]"
                onClick={() => {
                    navigate('/account/advanced');
                    setShowProfileDropdown(false);
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                Advanced Settings
            </div>

            {/* Account */}
            <div 
                className="px-5 py-3 mt-1 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
                onClick={() => {
                    navigate('/account/details');
                    setShowProfileDropdown(false);
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Account
            </div>

            {/* Log Out */}
            <div 
                className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mb-1"
                onClick={async () => {
                    try {
                        await logout();
                        navigate('/login');
                    } catch (err) {
                        console.error('Logout failed', err);
                    }
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Log Out
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[#ffffff] md:overflow-hidden">
            {/* Mobile Hamburger Button */}
            <button 
                className="fixed top-4 right-4 z-[1100] w-10 h-10 border-none rounded-none bg-[#1a9b84] text-white cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center md:hidden" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-[900] md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside className={`${isCollapsed ? 'md:w-[80px]' : 'md:w-[320px]'} ${isMobileMenuOpen ? 'left-0' : '-left-[320px]'} fixed md:static top-0 w-[280px] h-screen bg-[#ffffff] flex flex-col shrink-0 z-[1000] md:z-10 shadow-[4px_0_20px_rgba(0,0,0,0.15)] md:shadow-[1px_0_0_rgba(0,0,0,0.06)] border-r border-[#eeeeee] transition-[width,left] duration-300 ease overflow-y-auto md:overflow-y-visible`}>
                <div className={`h-[80px] flex items-center px-6 ${isCollapsed ? 'md:justify-center md:px-0' : 'justify-between'}`}>
                    <div className="flex items-center gap-2 cursor-pointer relative" ref={appDropdownRef}>
                        <img src={brandPng} alt="Pixnxt" className="w-[30px] h-[30px] object-contain shrink-0" />
                        {(!isCollapsed || isMobileMenuOpen) && <span className="text-[14px] font-bold text-[#444] uppercase tracking-[0.08em]">Client Gallery</span>}
                        {(!isCollapsed || isMobileMenuOpen) && <svg className="text-[#999] cursor-pointer" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" onClick={(e) => { e.stopPropagation(); setShowAppDropdown(!showAppDropdown); }}><polyline points="6 9 12 15 18 9"></polyline></svg>}
                        {showAppDropdown && (!isCollapsed || isMobileMenuOpen) && (
                            <div className="absolute top-[calc(100%+8px)] left-0 md:w-[360px] bg-[#ffffff] rounded-none shadow-[0_12px_48px_rgba(0,0,0,0.15)] z-[500] py-3 animate-[cgFadeIn_0.15s_ease] max-md:fixed max-md:top-[70px] max-md:left-3 max-md:right-3 max-md:w-auto max-md:z-[99999] max-md:max-h-[80vh] max-md:overflow-y-auto">
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => { navigate('/client-gallery'); setShowAppDropdown(false); }}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1a9b84, #147d6a)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Client Gallery</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Better way to share, deliver, proof and sell</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => { navigate('/smart-albums'); setShowAppDropdown(false); }}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="14" y2="10"></line></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Smart Albums</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Design and deliver beautiful photo albums</span>
                                    </div>
                                </div>
                                {/* Commented out unused secondary app options as requested */}
                                {/*
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => setShowAppDropdown(false)}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Website</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Build your own beautiful portfolio website</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => setShowAppDropdown(false)}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Store</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Your online store for prints and downloads</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => setShowAppDropdown(false)}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Studio Manager</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Photography business management</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => setShowAppDropdown(false)}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f1c40f, #f39c12)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Mobile Gallery App</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Simple, personalized mobile photo albums</span>
                                    </div>
                                </div>
                                */}
                                <div className="h-px bg-[#f0f0f0] my-2"></div>
                                <div className="flex items-center gap-[14px] px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => { navigate('/dashboard'); setShowAppDropdown(false); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                    <span className="text-sm font-medium text-[#333]">View Dashboard</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {(!isCollapsed || isMobileMenuOpen) && (
                        <div className="flex items-center gap-3.5 relative" ref={!isCollapsed || isMobileMenuOpen ? profileDropdownRef : null}>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
                            <div 
                                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer max-md:hidden bg-[#1a9b84] text-[#fff]"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            >
                                {userInitial}
                            </div>
                            {showProfileDropdown && renderProfileDropdown('top-[calc(100%+8px)] right-0')}
                        </div>
                    )}
                </div>

                <div className="flex-1 pt-2.5 flex flex-col gap-3">
                    <div className={`h-[52px] flex items-center pl-6 text-[15px] cursor-pointer hover:text-[#111] hover:bg-[rgba(26,155,132,0.05)] ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-4'} ${path === '/client-gallery' || path.startsWith('/collections') ? 'text-[#111] bg-[#f3f4f6]' : 'text-[#444]'}`} onClick={() => navigate('/client-gallery')}>
                        <svg className={`shrink-0 ${path === '/client-gallery' || path.startsWith('/collections') ? 'text-[#111]' : 'text-[#555]'}`} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><circle cx="12" cy="13" r="2"></circle><path d="m14 13-1.5 1.5-1-1L10 15h6Z"></path></svg>
                        {(!isCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-[0.08em] text-[13px] font-bold">Collections</span>}
                    </div>
                    <div className={`h-[52px] flex items-center pl-6 text-[15px] cursor-pointer hover:text-[#111] hover:bg-[rgba(26,155,132,0.05)] ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-4'} ${path.startsWith('/starred') ? 'text-[#111] bg-[#f3f4f6]' : 'text-[#444]'}`} onClick={() => navigate('/starred/collections')}>
                        <svg className={`shrink-0 ${path.startsWith('/starred') ? 'text-[#111]' : 'text-[#555]'}`} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        {(!isCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-[0.08em] text-[13px] font-bold">Starred</span>}
                    </div>
                    <div className={`h-[52px] flex items-center pl-6 text-[15px] cursor-pointer hover:text-[#111] hover:bg-[rgba(26,155,132,0.05)] ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-4'} ${path === '/homepage' ? 'text-[#111] bg-[#f3f4f6]' : 'text-[#444]'}`} onClick={() => navigate('/homepage')}>
                        <svg className={`shrink-0 ${path === '/homepage' ? 'text-[#111]' : 'text-[#555]'}`} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {(!isCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-[0.08em] text-[13px] font-bold">Homepage</span>}
                    </div>
                    <div className={`h-[52px] flex items-center pl-6 text-[15px] cursor-pointer hover:text-[#111] hover:bg-[rgba(26,155,132,0.05)] ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center md:pl-0' : 'gap-4'} ${path.startsWith('/settings') ? 'text-[#111] bg-[#f3f4f6]' : 'text-[#444]'}`} onClick={() => navigate('/settings')}>
                        <svg className={`shrink-0 ${path.startsWith('/settings') ? 'text-[#111]' : 'text-[#555]'}`} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        {(!isCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-[0.08em] text-[13px] font-bold">Settings</span>}
                    </div>
                </div>

                <div className="flex flex-col items-stretch p-6 gap-2">
                    {isCollapsed && !isMobileMenuOpen ? (
                        <div className="flex flex-col items-center gap-5 w-full pb-1 relative" ref={isCollapsed && !isMobileMenuOpen ? profileDropdownRef : null}>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
                            <div 
                                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer max-md:hidden bg-[#1a9b84] text-[#fff]"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            >
                                {userInitial}
                            </div>
                            {showProfileDropdown && renderProfileDropdown('bottom-0 left-[calc(100%+8px)]')}

                            <div className="w-11 h-11 rounded-none bg-[#f7f9fa] flex items-center justify-center cursor-pointer mt-1 text-[#555] transition-colors duration-200 hover:bg-[#edf0f2]" onClick={() => setIsCollapsed(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center justify-center text-[#444] cursor-pointer hover:text-[#111]" onClick={() => setIsCollapsed(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
                            </div>
                            <div className="flex-1 bg-[#e8f7f2] rounded-none p-2.5 flex items-center gap-2.5 relative cursor-pointer transition-colors duration-200 hover:bg-[#d5f0e7]">
                                <div className="w-7 h-7 border-2 border-[#b8e8d8] rounded-full flex items-center justify-center bg-[#e8f7f2]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a9b84" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[#1a9b84] text-[13px] font-medium">Storage</span>
                                    <span className="text-[#888] text-[11px] mt-[1px]">0 GB of 3 GB used</span>
                                </div>
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a9b84" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-h-screen md:h-screen w-full md:w-auto bg-[#ffffff]">
                {children}
            </div>
        </div>
    );
};

export default SidebarLayout;
