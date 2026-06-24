import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  mobileGalleryPhotosService,
  validateMobileGalleryJpeg,
} from '../../services/mobileGalleryPhotos.service';
import '../../pages/mobile-gallery/MobileGallery.css';

const DUPLICATE_MODES = [
  { value: 'skip', label: 'Skip duplicates' },
  { value: 'replace', label: 'Replace duplicates' },
];

const CloudUploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    <polyline points="12 16 12 8" />
    <polyline points="8 12 12 8 16 12" />
  </svg>
);

const AppPhotoUploadZone = ({
  existingFilenames,
  duplicateMode,
  onDuplicateModeChange,
  onCancel,
  onFilesSelected,
  uploading,
  uploadProgress,
  toolbarOnly = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const fileInputRef = useRef(null);
  const duplicateRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (duplicateRef.current?.contains(e.target)) return;
      setDuplicateOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const processFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      const valid = [];
      const errors = [];

      files.forEach((file) => {
        const err = validateMobileGalleryJpeg(file);
        if (err) {
          errors.push(`${file.name}: ${err}`);
          return;
        }
        valid.push(file);
      });

      if (errors.length) {
        alert(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n…and ${errors.length - 5} more` : ''));
      }

      if (!valid.length) return;

      const existing = new Set(existingFilenames.map((n) => n.toLowerCase()));
      let toUpload = valid;

      if (duplicateMode === 'skip') {
        toUpload = valid.filter((f) => !existing.has(f.name.toLowerCase()));
        const skipped = valid.length - toUpload.length;
        if (skipped > 0 && toUpload.length === 0) {
          alert(`${skipped} duplicate file${skipped === 1 ? '' : 's'} skipped.`);
          return;
        }
      }

      onFilesSelected(toUpload);
    },
    [duplicateMode, existingFilenames, onFilesSelected]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    const next = e.relatedTarget;
    if (next && e.currentTarget.contains(next)) return;
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
    processFiles(e.dataTransfer.files);
  };

  const duplicateLabel =
    DUPLICATE_MODES.find((m) => m.value === duplicateMode)?.label || 'Skip duplicates';

  return (
    <div className="mg-upload-panel">
      <div className="mg-upload-toolbar">
        <div className="mg-upload-duplicate" ref={duplicateRef}>
          <button
            type="button"
            className="mg-upload-duplicate-btn"
            onClick={() => setDuplicateOpen((open) => !open)}
            disabled={uploading}
            aria-expanded={duplicateOpen}
          >
            {duplicateLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {duplicateOpen && (
            <div className="mg-upload-duplicate-menu">
              {DUPLICATE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={`mg-upload-duplicate-option${duplicateMode === mode.value ? ' mg-upload-duplicate-option--active' : ''}`}
                  onClick={() => {
                    onDuplicateModeChange(mode.value);
                    setDuplicateOpen(false);
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="mg-upload-cancel" onClick={onCancel} disabled={uploading}>
          Cancel
        </button>
      </div>

      {!toolbarOnly && (
      <div
        className={`mg-upload-dropzone${isDragging ? ' mg-upload-dropzone--dragging' : ''}${uploading ? ' mg-upload-dropzone--busy' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload photos"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,.jpg,.jpeg"
          multiple
          className="mg-upload-input"
          onChange={(e) => {
            processFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="mg-upload-dropzone-inner">
          <div className="mg-upload-cloud">
            <CloudUploadIcon />
          </div>
          <p className="mg-upload-drag-text">Drag photos here</p>
          <p className="mg-upload-or">Or...</p>
          <button
            type="button"
            className="mg-btn-primary mg-upload-select-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (!uploading) fileInputRef.current?.click();
            }}
            disabled={uploading}
          >
            Select photos from your computer
          </button>
          <p className="mg-upload-hint">Accepts JPEG files up to 100MB each</p>
          {uploading && (
            <p className="mg-upload-progress">
              Uploading… {uploadProgress}%
            </p>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default AppPhotoUploadZone;
