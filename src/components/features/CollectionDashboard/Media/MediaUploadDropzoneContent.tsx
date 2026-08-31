import React from 'react';
import './MediaUploadDropzoneContent.css';

function UploadDropIcon() {
  return (
    <svg
      className="cd-upload-drop__icon-svg"
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="9" y="11" width="30" height="30" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="22" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M17.5 32.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="38" cy="38" r="8.5" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M38 34.75v6.5M34.75 38h6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type MediaUploadDropzoneContentProps = {
  onBrowse?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export function MediaUploadDropzoneContent({ onBrowse }: MediaUploadDropzoneContentProps) {
  return (
    <div className="cd-upload-drop">
      <div className="cd-upload-drop__icon" aria-hidden>
        <UploadDropIcon />
      </div>
      <p className="cd-upload-drop__title">Drag photographs and films here</p>
      <p className="cd-upload-drop__browse-row">
        or{' '}
        <button
          type="button"
          className="cd-upload-drop__browse"
          onClick={(event) => {
            event.stopPropagation();
            onBrowse?.(event);
          }}
        >
          browse your files
        </button>
      </p>
      <p className="cd-upload-drop__meta">
        JPEG, PNG, HEIC, MP4, MOV · up to 5 GB a file · originals are kept untouched
      </p>
    </div>
  );
}
