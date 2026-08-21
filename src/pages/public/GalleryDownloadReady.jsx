import React, { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GalleryDownloadPopup from '@/components/features/Gallery/GalleryDownloadPopup/GalleryDownloadPopup';
import '@/components/features/Gallery/GalleryDownloadPopup/GalleryDownloadPopup.css';

export default function GalleryDownloadReady() {
  const { token } = useParams();
  const navigate = useNavigate();

  const handleBack = useCallback(
    (job) => {
      const slug = job?.collectionSlug;
      if (slug) {
        navigate(`/gallery/${encodeURIComponent(slug)}`);
        return;
      }
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate('/');
    },
    [navigate]
  );

  return (
    <div className="gallery-dl-popup-page">
      <GalleryDownloadPopup token={token} showBack onBack={handleBack} />
    </div>
  );
}
