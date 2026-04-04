import React from 'react';
import { CoverProps } from './CoverStyles.types';

export const CenterCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="header-center-layout">
    <div className="header-bg-img">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
    <div className="header-overlay">
      <div className="h-super">{subtitle || 'GALLERY'}</div>
      <div className="h-title">{title}</div>
      <div className="h-date">{date}</div>
      <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
    </div>
  </div>
);

export const LeftCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="header-left-layout">
    <div className="header-bg-img">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
    <div className="header-content">
      <div className="h-super">{subtitle || 'GALLERY'}</div>
      <div className="h-title">{title}</div>
      <div className="h-date">{date}</div>
      <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
    </div>
  </div>
);

export const NovelCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="header-novel-layout">
    <div className="header-left">
      <div className="header-title-box">
        <div className="h-super">{subtitle || 'GALLERY'}</div>
        <div className="h-title">{title}</div>
        <div className="h-date">{date}</div>
        <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
      </div>
    </div>
    <div className="header-right">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
  </div>
);

export const VintageCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="header-vintage-layout">
    <div className="header-left">
      <div className="vintage-img-box">
        {photoUrl && <img src={photoUrl} alt="Preview" />}
      </div>
    </div>
    <div className="header-right">
      <div className="header-title-box">
        <div className="h-super">{subtitle || 'GALLERY'}</div>
        <div className="h-title">{title}</div>
        <div className="h-date">{date}</div>
        <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
      </div>
    </div>
  </div>
);

export const FrameCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl }) => (
  <div className="header-frame-layout">
    <div className="header-frame-inner">
      <div className="header-bg-img">
        {photoUrl && <img src={photoUrl} alt="Preview" />}
      </div>
      <div className="header-overlay">
        <div className="h-super">{subtitle || 'GALLERY'}</div>
        <div className="h-title">{title}</div>
        <div className="h-date">{date}</div>
      </div>
    </div>
  </div>
);

export const StripeCover: React.FC<CoverProps> = ({ title, date, photoUrl, onViewGallery }) => (
  <div className="header-stripe-layout">
    <div className="header-bg-img">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
    <div className="header-overlay">
      <div className="stripe-line"></div>
      <div className="h-title">{title}</div>
      <div className="stripe-line"></div>
      <div className="h-date">{date}</div>
      <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
    </div>
  </div>
);

export const DividerCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="header-divider-layout">
    <div className="divider-left">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
    <div className="divider-right">
      <div className="header-title-box">
        <div className="h-super">{subtitle || 'GALLERY'}</div>
        <div className="h-title">{title}</div>
        <div className="h-date">{date}</div>
        <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
      </div>
    </div>
  </div>
);

export const JournalCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="header-journal-layout">
    <div className="journal-left">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
    <div className="journal-right">
      <div className="header-title-box">
        <div className="h-super">{subtitle || 'GALLERY'}</div>
        <div className="h-title">{title}</div>
        <div className="h-date">{date}</div>
        <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
      </div>
    </div>
  </div>
);

export const StampCover: React.FC<CoverProps> = ({ title, subtitle, date, photoUrl, onViewGallery }) => (
  <div className="header-stamp-layout">
    <div className="stamp-img">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
    <div className="h-super">{subtitle || 'GALLERY'}</div>
    <div className="h-title">{title}</div>
    <div className="h-date">{date}</div>
    <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
  </div>
);

export const OutlineCover: React.FC<CoverProps> = ({ title, subtitle, date, onViewGallery }) => (
  <div className="header-outline-layout">
    <div className="outline-box">
      <div className="h-super">{subtitle || 'GALLERY'}</div>
      <div className="h-title">{title}</div>
      <div className="h-date">{date}</div>
      <button className="view-gallery-btn" onClick={onViewGallery}>VIEW GALLERY</button>
    </div>
  </div>
);

export const ClassicCover: React.FC<CoverProps> = ({ title, date, photoUrl }) => (
  <div className="header-classic-layout">
    <div className="header-bg-img">
      {photoUrl && <img src={photoUrl} alt="Preview" />}
    </div>
    <div className="classic-overlay">
      <div className="h-title">{title}</div>
      <div className="h-date">{date}</div>
    </div>
  </div>
);
