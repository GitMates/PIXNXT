import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUploadQueueContext } from './uploadQueueContext';

/** Minimize upload panel when navigating away from active upload pages. */
export function UploadQueueRouteSync() {
  const location = useLocation();
  const { state, minimize } = useUploadQueueContext();
  const prevPathRef = useRef(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    prevPathRef.current = curr;

    if (prev === '/collections/manage' && curr !== '/collections/manage') {
      if (state.isOpen && !state.isMinimized) {
        minimize();
      }
    }

    if (prev?.startsWith('/guest-delivery/event/') && !curr.startsWith('/guest-delivery/event/')) {
      if (state.isOpen && !state.isMinimized) {
        minimize();
      }
    }
  }, [location.pathname, state.isOpen, state.isMinimized, minimize]);

  return null;
}
