import React from 'react';
import { PreviewPaneProps } from './PreviewPane.types';
import { GalleryPreview } from './GalleryPreview';
import { cn } from '../../../../lib/utils';
import '../DesignTab/DesignWorkspace.css';
import './PreviewPane.css';

function PreviewFrame({
  className,
  isMobile,
  children,
}: {
  className?: string;
  isMobile: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('cd-design-frame', className)}>
      <div
        className="cd-design-frame__canvas"
        style={isMobile ? { fontSize: '10px' } : undefined}
      >
        {isMobile ? (
          <div className="cd-design-preview-pane mobile">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  settings,
  collectionTitle,
  collectionDate,
  collectionDescription,
  coverPhotoUrl,
  gridPhotos,
  previewMode,
  onPreviewModeChange,
  dashboardState,
  onSetActiveSet,
  photographerName,
  coverLogoUrl,
  dualPreview = false,
}) => {
  const galleryProps = {
    settings,
    collectionTitle,
    collectionDate,
    collectionDescription,
    coverPhotoUrl,
    gridPhotos,
    dashboardState,
    onSetActiveSet,
    photographerName,
    coverLogoUrl,
  };

  if (dualPreview) {
    return (
      <div className="cd-design-preview-column">
        <div className="cd-design-page-intro">
          <h1 className="cd-design-page-title">Design</h1>
          <p className="cd-design-page-subtitle">how your client sees this delivery</p>
        </div>

        <div className="cd-design-dual-preview">
          <div className="cd-design-dual-preview__frames">
            <PreviewFrame className="cd-design-frame--desktop" isMobile={false}>
              <GalleryPreview {...galleryProps} isPreviewMobile={false} />
            </PreviewFrame>
            <PreviewFrame className="cd-design-frame--mobile" isMobile>
              <GalleryPreview {...galleryProps} isPreviewMobile />
            </PreviewFrame>
          </div>
          <p className="cd-design-dual-preview__note">
            Both frames are the shape a real screen is — 16:10 and 9:19.6 — so the cover is shown at
            the proportion your client will actually see.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('cd-design-preview-pane', previewMode, `font-${settings.fontFamily}`)}>
      <div className="cd-preview-workspace">
        <div className="cd-preview-canvas">
          <GalleryPreview
            {...galleryProps}
            isPreviewMobile={previewMode === 'mobile'}
          />
        </div>
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
  );
};
