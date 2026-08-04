import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import CollectionList from '../pages/public/CollectionList';
import GalleryView from '../pages/public/GalleryView';
import GalleryFavoritesHub from '../pages/public/GalleryFavoritesHub';
import MobileGalleryClient from '../pages/public/MobileGalleryClient';
import MobileGalleryInstall from '../pages/public/MobileGalleryInstall';
import PublicAlbumPreview from '../pages/smart-albums/PublicAlbumPreview';
import { galleryService } from '../services/gallery.service';
import { GlobalUploadShell } from './features/CollectionDashboard/Upload/GlobalUploadShell';

function MobileGalleryViewRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/m/${slug}/pwa`} replace />;
}

/**
 * Public gallery routes when the visitor opened a photographer custom domain
 * (e.g. gallery.yourdomain.com instead of slug.pixnxt.in).
 */
export function CustomDomainGalleryApp({ hostname }) {
  const [slug, setSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    galleryService
      .getPhotographerProfileByCustomDomain(hostname)
      .then((profile) => {
        if (cancelled) return;
        if (profile?.showcase_slug || profile?.display_name) {
          setSlug(
            profile.showcase_slug ||
              profile.display_name ||
              profile.email?.split('@')[0] ||
              null
          );
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

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (notFound || !slug) {
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
        <Route path="/" element={<CollectionList slug={slug} />} />
        <Route path="/gallery/:slug/f" element={<GalleryFavoritesHub />} />
        <Route path="/gallery/:slug" element={<GalleryView />} />
        <Route path="/m/:slug/pwa" element={<MobileGalleryClient />} />
        <Route path="/m/:slug/view" element={<MobileGalleryViewRedirect />} />
        <Route path="/m/:slug" element={<MobileGalleryInstall />} />
        <Route path="/album-preview/:albumId" element={<PublicAlbumPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalUploadShell />
    </>
  );
}
