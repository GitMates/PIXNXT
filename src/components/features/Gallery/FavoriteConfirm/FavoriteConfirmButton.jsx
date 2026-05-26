import React from 'react';
import { cn } from '../../../../lib/utils';

/**
 * Full-width confirm control (Favorites hub + gallery bar).
 */
export function FavoriteConfirmButton({
  disabled,
  isSubmitting,
  onClick,
  className,
  label = 'Confirm favorites',
}) {
  return (
    <button
      type="button"
      disabled={disabled || isSubmitting}
      onClick={onClick}
      className={cn(
        'w-full py-4 text-[11px] font-bold uppercase tracking-[0.35em] text-white transition-opacity',
        'disabled:cursor-not-allowed disabled:opacity-45',
        !disabled && !isSubmitting && 'hover:opacity-90',
        className
      )}
      style={{ backgroundColor: disabled || isSubmitting ? '#b5b5b5' : '#9a9a9a' }}
    >
      {isSubmitting ? 'Submitting…' : label}
    </button>
  );
}
