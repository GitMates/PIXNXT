import React from 'react';
import './CoverNovel.css';
import './CoverVintage.css';
import './CoverJournal.css';
import './CoverStamp.css';
import './CoverClassic.css';
import { CoverProps } from './CoverStyles.types';
import { cn } from '../../../../../lib/utils';
import {
  coverLayoutHeight,
  CoverPhoto,
  getBrandLabel,
  useCoverTypography,
  ViewGalleryButton,
} from './coverLayoutHelpers';

export const CenterCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);

  return (
    <div
      className={cn(
        'cover-center-layout cover-over-photo relative w-full overflow-hidden',
        coverLayoutHeight(isPreview, isGalleryView)
      )}
    >
      <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0" />

      {/* Centered Typography Stack */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <h1 className={cn('gallery-heading cover-center-layout__title uppercase leading-none font-bold', s.title)}>
          {title}
        </h1>
        {date ? (
          <p className={cn('gallery-body-text cover-center-layout__date mt-2 uppercase tracking-[0.25em] text-white/90', s.date)}>
            {date}
          </p>
        ) : null}
        <div className="mt-4">
          <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="ghost" />
        </div>
      </div>

      {/* Centered Brand Name at the Bottom */}
      {brand ? (
        <p
          className={cn(
            'cover-center-layout__brand gallery-heading absolute bottom-0 left-0 right-0 z-10 pb-6 text-center uppercase tracking-[0.45em] text-white/90 font-medium',
            s.subtitle
          )}
        >
          {brand}
        </p>
      ) : null}
    </div>
  );
};

export const LeftCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const pad = isPreview ? 'p-4' : isGalleryView ? 'p-8 md:p-10 lg:p-12' : 'p-8 md:p-10';
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);

  return (
    <div
      className={cn(
        'cover-left-layout cover-over-photo relative w-full overflow-hidden',
        coverLayoutHeight(isPreview, isGalleryView)
      )}
      style={{ color: '#fff' }}
    >
      <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0" />

      {/* Brand in Top Left */}
      {brand ? (
        <div className={cn('cover-left-layout__brand absolute left-0 top-0 z-20', pad)}>
          <span className={cn('gallery-heading uppercase tracking-[0.35em] text-white/95 font-semibold', s.subtitle)}>
            {brand}
          </span>
        </div>
      ) : null}

      {/* Title/Date on bottom-left, Button on bottom-right */}
      <div className={cn('cover-left-layout__footer absolute inset-x-0 bottom-0 z-20 flex w-full items-end justify-between gap-3', pad)}>
        <div className="min-w-0 flex-1 text-left">
          <h1 className={cn('gallery-heading uppercase leading-none font-bold text-white', s.title)}>
            {title}
          </h1>
          {date ? (
            <p className={cn('gallery-body-text mt-1.5 uppercase tracking-[0.22em] text-white/90', s.date)}>
              {date}
            </p>
          ) : null}
        </div>
        <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="ghost" />
      </div>
    </div>
  );
};

export const NovelCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);

  const textPad = isPreview ? 'px-4 py-5' : isGalleryView ? 'px-8 py-10 md:px-12 lg:px-16' : 'px-10 py-10';
  const mediaPad = isPreview ? 'p-1.5' : isGalleryView ? 'p-0' : 'p-10 md:p-12';

  return (
    <div
      className={cn('cover-novel-layout flex w-full overflow-hidden', coverLayoutHeight(isPreview, isGalleryView))}
    >
      {/* Left side: solid color panel with centered stack */}
      <div
        className={cn(
          'cover-novel-layout__text flex w-1/2 min-w-0 flex-col items-center justify-center text-center',
          textPad
        )}
      >
        {brand ? (
          <p
            className={cn(
              'cover-novel-layout__brand cover-text-grid__subtitle uppercase font-normal',
              s.subtitle
            )}
          >
            {brand}
          </p>
        ) : null}
        <h1
          className={cn(
            'cover-novel-layout__title cover-text-grid__title gallery-heading uppercase leading-none font-bold',
            s.title
          )}
        >
          {title}
        </h1>
        {date ? (
          <p className={cn('cover-novel-layout__date cover-text-grid__date gallery-body-text uppercase', s.date)}>
            {date}
          </p>
        ) : null}
        <div className="cover-novel-layout__cta">
          <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="dark" />
        </div>
      </div>

      {/* Right side: portrait photo enclosed in framed border */}
      <div
        className={cn('cover-novel-layout__media flex w-1/2 min-w-0 items-center justify-center', mediaPad)}
      >
        {photoUrl ? (
          <div className="cover-novel-layout__image-frame relative overflow-hidden">
            <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0 h-full w-full" />
          </div>
        ) : (
          <div className="cover-novel-layout__image-frame bg-neutral-200" />
        )}
      </div>
    </div>
  );
};

