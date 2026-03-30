import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../pages/ClientGallery.css';

const SidebarLayout = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        return localStorage.getItem('themeMode') === 'dark';
    });
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const appDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (appDropdownRef.current && !appDropdownRef.current.contains(e.target)) {
                setShowAppDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('themeMode', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('themeMode', 'light');
        }
        window.dispatchEvent(new Event('theme-change'));
    }, [isDarkTheme]);

    const toggleTheme = () => {
        setIsDarkTheme(prev => !prev);
    };

    return (
        <div className="cg-container">
            {/* Mobile Hamburger Button */}
            <button 
                className="cg-mobile-menu-btn" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{ display: 'none' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div className="cg-mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside className={`cg-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="cg-sidebar-header">
                    <div className="cg-logo" ref={appDropdownRef} style={{ position: 'relative' }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#593116" />
                            <rect x="10" y="10" width="8" height="8" fill="#fff" />
                        </svg>
                        {!isCollapsed && <span className="cg-logo-text">Client Gallery</span>}
                        {!isCollapsed && <svg className="cg-logo-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" onClick={(e) => { e.stopPropagation(); setShowAppDropdown(!showAppDropdown); }} style={{ cursor: 'pointer' }}><polyline points="6 9 12 15 18 9"></polyline></svg>}
                        {showAppDropdown && !isCollapsed && (
                            <div className="cg-app-dropdown">
                                <div className="cg-app-dropdown-item" onClick={() => { navigate('/client-gallery'); setShowAppDropdown(false); }}>
                                    <div className="cg-app-icon" style={{ background: 'linear-gradient(135deg, #593116, #42220c)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    </div>
                                    <div className="cg-app-info">
                                        <span className="cg-app-name">Client Gallery</span>
                                        <span className="cg-app-desc">Better way to share, deliver, proof and sell</span>
                                    </div>
                                </div>
                                <div className="cg-app-dropdown-item" onClick={() => setShowAppDropdown(false)}>
                                    <div className="cg-app-icon" style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                    </div>
                                    <div className="cg-app-info">
                                        <span className="cg-app-name">Website</span>
                                        <span className="cg-app-desc">Build your own beautiful portfolio website</span>
                                    </div>
                                </div>
                                <div className="cg-app-dropdown-item" onClick={() => setShowAppDropdown(false)}>
                                    <div className="cg-app-icon" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                                    </div>
                                    <div className="cg-app-info">
                                        <span className="cg-app-name">Store</span>
                                        <span className="cg-app-desc">Your online store for prints and downloads</span>
                                    </div>
                                </div>
                                <div className="cg-app-dropdown-item" onClick={() => setShowAppDropdown(false)}>
                                    <div className="cg-app-icon" style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </div>
                                    <div className="cg-app-info">
                                        <span className="cg-app-name">Studio Manager</span>
                                        <span className="cg-app-desc">Photography business management</span>
                                    </div>
                                </div>
                                <div className="cg-app-dropdown-item" onClick={() => setShowAppDropdown(false)}>
                                    <div className="cg-app-icon" style={{ background: 'linear-gradient(135deg, #f1c40f, #f39c12)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                    </div>
                                    <div className="cg-app-info">
                                        <span className="cg-app-name">Mobile Gallery App</span>
                                        <span className="cg-app-desc">Simple, personalized mobile photo albums</span>
                                    </div>
                                </div>
                                <div className="cg-app-dropdown-divider"></div>
                                <div className="cg-app-dropdown-item cg-app-dashboard-link" onClick={() => { navigate('/'); setShowAppDropdown(false); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                    <span className="cg-app-name">View Dashboard</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="cg-sidebar-actions">
                            <div className="cg-nav-icon cg-action-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                            <div className="cg-nav-icon cg-action-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
                            <div className="cg-profile-circle" style={{ backgroundColor: '#593116', color: '#fff' }}>D</div>
                        </div>
                    )}
                </div>

                <div className="cg-sidebar-nav">
                    <div className={`cg-nav-item ${path === '/client-gallery' || path.startsWith('/collections') ? 'active' : ''}`} onClick={() => navigate('/client-gallery')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><circle cx="12" cy="13" r="2"></circle><path d="m14 13-1.5 1.5-1-1L10 15h6Z"></path></svg>
                        <span>Collections</span>
                    </div>
                    <div className={`cg-nav-item ${path === '/photos' ? 'active' : ''}`} onClick={() => navigate('/photos')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
                        <span>Library</span>
                    </div>
                    <div className={`cg-nav-item ${path.startsWith('/starred') ? 'active' : ''}`} onClick={() => navigate('/starred')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        <span>Starred</span>
                    </div>

                    <div className={`cg-nav-item ${path === '/homepage' ? 'active' : ''}`} onClick={() => navigate('/homepage')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>Homepage</span>
                    </div>
                    <div className={`cg-nav-item ${path.startsWith('/settings') ? 'active' : ''}`} onClick={() => navigate('/settings')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <span>Settings</span>
                    </div>
                    
                    {!isCollapsed && (
                        <div className="cg-theme-toggle-container" style={{ display: 'flex', alignItems: 'center', margin: '16px 20px', gap: '12px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-800)', flex: 1 }}>{isDarkTheme ? 'Dark Mode' : 'Light Mode'}</span>
                            <div className={`cg-theme-switch ${isDarkTheme ? 'on' : 'off'}`} onClick={toggleTheme} style={{ width: '40px', height: '22px', backgroundColor: isDarkTheme ? '#593116' : '#d9d9d9', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}>
                                <div className="cg-theme-knob" style={{ width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isDarkTheme ? '20px' : '2px', transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="cg-sidebar-bottom" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    {isCollapsed ? (
                        <div className="cg-sidebar-bottom-collapsed-actions">
                            <div className="cg-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                            <div className="cg-nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
                            <div className="cg-profile-circle">D</div>

                            <div className="cg-collapse-toggle-box" onClick={() => setIsCollapsed(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                            </div>
                        </div>
                    ) : (
                        <div className="cg-sidebar-bottom-expanded">
                            <div className="cg-collapse-btn" onClick={() => setIsCollapsed(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
                            </div>
                            <div className="cg-storage-card">
                                <div className="cg-storage-icon-circle">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-800, #593116)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                                </div>
                                <div className="cg-storage-info">
                                    <span className="cg-storage-title">Storage</span>
                                    <span className="cg-storage-text">0 GB of 3 GB used</span>
                                </div>
                                <button className="cg-upgrade-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#593116" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="cg-main-wrapper">
                {children}
            </div>
        </div>
    );
};

export default SidebarLayout;

