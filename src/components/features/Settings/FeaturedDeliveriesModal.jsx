import React, { useEffect, useMemo, useState } from 'react';
import { galleryService } from '../../../services/gallery.service';
import { CollectionCardCover } from '../ClientGallery/CollectionCardCover';
import { showcasePhotoCount } from '../../../lib/showcaseFeature';
import { AppLoader } from '../../ui/AppLoading';

const MAX_FEATURED = 6;

function photoCountLabel(col) {
  const n = showcasePhotoCount(col);
  if (n === 1) return '1 photograph';
  return `${Number(n).toLocaleString()} photographs`;
}

function isPinLocked(col) {
  return Boolean(
    col?.client_access_enabled &&
      (col?.client_password_hash || col?.client_password || col?.password)
  );
}

/**
 * Multi-select picker for Showcase featured deliveries.
 */
export function FeaturedDeliveriesModal({ open, photographerId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !photographerId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    galleryService
      .getCollections(photographerId)
      .then((rows) => {
        if (cancelled) return;
        const list = (rows || []).filter((c) => c.status !== 'archived');
        setCollections(list);
        const initial = new Set(
          list
            .filter((c) => c.status === 'published' && c.show_on_showcase !== false)
            .map((c) => String(c.id))
        );
        setSelected(initial);
      })
      .catch((err) => {
        console.error('Failed to load deliveries for feature picker:', err);
        if (!cancelled) setError('Could not load deliveries. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, photographerId]);

  const eligible = useMemo(
    () =>
      collections.filter((c) => c.status === 'published' || selected.has(String(c.id))),
    [collections, selected]
  );

  const chosenCount = selected.size;
  const publishedCount = collections.filter((c) => c.status === 'published').length;
  const totalLabel = publishedCount || eligible.length;

  const toggle = (col) => {
    const id = String(col.id);
    if (isPinLocked(col) && !selected.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= MAX_FEATURED) return prev;
      next.add(id);
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const updates = collections
        .filter((c) => c.status === 'published')
        .map((c) => {
          const id = String(c.id);
          const want = selected.has(id);
          const was = c.show_on_showcase !== false;
          if (want === was) return null;
          return galleryService.updateCollection(c.id, { show_on_showcase: want });
        })
        .filter(Boolean);
      await Promise.all(updates);
      onSaved?.(chosenCount);
      onClose?.();
    } catch (err) {
      console.error('Failed to save featured deliveries:', err);
      setError(err?.message || 'Failed to save selection.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="set-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="set-modal set-modal--featured"
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-featured-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="set-modal__head">
          <div>
            <h2 id="set-featured-title" className="set-modal__title">
              Featured deliveries
            </h2>
            <p className="set-modal__desc">
              Pick the work that represents you. A Showcase of everything is not a portfolio.
            </p>
          </div>
        </div>

        <div className="set-modal__toolbar">
          <span className="set-modal__count">
            {chosenCount} of {totalLabel} chosen
          </span>
          <button type="button" className="settings-pill-btn" onClick={clearAll} disabled={!chosenCount}>
            Clear all
          </button>
        </div>

        <div className="set-modal__body">
          {loading ? (
            <AppLoader label="Loading deliveries" variant="compact" className="app-loader" />
          ) : error && eligible.length === 0 ? (
            <p className="set-modal__muted">{error}</p>
          ) : eligible.length === 0 ? (
            <p className="set-modal__muted">Publish a delivery first, then choose it here.</p>
          ) : (
            <div className="set-feature-grid">
              {eligible.map((col) => {
                const id = String(col.id);
                const isOn = selected.has(id);
                const locked = isPinLocked(col);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`set-feature-card${isOn ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
                    onClick={() => toggle(col)}
                    disabled={locked && !isOn}
                    title={locked ? 'PIN-protected deliveries cannot be featured' : undefined}
                  >
                    <div className="set-feature-card__media">
                      <div className="set-feature-card__placeholder" aria-hidden />
                      <CollectionCardCover collection={col} alt="" className="set-feature-card__img" />
                      <span className={`set-feature-card__check${isOn ? ' is-on' : ''}`} aria-hidden>
                        {isOn ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : null}
                      </span>
                    </div>
                    <div className="set-feature-card__meta">
                      <strong>{col.name || 'Untitled'}</strong>
                      <span>{photoCountLabel(col)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="set-modal__footnote">
          A featured delivery shows its cover and its name. Nothing behind a PIN can be featured, and
          choosing one here does not change who can open it.
        </p>

        {error ? <p className="set-modal__error">{error}</p> : null}

        <div className="set-modal__footer">
          <button type="button" className="settings-pill-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="set-modal__primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Saving…' : 'Save selection'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeaturedDeliveriesModal;
