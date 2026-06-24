import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../../pages/mobile-gallery/MobileGallery.css';

const HELP_ARTICLES = [
  {
    id: 'what-is',
    title: 'What is a Mobile Gallery App?',
    description: 'Learn about personalized mobile photo albums for your clients.',
  },
  {
    id: 'create-share',
    title: 'Creating and Sharing a Mobile Gallery App',
    description: 'Create a new app and share it with your clients.',
  },
  {
    id: 'client-install',
    title: 'How does my client install a Mobile Gallery App?',
    description: 'Help your clients save the app to their home screen.',
  },
];

const MobileGalleryHelpDropdown = ({ open, onToggle, onClose, triggerClassName = 'mg-topbar-icon' }) => {
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_ARTICLES;
    return HELP_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="mg-header-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className={`${triggerClassName}${open ? ' mg-topbar-icon--active' : ''}`}
        onClick={onToggle}
        aria-label="Help"
        aria-expanded={open}
        title="Help"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
      {open && (
        <div className="mg-help-panel">
          <div className="mg-help-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search our articles"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search help articles"
            />
          </div>
          <div className="mg-help-articles">
            {filtered.length === 0 ? (
              <p className="mg-help-empty">No articles match your search.</p>
            ) : (
              filtered.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className="mg-help-article"
                  onClick={() => {
                    onClose();
                    window.open('https://help.pixieset.com/', '_blank', 'noopener,noreferrer');
                  }}
                >
                  <span className="mg-help-article-title">{article.title}</span>
                  <span className="mg-help-article-desc">{article.description}</span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            className="mg-help-browse"
            onClick={() => {
              onClose();
              window.open('https://help.pixieset.com/', '_blank', 'noopener,noreferrer');
            }}
          >
            Browse Help Center
          </button>
          <div className="mg-help-footer">
            <button
              type="button"
              className="mg-help-contact"
              onClick={() => {
                onClose();
                window.location.href = 'mailto:support@pixnxt.com?subject=Mobile%20Gallery%20App%20Support';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Contact Us
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileGalleryHelpDropdown;
