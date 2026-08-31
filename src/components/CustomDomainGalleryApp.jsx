import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import CollectionList from '../pages/public/CollectionList';
import GalleryView from '../pages/public/GalleryView';
import GalleryFavoritesHub from '../pages/public/GalleryFavoritesHub';
import GallerySelectionDetail from '../pages/public/GallerySelectionDetail';
import GalleryDownloadReady from '../pages/public/GalleryDownloadReady';
import MobileGalleryClient from '../pages/public/MobileGalleryClient';
import MobileGalleryInstall from '../pages/public/MobileGalleryInstall';
import EventGuestRegister from '../pages/public/EventGuestRegister';
import EventGuestGallery from '../pages/public/EventGuestGallery';
import PublicAlbumPreview from '../pages/smart-albums/PublicAlbumPreview';
import PrintStoreApp from '../printstore/PrintStoreApp';
import { galleryService } from '../services/gallery.service';
import { GlobalUploadShell } from './features/CollectionDashboard/Upload/GlobalUploadShell';
import { ErrorBoundary } from './ErrorBoundary';
import { AppLoader } from './ui/AppLoading';

function MobileGalleryViewRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/m/${slug}/pwa`} replace />;
}

function RedirectToGuestRegister() {
  const { slug } = useParams();
  return <Navigate to={`/e/${encodeURIComponent(slug || '')}/register`} replace />;
}

/**
 * Public gallery routes when the visitor opened a photographer custom domain
 * (e.g. gallery.yourdomain.com instead of slug.pixnxt.in).
 */
export function CustomDomainGalleryApp({ hostname }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    galleryService
      .getPhotographerProfileByCustomDomain(hostname)
      .then((found) => {
        if (cancelled) return;
        if (found?.id) {
          setProfile(found);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hostname]);

  const slug =
    profile?.showcase_slug ||
    profile?.display_name ||
    profile?.email?.split('@')[0] ||
    null;

  if (loading) {
    return <AppLoader label="Loading gallery" variant="page" />;
  }

  if (notFound || !profile || !slug) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-2xl font-serif mb-2">Gallery not found</h1>
        <p className="text-gray-500 text-sm">
          This custom domain is not connected yet, or DNS is still propagating.
        </p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<CollectionList slug={slug} photographerProfile={profile} />} />
        <Route path="/gallery/:slug/f" element={<GalleryFavoritesHub />} />
        <Route path="/gallery/:slug/choose" element={<GalleryFavoritesHub />} />
        <Route path="/gallery/:slug/choose/:listId" element={<GallerySelectionDetail />} />
        <Route path="/g/:slug/choose" element={<GalleryFavoritesHub />} />
        <Route path="/g/:slug/choose/:listId" element={<GallerySelectionDetail />} />
        <Route path="/gallery/:slug" element={<GalleryView />} />
        <Route path="/download/:token" element={<GalleryDownloadReady />} />
        <Route path="/m/:slug/pwa" element={<MobileGalleryClient />} />
        <Route path="/m/:slug/view" element={<MobileGalleryViewRedirect />} />
        <Route path="/m/:slug" element={<MobileGalleryInstall />} />
        <Route path="/album-preview/:albumId" element={<PublicAlbumPreview />} />
        <Route path="/printstore" element={<ErrorBoundary><PrintStoreApp /></ErrorBoundary>} />
        <Route path="/e/:slug/register" element={<EventGuestRegister />} />
        <Route path="/e/:slug" element={<RedirectToGuestRegister />} />
        <Route path="/e/:slug/g/:token" element={<EventGuestGallery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalUploadShell />
    </>
  );
}
