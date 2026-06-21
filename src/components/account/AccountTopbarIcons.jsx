import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MobileGalleryHelpDropdown from '../mobile-gallery/MobileGalleryHelpDropdown';
import MobileGalleryNotifications from '../mobile-gallery/MobileGalleryNotifications';
import '../../pages/mobile-gallery/MobileGallery.css';

const ACCENT = '#1a9b84';
const ACCENT_LIGHT = '#e8f7f2';

const GiftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CreditCardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function AccountProfileDropdown({ open, onToggle, onClose, userInitial }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.email ? user.email.split('@')[0] : 'User';

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="mg-header-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className="acct-topbar-avatar"
        onClick={onToggle}
        aria-label="Account menu"
        aria-expanded={open}
      >
        {userInitial}
      </button>
      {open && (
        <div className="mg-profile-dropdown mg-profile-dropdown--full acct-profile-menu">
          <div className="mg-profile-dropdown-header">
            <div className="mg-profile-dropdown-avatar" style={{ background: ACCENT_LIGHT, color: ACCENT }}>
              {userInitial}
            </div>
            <div>
              <div className="mg-profile-dropdown-name">{displayName}</div>
              <div className="mg-profile-dropdown-email">{user?.email || ''}</div>
            </div>
          </div>
          <button type="button" className="mg-profile-dropdown-item mg-profile-dropdown-item--icon" onClick={() => go('/account/refer')}>
            <GiftIcon />
            Invite Friends &amp; Get $20
          </button>
          <div className="mg-profile-dropdown-divider" />
          <button type="button" className="mg-profile-dropdown-item mg-profile-dropdown-item--icon" onClick={() => go('/account/profile')}>
            <UserIcon />
            Profile
          </button>
          <button type="button" className="mg-profile-dropdown-item mg-profile-dropdown-item--icon" onClick={() => go('/account/billing')}>
            <CreditCardIcon />
            Billing
          </button>
          <button type="button" className="mg-profile-dropdown-item mg-profile-dropdown-item--icon" onClick={() => go('/account/advanced')}>
            <SlidersIcon />
            Advanced Settings
          </button>
          <div className="mg-profile-dropdown-divider" />
          <button type="button" className="mg-profile-dropdown-item mg-profile-dropdown-item--icon" onClick={() => go('/account/account')}>
            <GearIcon />
            Account
          </button>
          <button type="button" className="mg-profile-dropdown-item mg-profile-dropdown-item--icon" onClick={handleLogout}>
            <LogoutIcon />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

/** Help / notifications / profile icons for Account settings header */
export default function AccountTopbarIcons({ userInitial }) {
  const [openPanel, setOpenPanel] = useState(null);

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const closePanels = () => setOpenPanel(null);

  return (
    <div className="acct-topbar-icons">
      <MobileGalleryHelpDropdown
        open={openPanel === 'help'}
        onToggle={() => togglePanel('help')}
        onClose={closePanels}
        triggerClassName="acct-topbar-icon"
      />
      <MobileGalleryNotifications
        open={openPanel === 'notifications'}
        onToggle={() => togglePanel('notifications')}
        onClose={closePanels}
        triggerClassName="acct-topbar-icon"
      />
      <AccountProfileDropdown
        open={openPanel === 'profile'}
        onToggle={() => togglePanel('profile')}
        onClose={closePanels}
        userInitial={userInitial}
      />
    </div>
  );
}
