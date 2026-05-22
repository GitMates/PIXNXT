import React, { useEffect } from 'react';
import { Play } from 'lucide-react';
import { openSpaPath } from '../../../../lib/spaNavigation';

export interface FavoriteListDetail {
  id: string | number;
  name?: string;
  email?: string;
  photoCount?: number;
  max_selection?: number | null;
  updated_at?: string;
  description?: string;
}

export interface FavoriteDetailRow {
  itemCreatedAt?: string;
  photo?: {
    id?: string;
    set_id?: string | null;
    filename?: string;
    thumbnail_url?: string;
    web_url?: string;
    full_url?: string;
  };
}

export interface FavoriteActivityDetailModalProps {
  selectedFavoriteListId: string | number;
  favoriteActivity: FavoriteListDetail[];
  favoriteDetailRows: FavoriteDetailRow[];
  favoriteDetailSort: 'name-az' | 'name-za';
  setFavoriteDetailSort: React.Dispatch<React.SetStateAction<'name-az' | 'name-za'>>;
  favoriteDetailLoading: boolean;
  favoriteDetailToolbarMenuOpen: boolean;
  setFavoriteDetailToolbarMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  favoriteDetailPhotoMenuPhotoId: string | null;
  setFavoriteDetailPhotoMenuPhotoId: React.Dispatch<React.SetStateAction<string | null>>;
  favoriteDetailToolbarMenuRef: React.RefObject<HTMLDivElement | null>;
  favoriteDetailPhotoMenuRef: React.RefObject<HTMLDivElement | null>;
  collectionSlug?: string;
  highlightsName: string;
  sets: Array<{ id: string; name?: string }>;
  onClose: () => void;
  setActiveActivityMenu: (id: string | number | null) => void;
  /** Closes details popup, then opens the edit form modal */
  onEditList: (detail: FavoriteListDetail) => void;
  handleDownloadAllFavoriteList: (listId: string | number) => void;
  handleExportFavoriteList: (listId: string | number, name?: string) => void;
  handleLightroomCopyList: (listId: string | number) => void;
  handleFavoriteDetailRowDownload: (photo: FavoriteDetailRow['photo']) => void;
  handleRemovePhotoFromFavoriteList: (listId: string | number, photoId?: string) => void;
  handleDeleteFavoriteActivity: (listId: string | number) => void;
}

