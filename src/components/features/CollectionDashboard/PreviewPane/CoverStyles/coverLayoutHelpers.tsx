import React from 'react';
import { cn } from '../../../../../lib/utils';
import { stripMediaUrlHash } from '../../../../../lib/focalPoint';
import { coverTextStyles, getCoverTextMode } from './coverTextStyles';

export function coverLayoutHeight(isPreview?: boolean, isGalleryView?: boolean) {
  return isGalleryView
    ? 'h-full min-h-[400px]'
    : isPreview
      ? 'h-full min-h-[220px]'
      : 'h-[400px] min-h-[400px]';
}

export function getBrandLabel(subtitle?: string) {
  return (subtitle || '').trim();
}

type CoverPhotoProps = {
  photoUrl?: string;
  focalX?: number;
  focalY?: number;
  className?: string;
  alt?: string;
};

export function CoverPhoto({ photoUrl, focalX, focalY, className, alt = '' }: CoverPhotoProps) {
  const src = stripMediaUrlHash(photoUrl);
  if (!src) return null;
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className={cn('h-full w-full object-cover', className)}
      style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }}
    />
  );
}

export function useCoverTypography(isPreview?: boolean, isGalleryView?: boolean) {
  const mode = getCoverTextMode(isPreview, isGalleryView);
  const s = coverTextStyles[mode];
  return { mode, s };
}

type ViewGalleryButtonProps = {
  onClick?: () => void;
  isPreview?: boolean;
  isGalleryView?: boolean;
  variant?: 'ghost' | 'filled' | 'underline' | 'dark' | 'plain';
  className?: string;
};

export function ViewGalleryButton({
  onClick,
  isPreview,
  isGalleryView,
  variant = 'filled',
  className,
}: ViewGalleryButtonProps) {
  const { s } = useCoverTypography(isPreview, isGalleryView);

  const variantClass =
    variant === 'ghost'
      ? 'border border-white/85 bg-transparent text-white hover:bg-white/10'
      : variant === 'underline'
        ? 'border-0 border-b border-white bg-transparent pb-1 text-white hover:opacity-80'
        : variant === 'dark'
          ? 'border-0 bg-[var(--gallery-text)] text-[var(--gallery-bg)] hover:opacity-90'
          : variant === 'plain'
            ? 'border-0 bg-transparent text-white hover:opacity-80'
            : 'border-0 bg-neutral-500 text-white hover:bg-neutral-600';

  return (
    <button
      type="button"
      className={cn(
        'cover-text-grid__button view-gallery-btn gallery-body-text shrink-0 font-medium uppercase tracking-[0.2em] transition-all duration-300',
        s.button,
        variantClass,
        className
      )}
      onClick={onClick}
    >
      VIEW GALLERY
    </button>
  );
}

type BrandDisplayProps = {
  brand?: string;
  coverLogoUrl?: string;
  className?: string;
  textClassName?: string;
  isPreview?: boolean;
};

export const BrandDisplay: React.FC<BrandDisplayProps> = ({
  brand,
  coverLogoUrl,
  className,
  textClassName,
  isPreview,
}) => {
  if (coverLogoUrl) {
    return (
      <div className={cn('cover-brand-logo-container flex items-center justify-center', className)}>
        <img
          src={coverLogoUrl}
          alt="Cover Logo"
          className={cn(
            'object-contain max-w-full',
            isPreview ? 'max-h-[30px] my-1' : 'max-h-[60px] my-2'
          )}
        />
      </div>
    );
  }

  if (brand) {
    return <span className={textClassName}>{brand}</span>;
  }

  return null;
};
