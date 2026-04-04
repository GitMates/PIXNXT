import React from 'react';

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
                <div className="cd-modal-drop-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cfd5d8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
                    <path d="M8 2h12a2 2 0 0 1 2 2v10"></path>
                    <circle cx="15" cy="15" r="5" fill="#fff" stroke="#cfd5d8"></circle>
                    <line x1="15" y1="12" x2="15" y2="18"></line>
                    <line x1="12" y1="15" x2="18" y2="15"></line>
                  </svg>
                </div>
                <p className="cd-modal-drop-text">Drag photos and videos here to upload</p>
                <p className="cd-modal-drop-browse">or <span className="cd-browse-link" onClick={onBrowse}>Browse files</span></p>
              </div>
            </div>
            <div className="cd-modal-footer">
              <span className="cd-modal-switch">Switch to classic uploader</span>
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
