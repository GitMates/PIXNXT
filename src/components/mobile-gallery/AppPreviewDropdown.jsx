import React, { useEffect, useRef, useState } from 'react';
import '../../pages/mobile-gallery/MobileGallery.css';

const AppPreviewDropdown = ({ appId, appName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const enterPreview = () => {
    setOpen(false);
    window.open(`/mobile-gallery/app/${appId}/preview`, '_blank', 'noopener,noreferrer');
  };

  const sendTestApp = () => {
    setOpen(false);
    const email = window.prompt('Send a test app link to (email):');
    if (!email?.trim()) return;
    const subject = encodeURIComponent(`Test Mobile Gallery App: ${appName || 'Gallery'}`);
    const body = encodeURIComponent(
      `Hi,\n\nTry your Mobile Gallery App preview here:\n${window.location.origin}/mobile-gallery/app/${appId}/preview\n`
    );
    window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="mg-preview-dropdown" ref={ref}>
      <button
        type="button"
        className="mg-btn-outline mg-preview-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Preview
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="mg-preview-menu" role="menu">
          <button type="button" className="mg-preview-menu-item" onClick={enterPreview} role="menuitem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Enter preview mode
          </button>
          <button type="button" className="mg-preview-menu-item" onClick={sendTestApp} role="menuitem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            Send a test app
          </button>
        </div>
      )}
    </div>
  );
};

export default AppPreviewDropdown;
