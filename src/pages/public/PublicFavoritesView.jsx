import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Heart,
  Link as LinkIcon,
  Mail,
  SendHorizontal,
} from 'lucide-react';
import * as Covers from '../../components/features/CollectionDashboard/PreviewPane/CoverStyles';
import { CoverScrollHint, coverUsesEmbeddedScroll } from '../../components/features/CollectionDashboard/PreviewPane/CoverStyles/CoverScrollHint';
import { galleryService } from '../../services/gallery.service';
import { resolveMediaUrl, getWebResolutionUrl } from '../../lib/photoDisplayUrl';
import { downloadPhotosToZip, generateZipBlob } from '../../lib/downloadPhoto';
import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { AppLoader } from '../../components/ui/AppLoading';
import { formatCoverDate } from '../../lib/formatCoverDate';
import { getCollectionFocal, getCollectionFocals, stripMediaUrlHash } from '../../lib/focalPoint';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import JSZip from 'jszip';
import './GalleryFavoritesHub.css';

export default function PublicFavoritesView() {
  const { slug, listId } = useParams();
  const isMobileViewport = useIsMobileViewport();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [list, setList] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [collection, setCollection] = useState(null);
  const [photographer, setPhotographer] = useState(null);

  // Dropdowns & modals
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Download
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  const shareMenuRef = useRef(null);
  const moreMenuRef = useRef(null);
  const contentSectionRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShareMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!listId) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch list metadata (public, no session required)
        const listData = await galleryService.getFavoriteListPublic(listId);
        if (cancelled) return;
        if (!listData) {
          setError('not_found');
          return;
        }
        setList(listData);

        // Fetch photos
        const rows = await galleryService.getFavoriteListItemRows(listId);
        if (cancelled) return;
        setPhotos(rows.map((r) => r.photo).filter(Boolean));

        // Fetch collection for cover & design settings
        const colSlug = listData.collectionSlug || slug;
        let fetchedCollection = null;
        if (colSlug) {
          try {
            fetchedCollection = await galleryService.getCollectionBySlug(colSlug);
            if (fetchedCollection && !cancelled) setCollection(fetchedCollection);
          } catch { /* optional */ }
        }

        // Fetch photographer profile
        const photogId = fetchedCollection?.photographer_id;
        if (photogId) {
          try {
            const profile = await galleryService.getPhotographerProfile(photogId);
            if (profile && !cancelled) setPhotographer(profile);
          } catch { /* optional */ }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('load_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [listId, slug]);

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

  const scrollToContent = () => {
    contentSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentPublicUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copySelectionLink = async () => {
    try {
      await navigator.clipboard.writeText(currentPublicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      /* ignore */
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

    try {
      setIsSendingEmail(true);
      for (const email of emails) {
        await galleryService.shareCollectionByEmail({
          collectionSlug: list?.collectionSlug || slug,
          recipientEmail: email,
          senderEmail: list?.curatorEmail || '',
          personalMessage: emailMessage
            ? `${emailMessage}\n\nFavorites: ${list?.name || 'My Favorites'}\n${currentPublicUrl}`
            : `Here is the favorite selection (${list?.name || 'My Favorites'}):\n${currentPublicUrl}`,
        });
      }
      alert('Favorites shared successfully via email!');
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

  if (loading) {
    return <AppLoader label="Loading favorites" variant="page-short" className="selections-loading app-loader" />;
  }

  if (error === 'not_found' || !list) {
    return (
      <div className="pub-fav-page">
        <div className="pub-fav-page__empty">
          <Heart size={32} strokeWidth={1.2} />
          <h2>Favorites not found</h2>
          <p>This link may have expired or the selection has been removed.</p>
        </div>
      </div>
    );
  }

  const photoCount = photos.length;
  const listName = (list.name || 'MY FAVORITES').toUpperCase();
  const curatorEmail = list.curatorEmail || '';
  const gallerySlug = list.collectionSlug || slug || '';
  const galleryFavoritesHubPath = gallerySlug ? `/gallery/${gallerySlug}/choose` : '/';
  const photographerName = photographer?.business_name || photographer?.display_name || '';

  // Resolve cover image from delivery / collection
  let activeCoverPhotoUrl = '';
  if (collection) {
    activeCoverPhotoUrl = stripMediaUrlHash(collection.cover_url || '');
    if (activeCoverPhotoUrl) {
      activeCoverPhotoUrl = resolveMediaUrl(activeCoverPhotoUrl);
      if (activeCoverPhotoUrl.includes('/original/')) {
        activeCoverPhotoUrl = activeCoverPhotoUrl.replace('/original/', '/web/');
      }
    } else if (collection.cover_photo?.web_url || collection.cover_photo?.url) {
      activeCoverPhotoUrl = resolveMediaUrl(collection.cover_photo.web_url || collection.cover_photo.url);
    } else if (collection.photos?.[0]) {
      activeCoverPhotoUrl = getWebResolutionUrl(collection.photos[0]);
    }
  }
  if (!activeCoverPhotoUrl && photos[0]) {
    activeCoverPhotoUrl = resolveMediaUrl(photos[0].web_url || photos[0].url || photos[0].thumbnail_url || '');
  }

  // Cover focal point
  const focals = collection ? getCollectionFocals(collection) : { x: 50, y: 50 };
  const { x: focalX, y: focalY } = isMobileViewport
    ? (focals.phone || focals.desktop || getCollectionFocal(collection))
    : (focals.desktop || focals.website || getCollectionFocal(collection));

  // Cover Style from delivery settings
  const coverStyle = collection?.design_options?.cover_style || collection?.cover_layout || collection?.cover_style || 'novel';

  const coverProps = {
    title: collection?.name || list?.collectionName || 'COLLECTION',
    subtitle: photographerName,
    coverLogoUrl: photographer?.cover_logo_url || '',
    date: formatCoverDate(collection?.event_date || collection?.created_at),
    photoUrl: activeCoverPhotoUrl,
    focalX,
    focalY,
    onViewGallery: scrollToContent,
    isGalleryView: true,
  };

  const renderCover = () => {
    switch (coverStyle) {
      case 'center': return <Covers.CenterCover {...coverProps} />;
      case 'left': return <Covers.LeftCover {...coverProps} />;
      case 'novel': return <Covers.NovelCover {...coverProps} />;
      case 'vintage': return <Covers.VintageCover {...coverProps} />;
      case 'frame': return <Covers.FrameCover {...coverProps} />;
      case 'stripe': return <Covers.StripeCover {...coverProps} />;
      case 'divider': return <Covers.DividerCover {...coverProps} />;
      case 'journal': return <Covers.JournalCover {...coverProps} />;
      case 'stamp': return <Covers.StampCover {...coverProps} />;
      case 'outline': return <Covers.OutlineCover {...coverProps} />;
      case 'classic': return <Covers.ClassicCover {...coverProps} />;
      default: return <Covers.NovelCover {...coverProps} />;
    }
  };

  return (
    <div className="pub-fav-page">
      {/* 1. Full-Screen Delivery Cover with matching layout & focal point placement */}
      <div
        className="gallery-view-hero relative w-full h-[100dvh] [&>div]:!h-full"
        data-cover-text-scale={isMobileViewport ? 'compact' : 'large'}
      >
        {renderCover()}
        {coverStyle !== 'classic' && !coverUsesEmbeddedScroll(coverStyle) ? (
          <CoverScrollHint
            coverStyle={coverStyle}
            onClick={scrollToContent}
            isGalleryView
          />
        ) : null}
      </div>

      {/* 2. Top Navigation Toolbar */}
      <header className="pub-fav-toolbar" ref={contentSectionRef}>
        <div className="pub-fav-toolbar__inner">
          <div className="pub-fav-toolbar__left">
            <Link to={galleryFavoritesHubPath} className="pub-fav-toolbar__back">
              <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
              <span>FAVORITES</span>
            </Link>
          </div>

          <div className="pub-fav-toolbar__right">
            {/* Share Menu */}
            <div className="pub-fav-menu-wrap" ref={shareMenuRef}>
              <button
                type="button"
                className={`pub-fav-toolbar__action-btn ${shareMenuOpen ? 'pub-fav-toolbar__action-btn--active' : ''}`}
                onClick={() => setShareMenuOpen((prev) => !prev)}
              >
                <SendHorizontal size={14} strokeWidth={1.75} />
                <span>SHARE</span>
              </button>

              {shareMenuOpen && (
                <div className="pub-fav-dropdown-menu">
                  <button
                    type="button"
                    className="pub-fav-dropdown-item"
                    onClick={() => {
                      setShareMenuOpen(false);
                      setShowEmailModal(true);
                    }}
                  >
                    <Mail size={15} strokeWidth={1.6} />
                    <span>EMAIL FAVORITES</span>
                  </button>

                  <button
                    type="button"
                    className="pub-fav-dropdown-item"
                    onClick={() => {
                      setShareMenuOpen(false);
                      setShowLinkModal(true);
                    }}
                  >
                    <LinkIcon size={15} strokeWidth={1.6} />
                    <span>GET LINK</span>
                  </button>
                </div>
              )}
            </div>

            {/* Download Button */}
            <button
              type="button"
              className="pub-fav-toolbar__action-btn"
              onClick={handleDownload}
              disabled={isDownloading || photoCount === 0}
            >
              <Download size={14} strokeWidth={1.75} />
              <span>
                {isDownloading
                  ? downloadProgress
                    ? `DOWNLOADING (${downloadProgress.current}/${downloadProgress.total})`
                    : 'DOWNLOADING…'
                  : 'DOWNLOAD'}
              </span>
            </button>

            {/* More Menu */}
            <div className="pub-fav-menu-wrap" ref={moreMenuRef}>
              <button
                type="button"
                className="pub-fav-toolbar__action-btn"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
              >
                <span>MORE</span>
                <ChevronDown size={13} strokeWidth={1.75} />
              </button>

              {moreMenuOpen && (
                <div className="pub-fav-dropdown-menu">
                  <Link
                    to={`/gallery/${gallerySlug}`}
                    className="pub-fav-dropdown-item"
                    onClick={() => setMoreMenuOpen(false)}
                  >
                    <span>View full gallery</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 3. Centered Title Header Section */}
      <div className="pub-fav-header-section">
        <h2 className="pub-fav-header-section__title">{listName}</h2>
        <div className="pub-fav-header-section__meta">
          <span className="pub-fav-header-section__count">
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </span>
          {curatorEmail && (
            <>
              <span className="pub-fav-header-section__sep">·</span>
              <span className="pub-fav-header-section__curator">
                Curated by {curatorEmail}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 4. Photo Grid */}
      <main className="pub-fav-grid-container">
        {photoCount === 0 ? (
          <div className="pub-fav-grid__empty">
            <Heart size={28} strokeWidth={1.2} />
            <p>No photos in this favorites selection yet.</p>
          </div>
        ) : (
          <MasonryGrid
            key={`pub-fav-${listId}-${galleryGridSettings.style}-${galleryGridSettings.size}-${galleryGridSettings.spacing}`}
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
      </main>

      {/* Footer */}
      {photographerName && (
        <footer className="pub-fav-footer">
          <p className="pub-fav-footer__text">
            Photography by <strong>{photographerName}</strong>
          </p>
        </footer>
      )}

      {/* EMAIL MODAL */}
      {showEmailModal && (
        <div className="fav-share-modal__overlay" onClick={() => setShowEmailModal(false)}>
          <div className="fav-share-modal__box" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2 className="fav-share-modal__title">EMAIL FAVORITES</h2>
            <form onSubmit={handleShareEmailSubmit} className="fav-share-modal__form">
              <div className="fav-share-modal__field">
                <label className="fav-share-modal__label">TO</label>
                <input
                  type="text"
                  required
                  placeholder="Enter email addresses separated by commas"
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  className="fav-share-modal__input"
                  autoFocus
                />
              </div>

              <div className="fav-share-modal__field">
                <label className="fav-share-modal__label">MESSAGE (OPTIONAL)</label>
                <textarea
                  placeholder="Add a personal note..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="fav-share-modal__textarea"
                  rows={3}
                />
              </div>

              <div className="fav-share-modal__actions">
                <button
                  type="button"
                  className="fav-share-modal__btn-cancel"
                  onClick={() => setShowEmailModal(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="fav-share-modal__btn-submit"
                  disabled={isSendingEmail || !recipientEmails.trim()}
                >
                  {isSendingEmail ? 'SENDING…' : 'SEND'}
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
                value={currentPublicUrl}
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
