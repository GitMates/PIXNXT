import React from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import './MobileMenuButton.css';

/** Theme-aware mobile navigation trigger for drawer-based app shells. */
export default function MobileMenuButton({
  isOpen = false,
  onClick,
  controls,
  label = 'navigation menu',
  className = '',
}) {
  const Icon = isOpen ? X : Menu;

  return (
    <button
      type="button"
      className={cn('mobile-menu-button', className)}
      onClick={onClick}
      aria-label={`${isOpen ? 'Close' : 'Open'} ${label}`}
      aria-expanded={isOpen}
      aria-controls={controls}
    >
      <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
