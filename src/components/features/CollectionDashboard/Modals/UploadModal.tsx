import React from 'react';
import { MediaUploadDropzoneContent } from '../Media/MediaUploadDropzoneContent';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrowse: () => void;
  onDrop: (files: FileList) => void;
  activeTab: 'upload' | 'embed';
  onTabChange: (tab: 'upload' | 'embed') => void;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onBrowse,
  onDrop,
  activeTab,
  onTabChange,
  isDragging,
  onDragOver,
  onDragLeave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3 className="cd-modal-title">ADD MEDIA</h3>
          <button className="cd-modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="cd-modal-tabs">
          <button 
            className={`cd-modal-tab ${activeTab === 'upload' ? 'active' : ''}`} 
            onClick={() => onTabChange('upload')}
          >
            Upload
          </button>
          <button 
            className={`cd-modal-tab ${activeTab === 'embed' ? 'active' : ''}`} 
            onClick={() => onTabChange('embed')}
          >
            Embed
          </button>
        </div>

        {activeTab === 'upload' ? (
          <>
            <div
              className={`cd-modal-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(e.dataTransfer.files);
              }}
            >
              <div className="cd-modal-drop-content">
                <MediaUploadDropzoneContent onBrowse={onBrowse} />
              </div>
            </div>
          </>
        ) : (
          <div className="cd-modal-embed">
            <div className="cd-embed-input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              <input type="text" placeholder="Add a YouTube or Vimeo Video URL" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
