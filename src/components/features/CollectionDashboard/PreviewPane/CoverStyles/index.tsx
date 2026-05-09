import React from 'react';
import { CoverProps } from './CoverStyles.types';

export const CenterCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && (
      <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
    )}
    <div className="relative z-10 flex flex-col items-center text-center px-6">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-80 mb-4" style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-light tracking-[0.2em] mb-4 uppercase" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-10" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      <button
        className="px-10 py-3 border text-[11px] tracking-[0.2em] uppercase transition-all duration-300"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const LeftCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-start justify-center overflow-hidden px-16" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && (
      <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
    )}
    <div className="relative z-10 flex flex-col items-start text-left max-w-lg">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-80 mb-4" style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-light tracking-[0.2em] mb-4 uppercase" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-10" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      <button
        className="px-10 py-3 border text-[11px] tracking-[0.2em] uppercase transition-all duration-300"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const NovelCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="flex-1 flex flex-col items-center justify-center p-12" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
      <div className="text-[10px] tracking-[0.3em] uppercase mb-4 opacity-60" style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-serif mb-6" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase mb-10 opacity-60" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      <button
        className="px-10 py-3 text-[11px] tracking-[0.2em] uppercase transition-colors"
        style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
    <div className="flex-1 h-full">
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
  </div>
);

export const VintageCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    <div className="flex-1 h-full p-6">
      <div className="w-full h-full border p-3 overflow-hidden" style={{ borderColor: 'var(--gallery-border)' }}>
        {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover grayscale opacity-80" />}
      </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-60 mb-4" style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-serif tracking-widest mb-6 italic" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-70 mb-10" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      <button
        className="px-10 py-3 border text-[11px] tracking-[0.2em] uppercase transition-all"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const FrameCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex items-center justify-center p-6" style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 border-[16px] z-20 pointer-events-none" style={{ borderColor: 'var(--gallery-bg)' }}></div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}>
        <div className="text-[10px] tracking-[0.3em] uppercase opacity-90 mb-3"> {subtitle || 'GALLERY'}</div>
        <h1 className="text-4xl font-serif tracking-widest uppercase mb-4">{title}</h1>
        <div className="w-16 h-px bg-white/60 mb-4"></div>
        <div className="text-[11px] tracking-[0.2em] uppercase opacity-90 mb-8">{date}</div>
        <button
          className="px-8 py-2 border border-white text-[10px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
          onClick={onViewGallery}
        >
          VIEW GALLERY
        </button>
      </div>
    </div>
  </div>
);

export const StripeCover: React.FC<CoverProps> = ({ title, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
    <div className="relative z-10 flex flex-col items-center px-12 py-10 backdrop-blur-sm border-y w-full max-w-3xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'var(--gallery-border)' }}>
      <div className="w-24 h-px mb-6" style={{ backgroundColor: 'var(--gallery-text)', opacity: 0.7 }}></div>
      <h1 className="text-5xl font-light tracking-[0.3em] uppercase mb-6 text-center" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
      <div className="w-24 h-px mb-6" style={{ backgroundColor: 'var(--gallery-text)', opacity: 0.7 }}></div>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-8" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      <button
        className="px-10 py-3 border text-[11px] tracking-[0.2em] uppercase transition-all"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const DividerCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 z-10" style={{ backgroundColor: 'var(--gallery-text)', opacity: 0.4 }}></div>
    <div className="relative z-10 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-80 mb-4" style={{ color: 'var(--gallery-text)' }}>{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-light tracking-[0.2em] uppercase" style={{ color: 'var(--gallery-text)' }}>{title}</h1>
    </div>
    <div className="relative z-10 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-8" style={{ color: 'var(--gallery-text)' }}>{date}</div>
      <button
        className="px-8 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors"
        style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const JournalCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex overflow-hidden p-8 gap-8 items-center justify-center" style={{ backgroundColor: 'var(--gallery-bg)' }}>
    <div className="w-1/2 h-[90%] overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
    <div className="w-1/2 flex flex-col items-center text-center p-8" style={{ color: 'var(--gallery-text)' }}>
      <div className="text-[10px] tracking-[0.3em] uppercase mb-4 opacity-60">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-serif mb-6">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase mb-10 opacity-60">{date}</div>
      <button
        className="px-8 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors"
        style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const StampCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col items-center justify-center p-12" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    <div className="w-48 h-48 overflow-hidden mb-8 shadow-sm" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
    <div className="text-[10px] tracking-[0.3em] uppercase mb-3 opacity-60">{subtitle || 'GALLERY'}</div>
    <h1 className="text-4xl font-serif mb-4 tracking-wide">{title}</h1>
    <div className="text-[11px] tracking-[0.2em] mb-8 opacity-60">{date}</div>
    <button
      className="px-8 py-3 border text-[10px] tracking-[0.2em] uppercase transition-all"
      style={{ borderColor: 'var(--gallery-accent)', color: 'var(--gallery-accent)', backgroundColor: 'transparent' }}
      onClick={onViewGallery}
    >
      VIEW GALLERY
    </button>
  </div>
);

export const OutlineCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex items-center justify-center overflow-hidden p-8" style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
    <div className="relative z-10 w-full h-full max-w-2xl border-[2px] flex flex-col items-center justify-center p-12 bg-black/10 backdrop-blur-[2px]" style={{ borderColor: 'var(--gallery-text)' }}>
      <div className="text-[10px] tracking-[0.4em] uppercase opacity-90 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-light tracking-[0.2em] uppercase mb-6 text-center">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-90 mb-10">{date}</div>
      <button
        className="px-10 py-3 border text-[11px] tracking-[0.2em] uppercase transition-all"
        style={{ borderColor: 'var(--gallery-text)', color: 'var(--gallery-text)', backgroundColor: 'transparent' }}
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const ClassicCover: React.FC<CoverProps> = ({ title, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full overflow-hidden" style={{ backgroundColor: 'var(--gallery-bg)', color: '#fff' }}>
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10">
      <div className="flex justify-between items-end w-full">
        <div>
          <h1 className="text-4xl font-serif tracking-wide mb-2">{title}</h1>
          <div className="text-[12px] tracking-[0.2em] uppercase opacity-80">{date}</div>
        </div>
        <button
          className="px-8 py-3 bg-white text-black text-[10px] tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
          onClick={onViewGallery}
        >
          VIEW GALLERY
        </button>
      </div>
    </div>
  </div>
);

