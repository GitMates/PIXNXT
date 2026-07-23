import React from 'react';
import { Heart, Share2, Play, Download, Loader2, ShoppingCart, Store, ArrowDownToLine } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { galleryChromeStyles, GalleryChromeVariant, getGalleryChromeVariant } from './galleryChromeStyles';
import { NavigationStyleSetting } from '../../../../lib/navStyle';
import { GalleryMediaFilter } from './GalleryMediaFilter';
import type { GalleryMediaFilterValue } from '../../../../lib/galleryMediaType';

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
  showShop?: boolean;
  favoritedCount?: number;
  isDownloadingAll?: boolean;
  downloadLabel?: string;
  onFavoriteClick?: () => void;
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onSlideshowClick?: () => void;
  onShopClick?: () => void;
  showPrintLab?: boolean;
  onPrintLabClick?: () => void;
  showBuyGallery?: boolean;
  buyGalleryLabel?: string;
  onBuyGalleryClick?: () => void;
  isPaidDownload?: boolean;
  isDark?: boolean;
  isPreviewMobile?: boolean;
  /** Public gallery on a real phone — same two-row nav as preview mobile. */
  isGalleryViewMobile?: boolean;
  /** icon = icons only; text = icons + labels */
  navigationStyle?: NavigationStyleSetting;
  showHighlightsTab?: boolean;
  /** Photos / videos toggle (shown in nav when both types exist in the active set). */
  mediaFilter?: GalleryMediaFilterValue;
  onMediaFilterChange?: (value: GalleryMediaFilterValue) => void;
  mediaPhotoCount?: number;
  mediaVideoCount?: number;
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
  showShop = true,
  favoritedCount = 0,
  isDownloadingAll = false,
  downloadLabel = 'Download',
  onFavoriteClick,
  onDownloadClick,
  onShareClick,
  onSlideshowClick,
  onShopClick,
  showPrintLab = true,
  onPrintLabClick,
  showBuyGallery = false,
  buyGalleryLabel = 'Buy Gallery',
  onBuyGalleryClick,
  isPaidDownload = false,
  isDark,
  isPreviewMobile = false,
  isGalleryViewMobile = false,
  navigationStyle = 'icon',
  showHighlightsTab = true,
  mediaFilter,
  onMediaFilterChange,
  mediaPhotoCount = 0,
  mediaVideoCount = 0,
  className,
}) => {
  const variant = variantProp ?? getGalleryChromeVariant(isPreview, isGalleryView);
  const styles = galleryChromeStyles[variant];
  const isCompact = variant === 'preview';
  const isMobilePreviewNav = isCompact && isPreviewMobile;
  const isMobileGalleryNav = isGalleryView && isGalleryViewMobile;
  const useMobileNavLayout = isMobilePreviewNav || isMobileGalleryNav;
  const mobileLayoutStyles = isMobileGalleryNav
    ? galleryChromeStyles.galleryView
    : isCompact
      ? galleryChromeStyles.preview
      : null;
  const iconSize = isMobilePreviewNav ? 10 : isMobileGalleryNav ? 12 : styles.actionIcon;

  const showActionLabels = navigationStyle === 'text' && !useMobileNavLayout;

  const actionLabelClass = (labelClass: string) =>
    cn(
      labelClass,
      'gallery-chrome__action-label',
      showActionLabels ? (isCompact ? 'inline' : 'hidden md:inline') : 'sr-only'
    );

  const visibleSets = sets
    .filter((s) => s.name?.toLowerCase() !== 'highlights')
    .slice(0, maxVisibleSets ?? sets.length);

  const tabButtonClass = (active: boolean) =>
    cn(
      styles.tab,
      'transition-opacity',
      active ? 'opacity-100' : 'opacity-45 hover:opacity-100'
    );

  const renderMediaFilter = () => {
    if (mediaFilter == null || !onMediaFilterChange) return null;
    return (
      <GalleryMediaFilter
        layout="inline"
        variant={variant}
        value={mediaFilter}
        onChange={onMediaFilterChange}
        photoCount={mediaPhotoCount}
        videoCount={mediaVideoCount}
      />
    );
  };

  const renderTabs = () => (
    <>
      {showHighlightsTab ? (
        <button
          type="button"
          className={cn(
            'group relative inline-flex shrink-0 items-center whitespace-nowrap',
            isCompact ? 'py-0' : 'py-2'
          )}
          onClick={() => onSetChange?.(null)}
        >
          <span className={cn(tabButtonClass(!activeSetId), 'whitespace-nowrap')} style={{ color: 'var(--gallery-text)' }}>
            Highlights
          </span>
          {!activeSetId && (
            <div
              className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-100"
              style={{ backgroundColor: 'var(--gallery-text)' }}
            />
          )}
        </button>
      ) : null}
      {visibleSets.map((set) => (
        <button
          key={set.id}
          type="button"
          className={cn(
            'group relative inline-flex shrink-0 items-center whitespace-nowrap',
            isCompact ? 'py-0' : 'py-2'
          )}
          onClick={() => onSetChange?.(set.id)}
        >
          <span
            className={cn(tabButtonClass(activeSetId === set.id), 'whitespace-nowrap')}
            style={{ color: 'var(--gallery-text)' }}
          >
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
      {showPrintLab && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center transition-opacity',
            isCompact ? 'gap-0.5 opacity-60 hover:opacity-100' : 'gap-1 md:gap-2 hover:opacity-50',
            !isCompact && 'relative'
          )}
          onClick={onPrintLabClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          <span className="text-xs md:text-sm font-medium uppercase tracking-wider underline underline-offset-4 decoration-1">Print Lab</span>
        </button>
      )}
      {showBuyGallery && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center transition-opacity',
            isCompact ? 'gap-0.5 opacity-60 hover:opacity-100' : 'gap-1 md:gap-2 hover:opacity-50',
            !isCompact && 'relative'
          )}
          onClick={onBuyGalleryClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          <span className="text-xs md:text-sm font-medium uppercase tracking-wider underline underline-offset-4 decoration-1">
            {buyGalleryLabel}
          </span>
        </button>
      )}
      {showShop && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center transition-opacity',
            isCompact ? 'gap-0.5 opacity-60 hover:opacity-100' : 'gap-1 md:gap-2 hover:opacity-50',
            !isCompact && 'relative'
          )}
          onClick={onShopClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          <ShoppingCart size={iconSize} />
          <span className={actionLabelClass(styles.action)}>Cart</span>
        </button>
      )}
      {showFavorites && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center transition-opacity',
            isCompact ? 'gap-0.5 opacity-60 hover:opacity-100' : 'gap-1 md:gap-2 hover:opacity-50',
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
          <span className={actionLabelClass(styles.action)}>Favorites</span>
        </button>
      )}
      {showDownload && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center transition-opacity',
            isCompact
              ? `gap-0.5 ${isDownloadingAll ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`
              : 'gap-1 md:gap-2 hover:opacity-50',
            !isCompact && isDownloadingAll && 'disabled:cursor-not-allowed disabled:opacity-40'
          )}
          onClick={() => !isDownloadingAll && onDownloadClick?.()}
          disabled={!isCompact && isDownloadingAll}
          style={{ color: 'var(--gallery-text)' }}
        >
          {isDownloadingAll ? (
            <Loader2 size={iconSize} className="animate-spin shrink-0" aria-hidden />
          ) : isPaidDownload ? (
            <span className="relative shrink-0">
              <ArrowDownToLine size={iconSize} aria-hidden />
              <span style={{ position: 'absolute', top: '-4px', right: '-6px', fontSize: '7px', fontWeight: 800, lineHeight: 1, background: 'var(--gallery-text)', color: 'var(--gallery-bg)', borderRadius: '3px', padding: '1px 2px' }}>₹</span>
            </span>
          ) : (
            <Download size={iconSize} className="shrink-0" aria-hidden />
          )}
          <span className={actionLabelClass(styles.action)}>{isPaidDownload ? 'Buy' : downloadLabel}</span>
        </button>
      )}
      {showShare && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center transition-opacity',
            isCompact ? 'gap-0.5 opacity-60 hover:opacity-100' : 'gap-1 md:gap-2 hover:opacity-50'
          )}
          onClick={onShareClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          <Share2 size={iconSize} />
          <span className={actionLabelClass(styles.action)}>Share</span>
        </button>
      )}
      {showSlideshow && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center transition-opacity',
            isCompact ? 'gap-0.5 opacity-60 hover:opacity-100' : 'gap-1 md:gap-2 hover:opacity-50'
          )}
          onClick={onSlideshowClick}
          style={{ color: 'var(--gallery-text)' }}
        >
          <Play size={iconSize} fill="currentColor" />
          <span className={actionLabelClass(styles.action)}>Slideshow</span>
        </button>
      )}
    </>
  );

  const renderBrand = () => (
    <>
      <span className={styles.brandTitle} style={{ color: 'var(--gallery-text)' }}>
        {collectionTitle}
      </span>
      {photographerName ? (
        <span className={styles.brandSubtitle} style={{ color: 'var(--gallery-meta-text)' }}>
          {photographerName}
        </span>
      ) : null}
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
      <div
        className={cn(
          useMobileNavLayout && mobileLayoutStyles ? mobileLayoutStyles.navInnerMobile : styles.navInner,
          !isCompact && !isMobileGalleryNav && 'w-full'
        )}
      >
        {useMobileNavLayout && mobileLayoutStyles ? (
          <>
            <div className={mobileLayoutStyles.navRowMobile}>
              <div className={mobileLayoutStyles.brandBlockMobile}>{renderBrand()}</div>
              <div className={mobileLayoutStyles.actionsBlockMobile}>{renderActions()}</div>
            </div>
            <div className={mobileLayoutStyles.tabsBlockMobile}>
              {renderTabs()}
              {renderMediaFilter()}
            </div>
          </>
        ) : isCompact ? (
          <>
            <div className={styles.navLeft}>
              <div className={styles.brandBlock}>{renderBrand()}</div>
              <div className={styles.tabsBlock}>
                {renderTabs()}
                {renderMediaFilter()}
              </div>
            </div>
            <div className={styles.actionsBlock}>{renderActions()}</div>
          </>
        ) : (
          <>
            <div className={styles.navLeft}>
              <div className={styles.brandBlock}>{renderBrand()}</div>
              <div className={styles.tabsBlock}>
                {renderTabs()}
                {renderMediaFilter()}
              </div>
            </div>
            <div className={styles.navRailSpacer} aria-hidden />
            <div className={styles.actionsBlock}>{renderActions()}</div>
          </>
        )}
      </div>
    </div>
  );
};
