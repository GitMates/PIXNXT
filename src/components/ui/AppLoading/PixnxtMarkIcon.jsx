import React from 'react';

/**
 * PIXNXT logomark — geometric “N” from the original brand lockup
 * (left upright + diagonal top-left→bottom-right + right upright).
 * Uses currentColor so the sidebar wordmark can share the same tint.
 */
export function PixnxtMarkIcon({ className = '', ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      {/* Left upright */}
      <rect x="3.2" y="2.4" width="4.2" height="19.2" />
      {/* Right upright */}
      <rect x="16.6" y="2.4" width="4.2" height="19.2" />
      {/* Diagonal — top-left → bottom-right (original lockup) */}
      <path d="M7.4 2.4H11.85L20.8 21.6H16.35L7.4 2.4Z" />
    </svg>
  );
}
