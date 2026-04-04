import React from 'react';
import { GalleryPreviewProps } from './PreviewPane.types';
import * as Covers from './CoverStyles';
import { cn } from '../../../../lib/utils';

export const GalleryPreview: React.FC<GalleryPreviewProps> = ({ 
  settings, 
  collectionTitle, 
  collectionDate,
  coverPhotoUrl,
  gridPhotos 
}) => {
  const { coverStyle, fontFamily, colorPalette, grid } = settings;

  const renderCover = () => {
    const props = {
      title: collectionTitle,
      date: collectionDate,
      photoUrl: coverPhotoUrl,
    };

    switch (coverStyle) {
      case 'center': return <Covers.CenterCover {...props} />;
      case 'left': return <Covers.LeftCover {...props} />;
      case 'novel': return <Covers.NovelCover {...props} />;
      case 'vintage': return <Covers.VintageCover {...props} />;
      case 'frame': return <Covers.FrameCover {...props} />;
      case 'stripe': return <Covers.StripeCover {...props} />;
      case 'divider': return <Covers.DividerCover {...props} />;
      case 'journal': return <Covers.JournalCover {...props} />;
      case 'stamp': return <Covers.StampCover {...props} />;
      case 'outline': return <Covers.OutlineCover {...props} />;
      case 'classic': return <Covers.ClassicCover {...props} />;
      case 'none': return null;
      default: return <Covers.NovelCover {...props} />;
    }
  };

  return (
    <div className={cn(
      'cd-preview-gallery-card',
      `style-${coverStyle}`,
      `font-${fontFamily}`,
      `theme-${colorPalette}`
    )}>
      <div className="cd-preview-gallery-header">
        {renderCover()}
      </div>

      <div className={cn(
        'cd-preview-gallery-body',
        `grid-style-${grid.style}`,
        `grid-size-${grid.size}`,
        `grid-spacing-${grid.spacing}`,
        `nav-style-${grid.navigation}`,
        `aspect-${grid.aspectRatio}`
      )}>
        <div className="gallery-meta-bar">
          <div className="meta-left">
             <div className="collection-nav-mock">
               <span className="nav-item active">{collectionTitle.toUpperCase()}</span>
               <span className="nav-item">HIGHLIGHTS</span>
               <span className="nav-item">US</span>
             </div>
          </div>
          <div className="meta-right">
            <div className="meta-icon-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              {grid.navigation === 'text' && <span>Favorite</span>}
            </div>
            <div className="meta-icon-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              {grid.navigation === 'text' && <span>Download</span>}
            </div>
            <div className="meta-icon-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              {grid.navigation === 'text' && <span>Share</span>}
            </div>
          </div>
        </div>

        <div className="gallery-mock-grid">
          {[...Array(12)].map((_, i) => {
             const photo = gridPhotos[i % gridPhotos.length];
             return (
              <div 
                key={i} 
                className={cn('mock-grid-item', `item-${i}`)}
                style={{ 
                  '--aspect-ratio': grid.aspectRatio === 'square' ? '1/1' 
                    : grid.aspectRatio === '3-2' ? '3/2'
                    : grid.aspectRatio === '4-5' ? '4/5'
                    : grid.aspectRatio === '16-9' ? '16/9'
                    : 'auto'
                } as React.CSSProperties}
              >
                {photo && (
                  <>
                    <img src={photo.full_url} alt="Grid Mock" />
                    <div className="item-hover-overlay">
                      <div className="hover-top-right">
                        <svg className="heart-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      </div>
                      <div className="hover-center">
                        <svg className="zoom-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                      </div>
                    </div>
                  </>
                )}
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};
