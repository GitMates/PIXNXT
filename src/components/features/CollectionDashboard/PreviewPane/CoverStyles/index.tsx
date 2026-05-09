import React from 'react';
import { CoverProps } from './CoverStyles.types';

export const CenterCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center bg-black text-white overflow-hidden">
    {photoUrl && (
      <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
    )}
    <div className="relative z-10 flex flex-col items-center text-center px-6">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-80 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-light tracking-[0.2em] mb-4 uppercase">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-10">{date}</div>
      <button 
        className="px-10 py-3 border border-white text-[11px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const LeftCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex flex-col items-start justify-center bg-black text-white overflow-hidden px-16">
    {photoUrl && (
      <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
    )}
    <div className="relative z-10 flex flex-col items-start text-left max-w-lg">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-80 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-light tracking-[0.2em] mb-4 uppercase">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-10">{date}</div>
      <button 
        className="px-10 py-3 border border-white text-[11px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const NovelCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col md:flex-row bg-white overflow-hidden">
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white text-stone-900">
      <div className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-serif text-stone-800 mb-6">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-10">{date}</div>
      <button 
        className="px-10 py-3 bg-stone-900 text-white text-[11px] tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors"
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
  <div className="h-[400px] w-full flex flex-col md:flex-row bg-[#1a1a1a] overflow-hidden text-white">
    <div className="flex-1 h-full p-6">
      <div className="w-full h-full border border-white/20 p-3 overflow-hidden">
        {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover grayscale opacity-80" />}
      </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-60 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-serif tracking-widest mb-6 italic">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-70 mb-10">{date}</div>
      <button 
        className="px-10 py-3 border border-white/40 text-[11px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const FrameCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full bg-white flex items-center justify-center p-6">
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-stone-100">
      {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 border-[16px] border-white z-20 pointer-events-none"></div>
      <div className="relative z-10 flex flex-col items-center justify-center text-white bg-black/30 w-full h-full p-8">
        <div className="text-[10px] tracking-[0.3em] uppercase opacity-90 mb-3">{subtitle || 'GALLERY'}</div>
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
  <div className="relative h-[400px] w-full flex flex-col items-center justify-center bg-stone-900 overflow-hidden text-white">
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
    <div className="relative z-10 flex flex-col items-center px-12 py-10 bg-black/10 backdrop-blur-sm border-y border-white/30 w-full max-w-3xl">
      <div className="w-24 h-px bg-white/70 mb-6"></div>
      <h1 className="text-5xl font-light tracking-[0.3em] uppercase mb-6 text-center">{title}</h1>
      <div className="w-24 h-px bg-white/70 mb-8"></div>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-8">{date}</div>
      <button 
        className="px-10 py-3 border border-white text-[11px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const DividerCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex bg-stone-900 overflow-hidden text-white">
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/40 -translate-x-1/2 z-10"></div>
    <div className="relative z-10 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="text-[10px] tracking-[0.3em] uppercase opacity-80 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-light tracking-[0.2em] uppercase">{title}</h1>
    </div>
    <div className="relative z-10 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-80 mb-8">{date}</div>
      <button 
        className="px-8 py-3 bg-white text-black text-[10px] tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const JournalCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex bg-white overflow-hidden p-8 gap-8 items-center justify-center">
    <div className="w-1/2 h-[90%] overflow-hidden shadow-sm bg-stone-100">
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
    <div className="w-1/2 flex flex-col items-center text-center p-8 text-stone-900">
      <div className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-4xl font-serif text-stone-800 mb-6">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-10">{date}</div>
      <button 
        className="px-8 py-3 bg-stone-900 text-white text-[10px] tracking-[0.2em] uppercase hover:bg-stone-700 transition-colors"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const StampCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="h-[400px] w-full flex flex-col items-center justify-center bg-white p-12 text-stone-900">
    <div className="w-48 h-48 overflow-hidden mb-8 bg-stone-100">
      {photoUrl && <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />}
    </div>
    <div className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">{subtitle || 'GALLERY'}</div>
    <h1 className="text-4xl font-serif mb-4 tracking-wide">{title}</h1>
    <div className="text-[11px] tracking-[0.2em] text-stone-500 mb-8">{date}</div>
    <button 
      className="px-8 py-3 border border-stone-800 text-[10px] tracking-[0.2em] uppercase hover:bg-stone-800 hover:text-white transition-all"
      onClick={onViewGallery}
    >
      VIEW GALLERY
    </button>
  </div>
);

export const OutlineCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full flex items-center justify-center bg-stone-900 overflow-hidden text-white p-8">
    {photoUrl && <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
    <div className="relative z-10 w-full h-full max-w-2xl border-[2px] border-white flex flex-col items-center justify-center p-12 bg-black/10 backdrop-blur-[2px]">
      <div className="text-[10px] tracking-[0.4em] uppercase opacity-90 mb-4">{subtitle || 'GALLERY'}</div>
      <h1 className="text-5xl font-light tracking-[0.2em] uppercase mb-6 text-center">{title}</h1>
      <div className="text-[11px] tracking-[0.2em] uppercase opacity-90 mb-10">{date}</div>
      <button 
        className="px-10 py-3 border border-white text-[11px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
        onClick={onViewGallery}
      >
        VIEW GALLERY
      </button>
    </div>
  </div>
);

export const ClassicCover: React.FC<CoverProps> = ({ title, date, photoUrl, onViewGallery }) => (
  <div className="relative h-[400px] w-full bg-stone-900 overflow-hidden text-white">
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
