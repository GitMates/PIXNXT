import React, { useEffect, useState } from 'react';
import { getStudioProfileIconCandidates, preloadProfileIcon } from '../../lib/profileIcon';

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
  const explicit = typeof src === 'string' ? src.trim() : '';
  const candidates = explicit
    ? [explicit]
    : getStudioProfileIconCandidates(profile, userId || profile?.id);
  const [index, setIndex] = useState(0);
  const icon = candidates[index] || '';

  useEffect(() => {
    setIndex(0);
  }, [explicit, profile?.profile_icon_url, profile?.avatar_url, profile?.picture, userId]);

  useEffect(() => {
    if (icon) preloadProfileIcon(icon);
  }, [icon]);

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
        onError={() => setIndex((i) => i + 1)}
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
