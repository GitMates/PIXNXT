import { useEffect, useState } from 'react';

/** Matches GalleryView.css breakpoint (max-width: 767px). */
export const GALLERY_MOBILE_MAX_WIDTH_PX = 767;

export function useIsMobileViewport(maxWidth = GALLERY_MOBILE_MAX_WIDTH_PX) {
  const query = `(max-width: ${maxWidth}px)`;

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [query]);

  return isMobile;
}
