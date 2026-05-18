import React from 'react';
import { cn } from '../../../../lib/utils';
import type { GalleryMediaFilterValue } from '../../../../lib/galleryMediaType';
import { galleryChromeStyles, type GalleryChromeVariant } from './galleryChromeStyles';

interface GalleryMediaFilterProps {
  value: GalleryMediaFilterValue;
  onChange: (value: GalleryMediaFilterValue) => void;
  photoCount: number;
  videoCount: number;
  variant?: GalleryChromeVariant;
  className?: string;
}

export const GalleryMediaFilter: React.FC<GalleryMediaFilterProps> = ({
  value,
  onChange,
  photoCount,
  videoCount,
  variant = 'galleryView',
  className,
}) => {
  if (photoCount <= 0 || videoCount <= 0) return null;

  const isCompact = variant === 'preview';
  const tabClass = galleryChromeStyles[variant].tab;

  const tabButtonClass = (active: boolean) =>
    cn(
      tabClass,
      'relative shrink-0 py-2 transition-opacity',
      active ? 'opacity-100' : 'opacity-45 hover:opacity-100'
    );

  return (
    <div
      className={cn(
        'gallery-media-filter flex w-full items-center justify-center gap-6 border-b md:gap-10',
        isCompact ? 'gap-4 border-black/5 px-2 py-1.5 md:px-3' : 'border-black/5 py-2 md:py-2.5',
        className
      )}
      style={{
        backgroundColor: 'var(--gallery-bg)',
        borderColor: 'color-mix(in srgb, var(--gallery-text) 8%, transparent)',
      }}
      role="tablist"
      aria-label="Filter by media type"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'photos'}
        className={tabButtonClass(value === 'photos')}
        style={{ color: 'var(--gallery-text)' }}
        onClick={() => onChange('photos')}
      >
        Photos
        {value === 'photos' && (
          <span
            className="absolute bottom-0 left-0 h-[1.5px] w-full"
            style={{ backgroundColor: 'var(--gallery-text)' }}
          />
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'videos'}
        className={tabButtonClass(value === 'videos')}
        style={{ color: 'var(--gallery-text)' }}
        onClick={() => onChange('videos')}
      >
        Videos
        {value === 'videos' && (
          <span
            className="absolute bottom-0 left-0 h-[1.5px] w-full"
            style={{ backgroundColor: 'var(--gallery-text)' }}
          />
        )}
      </button>
    </div>
  );
};
