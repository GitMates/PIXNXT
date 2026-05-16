import React from 'react';
import { CoverProps } from './CoverStyles.types';
import { cn } from '../../../../../lib/utils';
import { CoverTextGrid } from './CoverTextGrid';

export const CenterCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && (
      <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />
    )}
    <CoverTextGrid
      variant="center"
      isPreview={isPreview}
      isGalleryView={isGalleryView}
      title={title}
      subtitle={subtitle}
      date={date}
      description={description}
      onViewGallery={onViewGallery}
      className="relative z-10 px-6"
    />
  </div>
);

export const LeftCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div
    className="cover-left-layout flex h-[400px] min-h-[400px] w-full flex-row overflow-hidden"
    style={{ backgroundColor: 'var(--gallery-bg)' }}
  >
    <div
      className={cn(
        'cover-left-layout__text flex w-1/2 min-w-0 flex-col items-center justify-center',
        isPreview ? 'px-3 py-4' : 'px-12 py-10'
      )}
      style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
    >
      <CoverTextGrid
        isPreview={isPreview}
        isGalleryView={isGalleryView}
        align="center"
        title={title}
        subtitle={subtitle}
        date={date}
        description={description}
        onViewGallery={onViewGallery}
        className="w-full max-w-full"
      />
    </div>
    <div className="cover-left-layout__media relative w-1/2 min-w-0">
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }}
        />
      )}
    </div>
  </div>
);

export const NovelCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className="h-full min-h-[400px] w-full flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div
      className={cn('flex flex-1 flex-col items-center justify-center', isPreview ? 'p-6' : 'p-12')}
      style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
    >
      <CoverTextGrid
        isPreview={isPreview}
        isGalleryView={isGalleryView}
        title={title}
        subtitle={subtitle}
        date={date}
        description={description}
        onViewGallery={onViewGallery}
      />
    </div>
    <div className="h-full min-h-[200px] flex-1 md:min-h-0">
      {photoUrl && (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />
      )}
    </div>
  </div>
);

export const VintageCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className="h-[400px] w-full flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    <div className={cn('flex-1 h-full', isPreview ? 'p-4' : 'p-6')}>
      <div className={cn('w-full h-full border overflow-hidden', isPreview ? 'p-2' : 'p-3')} style={{ borderColor: 'var(--gallery-border)' }}>
        {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover grayscale opacity-80" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
      </div>
    </div>
    <div className={cn('flex-1 flex flex-col items-center justify-center', isPreview ? 'p-4' : 'p-12')}>
      <CoverTextGrid
        variant="vintage"
        isPreview={isPreview}
        isGalleryView={isGalleryView}
        title={title}
        subtitle={subtitle}
        date={date}
        description={description}
        onViewGallery={onViewGallery}
      />
    </div>
  </div>
);

export const FrameCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className={cn('h-[400px] w-full flex items-center justify-center', isPreview ? 'p-4' : 'p-6')} style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
      <div className={cn('absolute inset-0 z-20 pointer-events-none border-[16px]', isPreview && 'border-[10px]')} style={{ borderColor: 'var(--gallery-bg)' }} />
      <CoverTextGrid
        variant="light"
        isPreview={isPreview}
        isGalleryView={isGalleryView}
        title={title}
        subtitle={subtitle}
        date={date}
        description={description}
        onViewGallery={onViewGallery}
        className={cn('relative z-10 flex w-full h-full items-center justify-center', isPreview ? 'p-4' : 'p-8')}
        buttonClassName={isPreview ? undefined : 'hover:bg-white hover:text-black'}
      >
        <div className={cn('bg-white/60', isPreview ? 'w-10 h-px mb-2' : 'w-16 h-px mb-4')} />
      </CoverTextGrid>
    </div>
  </div>
);

export const StripeCover: React.FC<CoverProps> = ({
  title, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
    <div className="relative h-[400px] w-full flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
      <div className={cn('relative z-10 flex flex-col items-center backdrop-blur-sm border-y w-full max-w-3xl', isPreview ? 'px-6 py-6' : 'px-12 py-10')} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'var(--gallery-border)' }}>
        <div className={cn('bg-[var(--gallery-text)] opacity-70', isPreview ? 'w-12 h-px mb-3' : 'w-24 h-px mb-6')} />
        <h1 className={cn('gallery-heading cover-text-grid__title text-center', isPreview ? 'mb-2' : isGalleryView ? 'text-4xl mb-7' : 'text-3xl mb-6')} style={{ color: 'var(--gallery-text)' }}>{title}</h1>
        <div className={cn('bg-[var(--gallery-text)] opacity-70', isPreview ? 'w-12 h-px mb-3' : 'w-24 h-px mb-6')} />
        <CoverTextGrid
          isPreview={isPreview}
        isGalleryView={isGalleryView}
          title={title}
          date={date}
          description={description}
          onViewGallery={onViewGallery}
          showSubtitle={false}
          showTitle={false}
          className="!gap-0"
        />
      </div>
    </div>
);

