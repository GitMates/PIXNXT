import React from 'react';
import { PreviewPaneProps } from './PreviewPane.types';
import { GalleryPreview } from './GalleryPreview';
import { cn } from '../../../../lib/utils';
import { getCollectionShareUrl } from '../../../../lib/shareCollection';
import '../DesignTab/DesignWorkspace.css';
import './PreviewPane.css';

function PreviewFrame({
  className,
  isMobile,
  fontFamily,
  browserUrl,
  children,
}: {
  className?: string;
  isMobile: boolean;
  fontFamily?: string;
  browserUrl?: string;
  children: React.ReactNode;
}) {
  if (isMobile) {
    return (
      <div className={cn('cd-design-frame', className)}>
        <div className="cd-design-frame__mobile-scaler">
          <div className="cd-phone-shell">
            <span className="cd-phone-btn cd-phone-btn--action" aria-hidden="true" />
            <span className="cd-phone-btn cd-phone-btn--vol-up" aria-hidden="true" />
            <span className="cd-phone-btn cd-phone-btn--vol-down" aria-hidden="true" />
            <span className="cd-phone-btn cd-phone-btn--power" aria-hidden="true" />
            <div className={cn('cd-design-preview-pane', 'mobile', fontFamily && `font-${fontFamily}`)}>
              <div className="cd-preview-workspace cd-preview-workspace--dual">
                <div className="cd-preview-canvas cd-preview-canvas--phone">
                  <div className="cd-phone-chrome" aria-hidden="true">
                    <div className="cd-phone-chrome__status">
                      <span className="cd-phone-chrome__time">9:41</span>
                      <span className="cd-phone-chrome__island" />
                      <span className="cd-phone-chrome__icons">
                        <svg viewBox="0 0 17 12" width="15" height="11" aria-hidden>
                          <rect x="0.5" y="7" width="3" height="4.5" rx="0.6" fill="currentColor" opacity="0.35" />
                          <rect x="4.5" y="5" width="3" height="6.5" rx="0.6" fill="currentColor" opacity="0.55" />
                          <rect x="8.5" y="2.75" width="3" height="8.75" rx="0.6" fill="currentColor" opacity="0.75" />
                          <rect x="12.5" y="0.5" width="3" height="11" rx="0.6" fill="currentColor" />
                        </svg>
                        <svg viewBox="0 0 16 12" width="14" height="11" aria-hidden>
                          <path
                            fill="currentColor"
                            d="M8 3.2c1.7 0 3.3.6 4.5 1.7l1.1-1.1A7.9 7.9 0 0 0 8 1.2 7.9 7.9 0 0 0 2.4 3.8l1.1 1.1A6.3 6.3 0 0 1 8 3.2zm0 3.1c.9 0 1.8.3 2.5.9l1.1-1.1A5 5 0 0 0 8 4.7a5 5 0 0 0-3.6 1.4l1.1 1.1c.7-.6 1.6-.9 2.5-.9zM8 10.8a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z"
                          />
                        </svg>
                        <svg viewBox="0 0 25 12" width="22" height="11" aria-hidden>
                          <rect x="0.5" y="0.5" width="21" height="11" rx="2.2" stroke="currentColor" strokeOpacity="0.35" fill="none" />
                          <rect x="2" y="2" width="15" height="8" rx="1.2" fill="currentColor" />
                          <path d="M23 4.2v3.6a1.5 1.5 0 0 0 0-3.6z" fill="currentColor" opacity="0.4" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="cd-preview-canvas__body">{children}</div>
                  <div className="cd-phone-chrome__home" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <span className="cd-design-frame__label">Phone</span>
      </div>
    );
  }

  const urlLabel = (browserUrl || 'gallery.pixnxt.com').replace(/^https?:\/\//, '');

  return (
    <div className={cn('cd-design-frame', className)}>
      <div className="cd-browser-chrome" aria-hidden="true">
        <div className="cd-browser-chrome__dots">
          <span />
          <span />
          <span />
        </div>
        <div className="cd-browser-chrome__url">
          <span className="cd-browser-chrome__url-text">{urlLabel}</span>
        </div>
      </div>
      <div className="cd-design-frame__canvas">{children}</div>
      <span className="cd-design-frame__label">Desktop</span>
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
  photographerProfile,
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
    photographerProfile,
    coverLogoUrl,
  };

  if (dualPreview) {
    const browserUrl = getCollectionShareUrl(
      (dashboardState?.collection?.slug as string) || 'preview',
      photographerProfile
    );

    return (
      <div className="cd-design-preview-column">
        <div className="cd-design-page-intro">
          <h1 className="cd-design-page-title">Design</h1>
          <p className="cd-design-page-subtitle">how your client sees this delivery</p>
        </div>

        <div className="cd-design-dual-preview">
          <div className="cd-design-dual-preview__frames">
            <div className="cd-design-dual-preview__scale">
              <PreviewFrame
                className="cd-design-frame--desktop"
                isMobile={false}
                browserUrl={browserUrl}
              >
                <GalleryPreview {...galleryProps} isPreviewMobile={false} />
              </PreviewFrame>
              <PreviewFrame
                className="cd-design-frame--mobile"
                isMobile
                fontFamily={settings.fontFamily}
              >
                <GalleryPreview {...galleryProps} isPreviewMobile />
              </PreviewFrame>
            </div>
          </div>
          <p className="cd-design-dual-preview__note">
            Both frames are the shape a real screen is — 16:10 and 9:19.5 — so the cover is shown
            at the proportion your client will actually see.
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
