import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUploadQueueContext, useUploadQueueSelector } from './uploadQueueContext';

const selectExpanded = (s) => s.isOpen && !s.isMinimized;

/** Minimize upload panel when navigating away from active upload pages. */
export function UploadQueueRouteSync() {
  const location = useLocation();
  const { minimize } = useUploadQueueContext();
  const isExpanded = useUploadQueueSelector(selectExpanded);
  const prevPathRef = useRef(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    prevPathRef.current = curr;

    if (prev === '/deliveries/manage' && curr !== '/deliveries/manage') {
      if (isExpanded) minimize();
    }

    if (prev?.startsWith('/guest-delivery/event/') && !curr.startsWith('/guest-delivery/event/')) {
      if (isExpanded) minimize();
    }
  }, [location.pathname, isExpanded, minimize]);

  return null;
}
