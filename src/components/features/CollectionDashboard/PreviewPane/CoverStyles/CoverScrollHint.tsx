import React from 'react';
import { cn } from '../../../../../lib/utils';
import './CoverScrollHint.css';

export type CoverScrollStyle =
  | 'center'
  | 'left'
  | 'novel'
  | 'vintage'
  | 'frame'
  | 'stripe'
  | 'divider'
  | 'journal'
  | 'stamp'
  | 'outline'
  | 'classic'
  | 'none';

type CoverScrollHintProps = {
  coverStyle: string;
  onClick?: () => void;
  /** Smaller sizing in the dashboard GalleryPreview pane */
  isPreview?: boolean;
  /** Full-size sizing on the public /gallery page */
  isGalleryView?: boolean;
  /** Rendered inside a cover layout stack instead of the hero overlay */
  embedded?: boolean;
  className?: string;
};

/** Covers that embed the scroll hint in their own layout stack */
export function coverUsesEmbeddedScroll(coverStyle: string): boolean {
  return ['center', 'frame', 'journal', 'outline'].includes(coverStyle);
}

/** Cover layouts that sit on a solid panel rather than a full-bleed photo */
export function coverScrollHintUsesLightText(coverStyle: string): boolean {
  return !['novel', 'vintage', 'journal', 'stamp'].includes(coverStyle);
}

/** Maps each cover layout to a placement modifier class */
export function getCoverScrollHintPlacementClass(coverStyle: string): string {
  switch (coverStyle) {
    case 'center':
      return 'cover-scroll-hint--placement-center';
    case 'novel':
      return 'cover-scroll-hint--placement-left-panel';
    case 'divider':
      return 'cover-scroll-hint--placement-left-panel cover-scroll-hint--placement-divider';
    case 'journal':
      return 'cover-scroll-hint--placement-right-panel';
    case 'vintage':
    case 'stamp':
      return 'cover-scroll-hint--placement-panel-bottom';
    case 'left':
    case 'frame':
    case 'stripe':
    case 'outline':
      return 'cover-scroll-hint--placement-photo-bottom';
    default:
      return 'cover-scroll-hint--placement-photo-bottom';
  }
}

export const CoverScrollHint: React.FC<CoverScrollHintProps> = ({
  coverStyle,
  onClick,
  isPreview,
  isGalleryView,
  embedded,
  className,
}) => {
  const lightText = coverScrollHintUsesLightText(coverStyle);

  return (
    <button
      type="button"
      className={cn(
        'cover-scroll-hint',
        embedded
          ? `cover-scroll-hint--embedded cover-scroll-hint--embedded-${coverStyle}`
          : getCoverScrollHintPlacementClass(coverStyle),
        isPreview && 'cover-scroll-hint--preview',
        isGalleryView && 'cover-scroll-hint--gallery-view',
        lightText ? 'cover-scroll-hint--light' : 'cover-scroll-hint--dark',
        className
      )}
      onClick={onClick}
      aria-label="Scroll to gallery"
    >
      <span className="cover-scroll-hint__track" aria-hidden>
        <span className="cover-scroll-hint__line" />
      </span>
      <span className="cover-scroll-hint__label">Scroll</span>
    </button>
  );
};
