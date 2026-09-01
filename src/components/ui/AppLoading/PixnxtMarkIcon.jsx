import React from 'react';

/** PIXNXT logomark — mirrored N used in the center of AppSpinner. */
export function PixnxtMarkIcon({ className = '', ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M6 4.25V19.75M6 19.75L18 4.25M18 4.25V19.75"
        stroke="currentColor"
        strokeWidth="3.15"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
