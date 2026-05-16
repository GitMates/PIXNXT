import React from 'react';
import { CoverProps } from './CoverStyles.types';
import { cn } from '../../../../../lib/utils';

export const CenterCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && (
      <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />
    )}
    <div className="relative z-10 flex flex-col items-center text-center px-6">
      <div className={cn("tracking-[0.5em] uppercase opacity-80 font-medium", isPreview ? "text-[8px] mb-1" : "text-[10px] mb-2")} style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className={cn("gallery-heading leading-tight font-bold", isPreview ? "text-[20px] mb-1" : "text-[26px] mb-2")} style={{ color: 'var(--gallery-text)', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>{title}</h1>
      <div className={cn("tracking-[0.3em] uppercase opacity-80 font-medium", isPreview ? "text-[9px] mb-4" : "text-[11px] mb-6")} style={{ color: 'var(--gallery-text)' }}>{date}</div>
      {description && (
        <p className={cn("leading-relaxed opacity-70 max-w-lg whitespace-pre-wrap", isPreview ? "text-[10px] mb-4" : "text-[11px] mb-6")} style={{ color: 'var(--gallery-text)' }}>
          {description}
        </p>
      )}
      <button
        className={cn("border tracking-[0.2em] uppercase transition-all duration-300 font-medium", isPreview ? "px-6 py-2 text-[9px]" : "px-8 py-3 text-[10px]")}
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const LeftCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-start justify-center overflow-hidden px-16" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && (
      <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />
    )}
    <div className="relative z-10 flex flex-col items-start text-left max-w-lg">
      <div className={cn("tracking-[0.5em] uppercase opacity-80 font-medium", isPreview ? "text-[8px] mb-1" : "text-[10px] mb-2")} style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className={cn("gallery-heading leading-tight font-bold", isPreview ? "text-[20px] mb-1" : "text-[26px] mb-2")} style={{ color: 'var(--gallery-text)', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>{title}</h1>
      <div className={cn("tracking-[0.3em] uppercase opacity-80 font-medium", isPreview ? "text-[9px] mb-4" : "text-[11px] mb-6")} style={{ color: 'var(--gallery-text)' }}>{date}</div>
      {description && (
        <p className={cn("leading-relaxed opacity-70 whitespace-pre-wrap", isPreview ? "text-[10px] mb-4" : "text-[11px] mb-6")} style={{ color: 'var(--gallery-text)' }}>
          {description}
        </p>
      )}
      <button
        className={cn("border tracking-[0.2em] uppercase transition-all duration-300 font-medium", isPreview ? "px-6 py-2 text-[9px]" : "px-8 py-3 text-[10px]")}
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const NovelCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, isPreview, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="flex-1 flex flex-col items-center justify-center p-12" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
      <div className={cn("tracking-[0.5em] uppercase opacity-80 font-medium", isPreview ? "text-[8px] mb-1" : "text-[10px] mb-2")} style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className={cn("gallery-heading leading-tight font-bold", isPreview ? "text-[18px] mb-1" : "text-[24px] mb-2")} style={{ color: 'var(--gallery-text)', textShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>{title}</h1>
      <div className={cn("tracking-[0.3em] uppercase opacity-80 font-medium", isPreview ? "text-[9px] mb-4" : "text-[11px] mb-6")} style={{ color: 'var(--gallery-text)' }}>{date}</div>
      {description && (
        <p className={cn("leading-relaxed opacity-60 whitespace-pre-wrap text-center max-w-sm", isPreview ? "text-[10px] mb-4" : "text-[11px] mb-6")} style={{ color: 'var(--gallery-text)' }}>
          {description}
        </p>
      )}
      <button
        className={cn("tracking-[0.2em] uppercase transition-colors font-medium", isPreview ? "px-6 py-2.5 text-[9px]" : "px-8 py-3 text-[10px]")}
        style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
    <div className="flex-1 h-full">
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    </div>
  </div>
);

export const VintageCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    <div className="flex-1 h-full p-6">
      <div className="w-full h-full border p-3 overflow-hidden" style={{ borderColor: 'var(--gallery-border)' }}>
        {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover grayscale opacity-80" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
      </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="text-[9px] tracking-[0.3em] uppercase opacity-60 mb-4" style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className="text-2xl mb-6 gallery-heading" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
      <div className="text-[10px] tracking-[0.2em] uppercase opacity-70 mb-4" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      {description && (
        <p className="text-[11px] leading-relaxed opacity-60 mb-8 whitespace-pre-wrap" style={{ color: 'var(--gallery-text)' }}>
          {description}
        </p>
      )}
      <button
        className="px-10 py-3 border text-[10px] tracking-[0.2em] uppercase transition-all"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const FrameCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="h-[400px] w-full flex items-center justify-center p-6" style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
      <div className="absolute inset-0 border-[16px] z-20 pointer-events-none" style={{ borderColor: 'var(--gallery-bg)' }}></div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}>
        <div className="text-[9px] tracking-[0.3em] uppercase opacity-90 mb-3"> {subtitle || 'GALLERY'}</div>
        <h1 className="text-2xl mb-4 gallery-heading">{title}</h1>
        <div className="w-16 h-px bg-white/60 mb-4"></div>
        <div className="text-[10px] tracking-[0.2em] uppercase opacity-90 mb-4">{date}</div>
        {description && (
          <p className="text-[10px] leading-relaxed opacity-80 mb-6 text-center max-w-xs whitespace-pre-wrap">
            {description}
          </p>
        )}
        <button
          className="px-8 py-2 border border-white text-[9px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
          onClick={onViewGallery}
        >
          VIEW GALLERY
        </button>
      </div>
    </div>
  </div>
);

export const StripeCover: React.FC<CoverProps> = ({ title, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    <div className="relative z-10 flex flex-col items-center px-12 py-10 backdrop-blur-sm border-y w-full max-w-3xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'var(--gallery-border)' }}>
      <div className="w-24 h-px mb-6" style={{ backgroundColor: 'var(--gallery-text)', opacity: 0.7 }}></div>
      <h1 className="text-3xl mb-6 text-center gallery-heading" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
      <div className="w-24 h-px mb-6" style={{ backgroundColor: 'var(--gallery-text)', opacity: 0.7 }}></div>
      <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 mb-4" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      {description && (
        <p className="text-[11px] leading-relaxed opacity-70 mb-8 text-center max-w-lg whitespace-pre-wrap" style={{ color: 'var(--gallery-text)' }}>
          {description}
        </p>
      )}
      <button
        className="px-10 py-3 border text-[10px] tracking-[0.2em] uppercase transition-all"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const DividerCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 z-10" style={{ backgroundColor: 'var(--gallery-text)', opacity: 0.4 }}></div>
    <div className="relative z-10 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="text-[9px] tracking-[0.3em] uppercase opacity-80 mb-4" style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className="text-2xl gallery-heading" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
    </div>
    <div className="relative z-10 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 mb-4" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      {description && (
        <p className="text-[11px] leading-relaxed opacity-70 mb-8 whitespace-pre-wrap" style={{ color: 'var(--gallery-text)' }}>
          {description}
        </p>
      )}
      <button
        className="px-8 py-3 text-[9px] tracking-[0.2em] uppercase transition-colors"
        style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const JournalCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="h-[400px] w-full flex overflow-hidden p-8 gap-8 items-center justify-center" style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="w-1/2 h-[90%] overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    </div>
    <div className="w-1/2 flex flex-col items-center text-center p-8" style={{ color: 'var(--gallery-text)' }}>
      <div className="text-[9px] tracking-[0.3em] uppercase mb-4 opacity-60">{subtitle || 'GALLERY'}</div>
      <h1 className="text-2xl mb-6 gallery-heading">{title}</h1>
      <div className="text-[10px] tracking-[0.2em] uppercase mb-4 opacity-60">{date}</div>
      {description && (
        <p className="text-[11px] leading-relaxed opacity-60 mb-8 whitespace-pre-wrap">
          {description}
        </p>
      )}
      <button
        className="px-8 py-3 text-[9px] tracking-[0.2em] uppercase transition-colors"
        style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const StampCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col items-center justify-center p-12" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    <div className="w-48 h-48 overflow-hidden mb-8 shadow-sm" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    </div>
    <div className="text-[9px] tracking-[0.3em] uppercase mb-3 opacity-60">{subtitle || 'GALLERY'}</div>
    <h1 className="text-2xl mb-4 gallery-heading">{title}</h1>
    <div className="text-[10px] tracking-[0.2em] mb-4 opacity-60">{date}</div>
    {description && (
      <p className="text-[10px] leading-relaxed opacity-60 mb-8 text-center max-w-xs whitespace-pre-wrap">
        {description}
      </p>
    )}
    <button
      className="px-8 py-3 border text-[9px] tracking-[0.2em] uppercase transition-all"
      style={{ borderColor: 'var(--gallery-accent)', color: 'var(--gallery-accent)', backgroundColor: 'transparent' }}
      onClick={onViewGallery}
    >
      VIEW GALLERY
    </button>
  </div>
);

export const OutlineCover: React.FC<CoverProps> = ({ title, subtitle, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex items-center justify-center overflow-hidden p-8" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    <div className="relative z-10 w-full h-full max-w-2xl border-[2px] flex flex-col items-center justify-center p-12 bg-black/10 backdrop-blur-[2px]" style={{ borderColor: 'var(--gallery-text)' }}>
      <div className="text-[9px] tracking-[0.4em] uppercase opacity-90 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-3xl mb-6 text-center gallery-heading">{title}</h1>
      <div className="text-[10px] tracking-[0.2em] uppercase opacity-90 mb-4">{date}</div>
      {description && (
        <p className="text-[11px] leading-relaxed opacity-80 mb-8 text-center max-w-lg whitespace-pre-wrap">
          {description}
        </p>
      )}
      <button
        className="px-10 py-3 border text-[10px] tracking-[0.2em] uppercase transition-all"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const ClassicCover: React.FC<CoverProps> = ({ title, date, description, photoUrl, focalX, focalY, onViewGallery }) => (
  <div className="relative h-[400px] w-full overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: '#fff' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` }} />}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10">
      <div className="flex justify-between items-end w-full">
        <div>
          <h1 className="text-2xl mb-2 gallery-heading">{title}</h1>
          <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 mb-2">{date}</div>
          {description && (
            <p className="text-[11px] leading-relaxed opacity-70 max-w-md whitespace-pre-wrap">
              {description}
            </p>
          )}
        </div>
        <button
          className="px-8 py-3 bg-white text-black text-[9px] tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
          onClick={onViewGallery}
        >
          VIEW GALLERY
        </button>
      </div>
    </div>
  </div>
);