export function FavoriteActivityDetailModal({
  selectedFavoriteListId,
  favoriteActivity,
  favoriteDetailRows,
  favoriteDetailSort,
  setFavoriteDetailSort,
  favoriteDetailLoading,
  favoriteDetailToolbarMenuOpen,
  setFavoriteDetailToolbarMenuOpen,
  favoriteDetailPhotoMenuPhotoId,
  setFavoriteDetailPhotoMenuPhotoId,
  favoriteDetailToolbarMenuRef,
  favoriteDetailPhotoMenuRef,
  collectionSlug,
  highlightsName,
  sets,
  onClose,
  setActiveActivityMenu,
  onEditList,
  handleDownloadAllFavoriteList,
  handleExportFavoriteList,
  handleLightroomCopyList,
  handleFavoriteDetailRowDownload,
  handleRemovePhotoFromFavoriteList,
  handleDeleteFavoriteActivity,
}: FavoriteActivityDetailModalProps) {
  const detail = favoriteActivity.find((a) => a.id === selectedFavoriteListId);

  const sortedRows = [...favoriteDetailRows].sort((a, b) => {
    const fa = a.photo?.filename || '';
    const fb = b.photo?.filename || '';
    return favoriteDetailSort === 'name-za' ? fb.localeCompare(fa) : fa.localeCompare(fb);
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!detail) return null;

  const lastModified = detail.updated_at
    ? new Date(detail.updated_at)
        .toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .replace(',', ' -')
    : '—';

  const photoCountLabel =
    detail.max_selection != null && Number(detail.max_selection) > 0
      ? `${detail.photoCount} of ${detail.max_selection}`
      : String(detail.photoCount ?? 0);

  return (
    <div
      className="cd-modal-overlay favorite-detail-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cd-modal favorite-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-detail-modal-title"
      >
        <div className="cd-modal-header favorite-detail-modal-header">
          <h3 id="favorite-detail-modal-title" className="cd-modal-title">
            Favorite List Details
          </h3>
          <button type="button" className="cd-modal-close" onClick={onClose} aria-label="Close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="favorite-detail-modal-body">
          <div className="favorite-list-detail-toolbar">
            <button
              type="button"
              className="favorite-detail-toolbar-link"
              onClick={() => onEditList(detail)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit List
            </button>
            <button
              type="button"
              className="favorite-detail-toolbar-link"
              onClick={() => handleDownloadAllFavoriteList(detail.id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download All
            </button>
            <button
              type="button"
              className="favorite-detail-toolbar-link"
              onClick={() => {
                handleExportFavoriteList(detail.id, detail.name);
                setFavoriteDetailToolbarMenuOpen(false);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
            <div className="favorite-detail-toolbar-more-wrap">
              <button
                type="button"
                className="favorite-detail-toolbar-icon-btn"
                aria-label="More actions"
                aria-expanded={favoriteDetailToolbarMenuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveActivityMenu(null);
                  setFavoriteDetailPhotoMenuPhotoId(null);
                  setFavoriteDetailToolbarMenuOpen((o) => !o);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              {favoriteDetailToolbarMenuOpen && (
                <div ref={favoriteDetailToolbarMenuRef} className="favorite-detail-toolbar-menu" role="menu">
                  <button
                    type="button"
                    className="activity-menu-item"
                    role="menuitem"
                    onClick={() => {
                      handleLightroomCopyList(detail.id);
                      setFavoriteDetailToolbarMenuOpen(false);
                    }}
                  >
                    Lightroom Copy List
                  </button>
                  <button
                    type="button"
                    className="activity-menu-item"
                    role="menuitem"
                    onClick={() => {
                      if (collectionSlug) openSpaPath(`/gallery/${collectionSlug}?list=${detail.id}`);
                      setFavoriteDetailToolbarMenuOpen(false);
                    }}
                  >
                    View in Gallery
                  </button>
                  <button
                    type="button"
                    className="activity-menu-item"
                    role="menuitem"
                    onClick={() => handleDownloadAllFavoriteList(detail.id)}
                  >
                    Send as download
                  </button>
                  <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    Copy to new set
                  </button>
                  <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    Copy to new collection
                  </button>
                  <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    Create mobile app
                  </button>
                  <div style={{ height: '1px', background: '#eee', margin: '4px 0' }} />
                  <button
                    type="button"
                    className="activity-menu-item delete"
                    role="menuitem"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavoriteDetailToolbarMenuOpen(false);
                      setActiveActivityMenu(null);
                      handleDeleteFavoriteActivity(detail.id);
                    }}
                  >
                    Delete info
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="favorite-list-detail-meta">
            <div className="favorite-detail-meta-row">
              <span className="favorite-detail-meta-label">Name</span>
              <span>{detail.name}</span>
            </div>
            <div className="favorite-detail-meta-row">
              <span className="favorite-detail-meta-label">Email</span>
              <span>{detail.email}</span>
            </div>
            <div className="favorite-detail-meta-row">
              <span className="favorite-detail-meta-label">No. of photos</span>
              <span>{photoCountLabel}</span>
            </div>
            <div className="favorite-detail-meta-row">
              <span className="favorite-detail-meta-label">Last modified</span>
              <span>{lastModified}</span>
            </div>
            {detail.description?.trim() ? (
              <div className="favorite-detail-meta-row favorite-detail-meta-row--multiline">
                <span className="favorite-detail-meta-label">Description</span>
                <span className="favorite-detail-meta-value-wrap">{detail.description.trim()}</span>
              </div>
            ) : null}
          </div>

          <div className="favorite-list-detail-photos-head">
            <button
              type="button"
              className="favorite-detail-sort-btn"
              onClick={() => setFavoriteDetailSort((s) => (s === 'name-az' ? 'name-za' : 'name-az'))}
            >
              <span className="favorite-detail-sort-arrows" aria-hidden>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </span>
              Name: {favoriteDetailSort === 'name-az' ? 'A-Z' : 'Z-A'}
            </button>
          </div>

          <div className="favorite-list-detail-photos">
            {favoriteDetailLoading ? (
              <p className="favorite-detail-loading">Loading…</p>
            ) : sortedRows.length === 0 ? (
              <p className="favorite-detail-empty">No photos in this list yet.</p>
            ) : (
              sortedRows.map((row, index) => {
                const ph = row.photo;
                const setLabel = !ph?.set_id
                  ? highlightsName
                  : sets.find((ss) => ss.id === ph.set_id)?.name || 'Highlights';
                const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                const menuOpen = favoriteDetailPhotoMenuPhotoId === ph?.id;
                const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || '');

                return (
                  <div
                    key={`${ph?.id}-${row.itemCreatedAt}`}
                    className={`favorite-detail-photo-row${menuOpen ? ' favorite-detail-photo-row--menu-open' : ''}`}
                  >
                    <div className="favorite-detail-thumb">
                      {thumb ? (
                        isVideo ? (
                          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <video
                              src={thumb}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              muted
                            />
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.2)',
                              }}
                            >
                              <Play size={16} fill="white" stroke="white" />
                            </div>
                          </div>
                        ) : (
                          <img src={thumb} alt="" />
                        )
                      ) : null}
                    </div>
                    <div className="favorite-detail-photo-main">
                      <div className="favorite-detail-filename">{ph?.filename || 'Photo'}</div>
                      <div className="favorite-detail-sub">
                        {row.itemCreatedAt
                          ? new Date(row.itemCreatedAt)
                              .toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                              .replace(',', ' -')
                          : '—'}
                        <span className="favorite-detail-sub-sep"> - </span>
                        <span className="favorite-detail-set-tag">{setLabel}</span>
                      </div>
                    </div>
                    <div className="favorite-detail-row-actions">
                      <button
                        type="button"
                        className="favorite-detail-row-more"
                        aria-label="More options"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFavoriteDetailToolbarMenuOpen(false);
                          setActiveActivityMenu(null);
                          setFavoriteDetailPhotoMenuPhotoId((id) => (id === ph?.id ? null : ph?.id ?? null));
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>
                      {menuOpen && (
                        <div
                          ref={favoriteDetailPhotoMenuRef}
                          className={`favorite-detail-photo-row-menu${
                            index > 0 && index >= sortedRows.length - 2
                              ? ' favorite-detail-photo-row-menu--up'
                              : ''
                          }`}
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="activity-menu-item"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFavoriteDetailRowDownload(ph);
                            }}
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            className="activity-menu-item delete"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhotoFromFavoriteList(selectedFavoriteListId, ph?.id);
                            }}
                          >
                            Remove Favorite
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
