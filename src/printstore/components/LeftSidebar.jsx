import React from 'react';
import { X, Upload } from 'lucide-react';

export default function LeftSidebar({ isOpen, onClose, isLoggedIn, onToggleLogin }) {
  if (!isOpen) return null;

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Collection link copied to clipboard!");
  };

  return (
    <div className="menu-drawer-overlay" onClick={onClose}>
      <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header Actions Bar */}
        <div className="menu-drawer-header-actions">
          <button 
            className="menu-drawer-close-btn" 
            onClick={onClose} 
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Branding Photographer Title */}
        <h3 className="menu-drawer-title">Kharthik Baskaran</h3>

        {/* Share gallery button */}
        <button className="menu-drawer-share-btn" onClick={handleShareClick}>
          <Upload size={18} strokeWidth={1.5} />
          <span>Share gallery</span>
        </button>

        <hr className="menu-drawer-divider" />

        {/* Auth details panel */}
        {isLoggedIn ? (
          <div>
            <div className="menu-drawer-login-text" style={{ color: '#111111', fontWeight: 500 }}>
              Logged in as Kbaskaran
            </div>
            <div className="menu-drawer-login-text" style={{ fontSize: '0.8rem', marginTop: '-0.5rem' }}>
              kbaskaran@example.com
            </div>
            <button 
              className="menu-drawer-login-btn" 
              style={{ background: '#ff3b30 !important', marginTop: '1rem' }} 
              onClick={() => {
                onToggleLogin();
                alert("Logged out of account!");
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <div>
            <p className="menu-drawer-login-text">
              Log in to access your account, view orders and related galleries
            </p>
            <button 
              className="menu-drawer-login-btn" 
              onClick={() => {
                onToggleLogin();
                alert("Successfully logged in as Kbaskaran!");
              }}
            >
              Log in
            </button>
            <div className="menu-drawer-signup-text">
              Don't have an account? 
              <span className="menu-drawer-signup-link" onClick={() => alert("Redirecting to sign up... (Mock Action)")}>
                Sign up
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
