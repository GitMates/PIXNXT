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
  
  // Tab states: 'home' | 'favorites'
  const [activeTab, setActiveTab] = useState('home');
  
  // Local storage based favorites list
  const [favorites, setFavorites] = useState([]);

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

        // Load favorites from local storage
        try {
          const saved = localStorage.getItem(`pixnxt_favs_${g.id}`);
          if (saved) {
            setFavorites(JSON.parse(saved));
          }
        } catch (e) {
          console.error('Failed to load favorites', e);
        }

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

  // Inject public-gallery-body class to root document to support transparent scrollbar-free style globally
  useEffect(() => {
    document.documentElement.classList.add('public-gallery-body');
    document.body.classList.add('public-gallery-body');
    return () => {
      document.documentElement.classList.remove('public-gallery-body');
      document.body.classList.remove('public-gallery-body');
    };
  }, []);

  // Sync favorites back to localStorage
  const toggleFavorite = (imgId, e) => {
    if (e) e.stopPropagation();
    if (!gallery) return;
    
    setFavorites((prev) => {
      const updated = prev.includes(imgId) 
        ? prev.filter((id) => id !== imgId) 
        : [...prev, imgId];
      try {
        localStorage.setItem(`pixnxt_favs_${gallery.id}`, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

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
    } catch (_) {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
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
          <div style={{ width: 40, height: 40, border: '3px solid #000000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
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
  const accent = gallery.theme_color || (isDark ? '#ffffff' : '#000000');

  // Fonts theme matching the preset selection
  const fontMapping = {
    echo: "'Inter', sans-serif",
    spring: "'Playfair Display', Georgia, serif",
    lark: "'Outfit', 'Montserrat', sans-serif",
    sage: "'Lora', Georgia, serif"
  };
  const currentFont = fontMapping[gallery.theme_preset] || fontMapping.echo;

  // Filter images for favorites view
  const favoriteImages = images.filter((img) => favorites.includes(img.id));

  // Determine active view list of images
  const activeImagesList = activeTab === 'favorites' ? favoriteImages : images;

  return (
    <div className="public-gallery-body" style={{
      background: isDark ? '#121212' : '#fff',
      color: isDark ? '#eee' : '#111',
      minHeight: '100vh',
      fontFamily: currentFont,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      paddingBottom: 80 // offset bottom navigation bar
    }}>
      


      {/* ── HOME TAB CONTENT ── */}
      {activeTab === 'home' && (
        <>
          {/* App Header / Cover image style */}
          {gallery.cover_style !== 'none' && images.length > 0 && (
            <div style={{
              height: gallery.cover_style === 'full' ? '65vh' : '35vh',
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
                padding: '28px 20px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                color: '#fff'
              }}>
                {gallery.event_date && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{gallery.event_date}</div>}
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{gallery.name}</h1>
              </div>
            </div>
          )}

          {/* Simple Title (if cover style is none) */}
          {gallery.cover_style === 'none' && (
            <div style={{ padding: '40px 24px 20px', textAlign: 'left' }}>
              <h1 style={{ fontSize: 28, fontWeight: 400, color: isDark ? '#fff' : '#111', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.02em', fontFamily: 'inherit' }}>{gallery.name}</h1>
              <hr style={{ border: 'none', height: '1px', backgroundColor: isDark ? '#333' : '#dbdbdb', width: '60px', margin: '0 0 16px 0', padding: 0 }} />
              {gallery.event_date && <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>{gallery.event_date}</div>}
            </div>
          )}

          {/* Photos Grid */}
          <div style={{ padding: '0 24px 24px 24px', flex: 1 }}>
            {images.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: '#888' }}>
                No photos loaded in app yet.
              </div>
            ) : gallery.grid_style === 'horizontal' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                {images.map((img, index) => {
                  const isFav = favorites.includes(img.id);
                  return (
                    <div
                      key={img.id}
                      style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', background: '#eaeaea', position: 'relative' }}
                      onClick={() => setViewerIndex(index)}
                    >
                      <img src={img.thumbnail_url || img.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      {/* Floating favorite heart button */}
                      <button
                        onClick={(e) => toggleFavorite(img.id, e)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(0, 0, 0, 0.45)',
                          border: 'none',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: isFav ? accent : '#fff',
                          transition: 'color 0.15s, background-color 0.15s'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isFav ? accent : 'none'} stroke={isFav ? accent : '#fff'} strokeWidth="2.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ columnCount: 2, columnGap: 4 }}>
                {images.map((img, index) => {
                  const isFav = favorites.includes(img.id);
                  return (
                    <div
                      key={img.id}
                      style={{
                        breakInside: 'avoid',
                        marginBottom: 4,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#eaeaea',
                        borderRadius: 0,
                        position: 'relative'
                      }}
                      onClick={() => setViewerIndex(index)}
                    >
                      <img
                        src={img.thumbnail_url || img.original_url}
                        alt=""
                        style={{ width: '100%', display: 'block', height: 'auto' }}
                      />
                      
                      {/* Floating favorite heart button */}
                      <button
                        onClick={(e) => toggleFavorite(img.id, e)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(0, 0, 0, 0.45)',
                          border: 'none',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: isFav ? accent : '#fff',
                          transition: 'color 0.15s, background-color 0.15s'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isFav ? accent : 'none'} stroke={isFav ? accent : '#fff'} strokeWidth="2.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FAVORITES TAB CONTENT ── */}
      {activeTab === 'favorites' && (
        <div style={{ flex: 1, padding: 8 }}>
          <div style={{ padding: '24px 12px 16px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: isDark ? '#fff' : '#111' }}>My Favorites</h2>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>A curated list of your favorite photos</p>
          </div>

          {favoriteImages.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: isDark ? '#222' : '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: '#aaa'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>No favorites yet</span>
              <span style={{ fontSize: 11, color: '#888', marginTop: 4, maxWidth: 220, lineHeight: 1.4 }}>Tap the heart icon on any photo in the home tab to add it here.</span>
            </div>
          ) : gallery.grid_style === 'horizontal' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
              {favoriteImages.map((img, index) => {
                return (
                  <div
                    key={img.id}
                    style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', background: '#eaeaea', position: 'relative' }}
                    onClick={() => setViewerIndex(index)}
                  >
                    <img src={img.thumbnail_url || img.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    
                    <button
                      onClick={(e) => toggleFavorite(img.id, e)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: accent
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={accent} stroke={accent} strokeWidth="2.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ columnCount: 2, columnGap: 4 }}>
              {favoriteImages.map((img, index) => {
                return (
                  <div
                    key={img.id}
                    style={{
                      breakInside: 'avoid',
                      marginBottom: 4,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: '#eaeaea',
                      borderRadius: 0,
                      position: 'relative'
                    }}
                    onClick={() => setViewerIndex(index)}
                  >
                    <img
                      src={img.thumbnail_url || img.original_url}
                      alt=""
                      style={{ width: '100%', display: 'block', height: 'auto' }}
                    />
                    
                    <button
                      onClick={(e) => toggleFavorite(img.id, e)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: accent
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={accent} stroke={accent} strokeWidth="2.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CTA Button (if enabled) ── */}
      {gallery.cta_enabled && gallery.cta_url && (
        <div style={{ position: 'fixed', bottom: 76, left: 16, right: 16, zIndex: 90 }}>
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
              fontSize: 13,
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

      {/* Footer Powered Info */}
      <footer style={{
        padding: '36px 20px 48px',
        textAlign: 'center',
        borderTop: isDark ? '1px solid #222' : '1px solid #eee',
        fontSize: 11,
        color: '#888'
      }}>
        <div>Powered by PIXNXT Mobile Gallery</div>
      </footer>

      {/* ── STICKY BOTTOM TAB NAVIGATION BAR ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: isDark ? '#1a1a1a' : '#ffffff',
        borderTop: isDark ? '1px solid #2a2a2a' : '1px solid #eaeaea',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 999
      }}>
        {/* Home Tab */}
        <button
          onClick={() => setActiveTab('home')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 'home' ? accent : '#888',
            padding: '12px 16px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>

        {/* Favorites Tab */}
        <button
          onClick={() => setActiveTab('favorites')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 'favorites' ? accent : '#888',
            padding: '12px 16px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>

        {/* Share App Trigger */}
        <button
          onClick={handleShareApp}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            padding: '12px 16px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>

        {/* Contact sheet trigger */}
        <button
          onClick={() => setShowContact(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: showContact ? accent : '#888',
            padding: '12px 16px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path d="M6 19.5a7 7 0 0 1 12 0"/>
          </svg>
        </button>
      </div>

      {/* ── FULL-SCREEN RESPONSIVE SWIPEABLE VIEWER MODAL ── */}
      {viewerIndex !== null && activeImagesList.length > 0 && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Top Navigation Row inside viewer */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            zIndex: 10010
          }}>
            <button
              onClick={() => setViewerIndex(null)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: 4 }}
            >
              ×
            </button>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {viewerIndex + 1} / {activeImagesList.length}
            </div>
            
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* Heart toggle inside fullscreen viewer */}
              <button
                onClick={() => toggleFavorite(activeImagesList[viewerIndex].id)}
                style={{ background: 'none', border: 'none', color: favorites.includes(activeImagesList[viewerIndex].id) ? accent : '#fff', cursor: 'pointer', padding: 4 }}
                title="Favorite"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={favorites.includes(activeImagesList[viewerIndex].id) ? accent : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>

              <button
                onClick={() => handleDownloadImage(activeImagesList[viewerIndex])}
                style={{ background: 'none', border: 'none', color: '#fff', padding: 4, cursor: 'pointer' }}
                title="Download Photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Swipe navigation wrappers */}
          <div style={{ width: '100%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {viewerIndex > 0 && (
              <button
                onClick={() => setViewerIndex(viewerIndex - 1)}
                style={{ position: 'absolute', left: 12, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, zIndex: 10 }}
              >
                ‹
              </button>
            )}

            <img
              src={activeImagesList[viewerIndex].original_url}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />

            {viewerIndex < activeImagesList.length - 1 && (
              <button
                onClick={() => setViewerIndex(viewerIndex + 1)}
                style={{ position: 'absolute', right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, zIndex: 10 }}
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 12000, display: 'flex', alignItems: 'flex-end' }}
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
            {/* Top Drag Bar mockup */}
            <div style={{ width: 36, height: 4, background: '#888', borderRadius: 2, margin: '0 auto 16px' }} />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, fontFamily: currentFont }}>Contact Photographer</h3>
            
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
