import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, MessageCircle } from 'lucide-react';
import { galleryService } from '../../services/gallery.service';
import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { AppLoader } from '../../components/ui/AppLoading';
import './GalleryFavoritesHub.css';

function noteStorageKey(listId) {
  return `pixnxt_fav_note_${listId}`;
}

export default function GallerySelectionDetail() {
  const { slug, listId } = useParams();
  const navigate = useNavigate();

  const [collection, setCollection] = useState(null);
  const [photographerName, setPhotographerName] = useState('your photographer');
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [list, setList] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientNote, setClientNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  const galleryPath = `/gallery/${slug}`;
  const choosePath = `/gallery/${slug}/choose`;

  const loadDetail = useCallback(async (sid, targetListId) => {
    const row = await galleryService.getFavoriteListById(targetListId, sid);
    if (!row) {
      setList(null);
      setPhotos([]);
      return;
    }
    setList(row);
    const rows = await galleryService.getFavoriteListItemRows(targetListId);
    setPhotos(rows.map((r) => r.photo).filter(Boolean));
    const savedNote = localStorage.getItem(noteStorageKey(targetListId));
    if (savedNote != null) {
      setClientNote(savedNote);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!slug || !listId) return;
      try {
        setLoading(true);
        const data = await galleryService.getCollectionBySlug(slug);
        if (cancelled) return;
        if (!data || data.favorites_enabled === false) {
          navigate(galleryPath, { replace: true });
          return;
        }
        setCollection(data);

        if (data.photographer_id) {
          try {
            const profile = await galleryService.getPhotographerProfile(data.photographer_id);
            if (profile?.business_name || profile?.display_name) {
              setPhotographerName(profile.business_name || profile.display_name);
            }
          } catch {
            /* optional */
          }
        }

        const saved = localStorage.getItem(`pixnxt_fav_email_${data.id}`);
        if (!saved) {
          navigate(choosePath, { replace: true });
          return;
        }

        const session = await galleryService.createOrGetSession(data.id, saved);
        if (cancelled) return;
        setSessionId(session.id);
        await loadDetail(session.id, listId);
      } catch (e) {
        console.error(e);
        if (!cancelled) navigate(choosePath, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [slug, listId, navigate, galleryPath, choosePath, loadDetail]);

  useEffect(() => {
    if (!listId || !clientNote) return;
    localStorage.setItem(noteStorageKey(listId), clientNote);
  }, [listId, clientNote]);

  const cap = useMemo(() => {
    if (list?.max_selection != null && Number(list.max_selection) > 0) {
      return Number(list.max_selection);
    }
    return null;
  }, [list?.max_selection]);

  const countLabel = useMemo(() => {
    const count = photos.length;
    if (cap != null) return `${count} of ${cap} chosen`;
    return `${count} chosen`;
  }, [photos.length, cap]);

  const galleryGridSettings = useMemo(() => {
    if (!collection) {
      return { style: 'vertical', size: 'regular', spacing: 'regular', aspectRatio: 'original' };
    }
    const extras =
      collection.design_options && typeof collection.design_options === 'object'
        ? collection.design_options
        : {};
    return {
      style: extras.grid_style || collection.grid_style || 'vertical',
      size: extras.thumbnail_size || collection.thumbnail_size || 'regular',
      spacing: extras.grid_spacing || collection.grid_spacing || 'regular',
      aspectRatio: collection.aspect_ratio || 'original',
    };
  }, [collection]);

  const galleryCustomRowHeight = useMemo(() => {
    const size = galleryGridSettings.size;
    if (size === 'large') return 420;
    if (size === 'regular') return 300;
    if (size === 'small') return 200;
    return 140;
  }, [galleryGridSettings.size]);

  const isSubmitted = Boolean(list?.submitted_at);
  const isLocked = isSubmitted;

  const handleSend = async () => {
    if (!listId || !sessionId || !collection || isLocked) return;
    if (photos.length < 1) {
      alert('Add at least one photograph before sending.');
      return;
    }
    try {
      setIsSubmitting(true);
      await galleryService.submitFavoriteList(listId, sessionId);
      try {
        await galleryService.notifyPhotographerFavoriteSubmit({
          listId,
          sessionId,
          siteOrigin: window.location.origin,
          clientMessage: clientNote,
        });
      } catch (emailErr) {
        console.error('Photographer notification email failed:', emailErr);
        alert(
          'Your selection was saved, but we could not email your photographer. They can still see it in Favorite Activity.'
        );
      }
      sessionStorage.removeItem(`pixnxt_fav_pick_list_${collection.id}`);
      localStorage.removeItem(noteStorageKey(listId));
      const channel = new BroadcastChannel('pixnxt-gallery-update');
      channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collection.id });
      channel.close();
      await loadDetail(sessionId, listId);
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Could not send selection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!collection?.id || !listId) return;
    sessionStorage.setItem(`pixnxt_fav_pick_list_${collection.id}`, listId);
  }, [collection?.id, listId]);

  const openGalleryToAdd = () => {
    if (!collection?.id || !listId) return;
    sessionStorage.setItem(`pixnxt_fav_pick_list_${collection.id}`, listId);
    navigate(`${galleryPath}?pickList=${encodeURIComponent(listId)}`);
  };

  if (loading) {
    return <AppLoader label="Loading selection" variant="page-short" className="selections-loading app-loader" />;
  }

  if (!list) {
    return (
      <div className="selections-page">
        <main className="selections-page__main">
          <p style={{ textAlign: 'center', color: '#8a8580' }}>This selection could not be found.</p>
          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to={choosePath}>Back to selections</Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="selections-page selection-detail-page">
      <div className="selection-detail__chrome">
        <div className="selection-detail__chrome-row">
          <Link to={choosePath} className="selection-detail__crumb">
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden />
            Your selections
          </Link>
        </div>

        <div className="selection-detail__toolbar-bar">
          <div className="selection-detail__toolbar-inner">
            <div className="selection-detail__toolbar-left">
              <h1 className="selection-detail__title">{list.name}</h1>
              <p className="selection-detail__count">{countLabel}</p>
            </div>
            {!isLocked ? (
              <div className="selection-detail__toolbar-actions">
                <button type="button" className="selection-detail__ghost-btn" onClick={openGalleryToAdd}>
                  Add more from the gallery
                </button>
                <button
                  type="button"
                  className="selection-detail__send-btn"
                  disabled={isSubmitting || photos.length < 1}
                  onClick={() => void handleSend()}
                >
                  {isSubmitting ? 'Sending…' : `Send to ${photographerName}`}
                </button>
              </div>
            ) : (
              <span className="selection-detail__locked-badge">
                <Lock size={11} strokeWidth={2} aria-hidden />
                Sent, locked
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="selection-detail__shell">
        {!isLocked ? (
          <div className="selection-detail__note">
            <div className="selection-detail__note-box">
              <div className="selection-detail__note-head">
                <span className="selection-detail__note-label">
                  <MessageCircle size={13} strokeWidth={1.75} aria-hidden />
                  Your note to {photographerName.toUpperCase()}
                </span>
                {!editingNote ? (
                  <button
                    type="button"
                    className="selection-detail__note-edit"
                    onClick={() => setEditingNote(true)}
                  >
                    {clientNote.trim() ? 'Edit' : 'Add'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="selection-detail__note-edit"
                    onClick={() => setEditingNote(false)}
                  >
                    Done
                  </button>
                )}
              </div>
              {editingNote ? (
                <textarea
                  className="selection-detail__note-input"
                  value={clientNote}
                  onChange={(e) => setClientNote(e.target.value)}
                  placeholder="We would like the ceremony ones to lead the book if you can."
                  autoFocus
                />
              ) : clientNote.trim() ? (
                <p className="selection-detail__note-text">{clientNote.trim()}</p>
              ) : null}
            </div>
          </div>
        ) : list.description?.trim() ? (
          <div className="selection-detail__note">
            <div className="selection-detail__note-box">
              <div className="selection-detail__note-head">
                <span className="selection-detail__note-label">
                  <MessageCircle size={13} strokeWidth={1.75} aria-hidden />
                  Note from {photographerName.toUpperCase()}
                </span>
              </div>
              <p className="selection-detail__note-text">{list.description.trim()}</p>
            </div>
          </div>
        ) : null}

        <div className="selection-detail__grid-wrap selection-detail__masonry">
          {photos.length === 0 ? (
            <div className="selection-detail__empty">
              No photographs yet.{' '}
              {!isLocked ? (
                <button type="button" className="selection-detail__empty-link" onClick={openGalleryToAdd}>
                  Select photos in gallery
                </button>
              ) : null}
            </div>
          ) : (
            <MasonryGrid
              key={`selection-${listId}-${galleryGridSettings.style}-${galleryGridSettings.size}-${galleryGridSettings.spacing}`}
              photos={photos}
              gridSettings={galleryGridSettings}
              isHorizontal={galleryGridSettings.style?.toLowerCase() === 'horizontal'}
              customRowHeight={galleryCustomRowHeight}
              onImageClick={() => {}}
              showDownload={false}
              showFavorite={false}
              showShare={false}
              showShop={false}
              forceShow
            />
          )}
        </div>
      </div>
    </div>
  );
}
