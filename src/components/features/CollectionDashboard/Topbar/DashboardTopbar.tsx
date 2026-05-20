import React from 'react';
import { DashboardTopbarProps } from './DashboardTopbar.types';
import { CollectionMoreMenu } from './CollectionMoreMenu';

export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({
  collectionName,
  status,
  onStatusChange,
  onPreview,
  onShare,
  onBack,
  moreMenu,
}) => {
  return (
    <header className="cd-topbar">
      <div className="cd-topbar-left">
        <button type="button" className="cd-back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div className="cd-collection-info">
          <h1 className="cd-collection-name">{collectionName}</h1>
          <div className={`cd-status-badge ${status.toLowerCase()}`}>
            <div className="cd-status-dot"></div>
            <span>{status}</span>
          </div>
        </div>
      </div>

      <div className="cd-topbar-right">
        {moreMenu && (
          <CollectionMoreMenu
            collectionId={moreMenu.collectionId}
            collectionSlug={moreMenu.collectionSlug}
            collectionName={collectionName}
            photographerId={moreMenu.photographerId}
            currentFolderId={moreMenu.currentFolderId}
            eventDate={moreMenu.eventDate}
            pinValue={moreMenu.pinValue}
            clientPasswordDisplay={moreMenu.clientPasswordDisplay}
            onOpenDownloadSettings={moreMenu.onOpenDownloadSettings}
          />
        )}
        <button type="button" className="cd-topbar-btn preview-btn" onClick={onPreview}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          Preview
        </button>
        <button type="button" className="cd-topbar-btn share-btn" onClick={onShare}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          Share
        </button>
        <div className="cd-topbar-divider"></div>
        <button
          type="button"
          className={`cd-publish-btn ${status === 'PUBLISHED' ? 'published' : ''}`}
          onClick={() => onStatusChange(status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
        >
          {status === 'PUBLISHED' ? 'Published' : 'Publish'}
        </button>
      </div>
    </header>
  );
};
