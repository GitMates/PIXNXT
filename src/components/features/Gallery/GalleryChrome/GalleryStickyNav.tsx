import React from 'react';
import { Heart, Download, Share2, Play } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { galleryChromeStyles, GalleryChromeVariant, getGalleryChromeVariant } from './galleryChromeStyles';

export interface GallerySetTab {
  id: string;
  name: string;
}

export interface GalleryStickyNavProps {
  variant?: GalleryChromeVariant;
  isPreview?: boolean;
  isGalleryView?: boolean;
  collectionTitle: string;
  photographerName?: string;
  sets?: GallerySetTab[];
  activeSetId?: string | null;
  onSetChange?: (setId: string | null) => void;
  maxVisibleSets?: number;
  showFavorites?: boolean;
  showDownload?: boolean;
  showShare?: boolean;
  showSlideshow?: boolean;
  favoritedCount?: number;
  isDownloadingAll?: boolean;
  downloadLabel?: string;
  onFavoriteClick?: () => void;
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onSlideshowClick?: () => void;
  isDark?: boolean;
  className?: string;
}

export const GalleryStickyNav: React.FC<GalleryStickyNavProps> = ({
  variant: variantProp,
  isPreview,
  isGalleryView,
  collectionTitle,
  photographerName,
  sets = [],
  activeSetId = null,
  onSetChange,
  maxVisibleSets,
  showFavorites = true,
  showDownload = true,
  showShare = true,
  showSlideshow = true,
  favoritedCount = 0,
  isDownloadingAll = false,
  downloadLabel = 'Download',
  onFavoriteClick,
  onDownloadClick,
  onShareClick,
  onSlideshowClick,
  isDark,
  className,
}) => {
  const variant = variantProp ?? getGalleryChromeVariant(isPreview, isGalleryView);
  const styles = galleryChromeStyles[variant];
  const isCompact = variant === 'preview';
  const iconSize = styles.actionIcon;

  const visibleSets = sets
    .filter((s) => s.name?.toLowerCase() !== 'highlights')
    .slice(0, maxVisibleSets ?? sets.length);

  const tabButtonClass = (active: boolean) =>
    cn(
      styles.tab,
      'transition-opacity',
      active ? 'opacity-100' : 'opacity-45 hover:opacity-100'
    );

  const renderTabs = () => (
    <>
      <button type="button" className={cn('group relative', isCompact ? 'py-1' : 'py-2')} onClick={() => onSetChange?.(null)}>
        <span className={tabButtonClass(!activeSetId)} style={{ color: 'var(--gallery-text)' }}>
          Highlights
        </span>
        {!activeSetId && (
          <div
            className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-100"
            style={{ backgroundColor: 'var(--gallery-text)' }}
          />
        )}
      </button>
      {visibleSets.map((set) => (
        <button
          key={set.id}
          type="button"
          className={cn('group relative', isCompact ? 'py-1' : 'py-2')}
          onClick={() => onSetChange?.(set.id)}
        >
          <span className={tabButtonClass(activeSetId === set.id)} style={{ color: 'var(--gallery-text)' }}>
            {set.name}
          </span>
          {activeSetId === set.id && (
            <div
              className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-100"
              style={{ backgroundColor: 'var(--gallery-text)' }}
            />
          )}
        </button>
      ))}
    </>
  );

  const renderActions = () => (
    <>
      {showFavorites && (
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 md:gap-2 transition-opacity',
            isCompact ? 'opacity-60 hover:opacity-100' : 'hover:opacity-50',
            !isCompact && 'relative'
          )}
          onClick={onFavoriteClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          {isCompact ? (
            <Heart size={iconSize} fill={favoritedCount > 0 ? 'currentColor' : 'none'} />
          ) : (
            <span className="relative inline-flex">
              <Heart size={iconSize} className={favoritedCount > 0 ? 'fill-current' : ''} />
              {favoritedCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[var(--gallery-bg)]"
                  aria-hidden
                />
              )}
            </span>
          )}
          <span className={cn(styles.action, isCompact ? 'hidden xl:inline' : 'hidden md:inline')}>Favorites</span>
        </button>
      )}
      {showDownload && (
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 md:gap-2 transition-opacity',
            isCompact ? (isDownloadingAll ? 'opacity-100' : 'opacity-60 hover:opacity-100') : 'hover:opacity-50',
            !isCompact && isDownloadingAll && 'disabled:cursor-not-allowed disabled:opacity-40'
          )}
          onClick={() => !isDownloadingAll && onDownloadClick?.()}
          disabled={!isCompact && isDownloadingAll}
          style={{ color: 'var(--gallery-text)' }}
        >
          <Download size={iconSize} className={isDownloadingAll ? 'animate-bounce' : ''} />
          <span className={cn(styles.action, isCompact ? 'hidden xl:inline' : 'hidden md:inline')}>{downloadLabel}</span>
        </button>
      )}
      {showShare && (
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 md:gap-2 transition-opacity',
            isCompact ? 'opacity-60 hover:opacity-100' : 'hover:opacity-50'
          )}
          onClick={onShareClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          <Share2 size={iconSize} />
          <span className={cn(styles.action, isCompact ? 'hidden xl:inline' : 'hidden md:inline')}>Share</span>
        </button>
      )}
      {showSlideshow && (
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 md:gap-2 transition-opacity',
            isCompact ? 'opacity-60 hover:opacity-100' : 'hover:opacity-50'
          )}
          onClick={onSlideshowClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          <Play size={iconSize} fill="currentColor" />
          <span className={cn(styles.action, isCompact ? 'hidden xl:inline' : 'hidden md:inline')}>Slideshow</span>
        </button>
      )}
    </>
  );

  return (
    <div
      className={cn(
        styles.nav,
        'sticky top-0 z-[40] border-b backdrop-blur-md',
        isCompact ? 'border-black/5' : isDark ? 'border-white/10' : 'border-black/5',
        className
      )}
      style={{ backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 15%)' }}
    >
      <div className={cn(styles.navInner, !isCompact && '-mx-4 md:-mx-8 lg:-mx-12')}>
        <div className={styles.navLeft}>
          <div className={styles.brandBlock}>
            <span className={styles.brandTitle} style={{ color: 'var(--gallery-text)' }}>
              {collectionTitle}
            </span>
            {photographerName ? (
              <span className={styles.brandSubtitle} style={{ color: 'var(--gallery-meta-text)' }}>
                {photographerName}
              </span>
            ) : null}
          </div>
          <div className={styles.tabsBlock}>{renderTabs()}</div>
        </div>
        <div className={styles.actionsBlock}>{renderActions()}</div>
      </div>
    </div>
  );
};
