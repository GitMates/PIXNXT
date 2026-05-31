import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserDisplayLabel, getUserInitial } from '../lib/userInitials';
import brandPng from '../assets/icons/client gallery.png';
import smartAlbumPng from '../assets/icons/smart album.png';
import dashboardPng from '../assets/icons/dashboard.png';
import collectionsPng from '../assets/icons/collections.png';
import starredPng from '../assets/icons/starred.png';
import homePagePng from '../assets/icons/home page.png';
import settingsPng from '../assets/icons/settings.png';
import storagePng from '../assets/icons/storage.png';
import helpPng from '../assets/icons/help.png';
import notificationPng from '../assets/icons/notification.png';
import '../pages/ClientGallery.css';

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

    const userInitial = getUserInitial(user);
    const userDisplayLabel = getUserDisplayLabel(user);

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
                <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-[22px] font-medium bg-[#8BDFDD] text-[#222]">
                    {userInitial}
                </div>
                <div className="flex flex-col">
                    <div className="text-[17px] font-medium text-[#222] truncate w-[180px]">{userDisplayLabel}</div>
                    <div className="text-[15px] text-[#888] truncate w-[180px]">{user?.email || 'poojaelango03@gmail.com'}</div>
                </div>
            </div>
            
            {/* Invite Friends */}
            <div className="px-5 py-3.5 text-[17px] text-[#333] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 font-medium border-b border-[#eeeeee]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                Invite Friends & Get $20
            </div>

            {/* Profile */}
            <div 
                className="px-5 py-3 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mt-1"
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
                className="px-5 py-3 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
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
                className="px-5 py-3 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 pb-4 border-b border-[#eeeeee]"
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
                className="px-5 py-3 mt-1 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
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
                className="px-5 py-3 text-[16px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mb-1"
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
                className="fixed top-4 right-4 z-[1100] w-10 h-10 border-none rounded-none bg-[#8BDFDD] text-[#222] cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center md:hidden" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-[900] md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside className={`${isCollapsed ? 'md:w-[80px]' : 'md:w-[320px]'} ${isMobileMenuOpen ? 'left-0' : '-left-[320px]'} fixed md:static top-0 w-[280px] h-screen bg-[#ffffff] flex flex-col shrink-0 z-[1000] md:z-10 shadow-[4px_0_20px_rgba(0,0,0,0.15)] md:shadow-[1px_0_0_rgba(0,0,0,0.06)] border-r border-[#e0e0e0] transition-[width,left] duration-300 ease overflow-y-auto md:overflow-y-visible`}>
                <div className={`h-[80px] flex items-center px-4 ${isCollapsed ? 'md:justify-center md:px-0' : 'justify-between'}`}>
                    <div className="flex items-center gap-2 cursor-pointer relative sb-logo-container" ref={appDropdownRef}>
                        <img src={brandPng} alt="Pixnxt" className="w-[36px] h-[36px] object-contain shrink-0 mix-blend-multiply" />
                        {(!isCollapsed || isMobileMenuOpen) && <span className="text-[14px] font-bold text-[#444] uppercase tracking-[0.05em] whitespace-nowrap">Client Gallery</span>}
                        {(!isCollapsed || isMobileMenuOpen) && <svg className="text-[#999] cursor-pointer ml-0.5" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" onClick={(e) => { e.stopPropagation(); setShowAppDropdown(!showAppDropdown); }}><polyline points="6 9 12 15 18 9"></polyline></svg>}
                        {showAppDropdown && (!isCollapsed || isMobileMenuOpen) && (
                            <div className="absolute top-[calc(100%+8px)] left-0 md:w-[360px] bg-[#ffffff] rounded-none shadow-[0_12px_48px_rgba(0,0,0,0.15)] z-[500] py-3 animate-[cgFadeIn_0.15s_ease] max-md:fixed max-md:top-[70px] max-md:left-3 max-md:right-3 max-md:w-auto max-md:z-[99999] max-md:max-h-[80vh] max-md:overflow-y-auto">
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => { navigate('/client-gallery'); setShowAppDropdown(false); }}>
                                    <img src={brandPng} alt="Client Gallery" className="w-11 h-11 object-contain shrink-0 mix-blend-multiply" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[17px] font-semibold text-[#111]">Client Gallery</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Better way to share, deliver, proof and sell</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => { navigate('/smart-albums'); setShowAppDropdown(false); }}>
                                    <img src={smartAlbumPng} alt="Smart Albums" className="w-11 h-11 object-contain shrink-0 mix-blend-multiply" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[17px] font-semibold text-[#111]">Smart Albums</span>
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
                                        <span className="text-[17px] font-semibold text-[#111]">Website</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Build your own beautiful portfolio website</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => setShowAppDropdown(false)}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[17px] font-semibold text-[#111]">Store</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Your online store for prints and downloads</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => setShowAppDropdown(false)}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[17px] font-semibold text-[#111]">Studio Manager</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Photography business management</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => setShowAppDropdown(false)}>
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f1c40f, #f39c12)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[17px] font-semibold text-[#111]">Mobile Gallery App</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Simple, personalized mobile photo albums</span>
                                    </div>
                                </div>
                                */}
                                <div className="h-px bg-[#f0f0f0] my-2"></div>
                                <div className="flex items-center gap-[14px] px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]" onClick={() => { navigate('/dashboard'); setShowAppDropdown(false); }}>
                                    <img src={dashboardPng} alt="Dashboard" className="w-[18px] h-[18px] shrink-0 object-contain" />
                                    <span className="text-sm font-medium text-[#333]">View Dashboard</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {(!isCollapsed || isMobileMenuOpen) && (
                        <div className="flex items-center gap-2.5 relative" ref={!isCollapsed || isMobileMenuOpen ? profileDropdownRef : null}>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><img src={helpPng} alt="Help" className="w-[18px] h-[18px] object-contain shrink-0" /></div>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><img src={notificationPng} alt="Notifications" className="w-[18px] h-[18px] object-contain shrink-0" /></div>
                            <div 
                                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer max-md:hidden bg-[#8BDFDD] text-[#222]"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            >
                                {userInitial}
                            </div>
                            {showProfileDropdown && renderProfileDropdown('top-[calc(100%+8px)] right-0')}
                        </div>
                    )}
                </div>

                <div className="flex-1 pt-2.5 flex flex-col gap-3">
                    <div 
                        className={`sb-item ${isCollapsed && !isMobileMenuOpen ? 'sb-collapsed' : ''} ${path === '/client-gallery' || path.startsWith('/collections') ? 'sb-active' : ''}`} 
                        onClick={() => navigate('/client-gallery')}
                    >
                        <img src={collectionsPng} alt="Collections" className="sb-item-icon" style={{ opacity: path === '/client-gallery' || path.startsWith('/collections') ? 1 : 0.65 }} />
                        {(!isCollapsed || isMobileMenuOpen) && <span>Collections</span>}
                    </div>
                    <div 
                        className={`sb-item ${isCollapsed && !isMobileMenuOpen ? 'sb-collapsed' : ''} ${path.startsWith('/starred') ? 'sb-active' : ''}`} 
                        onClick={() => navigate('/starred/collections')}
                    >
                        <img src={starredPng} alt="Starred" className="sb-item-icon" style={{ opacity: path.startsWith('/starred') ? 1 : 0.65 }} />
                        {(!isCollapsed || isMobileMenuOpen) && <span>Starred</span>}
                    </div>
                    <div 
                        className={`sb-item ${isCollapsed && !isMobileMenuOpen ? 'sb-collapsed' : ''} ${path === '/homepage' ? 'sb-active' : ''}`} 
                        onClick={() => navigate('/homepage')}
                    >
                        <img src={homePagePng} alt="Homepage" className="sb-item-icon" style={{ opacity: path === '/homepage' ? 1 : 0.65 }} />
                        {(!isCollapsed || isMobileMenuOpen) && <span>Homepage</span>}
                    </div>
                    <div 
                        className={`sb-item ${isCollapsed && !isMobileMenuOpen ? 'sb-collapsed' : ''} ${path.startsWith('/settings') ? 'sb-active' : ''}`} 
                        onClick={() => navigate('/settings')}
                    >
                        <img src={settingsPng} alt="Settings" className="sb-item-icon" style={{ opacity: path.startsWith('/settings') ? 1 : 0.65 }} />
                        {(!isCollapsed || isMobileMenuOpen) && <span>Settings</span>}
                    </div>
                </div>

                <div className="flex flex-col items-stretch p-6 gap-2">
                    {isCollapsed && !isMobileMenuOpen ? (
                        <div className="flex flex-col items-center gap-5 w-full pb-1 relative" ref={isCollapsed && !isMobileMenuOpen ? profileDropdownRef : null}>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                            <div className="text-[#222] cursor-pointer flex items-center hover:text-[#111]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
                            <div 
                                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer max-md:hidden bg-[#8BDFDD] text-[#222]"
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
                            <div className="flex-1 sb-storage-box rounded-none flex items-center gap-2.5 relative cursor-pointer">
                                <div className="w-7 h-7 border-2 border-[#8BDFDD] rounded-full flex items-center justify-center bg-[rgba(139,223,221,0.15)] shrink-0">
                                    <img src={storagePng} alt="Storage" className="w-[16px] h-[16px] shrink-0 object-contain" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[#222] text-[15px] font-medium leading-none">Storage</span>
                                    <span className="text-[#888] text-[13px] mt-1.5 leading-none">0 GB of 3 GB used</span>
                                </div>
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
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
