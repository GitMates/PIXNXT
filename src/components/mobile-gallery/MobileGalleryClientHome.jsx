import React, { useMemo } from 'react';
import ThemeCoverContent from './ThemeCoverContent';
import MobileGalleryPhotoGrid from './MobileGalleryPhotoGrid';
import { getAppDesignSettings, getDesignPreviewBackgroundUrl, getThemeById } from '../../lib/mobileGalleryDesign';

export default function MobileGalleryClientHome({
  app,
  photos,
  scrollRef,
  photosRef,
  onPhotoClick,
  ctaLink = null,
}) {
  const design = useMemo(() => getAppDesignSettings(app), [app]);
  const theme = getThemeById(design.theme);
  const isDark = design.color_theme === 'dark';
  const focalX = design.cover_focal_x ?? 50;
  const focalY = design.cover_focal_y ?? 50;
  const coverUrl = getDesignPreviewBackgroundUrl(app, photos, design.theme);

  const showCoverImage = coverUrl && design.cover_style !== 'none';
  const coverImageStyle = showCoverImage
    ? {
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: `${focalX}% ${focalY}%`,
      }
    : undefined;

  const fullCoverStyle =
    design.cover_style === 'full'
      ? {
          backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: `${focalX}% ${focalY}%`,
        }
      : undefined;

  return (
    <div
      className={`mg-client-home-scroll${isDark ? ' mg-client-home-scroll--dark' : ''}`}
      ref={scrollRef}
    >
      <div
        className={`mg-design-cover-preview mg-design-cover-preview--${design.cover_style} mg-design-cover-preview--theme-${theme.id} mg-client-cover${isDark ? ' mg-design-cover-preview--dark' : ''}`}
        style={fullCoverStyle}
      >
        {design.cover_style === 'third' && (
          <div
            className={`mg-design-cover-third-img${showCoverImage ? '' : ' mg-design-cover-third-img--empty'}`}
            style={coverImageStyle}
          />
        )}
        {design.cover_style === 'full' && <div className="mg-design-cover-overlay" />}
        <div className={`mg-design-cover-body mg-design-cover-body--${design.cover_style}`}>
          <ThemeCoverContent
            themeId={design.theme}
            appName={app?.name}
            eventDate={app?.event_date}
            coverStyle={design.cover_style}
            variant="preview"
          />
        </div>
      </div>

      <div className="mg-client-grid" ref={photosRef}>
        {photos.length === 0 ? (
          <div className="mg-preview-home-empty-photos">
            <p>No photos yet</p>
          </div>
        ) : (
          <MobileGalleryPhotoGrid
            photos={photos}
            gridStyle={design.grid_style}
            variant="interactive"
            onPhotoClick={onPhotoClick}
          />
        )}

        {ctaLink && (
          <a
            href={ctaLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mg-preview-visit-website"
          >
            {ctaLink.label}
          </a>
        )}
      </div>
    </div>
  );
}
