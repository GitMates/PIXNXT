import React, { useEffect, useRef } from 'react';
import '../../pages/mobile-gallery/MobileGallery.css';

const MobileGalleryNotifications = ({ open, onToggle, onClose, triggerClassName = 'mg-topbar-icon' }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  return (
    <div className="mg-header-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className={`${triggerClassName}${open ? ' mg-topbar-icon--active' : ''}`}
        onClick={onToggle}
        aria-label="Notifications"
        aria-expanded={open}
        title="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
      {open && (
        <div className="mg-notifications-panel">
          <h3 className="mg-notifications-title">Notifications</h3>
          <p className="mg-notifications-empty">You have no notifications.</p>
        </div>
      )}
    </div>
  );
};

export default MobileGalleryNotifications;