export const DividerCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className="relative h-[400px] w-full flex overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 z-10" style={{ backgroundColor: 'var(--gallery-text)', opacity: 0.4 }} />
    <div className={cn('relative z-10 w-1/2 h-full flex flex-col items-center justify-center', isPreview ? 'p-6' : 'p-12')}>
      <CoverTextGrid isPreview={isPreview} isGalleryView={isGalleryView} title={title} subtitle={subtitle} date={date} showDate={false} showDescription={false} showButton={false} />
    </div>
    <div className={cn('relative z-10 w-1/2 h-full flex flex-col items-center justify-center', isPreview ? 'p-6' : 'p-12')}>
      <CoverTextGrid
        isPreview={isPreview}
        isGalleryView={isGalleryView}
        title=""
        date={date}
        description={description}
        onViewGallery={onViewGallery}
        showSubtitle={false}
        showTitle={false}
        buttonClassName="transition-colors"
      />
    </div>
  </div>
);

export const JournalCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className={cn('h-[400px] w-full flex overflow-hidden items-center justify-center', isPreview ? 'p-4 gap-4' : 'p-8 gap-8')} style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="w-1/2 h-[90%] overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    </div>
    <div className="w-1/2 flex flex-col items-center justify-center" style={{ color: 'var(--gallery-text)' }}>
      <CoverTextGrid
        isPreview={isPreview}
        isGalleryView={isGalleryView}
        title={title}
        subtitle={subtitle}
        date={date}
        description={description}
        onViewGallery={onViewGallery}
        buttonClassName="transition-colors"
      />
    </div>
  </div>
);

export const StampCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className={cn('h-[400px] w-full flex flex-col items-center justify-center', isPreview ? 'p-6' : 'p-12')} style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    <div className={cn('overflow-hidden shadow-sm mb-4', isPreview ? 'w-28 h-28' : 'w-48 h-48')} style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    </div>
    <CoverTextGrid
      isPreview={isPreview}
      isGalleryView={isGalleryView}
      title={title}
      subtitle={subtitle}
      date={date}
      description={description}
      onViewGallery={onViewGallery}
      buttonClassName="transition-all"
      buttonStyle={{ borderColor: 'var(--gallery-accent)', color: 'var(--gallery-accent)', backgroundColor: 'transparent' }}
    />
  </div>
);

export const OutlineCover: React.FC<CoverProps> = ({
  title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className={cn('relative h-[400px] w-full flex items-center justify-center overflow-hidden', isPreview ? 'p-4' : 'p-8')} style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    <div className={cn('relative z-10 w-full h-full max-w-2xl border-[2px] flex flex-col items-center justify-center bg-black/10 backdrop-blur-[2px]', isPreview ? 'p-6' : 'p-12')} style={{ borderColor: 'var(--gallery-text)' }}>
      <CoverTextGrid
        isPreview={isPreview}
        isGalleryView={isGalleryView}
        title={title}
        subtitle={subtitle}
        date={date}
        description={description}
        onViewGallery={onViewGallery}
      />
    </div>
  </div>
);

export const ClassicCover: React.FC<CoverProps> = ({
  title, date, description, photoUrl, focalX, focalY, isPreview, isGalleryView, onViewGallery,
}) => (
  <div className="relative h-[400px] w-full overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: '#fff' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    <div className={cn('absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end', isPreview ? 'p-5' : 'p-10')}>
      <div className="flex justify-between items-end w-full gap-4">
        <CoverTextGrid
          variant="light"
          isPreview={isPreview}
          isGalleryView={isGalleryView}
          title={title}
          date={date}
          description={description}
          showSubtitle={false}
          showButton={false}
          align="start"
          className="flex-1 min-w-0"
        />
        <button
          type="button"
          className={cn(
            'cover-text-grid__button view-gallery-btn shrink-0 tracking-[0.2em] uppercase transition-all duration-300 font-medium',
            isPreview ? 'px-4 py-2 text-[8px]' : isGalleryView ? 'px-10 py-3.5 text-[10px]' : 'px-8 py-3 text-[9px]'
          )}
          style={{
            backgroundColor: 'var(--gallery-accent)',
            color: 'var(--gallery-bg)',
            border: 'none',
          }}
          onClick={onViewGallery}
        >
          VIEW GALLERY
        </button>
      </div>
    </div>
  </div>
);
