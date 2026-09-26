import React, { useEffect, useState } from 'react';
import { getStudioProfileIconSrc, preloadProfileIcon } from '../../lib/profileIcon';

/**
 * Studio avatar: shows the uploaded profile icon when one exists,
 * otherwise falls back to initials text. The image fills the parent
 * wrapper — do not force a circle here; parents clip with overflow +
 * their own border-radius (circle or rounded square).
 */
export function StudioAvatar({
  profile,
  userId,
  src,
  fallback,
  alt = 'Studio',
  radius = '0',
  style,
  priority = true,
}) {
  const resolved =
    (typeof src === 'string' && src.trim()) ||
    getStudioProfileIconSrc(profile, userId || profile?.id) ||
    '';

  const [failedUrl, setFailedUrl] = useState('');
  const icon = resolved && resolved !== failedUrl ? resolved : '';

  useEffect(() => {
    if (resolved) preloadProfileIcon(resolved);
  }, [resolved]);

  if (icon) {
    return (
      <img
        src={icon}
        alt={alt}
        draggable={false}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(icon)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          borderRadius: radius,
          display: 'block',
          ...style,
        }}
      />
    );
  }
  return <>{fallback}</>;
}

export default StudioAvatar;
