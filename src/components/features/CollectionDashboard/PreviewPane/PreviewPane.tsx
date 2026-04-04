import React from 'react';
import { PreviewPaneProps } from './PreviewPane.types';
import { GalleryPreview } from './GalleryPreview';
import { cn } from '../../../../lib/utils';

export const PreviewPane: React.FC<PreviewPaneProps> = ({ 
  settings, 
  collectionTitle, 
  collectionDate,
  coverPhotoUrl,
  gridPhotos,
  previewMode,
  onPreviewModeChange
}) => {
  return (
    <div className={cn('cd-design-preview-pane', previewMode, `font-${settings.fontFamily}`)}>
      <div className="cd-preview-workspace">
        <div className="cd-preview-canvas">
          <GalleryPreview 
            settings={settings}
            collectionTitle={collectionTitle}
            collectionDate={collectionDate}
            coverPhotoUrl={coverPhotoUrl}
            gridPhotos={gridPhotos}
          />
        </div>
        <div className="cd-preview-toolbar">
          <button
            className={cn('cd-preview-tool-btn', previewMode === 'desktop' && 'active')}
            onClick={() => onPreviewModeChange('desktop')}
            aria-label="Desktop Preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </button>
          <button
            className={cn('cd-preview-tool-btn', previewMode === 'mobile' && 'active')}
            onClick={() => onPreviewModeChange('mobile')}
            aria-label="Mobile Preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
