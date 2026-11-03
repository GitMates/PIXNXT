import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Monitor, X } from 'lucide-react';
import './MobileExperienceNotice.css';

const NOTICE_KEY = 'pixnxt.mobile-experience-notice-seen';
const MOBILE_BREAKPOINT = 1024;

export default function MobileExperienceNotice() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (pathname !== '/' || typeof window === 'undefined') return undefined;

    let media;
    if (window.matchMedia) {
      media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    }

    const showIfNeeded = () => {
      if (!media?.matches) return;
      try {
        if (window.localStorage.getItem(NOTICE_KEY)) return;
        window.localStorage.setItem(NOTICE_KEY, 'true');
      } catch {
        // Keep the advice usable when browser storage is unavailable.
      }
      setIsOpen(true);
    };

    showIfNeeded();
    media?.addEventListener?.('change', showIfNeeded);
    return () => media?.removeEventListener?.('change', showIfNeeded);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  if (!isOpen || pathname !== '/') return null;

  return (
    <div className="mobile-experience-notice__backdrop">
      <section
        className="mobile-experience-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-experience-title"
        aria-describedby="mobile-experience-description"
      >
        <button
          type="button"
          className="mobile-experience-notice__close"
          onClick={() => setIsOpen(false)}
          aria-label="Close desktop experience advice"
        >
          <X size={18} />
        </button>
        <div className="mobile-experience-notice__mark" aria-hidden="true"><Monitor size={24} /></div>
        <p className="mobile-experience-notice__eyebrow">PIXNXT</p>
        <h2 id="mobile-experience-title">A bigger screen works best</h2>
        <p id="mobile-experience-description">
          For the best experience, open PIXNXT on a desktop. You can also continue using it on your phone.
        </p>
        <button
          type="button"
          className="mobile-experience-notice__continue"
          onClick={() => setIsOpen(false)}
        >
          Continue on mobile
        </button>
      </section>
    </div>
  );
}
