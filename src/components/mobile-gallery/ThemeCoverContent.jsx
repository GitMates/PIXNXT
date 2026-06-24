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

function SageLeafLogo({ size = 'preview' }) {
  const dimensions = size === 'thumb' ? { width: 22, height: 10 } : { width: 44, height: 18 };

  return (
    <svg
      {...dimensions}
      viewBox="0 0 56 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 15.5 C17 9.5, 31 7.5, 51 11.5" />
      <path d="M12 14 C12.5 10.5, 14.5 7.5, 17 5" />
      <path d="M18.5 12.5 C19 9, 21.5 6.5, 24 3.5" />
      <path d="M25 11.5 C25.5 8, 28.5 5.5, 31 2.5" />
      <path d="M31.5 11 C32 8, 35 6, 37.5 3.5" />
      <path d="M37.5 12 C38 9.5, 40.5 7.5, 43 5.5" />
      <path d="M43.5 13 C44 11, 46 9, 48.5 7" />
      <path d="M48.5 14 C49 12.5, 50.5 11, 52.5 9.5" />
    </svg>
  );
}

function ThemeCoverIcon({ themeId, variant = 'preview' }) {
  if (themeId !== 'sage') return null;

  return (
    <span className={`mg-theme-cover-icon mg-theme-cover-icon--${themeId}`} aria-hidden>
      <SageLeafLogo size={variant === 'thumb' ? 'thumb' : 'preview'} />
    </span>
  );
}

function ThemeCoverContent({ themeId, appName, eventDate, coverStyle = 'full', variant = 'preview' }) {
  const theme = getThemeById(themeId);
  const title = formatThemeTitle(appName, theme);
  const dateLabel = formatThemeEventDate(eventDate, theme);
  const isThumb = variant === 'thumb';
  const isFullCover = coverStyle === 'full';
  const showScrollHint = isFullCover;
  const showCta = theme.showCta && isFullCover;
  const showTitleRule = theme.showTitleRule && isFullCover;

  const dateEl = dateLabel ? (
    <p className={`mg-theme-cover-date mg-theme-cover-date--${themeId}`}>{dateLabel}</p>
  ) : null;

  const titleEl = (
    <h2 className={`mg-theme-cover-title mg-theme-cover-title--${themeId}`}>{title}</h2>
  );

  const textBlock = (
    <>
      {theme.showIcon && !isThumb && <ThemeCoverIcon themeId={themeId} variant="preview" />}
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
      {showTitleRule && !isThumb && <span className="mg-theme-cover-rule" aria-hidden />}
      {showCta && !isThumb && (
        <span className={`mg-theme-cover-cta mg-theme-cover-cta--${themeId}`}>View Photos</span>
      )}
      {showCta && isThumb && (
        <span className={`mg-theme-cover-cta mg-theme-cover-cta--thumb mg-theme-cover-cta--${themeId}`}>
          View Photos
        </span>
      )}
    </>
  );

  return (
    <>
      <div
        className={`mg-theme-cover-text mg-theme-cover-text--${theme.layout} mg-theme-cover-text--${themeId}`}
      >
        {textBlock}
      </div>
      {theme.showChevron && !isThumb && showScrollHint && (
        <ScrollDownButton
          className={`mg-theme-cover-chevron${themeId === 'sage' ? ' mg-theme-cover-chevron--circle' : ''}`}
        />
      )}
      {theme.showScrollBtn && !isThumb && showScrollHint && (
        <ScrollDownButton className="mg-theme-cover-scroll-btn" />
      )}
    </>
  );
}

export function ThemeThumbContent({ theme }) {
  const [line1, line2] = theme.sampleLines.length > 1
    ? theme.sampleLines
    : [null, theme.sampleLines[0]];

  return (
    <div
      className={`mg-design-theme-thumb-content mg-design-theme-thumb-content--layout-${theme.layout} mg-design-theme-thumb-content--${theme.id}`}
    >
      {theme.showIcon && <ThemeCoverIcon themeId={theme.id} variant="thumb" />}
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
