import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useScroll, useTransform, AnimatePresence, motion } from 'framer-motion';
import * as Covers from '../../components/features/CollectionDashboard/PreviewPane/CoverStyles';
import { GalleryHeader } from '../../components/features/Gallery/GalleryHeader/GalleryHeader';
import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../components/features/Gallery/PhotoLightbox/PhotoLightbox';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';
import { Container } from '../../components/ui/Container';
import { Typography } from '../../components/ui/Typography';
import { X, Mail, Lock, Share2, Link as LinkIcon, Download } from 'lucide-react';

const GalleryView = () => {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [downloadStep, setDownloadStep] = useState('pin');
  const [downloadSize, setDownloadSize] = useState('high');
  const [activeSetId, setActiveSetId] = useState(null);

  const handleDownloadClick = () => {
    if (collection?.download_pin_required) {
      setDownloadStep('pin');
    } else {
      setDownloadStep('size');
    }
    setShowDownloadModal(true);
  };

  const galleryRef = useRef(null);
  const [searchParams] = useSearchParams();
  const previewCoverStyle = searchParams.get('coverStyle');

  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [600, 800], [0, 1]);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const data = await galleryService.getCollectionBySlug(slug);

        if (!data) {
          setError('Collection not found');
          return;
        }

        setCollection(data);

        if (data.photographer_id) {
          const p = await galleryService.getPhotographerProfile(data.photographer_id);
          setPhotographer(p);
        }
      } catch (err) {
        console.error('Gallery Fetch Error:', err);
        setError(err.message || 'An error occurred while loading the gallery');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchGallery();
  }, [slug]);

  // Slideshow Logic
  useEffect(() => {
    let interval;
    if (isSlideshowActive && lightboxIndex !== -1) {
      interval = setInterval(() => {
        setLightboxIndex((prev) => (prev + 1) % (collection.photos?.length || 1));
      }, 4000); // 4 seconds per slide
    }
    return () => clearInterval(interval);
  }, [isSlideshowActive, lightboxIndex, collection]);

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartSlideshow = () => {
    setLightboxIndex(0);
    setIsSlideshowActive(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';

      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();

      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return `${month} ${getOrdinal(day)}, ${year}`.toUpperCase();
    } catch (e) {
      return '';
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-sm font-bold tracking-[0.6em] uppercase text-zinc-200 animate-pulse">
        PIXNXT
      </div>
    </div>
  );

  if (error || !collection) return (
    <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-white">
      <Typography variant="h2" className="mb-4">Gallery Not Found</Typography>
      <Typography variant="muted" className="mb-8">The collection you are looking for does not exist or is private.</Typography>
      <a href="/" className="text-[10px] font-bold underline uppercase tracking-[0.4em]">Back to Home</a>
    </div>
  );

  const filteredPhotos = activeSetId 
    ? (collection.photos || []).filter(p => p.set_id === activeSetId)
    : (collection.photos || []);

  const photoUrls = filteredPhotos.map(p => p.full_url || p.web_url || p.thumbnail_url);

  return (
    <div className={cn("min-h-screen transition-colors duration-500", `theme-${collection.color_palette || 'light'}`, `font-${collection.font_family || 'sans'}`)} style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
      {/* Hero Section */}
      <div className="w-full h-[100dvh] [&>div]:!h-full">
        {(() => {
          const props = {
            title: collection.name,
            date: formatDate(collection.event_date || collection.created_at),
            photoUrl: collection.cover_url || (collection.photos?.[0]?.web_url),
            onViewGallery: scrollToGallery
          };

          const activeCoverStyle = previewCoverStyle || collection.cover_style;
          switch (activeCoverStyle) {
            case 'center': return <Covers.CenterCover {...props} />;
            case 'left': return <Covers.LeftCover {...props} />;
            case 'novel': return <Covers.NovelCover {...props} />;
            case 'vintage': return <Covers.VintageCover {...props} />;
            case 'frame': return <Covers.FrameCover {...props} />;
            case 'stripe': return <Covers.StripeCover {...props} />;
            case 'divider': return <Covers.DividerCover {...props} />;
            case 'journal': return <Covers.JournalCover {...props} />;
            case 'stamp': return <Covers.StampCover {...props} />;
            case 'outline': return <Covers.OutlineCover {...props} />;
            case 'classic': return <Covers.ClassicCover {...props} />;
            default: return <Covers.NovelCover {...props} />;
          }
        })()}
      </div>

      {/* Sticky Header */}
      <GalleryHeader
        title={collection.name}
        opacity={headerOpacity}
        isDark={collection.color_palette === 'dark'}
        onSlideshow={handleStartSlideshow}
        onFavorite={() => setShowFavoriteModal(true)}
        onDownload={handleDownloadClick}
        onShare={() => setShowShareModal(true)}
      />

      {/* Main Gallery Content */}
      <main ref={galleryRef} className="py-24" style={{ backgroundColor: 'var(--gallery-bg)' }}>
        <Container>
          {/* Sets Navigation - Minimal Nova Style */}
          <div className="mb-16 flex items-center justify-center gap-12">
            <button 
              className="group relative py-2"
              onClick={() => setActiveSetId(null)}
            >
              <Typography variant="label" className={cn("transition-opacity", !activeSetId ? "opacity-100" : "opacity-50 hover:opacity-100")} style={{ color: 'var(--gallery-text)' }}>
                Highlights
              </Typography>
              {!activeSetId && <div className="absolute bottom-0 left-0 h-[1.5px] w-full scale-x-100 transition-transform origin-left" style={{ backgroundColor: 'var(--gallery-text)' }} />}
            </button>
            {(collection.sets || []).map((set) => (
              <button 
                key={set.id} 
                className="group relative py-2"
                onClick={() => setActiveSetId(set.id)}
              >
                <Typography variant="label" className={cn("transition-opacity", activeSetId === set.id ? "opacity-100" : "opacity-50 hover:opacity-100")} style={{ color: 'var(--gallery-text)' }}>
                  {set.name}
                </Typography>
                {activeSetId === set.id && <div className="absolute bottom-0 left-0 h-[1.5px] w-full scale-x-100 transition-transform origin-left" style={{ backgroundColor: 'var(--gallery-text)' }} />}
              </button>
            ))}
          </div>

          {/* Flexible Gallery Grid */}
          <MasonryGrid
            photos={filteredPhotos}
            gridSettings={{
              style: collection.grid_style || 'vertical',
              size: collection.thumbnail_size || 'regular',
              spacing: collection.grid_spacing || 'regular',
              aspectRatio: collection.aspect_ratio || 'original'
            }}
            onImageClick={(index) => setLightboxIndex(index)}
            onFavorite={() => setShowFavoriteModal(true)}
            onDownload={handleDownloadClick}
            onShare={() => setShowShareModal(true)}
          />
        </Container>
      </main>

      {/* Global Footer Branding */}
      <footer className="mt-12 border-t py-8" style={{ borderTopColor: 'rgba(0,0,0,0.05)', backgroundColor: 'var(--gallery-bg)' }}>
        <Container>
          <div className="text-center">
            <Typography variant="label" style={{ color: 'var(--gallery-meta-text)', opacity: 0.5 }}>© {new Date().getFullYear()} PIXNXT. All Rights Reserved.</Typography>
          </div>
        </Container>
      </footer>

      {/* Lightbox */}
      <PhotoLightbox
        isOpen={lightboxIndex !== -1}
        onClose={() => {
          setLightboxIndex(-1);
          setIsSlideshowActive(false);
        }}
        images={photoUrls}
        currentIndex={lightboxIndex}
        onNext={() => setLightboxIndex((prev) => (prev + 1) % photoUrls.length)}
        onPrev={() => setLightboxIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length)}
        isSlideshowActive={isSlideshowActive}
        onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
        onFavorite={() => setShowFavoriteModal(true)}
        onDownload={() => {
          setDownloadStep('pin');
          setShowDownloadModal(true);
        }}
        onShare={() => setShowShareModal(true)}
      />

      {/* Favorite Modal */}
      <AnimatePresence>
        {showFavoriteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFavoriteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-md bg-white p-10 shadow-2xl"
            >
              <button
                onClick={() => setShowFavoriteModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Mail className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900">Favorites</h3>
                <p className="text-sm text-zinc-500">Save your favorite photos and revisit them at any time using your email address.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-zinc-200 py-3 text-sm outline-none focus:border-zinc-950 transition-colors"
                />
                <button
                  className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors"
                  onClick={() => setShowFavoriteModal(false)}
                >
                  Go to Favorites
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Download Modal */}
      <AnimatePresence>
        {showDownloadModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-md bg-white p-10 shadow-2xl"
            >
              <button
                onClick={() => setShowDownloadModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors"
              >
                <X size={20} />
              </button>

              {downloadStep === 'pin' ? (
                <>
                  <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                      <Lock className="text-zinc-400" size={24} strokeWidth={1.5} />
                    </div>
                    <h3 className="mb-2 text-xl font-serif text-zinc-900">Download Photos</h3>
                    <p className="text-sm text-zinc-500">Please enter the 4-digit PIN provided by your photographer to start the download.</p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter Download PIN"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full border-b border-zinc-200 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-zinc-950 transition-colors"
                    />
                    <button
                      className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors"
                      onClick={() => {
                        if (pin === (collection?.download_pin || '1234')) {
                          setDownloadStep('size');
                        } else {
                          alert('Incorrect PIN. Please try again.');
                        }
                      }}
                    >
                      Verify PIN
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                      <Download className="text-zinc-400" size={24} strokeWidth={1.5} />
                    </div>
                    <h3 className="mb-2 text-xl font-serif text-zinc-900">Choose Download Size</h3>
                    <p className="text-sm text-zinc-500">Select the resolution you would like to download.</p>
                  </div>

                  <div className="space-y-4">
                    <button
                      className={cn(
                        "w-full py-4 px-6 flex items-center justify-between border cursor-pointer transition-all",
                        downloadSize === 'high' ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 bg-white"
                      )}
                      onClick={() => setDownloadSize('high')}
                    >
                      <div className="text-left">
                        <div className="text-sm font-bold text-zinc-900">High Resolution</div>
                        <div className="text-xs text-zinc-500">Best for printing (3600px)</div>
                      </div>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", downloadSize === 'high' ? "border-zinc-950" : "border-zinc-300")}>
                        {downloadSize === 'high' && <div className="w-2 h-2 rounded-full bg-zinc-950" />}
                      </div>
                    </button>
                    
                    <button
                      className={cn(
                        "w-full py-4 px-6 flex items-center justify-between border cursor-pointer transition-all mt-3",
                        downloadSize === 'web' ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 bg-white"
                      )}
                      onClick={() => setDownloadSize('web')}
                    >
                      <div className="text-left">
                        <div className="text-sm font-bold text-zinc-900">Web Size</div>
                        <div className="text-xs text-zinc-500">Best for sharing (2048px)</div>
                      </div>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", downloadSize === 'web' ? "border-zinc-950" : "border-zinc-300")}>
                        {downloadSize === 'web' && <div className="w-2 h-2 rounded-full bg-zinc-950" />}
                      </div>
                    </button>

                    <button
                      className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors mt-6"
                      onClick={() => setShowDownloadModal(false)}
                    >
                      Start Download
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-md bg-white p-10 shadow-2xl"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Share2 className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900">Share Collection</h3>
                <p className="text-sm text-zinc-500">Share these memories with family and friends.</p>
              </div>

              <div className="flex justify-center gap-6 mb-8">
                <button className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Facebook</span>
                </button>
                <button className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">X</span>
                </button>
                <button className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white">
                    <Mail size={20} />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Email</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                  <span className="bg-white px-4">Or copy link</span>
                </div>
              </div>

              <div className="mt-6 flex border border-zinc-200 rounded overflow-hidden p-1">
                <input 
                  type="text" 
                  readOnly 
                  value={window.location.origin + "/gallery/" + (collection?.slug || '')} 
                  className="flex-1 px-3 text-sm text-zinc-500 outline-none bg-zinc-50"
                />
                <button className="bg-zinc-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors rounded-sm flex items-center gap-2">
                  <LinkIcon size={14} />
                  Copy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function FooterLink({ href, children }) {
  return (
    <a
      href={href}
      className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-colors"
    >
      {children}
    </a>
  );
}

export default GalleryView;
