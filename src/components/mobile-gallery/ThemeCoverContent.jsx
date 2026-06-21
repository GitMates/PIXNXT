import React from 'react';
import { formatThemeEventDate, formatThemeTitle, getThemeById } from '../../lib/mobileGalleryDesign';

function ScrollDownButton({ className }) {
  return (
    <div className={className} aria-hidden>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function ThemeCoverContent({ themeId, appName, eventDate, variant = 'preview' }) {
  const theme = getThemeById(themeId);
  const title = formatThemeTitle(appName, theme);
  const dateLabel = formatThemeEventDate(eventDate, theme);
  const isThumb = variant === 'thumb';

  const dateEl = dateLabel ? (
    <p className={`mg-theme-cover-date mg-theme-cover-date--${themeId}`}>{dateLabel}</p>
  ) : null;

  const titleEl = (
    <h2 className={`mg-theme-cover-title mg-theme-cover-title--${themeId}`}>{title}</h2>
  );

  return (
    <>
      <div className={`mg-theme-cover-text mg-theme-cover-text--${theme.layout} mg-theme-cover-text--${themeId}`}>
        {theme.dateFirst ? (
          <>
            {dateEl}
            {titleEl}
          </>
        ) : (
          <>
            {titleEl}
            {dateEl}
          </>
        )}
        {theme.showCta && !isThumb && (
          <span className={`mg-theme-cover-cta mg-theme-cover-cta--${themeId}`}>View Photos</span>
        )}
        {theme.showCta && isThumb && (
          <span className={`mg-theme-cover-cta mg-theme-cover-cta--thumb mg-theme-cover-cta--${themeId}`}>
            View Photos
          </span>
        )}
      </div>
      {theme.showChevron && <ScrollDownButton className="mg-theme-cover-chevron" />}
      {theme.showScrollBtn && !isThumb && <ScrollDownButton className="mg-theme-cover-scroll-btn" />}
    </>
  );
}

export function ThemeThumbContent({ theme }) {
  const [line1, line2] = theme.sampleLines.length > 1
    ? theme.sampleLines
    : [null, theme.sampleLines[0]];

  return (
    <div className={`mg-design-theme-thumb-content mg-design-theme-thumb-content--${theme.id}`}>
      {line1 && <span className="mg-design-theme-thumb-line mg-design-theme-thumb-line--sub">{line1}</span>}
      {line2 && <span className="mg-design-theme-thumb-line mg-design-theme-thumb-line--main">{line2}</span>}
      {theme.showCta && (
        <span className={`mg-theme-cover-cta mg-theme-cover-cta--thumb mg-theme-cover-cta--${theme.id}`}>
          View Photos
        </span>
      )}
    </div>
  );
}

export default ThemeCoverContent;
