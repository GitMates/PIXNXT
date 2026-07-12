import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/clientGalleryTheme.css';
import '../../pages/guest-delivery/GuestDelivery.css';

const GuestDeliveryLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEventDetail = location.pathname.includes('/guest-delivery/event/');

  return (
    <div className="theme-mono gd-shell">
      <header className="gd-topbar">
        <div className="gd-topbar-left">
          <span className="gd-brand" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            PIXNXT
          </span>
          <span className="gd-module-name">Guest Delivery</span>
        </div>
        {!isEventDetail && (
          <button type="button" className="gd-btn-text" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
        )}
      </header>
      {children}
    </div>
  );
};

export default GuestDeliveryLayout;