export const VintageCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);

  const mediaPad = isPreview ? 'p-0' : isGalleryView ? 'p-0' : 'px-8 pt-8';
  const panelPad = isPreview ? 'px-3 pb-3 pt-2' : isGalleryView ? 'px-6 pb-8 pt-4 md:px-10 md:pb-10 md:pt-5' : 'px-10 pb-8 pt-4';

  return (
    <div
      className={cn('cover-vintage-layout flex w-full flex-col overflow-hidden', coverLayoutHeight(isPreview, isGalleryView))}
    >
      <div className={cn('cover-vintage-layout__media flex w-full shrink-0', mediaPad)}>
        {photoUrl ? (
          <div
            className={cn(
              'cover-vintage-layout__image-frame relative w-full overflow-hidden',
              isGalleryView ? 'h-full min-h-0' : 'aspect-[16/9]'
            )}
          >
            <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0 h-full w-full" />
          </div>
        ) : (
          <div
            className={cn(
              'cover-vintage-layout__image-frame w-full bg-neutral-200',
              isGalleryView ? 'h-full min-h-0' : 'aspect-[16/9]'
            )}
          />
        )}
      </div>

      <div
        className={cn('cover-vintage-layout__panel flex min-h-0 flex-1 flex-col', panelPad)}
      >
        <div className="cover-vintage-layout__panel-inner">
          {date ? (
            <p className={cn('cover-vintage-layout__date cover-text-grid__date gallery-body-text uppercase', s.date)}>
              {date}
            </p>
          ) : null}
          <h1
            className={cn(
              'cover-vintage-layout__title cover-text-grid__title gallery-heading uppercase leading-none font-bold',
              s.title
            )}
          >
            {title}
          </h1>
          <div className="cover-vintage-layout__footer">
            <span
              className={cn(
                'cover-vintage-layout__brand cover-text-grid__subtitle uppercase font-normal',
                s.subtitle,
                !brand && 'invisible'
              )}
              aria-hidden={!brand}
            >
              {brand || '\u00A0'}
            </span>
            <div className="cover-vintage-layout__cta">
              <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="dark" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FrameCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);
  const frameInset = isPreview ? 'inset-3' : isGalleryView ? 'inset-5 md:inset-7 lg:inset-9' : 'inset-4 md:inset-6';
  const topPad = isPreview ? 'pt-4' : isGalleryView ? 'pt-6 md:pt-8' : 'pt-5 md:pt-7';
  const bottomPad = isPreview ? 'pb-4' : isGalleryView ? 'pb-6 md:pb-8' : 'pb-5 md:pb-7';

  return (
    <div
      className={cn(
        'cover-frame-layout cover-over-photo relative w-full overflow-hidden',
        coverLayoutHeight(isPreview, isGalleryView)
      )}
    >
      <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0" />

      {/* Frame border */}
      <div
        className={cn('cover-frame-layout__border pointer-events-none absolute z-20 border border-white/80', frameInset)}
        aria-hidden
      />

      {/* Centered layout stacked from top to bottom inside the frame */}
      <div className={cn('cover-frame-layout__content absolute z-10 flex flex-col text-center text-white justify-between', frameInset)}>
        {brand ? (
          <p className={cn('cover-frame-layout__brand gallery-heading shrink-0 uppercase tracking-[0.4em] font-medium text-white/95', topPad, s.subtitle)}>
            {brand}
          </p>
        ) : (
          <div className={topPad} aria-hidden />
        )}
        
        <div className="cover-frame-layout__center flex min-h-0 flex-1 flex-col items-center justify-center px-4 my-auto">
          <h1 className={cn('cover-frame-layout__title gallery-heading uppercase leading-none font-bold text-white', s.title)}>
            {title}
          </h1>
          {date ? (
            <p className={cn('cover-frame-layout__date gallery-body-text mt-2.5 uppercase tracking-[0.28em] text-white/90', s.date)}>
              {date}
            </p>
          ) : null}
        </div>
        
        <div className={cn('cover-frame-layout__cta flex shrink-0 justify-center', bottomPad)}>
          <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="ghost" />
        </div>
      </div>
    </div>
  );
};

