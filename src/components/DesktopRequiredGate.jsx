import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DESKTOP_MIN_WIDTH,
  isDesktopViewport,
  shouldRequireDesktop,
} from '../lib/desktopOnly';
import './DesktopRequiredGate.css';

function DesktopRequiredNotice() {
  return (
    <div className="desktop-gate" role="alert">
      <div className="desktop-gate__glow" aria-hidden="true" />
      <div className="desktop-gate__grain" aria-hidden="true" />
      <div className="desktop-gate__copy">
        <svg className="desktop-gate__mark" viewBox="0 0 368 418" aria-hidden="true">
          <path d="M0 5h49v313L358 0h10v412h-49V101L10 418H0z" />
        </svg>
        <p className="desktop-gate__kicker">PIXNXT</p>
        <h1 className="desktop-gate__title">Open this on a desktop</h1>
        <p className="desktop-gate__body">
          The studio is built for a computer screen. Please visit from a desktop browser to continue.
        </p>
      </div>
    </div>
  );
}

export default function DesktopRequiredGate({ children }) {
  const { pathname } = useLocation();
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window === 'undefined' ? true : isDesktopViewport(window.innerWidth)
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const apply = () => setIsDesktop(media.matches);
    apply();
    if (media.addEventListener) media.addEventListener('change', apply);
    else media.addListener(apply);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', apply);
      else media.removeListener(apply);
    };
  }, []);

  if (shouldRequireDesktop(pathname) && !isDesktop) {
    return <DesktopRequiredNotice />;
  }

  return children;
}
