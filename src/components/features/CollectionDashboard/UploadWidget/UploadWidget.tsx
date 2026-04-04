import React from 'react';
import { UploadWidgetProps } from './UploadWidget.types';

export const UploadWidget: React.FC<UploadWidgetProps> = ({
  isOpen,
  isMinimized,
  onMinimize,
  onClose,
  files
}) => {
  if (!isOpen) return null;

  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const totalCount = files.length;

  if (isMinimized) {
    return (
      <div className="upload-widget-minimized" onClick={onMinimize}>
        <div className="upload-status-icon ring">
           <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="circle" strokeDasharray={`${(completedCount / totalCount) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
           </svg>
        </div>
        <span className="upload-min-text">
          {uploadingCount > 0 ? `Uploading ${uploadingCount} files...` : `Uploaded ${completedCount} files`}
        </span>
      </div>
    );
  }

  return (
    <div className="upload-widget">
      <div className="upload-widget-header">
        <div className="upload-header-left">
          <h4 className="upload-title">Uploading</h4>
          <span className="upload-count">{completedCount}/{totalCount}</span>
        </div>
        <div className="upload-header-actions">
          <button onClick={onMinimize} className="upload-action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button onClick={onClose} className="upload-action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      
      <div className="upload-files-list">
        {files.map(file => (
          <div key={file.id} className="upload-file-item">
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <div className="file-status-row">
               <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${file.progress}%` }}></div>
               </div>
               {file.status === 'completed' && (
                  <svg className="status-success-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
