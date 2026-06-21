import React from 'react';
import '../../pages/mobile-gallery/MobileGallery.css';

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AppUploadQueueList = ({
  items,
  onUploadMore,
  onManageApp,
  uploading,
}) => {
  const allDone = items.length > 0 && items.every((i) => i.status === 'done' || i.status === 'error');

  return (
    <div className="mg-upload-queue">
      <ul className="mg-upload-queue-list">
        {items.map((item) => (
          <li key={item.id} className={`mg-upload-queue-item mg-upload-queue-item--${item.status}`}>
            <span className={`mg-upload-queue-status${item.status === 'done' ? ' mg-upload-queue-status--done' : ''}`}>
              {item.status === 'done' ? <CheckIcon /> : item.status === 'uploading' ? '…' : '!'}
            </span>
            <span className="mg-upload-queue-name">{item.filename}</span>
            {item.status === 'uploading' && (
              <span className="mg-upload-queue-pct">{item.progress ?? 0}%</span>
            )}
            {item.status === 'error' && (
              <span className="mg-upload-queue-error">{item.error || 'Failed'}</span>
            )}
          </li>
        ))}
      </ul>
      {allDone && !uploading && (
        <div className="mg-upload-queue-actions">
          <button type="button" className="mg-btn-outline" onClick={onUploadMore}>
            Upload More
          </button>
          <button type="button" className="mg-btn-primary" onClick={onManageApp}>
            Manage Gallery App
          </button>
        </div>
      )}
    </div>
  );
};

export default AppUploadQueueList;