export const StripeCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);
  const frameInset = isPreview ? 'inset-3' : isGalleryView ? 'inset-5 md:inset-7 lg:inset-9' : 'inset-4 md:inset-6';
  const pad = isPreview ? 'p-4' : isGalleryView ? 'p-8 md:p-10 lg:p-12' : 'p-8 md:p-10';

  return (
    <div
      className={cn('cover-stripe-layout cover-over-photo relative w-full overflow-hidden', coverLayoutHeight(isPreview, isGalleryView))}
    >
      <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0" />

      {/* Frame border */}
      <div
        className={cn('cover-stripe-layout__border pointer-events-none absolute z-10 border border-white/80', frameInset)}
        aria-hidden
      />

      {/* Text stack nested in stripes */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center text-white px-8">
        <div className="flex flex-col items-center max-w-xl w-full">
          {date ? (
            <p className={cn('gallery-body-text uppercase tracking-[0.25em] text-white/95 mb-4', s.date)}>
              {date}
            </p>
          ) : null}
          
          {/* Top stripe line */}
          <div className="w-full max-w-[180px] md:max-w-[220px] h-px bg-white/70 mb-5" />
          
          <h1 className={cn('gallery-heading uppercase leading-none font-bold text-white my-1', s.title)}>
            {title}
          </h1>
          
          {/* Bottom stripe line */}
          <div className="w-full max-w-[180px] md:max-w-[220px] h-px bg-white/70 mt-5" />
          
          {brand ? (
            <p className={cn('gallery-heading uppercase tracking-[0.4em] text-white/95 mt-4 font-medium', s.subtitle)}>
              {brand}
            </p>
          ) : null}
        </div>
      </div>

      {/* View button in bottom-right corner */}
      <div className={cn('absolute right-0 bottom-0 z-30', pad)}>
        <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="ghost" />
      </div>
    </div>
  );
};

export const DividerCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);
  const pad = isPreview ? 'p-4' : isGalleryView ? 'p-8 md:p-12' : 'p-6 md:p-8';

  return (
    <div
      className={cn(
        'cover-divider-layout cover-over-photo relative flex w-full overflow-hidden',
        coverLayoutHeight(isPreview, isGalleryView)
      )}
    >
      <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0" />

      {/* Vertical split line in middle */}
      <div className="absolute left-1/2 top-0 bottom-0 z-10 w-px -translate-x-1/2 bg-white/20" />

      {/* Centered stack inside the left half */}
      <div className={cn('relative z-20 flex h-full w-1/2 flex-col items-center justify-center text-center text-white', pad)}>
        {brand ? (
          <p className={cn('gallery-heading uppercase tracking-[0.4em] text-white/95 mb-4 font-medium', s.subtitle)}>
            {brand}
          </p>
        ) : null}
        <h1 className={cn('gallery-heading uppercase leading-none font-bold text-white', s.title)}>
          {title}
        </h1>
        {date ? (
          <p className={cn('gallery-body-text uppercase tracking-[0.25em] text-white/90 mt-3', s.date)}>
            {date}
          </p>
        ) : null}
        <div className="mt-5">
          <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="ghost" />
        </div>
      </div>
      
      {/* Right half is empty to display the image clearly */}
      <div className="w-1/2 h-full" />
    </div>
  );
};

