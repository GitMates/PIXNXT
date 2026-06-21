import React from 'react';

const MobileGalleryIcon = ({ size = 36, className = '' }) => {
  const gradientId = React.useId().replace(/:/g, '');

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="44" height="44" rx="10" fill={`url(#${gradientId})`} />
      <rect x="13" y="8" width="18" height="28" rx="3" fill="white" fillOpacity="0.95" />
      <rect x="19" y="32" width="6" height="2" rx="1" fill="#f1c40f" />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1c40f" />
          <stop offset="1" stopColor="#f39c12" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default MobileGalleryIcon;
