import React from 'react';
import { CoverProps } from './CoverStyles.types';

export const CenterCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center bg-[#1a1a1a] text-white overflow-hidden">
    {photoUrl && (
      <div className="absolute inset-0 opacity-40">
        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
      </div>
    )}
    <div className="relative z-10 flex flex-col items-center text-center px-4">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-60 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl md:text-5xl font-light tracking-widest mb-4 uppercase">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-70 mb-8">{date}</div>
      <button 
        className="px-8 py-2 border border-white/40 text-[10px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.4em] uppercase opacity-50">
      KAVI
    </div>
  </div>
);

export const LeftCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-start justify-center bg-[#1a1a1a] text-white overflow-hidden px-12">
    {photoUrl && (
      <div className="absolute inset-0 opacity-40">
        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
      </div>
    )}
    <div className="relative z-10 flex flex-col items-start text-left max-w-lg">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-60 mb-3">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-light tracking-widest mb-4 uppercase">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-70 mb-8">{date}</div>
      <button 
        className="px-8 py-2 border border-white/40 text-[10px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const NovelCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col md:flex-row bg-white overflow-hidden">
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fdfcfb]">
      <div className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-serif text-stone-800 mb-4">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-8">{date}</div>
      <button 
        className="px-8 py-3 bg-stone-800 text-white text-[10px] tracking-[0.2em] uppercase hover:bg-stone-700 transition-colors"
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
  <div className="h-[400px] w-full flex flex-col md:flex-row bg-[#1a1a1a] overflow-hidden">
    <div className="flex-1 h-full p-4">
      <div className="w-full h-full border border-white/10 p-2 overflow-hidden">
        {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover grayscale opacity-70" />}
      </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-white">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-50 mb-3">{subtitle || 'GALLERY'}</div>
      <h1 className="text-3xl font-serif tracking-widest mb-4 italic">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-60 mb-8">{date}</div>
      <button 
        className="px-8 py-2 border border-white/30 text-[10px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const FrameCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl }) => (
  <div className="h-[400px] w-full p-8 bg-stone-100 flex items-center justify-center">
    <div className="relative w-full h-full border-[12px] border-white shadow-xl flex items-center justify-center overflow-hidden">
      {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white p-4">
        <div className="text-[9px] tracking-[0.3em] uppercase opacity-80 mb-2">{subtitle || 'GALLERY'}</div>
        <h1 className="text-3xl font-serif tracking-[0.2em] uppercase">{title}</h1>
        <div className="w-12 h-px bg-white/40 my-4"></div>
        <div className="text-[10px] tracking-[0.2em] uppercase opacity-80">{date}</div>
      </div>
    </div>
  </div>
);

export const StripeCover: React.FC<CoverProps> = ({ title, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center bg-black overflow-hidden">
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
    <div className="relative z-10 flex flex-col items-center text-white">
      <div className="w-16 h-px bg-white/60 mb-6"></div>
      <h1 className="text-4xl font-light tracking-[0.3em] uppercase mb-6">{title}</h1>
      <div className="w-16 h-px bg-white/60 mb-8"></div>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-70 mb-10">{date}</div>
      <button 
        className="px-8 py-2 border border-white/40 text-[10px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const DividerCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex bg-stone-50 overflow-hidden">
    <div className="w-1/2 h-full">
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
    <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 border-l border-stone-200">
      <div className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-serif text-stone-800 mb-4">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-10">{date}</div>
      <button 
        className="px-10 py-3 bg-stone-900 text-white text-[10px] tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const JournalCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex bg-white overflow-hidden p-8">
    <div className="w-2/3 h-full overflow-hidden">
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
    <div className="w-1/3 h-full flex flex-col items-start justify-end p-8">
      <div className="text-[9px] tracking-[0.2em] uppercase text-stone-400 mb-2">{subtitle || 'GALLERY'}</div>
      <h1 className="text-3xl font-serif text-stone-800 mb-4 leading-tight underline decoration-stone-200 underline-offset-8">{title}</h1>
      <div className="text-[10px] tracking-[0.1em] text-stone-500 mb-8 italic">{date}</div>
      <button 
        className="text-[10px] tracking-[0.2em] uppercase text-stone-900 font-bold hover:text-stone-600 transition-colors"
        onClick={onViewGallery}
      >
        OPEN GALLERY →
      </button>
    </div>
  </div>
);

export const StampCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col items-center justify-center bg-[#fdfcfb] p-12 text-stone-800">
    <div className="w-32 h-32 rounded-full overflow-hidden mb-8 border-4 border-white shadow-lg">
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
    <div className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">{subtitle || 'GALLERY'}</div>
    <h1 className="text-4xl font-serif mb-3 tracking-wide">{title}</h1>
    <div className="text-[11px] tracking-[0.2em] text-stone-500 mb-8">{date}</div>
    <button 
      className="px-8 py-2 border border-stone-800 text-[10px] tracking-[0.2em] uppercase hover:bg-stone-800 hover:text-white transition-all"
      onClick={onViewGallery}
    >
      VIEW GALLERY
    </button>
  </div>
);

export const OutlineCover: React.FC<CoverProps> = ({ title, subtitle, date, onViewGallery }) => (
  <div className="h-[400px] w-full flex items-center justify-center bg-stone-50">
    <div className="w-4/5 h-3/4 border border-stone-300 flex flex-col items-center justify-center p-8">
      <div className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-light tracking-[0.2em] uppercase text-stone-800 mb-6">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-10">{date}</div>
      <button 
        className="px-10 py-3 border border-stone-800 text-[11px] tracking-[0.2em] uppercase hover:bg-stone-800 hover:text-white transition-all"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const ClassicCover: React.FC<CoverProps> = ({ title, date, photoUrl }) => (
  <div className="relative h-[400px] w-full bg-stone-900 overflow-hidden">
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-12 text-white">
      <h1 className="text-4xl font-serif tracking-wide mb-2">{title}</h1>
      <div className="text-[12px] tracking-[0.2em] uppercase opacity-70">{date}</div>
    </div>
  </div>
);
