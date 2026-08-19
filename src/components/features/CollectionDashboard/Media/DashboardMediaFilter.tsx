import React from 'react';
import type { GalleryMediaFilterValue } from '@/lib/galleryMediaType';

export interface DashboardMediaFilterProps {
  value: GalleryMediaFilterValue;
  onChange: (value: GalleryMediaFilterValue) => void;
  photoCount: number;
  videoCount: number;
  className?: string;
}

export function DashboardMediaFilter({
  value,
  onChange,
  photoCount,
  videoCount,
  className = '',
}: DashboardMediaFilterProps) {
  if (photoCount <= 0 && videoCount <= 0) return null;

  return (
    <div className={`cd-media-filter${className ? ` ${className}` : ''}`} role="tablist" aria-label="Filter by media type">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'photos'}
        className={`cd-media-filter-tab${value === 'photos' ? ' cd-media-filter-tab--active' : ''}`}
        onClick={() => onChange('photos')}
      >
        Photos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'videos'}
        className={`cd-media-filter-tab${value === 'videos' ? ' cd-media-filter-tab--active' : ''}`}
        onClick={() => onChange('videos')}
      >
        Videos
      </button>
    </div>
  );
}
