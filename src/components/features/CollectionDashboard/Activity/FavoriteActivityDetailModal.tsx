import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { openSpaPath } from '../../../../lib/spaNavigation';
import { formatActivityRelativeTime } from '../../../../lib/buildActivityFeed';

export interface FavoriteListDetail {
  id: string | number;
  name?: string;
  email?: string;
  photoCount?: number;
  max_selection?: number | null;
  updated_at?: string;
  description?: string;
  submitted_at?: string | null;
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
  onReopenList: (detail: FavoriteListDetail) => void | Promise<void>;
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
  onReopenList,
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

  const heroPhotos = sortedRows.slice(0, 18);
  const overflowCount = Math.max(0, sortedRows.length - heroPhotos.length);
  const submittedLabel = detail.max_selection != null && Number(detail.max_selection) > 0
    ? `${detail.photoCount ?? 0} of ${detail.max_selection} · complete`
    : `${detail.photoCount ?? 0} selected`;
  const noteCount = sortedRows.filter((row: any) => String(row.photo?.note || '').trim()).length;
  const whenLabel = detail.updated_at
    ? `${formatActivityRelativeTime(detail.updated_at)} · ${new Date(detail.updated_at)
        .toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .replace(',', '')}`
    : '—';

  const isLocked = Boolean(detail.submitted_at);

  return (
    <AnimatePresence>
      <motion.div
        className="favorite-detail-drawer-overlay"
        onClick={onClose}
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.aside
          className="favorite-detail-drawer"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorite-detail-modal-title"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
        >
          <div className="favorite-detail-drawer__head">
            <div className="favorite-detail-drawer__head-top">
              <span className="favorite-detail-drawer__badge">Selection</span>
              <button type="button" className="favorite-detail-drawer__close" onClick={onClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <h3 id="favorite-detail-modal-title" className="favorite-detail-drawer__title">
              List submitted
            </h3>
            <p className="favorite-detail-drawer__summary">
              Started the {detail.name || 'list'} list · {photoCountLabel} so far
            </p>
          </div>

          <div className="favorite-detail-drawer__body">
            <div className="favorite-detail-drawer__section-head">
              <span className="download-detail-photos-title">
                The photographs <span className="favorite-detail-drawer__section-count">{detail.photoCount ?? 0}</span>
              </span>
            </div>

            <div className="favorite-detail-photo-grid">
              {favoriteDetailLoading ? (
                <p className="favorite-detail-empty">Loading…</p>
              ) : heroPhotos.length === 0 ? (
                <p className="favorite-detail-empty">No photos in this list yet.</p>
              ) : (
                <>
                  {heroPhotos.map((row, index) => {
                    const ph = row.photo;
                    const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || '');
                    return (
                      <div key={`${ph?.id || index}-${row.itemCreatedAt || index}`} className="favorite-detail-photo-grid__cell">
                        {thumb && !isVideo ? (
                          <img src={thumb} alt="" />
                        ) : (
                          <span className={`favorite-detail-photo-grid__placeholder favorite-detail-photo-grid__placeholder--${index % 6}`} />
                        )}
                        {thumb && isVideo ? (
                          <span className="favorite-detail-photo-grid__video">
                            <Play size={14} fill="white" stroke="white" />
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                  {overflowCount > 0 ? (
                    <div className="favorite-detail-photo-grid__cell favorite-detail-photo-grid__cell--more">+{overflowCount}</div>
                  ) : null}
                </>
              )}
            </div>

            <div className="favorite-detail-drawer__section-head favorite-detail-drawer__section-head--detail">
              <span className="download-detail-photos-title">Detail</span>
            </div>

            <div className="favorite-detail-facts">
              <div className="favorite-detail-fact-row">
                <span className="favorite-detail-fact-label">Who</span>
                <span className="favorite-detail-fact-value">{detail.name || detail.email || 'Client'}</span>
              </div>
              <div className="favorite-detail-fact-row">
                <span className="favorite-detail-fact-label">List</span>
                <span className="favorite-detail-fact-value">
                  <strong>{detail.name || 'Album'}</strong>
                  {detail.description?.trim() ? ` — ${detail.description.trim()}` : ''}
                </span>
              </div>
              <div className="favorite-detail-fact-row">
                <span className="favorite-detail-fact-label">Picked</span>
                <span className="favorite-detail-fact-value">{submittedLabel}</span>
              </div>
              <div className="favorite-detail-fact-row">
                <span className="favorite-detail-fact-label">Locked</span>
                <span className="favorite-detail-fact-value">
                  {isLocked ? 'Yes, on submission' : 'No'}
                </span>
              </div>
              <div className="favorite-detail-fact-row">
                <span className="favorite-detail-fact-label">Notes</span>
                <span className="favorite-detail-fact-value">
                  {noteCount > 0 ? `${noteCount} photograph${noteCount === 1 ? '' : 's'} carry a note` : 'None'}
                </span>
              </div>
              <div className="favorite-detail-fact-row">
                <span className="favorite-detail-fact-label">When</span>
                <span className="favorite-detail-fact-value">{whenLabel || lastModified}</span>
              </div>
            </div>
          </div>

          <div className="favorite-detail-drawer__footer">
            {isLocked ? (
              <button
                type="button"
                className="favorite-detail-footer-secondary"
                onClick={() => void onReopenList(detail)}
              >
                Reopen the list
              </button>
            ) : (
              <button
                type="button"
                className="favorite-detail-footer-secondary"
                onClick={() => onEditList(detail)}
              >
                Edit the list
              </button>
            )}
            <button
              type="button"
              className="favorite-detail-footer-primary"
              onClick={() => {
                if (collectionSlug) openSpaPath(`/gallery/${collectionSlug}?list=${detail.id}`);
              }}
            >
              Review the picks
            </button>
            <button
              type="button"
              className="favorite-detail-footer-link"
              onClick={() => {
                handleExportFavoriteList(detail.id, detail.name);
                setFavoriteDetailToolbarMenuOpen(false);
              }}
            >
              Export as CSV
            </button>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
