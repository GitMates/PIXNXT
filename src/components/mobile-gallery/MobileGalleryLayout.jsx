import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import brandPng from '../../assets/icons/client gallery.png';
import smartAlbumPng from '../../assets/icons/smart album.png';
import dashboardPng from '../../assets/icons/dashboard.png';
import MobileGalleryIcon from './MobileGalleryIcon';
import MobileGalleryHelpDropdown from './MobileGalleryHelpDropdown';
import MobileGalleryNotifications from './MobileGalleryNotifications';
import MobileGalleryProfileDropdown from './MobileGalleryProfileDropdown';
import '../../styles/clientGalleryTheme.css';
import '../../styles/mobileGalleryTheme.css';
import '../../pages/ClientGallery.css';
import '../../pages/mobile-gallery/MobileGallery.css';

const MobileGalleryLayout = ({ children }) => {
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  const [openPanel, setOpenPanel] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const appDropdownRef = useRef(null);

  const isAppDetail = location.pathname.includes('/mobile-gallery/app/');
  const isModuleSettings = location.pathname.startsWith('/mobile-gallery/settings');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (appDropdownRef.current?.contains(e.target)) return;
      setShowAppDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
    setShowAppDropdown(false);
  };

  const closePanels = () => setOpenPanel(null);

  return (
    <div className="theme-mono cg-shell mg-theme mg-shell">
      <header className="mg-topbar">
        <div className="mg-topbar-left">
          <span className="mg-brand-logo" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            PIXNXT
          </span>
          <div className="mg-app-switcher" ref={appDropdownRef}>
            <button
              type="button"
              className="mg-app-switcher-btn"
              onClick={() => {
                setShowAppDropdown((open) => !open);
                closePanels();
              }}
              aria-expanded={showAppDropdown}
            >
              <MobileGalleryIcon size={28} />
              <span>Mobile Gallery App</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showAppDropdown && (
              <div className="mg-app-dropdown">
                <div
                  className="mg-app-dropdown-item"
                  onClick={() => {
                    navigate('/client-gallery');
                    setShowAppDropdown(false);
                  }}
                >
                  <img src={brandPng} alt="" className="mg-app-dropdown-icon" />
                  <div>
                    <span className="mg-app-dropdown-title">Client Gallery</span>
                    <span className="mg-app-dropdown-desc">Better way to share, deliver, proof and sell</span>
                  </div>
                </div>
                <div
                  className="mg-app-dropdown-item"
                  onClick={() => {
                    navigate('/album-proofer');
                    setShowAppDropdown(false);
                  }}
                >
                  <img src={smartAlbumPng} alt="" className="mg-app-dropdown-icon" />
                  <div>
                    <span className="mg-app-dropdown-title">Album Proofer</span>
                    <span className="mg-app-dropdown-desc">Design and deliver beautiful photo albums</span>
                  </div>
                </div>
                <div className="mg-app-dropdown-item mg-app-dropdown-item--active">
                  <MobileGalleryIcon size={44} />
                  <div>
                    <span className="mg-app-dropdown-title">Mobile Gallery App</span>
                    <span className="mg-app-dropdown-desc">Simple, personalized mobile photo albums</span>
                  </div>
                </div>
                <div className="mg-app-dropdown-divider" />
                <div
                  className="mg-app-dropdown-item mg-app-dropdown-item--compact"
                  onClick={() => {
                    navigate('/dashboard');
                    setShowAppDropdown(false);
                  }}
                >
                  <img src={dashboardPng} alt="" className="mg-app-dropdown-icon-sm" />
                  <span className="mg-app-dropdown-link">View Dashboard</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mg-topbar-right">
          {!isAppDetail && !isModuleSettings && (
            <button
              type="button"
              className="mg-topbar-icon neu-circle"
              onClick={() => {
                closePanels();
                navigate('/mobile-gallery/settings');
              }}
              aria-label="Mobile Gallery settings"
            >
              <Settings size={18} strokeWidth={1.75} />
            </button>
          )}
          <MobileGalleryHelpDropdown
            open={openPanel === 'help'}
            onToggle={() => togglePanel('help')}
            onClose={closePanels}
            triggerClassName="mg-topbar-icon neu-circle"
          />
          <MobileGalleryNotifications
            open={openPanel === 'notifications'}
            onToggle={() => togglePanel('notifications')}
            onClose={closePanels}
            triggerClassName="mg-topbar-icon neu-circle"
          />
          <MobileGalleryProfileDropdown
            open={openPanel === 'profile'}
            onToggle={() => togglePanel('profile')}
            onClose={closePanels}
            triggerClassName="mg-profile-btn"
          />
        </div>
      </header>

      <main className="mg-main cg-style-2">{children}</main>
    </div>
  );
};

export default MobileGalleryLayout;
