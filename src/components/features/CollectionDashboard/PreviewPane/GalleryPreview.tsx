import React, { useState } from 'react';
import { GalleryPreviewProps } from './PreviewPane.types';
import * as Covers from './CoverStyles';
import { cn } from '../../../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, Share2, Link as LinkIcon, Download, Heart, Play } from 'lucide-react';
import { MasonryGrid } from '../../Gallery/MasonryGrid/MasonryGrid';
import { downloadPhotoFromR2, downloadAllPhotosAsZip } from '../../../../lib/downloadPhoto';
import { DownloadModal } from '../../Gallery/DownloadModal/DownloadModal';

export const GalleryPreview: React.FC<GalleryPreviewProps> = ({
  settings,
  collectionTitle,
  collectionDate,
  collectionDescription,
  coverPhotoUrl,
  gridPhotos,
  dashboardState,
  onSetActiveSet
}) => {
  const { coverStyle, fontFamily, colorPalette, grid } = settings;

  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

  // Build a collection-shaped object the shared DownloadModal understands
  // Note: dashboardState.downloadPin is the boolean toggle, pinValue is the actual PIN string
  const downloadCollection = {
    ...dashboardState?.collection,
    name: collectionTitle || dashboardState?.collection?.name,
    download_pin: (dashboardState?.downloadPin && dashboardState?.pinValue) ? dashboardState.pinValue : null,
    email_capture_enabled: dashboardState?.emailTracking ?? false,
    require_pin_for_single_photo: dashboardState?.requirePinForSinglePhoto ?? true,
    downloads_enabled: dashboardState?.photoDownload !== false,
    gallery_download_enabled: dashboardState?.galleryDownload !== false,
    single_photo_download_enabled: dashboardState?.singlePhotoDownload !== false,
  };

  const handleDownloadClick = async (photo?: any) => {
    const needsEmail = !!dashboardState?.emailTracking;
    
    // downloadPin is a boolean toggle; only consider PIN required if toggle is ON and a PIN value exists
    const hasPin = !!((dashboardState?.downloadPin && dashboardState?.pinValue) || dashboardState?.collection?.download_pin || dashboardState?.collection?.download_pin_hash);
    
    // Check if PIN is required for single photo downloads
    const pinRequiredForSingle = dashboardState?.requirePinForSinglePhoto !== false;
    
    const needsPin = hasPin && (!photo || pinRequiredForSingle);

    if (photo) {
      if (!needsPin && !needsEmail) {
        // Only download directly if auth is NOT required
        await downloadPhotoFromR2(photo.full_url, photo.filename || 'photo.jpg');
      } else {
        setSelectedDownloadPhoto(photo);
        setShowDownloadModal(true);
      }
    } else {
      // Gallery/bulk download: always show modal
      setSelectedDownloadPhoto(null);
      setShowDownloadModal(true);
    }
  };

  const renderCover = () => {
    const description = dashboardState.activeSetId 
      ? dashboardState.sets?.find((s: any) => s.id === dashboardState.activeSetId)?.description 
      : (collectionDescription || dashboardState.collection?.description || dashboardState.sets?.[0]?.description);

    const props = {
      title: collectionTitle,
      date: collectionDate,
      description: description,
      photoUrl: coverPhotoUrl,
      focalX: dashboardState?.focalX,
      focalY: dashboardState?.focalY,
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
        <div className="sticky top-0 z-[40] flex items-center justify-between w-full px-10 py-4 border-b border-black/5 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 20%)' }}>
          {/* Left: Collection Title */}
          <div className="flex-1 flex items-center">
            <span className="text-[8px] gallery-heading" style={{ color: 'var(--gallery-text)' }}>
              {collectionTitle}
            </span>
          </div>

          {/* Center: Sets Navigation */}
          <div className="flex-1 flex items-center justify-center gap-8">
            <span 
              className={cn(
                "text-[8px] gallery-heading cursor-pointer transition-opacity", 
                !dashboardState.activeSetId ? "opacity-100 border-b border-current pb-1" : "opacity-50 hover:opacity-100"
              )} 
              style={{ color: 'var(--gallery-text)' }}
              onClick={() => onSetActiveSet?.(null)}
            >
              Highlights
            </span>
            {dashboardState?.sets && dashboardState.sets.length > 0 && 
              dashboardState.sets
                .filter((s: any) => s.name?.toLowerCase() !== 'highlights')
                .slice(0, 5)
                .map((set: any) => (
                  <span 
                    key={set.id} 
                  className={cn(
                    "text-[8px] gallery-heading cursor-pointer hover:opacity-100 transition-opacity", 
                    dashboardState.activeSetId === set.id ? "border-b border-current pb-1" : "opacity-50"
                  )} 
                  style={{ color: 'var(--gallery-text)' }}
                  onClick={() => onSetActiveSet?.(set.id)}
                >
                  {set.name}
                </span>
              ))
            }
          </div>

          {/* Right: Action Icons */}
          <div className="flex-1 flex items-center justify-end gap-6">
            <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" style={{ color: 'var(--gallery-text)' }}>
              <Play size={14} fill="currentColor" />
              {grid.navigation !== 'icon' && <span className="text-[8px] gallery-heading hidden lg:inline">Slideshow</span>}
            </div>
            {dashboardState?.favoritePhotos !== false && (
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setShowFavoriteModal(true)} style={{ color: 'var(--gallery-text)' }}>
                <Heart size={14} />
                {grid.navigation !== 'icon' && <span className="text-[8px] gallery-heading hidden lg:inline">Favorite</span>}
              </div>
            )}
            {dashboardState?.photoDownload !== false && dashboardState?.galleryDownload !== false && (
              <div
                className={cn(
                  "flex items-center gap-2 transition-opacity cursor-pointer",
                  isDownloadingAll ? "opacity-100" : "opacity-60 hover:opacity-100"
                )}
                onClick={() => !isDownloadingAll && handleDownloadClick()}
                style={{ color: 'var(--gallery-text)' }}
              >
                <Download size={14} className={isDownloadingAll ? 'animate-bounce' : ''} />
                {grid.navigation !== 'icon' && (
                  <span className="text-[8px] gallery-heading hidden lg:inline">
                    {isDownloadingAll
                      ? `${downloadProgress.done} / ${downloadProgress.total}`
                      : 'Download'}
                  </span>
                )}
              </div>
            )}
            {dashboardState?.socialSharing !== false && (
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setShowShareModal(true)} style={{ color: 'var(--gallery-text)' }}>
                <Share2 size={14} />
                {grid.navigation !== 'icon' && <span className="text-[8px] gallery-heading hidden lg:inline">Share</span>}
              </div>
            )}
          </div>
        </div>

        {/* Set Description */}
        {(() => {
          const description = dashboardState.activeSetId 
            ? dashboardState.sets?.find((s: any) => s.id === dashboardState.activeSetId)?.description 
            : (collectionDescription || dashboardState.collection?.description || dashboardState.sets?.[0]?.description);

          if (!description) return null;

          return (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center" style={{ backgroundColor: 'var(--gallery-bg)' }}>
              <p className="text-[14px] md:text-[15px] leading-[1.8] tracking-[0.02em] opacity-70 max-w-2xl mx-auto whitespace-pre-wrap" style={{ color: 'var(--gallery-text)', fontWeight: 300 }}>
                {description}
              </p>
              <div className="w-12 h-px mt-12 opacity-20" style={{ backgroundColor: 'var(--gallery-text)' }}></div>
            </div>
          );
        })()}

        <div className="p-4" style={{ backgroundColor: 'var(--gallery-bg)' }}>
          {(() => {
            const activeId = dashboardState?.activeSetId;
            const visiblePhotos = activeId
              ? gridPhotos.filter((p: any) => p.set_id === activeId)
              : gridPhotos.filter((p: any) => !p.set_id || p.set_id === null);

            return (
              <MasonryGrid 
                key={`${grid.style}-${grid.size}-${grid.spacing}`}
                photos={visiblePhotos}
                gridSettings={grid}
                isHorizontal={grid.style?.toLowerCase() === 'horizontal'}
                onImageClick={() => {}}
                onFavorite={() => setShowFavoriteModal(true)}
                onDownload={handleDownloadClick}
                showDownload={dashboardState?.photoDownload !== false && dashboardState?.singlePhotoDownload !== false}
                showFavorite={dashboardState?.favoritePhotos !== false}
                customRowHeight={grid.size === 'large' ? 155 : grid.size === 'regular' ? 111 : grid.size === 'small' ? 74 : 52}
                customColumnCount={grid.size === 'large' ? 2 : grid.size === 'regular' ? 3 : 4}
              />
            );
          })()}
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

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => {
          setShowDownloadModal(false);
          setSelectedDownloadPhoto(null);
        }}
        collection={downloadCollection}
        photos={gridPhotos}
        sets={dashboardState?.sets || []}
        initialPhoto={selectedDownloadPhoto}
        initialSetId={dashboardState?.activeSetId || 'all'}
      />

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
