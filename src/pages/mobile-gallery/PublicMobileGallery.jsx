import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import './MobileGallery.css';

const PublicMobileGallery = () => {
  const { slug } = useParams();

  const [gallery, setGallery] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Full-screen swipeable viewer states
  const [viewerIndex, setViewerIndex] = useState(null);
  
  // Custom contact details modal
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const loadPublicApp = async () => {
      try {
        setLoading(true);
        const g = await mobileGalleryService.getGalleryBySlug(slug);
        setGallery(g);
        
        const imgs = await mobileGalleryService.getImages(g.id);
        setImages(imgs);

        // Proactively record anonymous view analytics event
        mobileGalleryService.recordView(g.id);
      } catch (err) {
        console.error(err);
        setError('This app could not be found or has been unpublished by the photographer.');
      } finally {
        setLoading(false);
      }
    };
    if (slug) loadPublicApp();
  }, [slug]);

  const handleShareApp = async () => {
    if (!gallery) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: gallery.name,
          text: `Check out the mobile photo gallery app: ${gallery.name}!`,
          url: url,
        });
        mobileGalleryService.recordShare(gallery.id, 'whatsapp');
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        mobileGalleryService.recordShare(gallery.id, 'copy');
      }
    } catch (_) {}
  };

  const handleDownloadImage = async (img) => {
    if (!gallery) return;
    try {
      mobileGalleryService.recordDownload(gallery.id, img.id);
      const res = await fetch(img.original_url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = img.file_name || 'photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (_) {
      window.open(img.original_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #8BDFDD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <span>Opening Photo App...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fff', color: '#555', fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
        <div>
          <svg style={{ color: '#ccc', marginBottom: 16 }} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 8 }}>App Offline</h2>
          <p style={{ fontSize: 14, margin: '0 auto', maxWidth: 300, lineHeight: 1.5 }}>{error || 'This gallery is currently unavailable.'}</p>
        </div>
      </div>
    );
  }

  const isDark = gallery.color_theme === 'dark';
  const accent = gallery.theme_color || '#8BDFDD';

  return (
    <div style={{
      background: isDark ? '#111' : '#fff',
      color: isDark ? '#eee' : '#111',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* ── Standalone App Top bar ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: isDark ? '1px solid #222' : '1px solid #eee',
        position: 'sticky',
        top: 0,
        background: isDark ? '#111' : '#fff',
        zIndex: 100
      }}>
        {/* Photographer Profile branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setShowContact(true)}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: accent,
            color: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13
          }}>
            {gallery.photographer_name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>{gallery.photographer_name || 'Photographer'}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Tap to contact</div>
          </div>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleShareApp}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#ccc' : '#555', padding: 6 }}
            title="Share App"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </header>

      {/* ── App Header / Cover image style ── */}
      {gallery.cover_style !== 'none' && images.length > 0 && (
        <div style={{
          height: gallery.cover_style === 'full' ? '60vh' : '30vh',
          position: 'relative',
          overflow: 'hidden',
          background: '#000'
        }}>
          <img
            src={images[0].original_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px 20px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
            color: '#fff'
          }}>
            {gallery.event_date && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{gallery.event_date}</div>}
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{gallery.name}</h1>
          </div>
        </div>
      )}

      {/* ── Simple Title (if cover style is none) ── */}
      {gallery.cover_style === 'none' && (
        <div style={{ padding: '36px 20px 16px', textAlign: 'center' }}>
          {gallery.event_date && <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{gallery.event_date}</div>}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#fff' : '#111', margin: 0 }}>{gallery.name}</h1>
        </div>
      )}

      {/* ── Photo Grid Experience ── */}
      <div style={{ padding: 8, flex: 1 }}>
        {images.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#888' }}>
            No photos loaded in app yet.
          </div>
        ) : gallery.grid_style === 'horizontal' ? (
          /* Horizontal grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
            {images.map((img, index) => (
              <div
                key={img.id}
                style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', background: '#eaeaea' }}
                onClick={() => setViewerIndex(index)}
              >
                <img src={img.thumbnail_url || img.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        ) : (
          /* Pinterest Masonry layout */
          <div style={{ columnCount: 2, columnGap: 4 }}>
            {images.map((img, index) => (
              <div
                key={img.id}
                style={{
                  breakInside: 'avoid',
                  marginBottom: 4,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: '#eaeaea',
                  borderRadius: 4
                }}
                onClick={() => setViewerIndex(index)}
              >
                <img
                  src={img.thumbnail_url || img.original_url}
                  alt=""
                  style={{ width: '100%', display: 'block', height: 'auto' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CTA Button (if enabled) ── */}
      {gallery.cta_enabled && gallery.cta_url && (
        <div style={{ position: 'sticky', bottom: 16, left: 16, right: 16, padding: '0 16px', zIndex: 90 }}>
          <a
            href={gallery.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              background: accent,
              color: '#111',
              textDecoration: 'none',
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 32,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              letterSpacing: '0.01em'
            }}
          >
            {gallery.cta_text || 'Book Session'}
          </a>
        </div>
      )}

      {/* ── PWA Installation / Footer Prompts ── */}
      <footer style={{
        padding: '36px 20px 80px',
        textAlign: 'center',
        borderTop: isDark ? '1px solid #222' : '1px solid #eee',
        fontSize: 12,
        color: '#888'
      }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => alert('To install this app on your phone:\n\n1. Tap the Share button in your browser.\n2. Select "Add to Home Screen".')}
            style={{
              background: isDark ? '#222' : '#f0f0f0',
              border: 'none',
              color: isDark ? '#ccc' : '#333',
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Install Mobile App
          </button>
        </div>
        <div>Powered by PIXNXT Mobile Gallery</div>
      </footer>

      {/* ── FULL-SCREEN RESPONSIVE SWIPEABLE VIEWER MODAL ── */}
      {viewerIndex !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Top navigation row */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            zIndex: 1010
          }}>
            <button
              onClick={() => setViewerIndex(null)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}
            >
              ×
            </button>
            <div style={{ color: '#fff', fontSize: 13 }}>
              {viewerIndex + 1} / {images.length}
            </div>
            <button
              onClick={() => handleDownloadImage(images[viewerIndex])}
              style={{ background: 'none', border: 'none', color: '#fff', padding: 6, cursor: 'pointer' }}
              title="Download Photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>

          {/* Swipe navigation wrappers */}
          <div style={{ width: '100%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {viewerIndex > 0 && (
              <button
                onClick={() => setViewerIndex(viewerIndex - 1)}
                style={{ position: 'absolute', left: 12, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}
              >
                ‹
              </button>
            )}

            <img
              src={images[viewerIndex].original_url}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />

            {viewerIndex < images.length - 1 && (
              <button
                onClick={() => setViewerIndex(viewerIndex + 1)}
                style={{ position: 'absolute', right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Photographer Contact Info Modal Sheet ── */}
      {showContact && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowContact(false)}
        >
          <div
            style={{
              width: '100%',
              background: isDark ? '#1e1e1e' : '#fff',
              color: isDark ? '#fff' : '#111',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 40px',
              animation: 'slideUp 0.25s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag bar mockup */}
            <div style={{ width: 36, height: 4, background: '#888', borderRadius: 2, margin: '0 auto 16px' }} />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Contact Photographer</h3>
            
            {gallery.photographer_name && <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{gallery.photographer_name}</div>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {gallery.photographer_email && (
                <a href={`mailto:${gallery.photographer_email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: accent, textDecoration: 'none', fontSize: 14 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {gallery.photographer_email}
                </a>
              )}
              {gallery.photographer_phone && (
                <a href={`tel:${gallery.photographer_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: accent, textDecoration: 'none', fontSize: 14 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {gallery.photographer_phone}
                </a>
              )}
              {gallery.photographer_instagram && (
                <a href={`https://instagram.com/${gallery.photographer_instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, color: accent, textDecoration: 'none', fontSize: 14 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  {gallery.photographer_instagram}
                </a>
              )}
              {gallery.photographer_website && (
                <a href={gallery.photographer_website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, color: accent, textDecoration: 'none', fontSize: 14 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Visit Website
                </a>
              )}
            </div>
            
            <button
              onClick={() => setShowContact(false)}
              style={{
                marginTop: 28,
                width: '100%',
                background: isDark ? '#2b2b2b' : '#f0f0f0',
                border: 'none',
                color: isDark ? '#fff' : '#111',
                padding: '12px 0',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default PublicMobileGallery;
