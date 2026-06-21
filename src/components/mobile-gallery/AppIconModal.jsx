import React, { useEffect, useRef, useState } from 'react';

function AppIconModal({ open, uploading, onUpload, onClose }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, uploading, onClose]);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/') || uploading) return;
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (!open) return null;

  return (
    <div className="mg-focal-overlay" role="presentation" onClick={uploading ? undefined : onClose}>
      <div
        className="mg-icon-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mg-icon-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mg-icon-modal-header">
          <h2 id="mg-icon-modal-title" className="mg-icon-modal-title">
            Change App Icon
          </h2>
          <button type="button" className="mg-icon-modal-cancel" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
        </header>

        <div
          className={`mg-icon-modal-dropzone${isDragging ? ' mg-icon-modal-dropzone--dragging' : ''}${uploading ? ' mg-icon-modal-dropzone--uploading' : ''}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!uploading) inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="mg-design-file-input"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="mg-icon-modal-dropzone-text">
            {uploading ? 'Uploading…' : 'Click here or drag photo here to upload app icon'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AppIconModal;
