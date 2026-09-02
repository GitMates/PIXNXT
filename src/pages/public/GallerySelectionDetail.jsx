import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, Heart, Link as LinkIcon, Lock, Mail, MessageCircle, Send, SendHorizontal, X } from 'lucide-react';
import { galleryService } from '../../services/gallery.service';
import { downloadPhotosToZip, generateZipBlob } from '../../lib/downloadPhoto';
import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { AppLoader } from '../../components/ui/AppLoading';
import JSZip from 'jszip';
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
  const [userEmail, setUserEmail] = useState('');
  const [list, setList] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientNote, setClientNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  // Top header Share & Download states
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareMenuRef = useRef(null);

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
        setUserEmail(saved);

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

  // Click outside to close share dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleDownload = async () => {
    if (photos.length === 0 || isDownloading) return;
    try {
      setIsDownloading(true);
      setDownloadProgress({ current: 0, total: photos.length });

      const zip = new JSZip();
      const folderName = (list?.name || 'favorites').replace(/[^a-zA-Z0-9_-]/g, '_');
      const folder = zip.folder(folderName) || zip;

      const result = await downloadPhotosToZip(folder, photos, {
        onProgress: (current, total) => {
          setDownloadProgress({ current, total });
        },
        preferOriginal: true,
      });

      if (result.fileCount === 0) {
        alert('Could not download any photos. Please try again.');
        return;
      }

      const zipBlob = await generateZipBlob(zip);
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to create download. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleShareEmailSubmit = async (e) => {
    e.preventDefault();
    const emails = recipientEmails
      .split(/[,;\s]+/)
      .map((em) => em.trim())
      .filter((em) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));

    if (emails.length === 0) {
      alert('Please enter at least one valid recipient email address.');
      return;
    }

    const publicShareUrl = `${window.location.origin}/gallery/${slug}/f/${listId}`;

    try {
      setIsSendingEmail(true);
      for (const email of emails) {
        await galleryService.shareCollectionByEmail({
          collectionSlug: slug,
          recipientEmail: email,
          senderEmail: userEmail,
          personalMessage: emailMessage ? `${emailMessage}\n\nSelection: ${list?.name || 'Favorites'}\n${publicShareUrl}` : `Here is the favorite selection (${list?.name || 'Favorites'}):\n${publicShareUrl}`,
        });
      }
      alert('Favorites list shared successfully via email!');
      setShowEmailModal(false);
      setRecipientEmails('');
      setEmailMessage('');
    } catch (err) {
      console.error('Failed to send share email:', err);
      alert(err.message || 'Could not send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const publicShareUrl = `${window.location.origin}/gallery/${slug}/f/${listId}`;

  const copySelectionLink = async () => {
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      /* ignore */
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
          <div className="selection-detail__chrome-left">
            <Link to={choosePath} className="selection-detail__crumb" title="Back to selections">
              <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
              <span>Your selections</span>
            </Link>
            <span className="selection-detail__crumb-sep">/</span>
            <div className="selection-detail__toolbar-left">
              <h1 className="selection-detail__title">{list.name}</h1>
              <span className="selection-detail__count">{countLabel}</span>
            </div>
          </div>

          <div className="selection-detail__chrome-right">
            {/* Primary Action to add photos */}
            {!isLocked && (
              <button type="button" className="selection-detail__ghost-btn" onClick={openGalleryToAdd}>
                Add more from the gallery
              </button>
            )}

            <span className="selection-detail__actions-divider" aria-hidden />

            {/* Download Button */}
            <button
              type="button"
              className="selection-detail__top-action-btn"
              onClick={handleDownload}
              disabled={isDownloading || photos.length === 0}
              title={photos.length === 0 ? 'No photos to download' : 'Download all selected photos'}
            >
              <Download size={14} strokeWidth={1.75} className="selection-detail__top-icon" />
              <span>{isDownloading ? (downloadProgress ? `DOWNLOADING (${downloadProgress.current}/${downloadProgress.total})` : 'DOWNLOADING…') : 'DOWNLOAD'}</span>
            </button>

            {/* Share Menu */}
            <div className="selection-detail__share-dropdown-wrap" ref={shareMenuRef}>
              <button
                type="button"
                className={`selection-detail__top-action-btn ${shareMenuOpen ? 'selection-detail__top-action-btn--active' : ''}`}
                onClick={() => setShareMenuOpen((prev) => !prev)}
                aria-expanded={shareMenuOpen}
              >
                <SendHorizontal size={14} strokeWidth={1.75} className="selection-detail__top-icon" />
                <span>SHARE</span>
              </button>

              {shareMenuOpen && (
                <div className="selection-detail__dropdown-menu">
                  <button
                    type="button"
                    className="selection-detail__dropdown-item"
                    onClick={() => {
                      setShareMenuOpen(false);
                      setShowEmailModal(true);
                    }}
                  >
                    <Mail size={15} strokeWidth={1.6} className="selection-detail__dropdown-icon" />
                    <span>EMAIL FAVORITES</span>
                  </button>

                  <button
                    type="button"
                    className="selection-detail__dropdown-item"
                    onClick={() => {
                      setShareMenuOpen(false);
                      setShowLinkModal(true);
                    }}
                  >
                    <LinkIcon size={15} strokeWidth={1.6} className="selection-detail__dropdown-icon" />
                    <span>GET LINK</span>
                  </button>
                </div>
              )}
            </div>

            {/* Main Action Button */}
            {!isLocked ? (
              <button
                type="button"
                className="selection-detail__send-btn"
                disabled={isSubmitting || photos.length < 1}
                onClick={() => void handleSend()}
              >
                {isSubmitting ? 'Sending…' : `Send to ${photographerName}`}
              </button>
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

      {/* EMAIL FAVORITES MODAL */}
      {showEmailModal && (
        <div className="fav-share-modal__overlay" onClick={() => !isSendingEmail && setShowEmailModal(false)}>
          <div className="fav-share-modal__box" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2 className="fav-share-modal__title">EMAIL FAVORITES</h2>
            <p className="fav-share-modal__subtitle">
              Share this favorite list with your family and friends via email.
            </p>

            <form onSubmit={handleShareEmailSubmit}>
              <div className="fav-share-modal__field">
                <input
                  type="text"
                  className="fav-share-modal__input"
                  placeholder="Recipient emails (e.g. guest1@email.com, guest2@email.com)"
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  disabled={isSendingEmail}
                  required
                  autoFocus
                />
              </div>

              <div className="fav-share-modal__field">
                <textarea
                  className="fav-share-modal__textarea"
                  placeholder="Custom message (Optional)"
                  rows={4}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  disabled={isSendingEmail}
                />
              </div>

              <div className="fav-share-modal__actions">
                <button
                  type="button"
                  className="fav-share-modal__btn-cancel"
                  onClick={() => setShowEmailModal(false)}
                  disabled={isSendingEmail}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="fav-share-modal__btn-submit"
                  disabled={isSendingEmail || !recipientEmails.trim()}
                >
                  {isSendingEmail ? 'SENDING…' : 'SHARE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GET LINK MODAL */}
      {showLinkModal && (
        <div className="fav-share-modal__overlay" onClick={() => setShowLinkModal(false)}>
          <div className="fav-share-modal__box" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2 className="fav-share-modal__title">GET LINK</h2>
            <p className="fav-share-modal__subtitle">
              Anyone with this link can view this favorites selection.
            </p>

            <div className="fav-share-modal__link-row">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="fav-share-modal__input fav-share-modal__link-input"
              />
              <button
                type="button"
                className="fav-share-modal__btn-copy"
                onClick={copySelectionLink}
              >
                {copiedLink ? 'COPIED' : 'COPY'}
              </button>
            </div>

            <div className="fav-share-modal__actions" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="fav-share-modal__btn-submit"
                onClick={() => setShowLinkModal(false)}
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

