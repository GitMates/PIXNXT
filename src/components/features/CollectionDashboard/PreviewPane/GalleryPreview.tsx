import React, { useState, useEffect } from 'react';
import { GalleryPreviewProps } from './PreviewPane.types';
import * as Covers from './CoverStyles';
import { cn } from '../../../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, Lock, Share2, Link as LinkIcon, Download } from 'lucide-react';

export const GalleryPreview: React.FC<GalleryPreviewProps> = ({
  settings,
  collectionTitle,
  collectionDate,
  coverPhotoUrl,
  gridPhotos,
  dashboardState
}) => {
  const [dynamicAspectRatios, setDynamicAspectRatios] = useState<Record<string, number>>({});

  useEffect(() => {
    gridPhotos.forEach(photo => {
      if (!photo.width || !photo.height) {
        const img = new Image();
        img.onload = () => {
          setDynamicAspectRatios(prev => ({ ...prev, [photo.id || photo.full_url]: img.width / img.height }));
        };
        img.src = photo.full_url;
      }
    });
  }, [gridPhotos]);
  const { coverStyle, fontFamily, colorPalette, grid } = settings;

  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [downloadStep, setDownloadStep] = useState('pin');
  const [downloadSize, setDownloadSize] = useState('high');

  const handleDownloadClick = () => {
    if (dashboardState?.downloadPin) {
      setDownloadStep('pin');
    } else {
      setDownloadStep('size');
    }
    setShowDownloadModal(true);
  };

  const renderCover = () => {
    const props = {
      title: collectionTitle,
      date: collectionDate,
      photoUrl: coverPhotoUrl,
    };

    switch (coverStyle) {
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
      case 'none': return null;
      default: return <Covers.NovelCover {...props} />;
    }
  };

  return (
    <div className={cn(
      'cd-preview-gallery-card',
      `style-${coverStyle}`,
      `font-${fontFamily}`,
      `theme-${colorPalette}`
    )}>
      <div className="cd-preview-gallery-header">
        {renderCover()}
      </div>

      <div className={cn(
        'cd-preview-gallery-body',
        `grid-style-${grid.style}`,
        `grid-size-${grid.size}`,
        `grid-spacing-${grid.spacing}`,
        `nav-style-${grid.navigation}`,
        `aspect-${grid.aspectRatio}`
      )}>
        <div className="gallery-meta-bar">
          <div className="meta-left">
            <div className="collection-nav-mock">
              <span className="nav-item active">
                {collectionTitle.toUpperCase()}
              </span>
              {(dashboardState?.sets || []).slice(0, 3).map((set: any) => (
                <span key={set.id} className="nav-item">
                  {set.name.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <div className="meta-right">
            {dashboardState?.favoritePhotos !== false && (
              <div className="meta-icon-item" onClick={() => setShowFavoriteModal(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                {grid.navigation === 'text' && <span>Favorite</span>}
              </div>
            )}
            {dashboardState?.photoDownload !== false && (
              <div className="meta-icon-item" onClick={handleDownloadClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                {grid.navigation === 'text' && <span>Download</span>}
              </div>
            )}
            {dashboardState?.socialSharing !== false && (
              <div className="meta-icon-item" onClick={() => setShowShareModal(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                {grid.navigation === 'text' && <span>Share</span>}
              </div>
            )}
          </div>
        </div>

        <div
          className={cn("gallery-preview-grid", grid.style === 'horizontal' && "items-start")}
          style={{
            '--grid-gap': grid.spacing === 'none' ? '0px'
              : grid.spacing === 'small' ? '4px'
                : grid.spacing === 'regular' ? '12px'
                  : '24px',
            display: grid.style === 'horizontal' ? 'flex' : 'block',
            flexWrap: grid.style === 'horizontal' ? 'wrap' : 'initial'
          } as React.CSSProperties}
        >
          {gridPhotos.map((photo, i) => {
            const photoKey = photo.id || photo.full_url;
            const aspectRatio = (photo.width && photo.height)
              ? (photo.width / photo.height)
              : (dynamicAspectRatios[photoKey] || 1.5);
            // Reduce row heights significantly for the preview pane to simulate multiple columns
            const rowHeight = grid.size === 'large' ? 240 : grid.size === 'regular' ? 140 : grid.size === 'small' ? 90 : 60;

            return (
              <div
                key={photoKey}
                className={cn('gallery-grid-item', `item-${i}`)}
                style={grid.style === 'horizontal' ? {
                  flexGrow: aspectRatio,
                  flexBasis: `${rowHeight * aspectRatio}px`,
                  width: `${rowHeight * aspectRatio}px`, // Use width instead of height to allow proportional scaling
                  minWidth: '50px'
                } : {
                  breakInside: 'avoid',
                  marginBottom: 'var(--grid-gap)'
                }}
              >
                <img
                  src={photo.full_url}
                  alt={`Photo ${i + 1}`}
                  style={grid.style === 'horizontal' ? {
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  } : {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <div className="item-hover-overlay">
                  <div className="hover-center flex gap-2">
                    <div className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors" onClick={(e) => { e.stopPropagation(); handleDownloadClick(); }}>
                      <Download size={20} color="white" />
                    </div>
                    <div className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors" onClick={(e) => { e.stopPropagation(); setShowFavoriteModal(true); }}>
                      <svg className="heart-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showFavoriteModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
              style={{ fontFamily: 'var(--font-sans)', color: '#111' }}
            >
              <button
                onClick={() => setShowFavoriteModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Mail className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900" style={{ fontFamily: 'var(--font-serif)' }}>Favorites</h3>
                <p className="text-sm text-zinc-500">Save your favorite photos and revisit them at any time using your email address.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-zinc-200 py-3 text-sm outline-none focus:border-zinc-950 transition-colors bg-transparent"
                  style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                />
                <button
                  className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors border-none cursor-pointer mt-4"
                  onClick={() => setShowFavoriteModal(false)}
                >
                  Go to Favorites
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDownloadModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
              style={{ fontFamily: 'var(--font-sans)', color: '#111' }}
            >
              <button
                onClick={() => setShowDownloadModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>

              {downloadStep === 'pin' ? (
                <>
                  <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                      <Lock className="text-zinc-400" size={24} strokeWidth={1.5} />
                    </div>
                    <h3 className="mb-2 text-xl font-serif text-zinc-900" style={{ fontFamily: 'var(--font-serif)' }}>Download Photos</h3>
                    <p className="text-sm text-zinc-500">Please enter the 4-digit PIN provided by your photographer to start the download.</p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter Download PIN"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full border-b border-zinc-200 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-zinc-950 transition-colors bg-transparent"
                      style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                    />
                    <button
                      className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors border-none cursor-pointer mt-4"
                      onClick={() => {
                        if (pin === (dashboardState?.pinValue || '1234')) {
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
                    <h3 className="mb-2 text-xl font-serif text-zinc-900" style={{ fontFamily: 'var(--font-serif)' }}>Choose Download Size</h3>
                    <p className="text-sm text-zinc-500">Select the resolution you would like to download.</p>
                  </div>

                  <div className="space-y-4">
                    {(dashboardState?.photoDownloadSizes?.includes('high') ?? true) && (
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
                    )}

                    {(dashboardState?.photoDownloadSizes?.includes('web') ?? true) && (
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
                    )}

                    <button
                      className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors border-none cursor-pointer mt-6"
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
              style={{ fontFamily: 'var(--font-sans)', color: '#111' }}
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Share2 className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900" style={{ fontFamily: 'var(--font-serif)' }}>Share Collection</h3>
                <p className="text-sm text-zinc-500">Share these memories with family and friends.</p>
              </div>

              <div className="flex justify-center gap-6 mb-8">
                <button className="flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Facebook</span>
                </button>
                <button className="flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">X</span>
                </button>
                <button className="flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
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
                  value={window.location.origin + "/gallery/" + (dashboardState?.collection?.slug || 'preview')}
                  className="flex-1 px-3 text-sm text-zinc-500 outline-none bg-zinc-50 border-none"
                />
                <button className="bg-zinc-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors border-none cursor-pointer rounded-sm flex items-center gap-2">
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