export const JournalCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);
  return (
    <div
      className={cn('cover-journal-layout flex w-full overflow-hidden', coverLayoutHeight(isPreview, isGalleryView))}
    >
      <div className="cover-journal-layout__media flex w-1/2 min-w-0 h-full items-center justify-center">
        {photoUrl ? (
          <div className="cover-journal-layout__image-frame relative w-full overflow-hidden">
            <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0 h-full w-full" />
          </div>
        ) : (
          <div className="cover-journal-layout__image-frame w-full aspect-[3/4] bg-neutral-200" />
        )}
      </div>

      <div className="cover-journal-layout__panel flex w-1/2 min-w-0 h-full flex-col">
        {brand ? (
          <span
            className={cn(
              'cover-journal-layout__brand cover-text-grid__subtitle uppercase font-normal self-start',
              s.subtitle
            )}
          >
            {brand}
          </span>
        ) : (
          <div className="mb-auto" aria-hidden="true" />
        )}
        <div className="cover-journal-layout__copy mt-auto">
          {date ? (
            <p className={cn('cover-journal-layout__date cover-text-grid__date gallery-body-text uppercase', s.date)}>
              {date}
            </p>
          ) : null}
          <h1
            className={cn(
              'cover-journal-layout__title cover-text-grid__title gallery-heading uppercase leading-none font-bold',
              s.title
            )}
          >
            {title}
          </h1>
          <div className="cover-journal-layout__cta">
            <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="dark" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const StampCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const brand = getBrandLabel(subtitle);
  const { s } = useCoverTypography(isPreview, isGalleryView);
  
  return (
    <div
      className={cn(
        'cover-stamp-layout flex flex-col items-center justify-center text-center',
        coverLayoutHeight(isPreview, isGalleryView)
      )}
    >
      {brand ? (
        <p
          className={cn(
            'cover-stamp-layout__brand cover-text-grid__subtitle gallery-body-text uppercase font-normal',
            s.subtitle
          )}
        >
          {brand}
        </p>
      ) : null}

      <div className="cover-stamp-layout__image-frame relative w-full overflow-hidden">
        {photoUrl ? (
          <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0 h-full w-full" />
        ) : (
          <div className="absolute inset-0 bg-neutral-200" aria-hidden="true" />
        )}
      </div>

      {date ? (
        <p className={cn('cover-stamp-layout__date cover-text-grid__date gallery-body-text uppercase', s.date)}>
          {date}
        </p>
      ) : null}

      <h1
        className={cn(
          'cover-stamp-layout__title cover-text-grid__title gallery-heading uppercase leading-none font-bold',
          s.title
        )}
      >
        {title}
      </h1>

      <div className="cover-stamp-layout__cta">
        <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="dark" />
      </div>
    </div>
  );
};

export const OutlineCover: React.FC<CoverProps> = ({
  title,
  subtitle,
  date,
  photoUrl,
  focalX,
  focalY,
  isPreview,
  isGalleryView,
  onViewGallery,
}) => {
  const { s } = useCoverTypography(isPreview, isGalleryView);
  const inset = isPreview ? 'inset-[8%]' : 'inset-[6%]';
  const pad = isPreview ? 'p-3' : isGalleryView ? 'p-10' : 'p-6';

  return (
    <div
      className={cn(
        'cover-outline-layout cover-over-photo relative w-full overflow-hidden',
        coverLayoutHeight(isPreview, isGalleryView)
      )}
    >
      <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0" />

      {/* Centered thin white outline frame enclosing all text/CTA elements */}
      <div
        className={cn('absolute z-10 border border-white/90 flex flex-col text-center text-white justify-between', inset, pad)}
      >
        {/* Date/Subtitle at top of box */}
        {date ? (
          <p className={cn('gallery-body-text uppercase tracking-[0.25em] text-white/95 shrink-0', s.date)}>
            {date}
          </p>
        ) : (
          <div className="shrink-0 h-4" />
        )}

        {/* Title in center of box */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 my-auto">
          <h1 className={cn('gallery-heading uppercase leading-tight font-bold text-white my-1 max-w-xl', s.title)}>
            {title}
          </h1>
        </div>

        {/* CTA Button at bottom of box */}
        <div className="shrink-0 flex justify-center mt-2">
          <ViewGalleryButton onClick={onViewGallery} isPreview={isPreview} isGalleryView={isGalleryView} variant="ghost" />
        </div>
      </div>
    </div>
  );
};

export const ClassicCover: React.FC<CoverProps> = ({
  photoUrl,
  focalX,
  focalY,
  isPreview,
}) => {
  // Classic cover is a clean landscape banner at the top without overlaid text or buttons
  const heightClass = isPreview ? 'h-[180px] min-h-[180px]' : 'h-[360px] min-h-[360px]';

  return (
    <div className={cn('cover-classic-layout relative w-full overflow-hidden', heightClass)}>
      {photoUrl ? (
        <CoverPhoto photoUrl={photoUrl} focalX={focalX} focalY={focalY} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-neutral-200" />
      )}
    </div>
  );
};
