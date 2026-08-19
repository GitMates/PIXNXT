import React from 'react';
import { Heart, Share2, Play, Download, Loader2, ShoppingCart, ArrowDownToLine, Infinity, Square } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { galleryChromeStyles, GalleryChromeVariant, getGalleryChromeVariant } from './galleryChromeStyles';
import { NavigationStyleSetting } from '../../../../lib/navStyle';
import { GalleryMediaFilter } from './GalleryMediaFilter';
import type { GalleryMediaFilterValue } from '../../../../lib/galleryMediaType';
import { orderGallerySetTabs } from '../../../../lib/gallerySetOrder';

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
  highlightsName?: string;
  /** Full sidebar order including virtual "highlights" id. */
  sidebarSetOrder?: string[] | null;
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
  highlightsName = 'Highlights',
  sidebarSetOrder = null,
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

  const orderedTabs = orderGallerySetTabs({
    sets,
    sidebarSetOrder,
    showHighlights: showHighlightsTab,
    highlightsName,
  });

  const visibleTabs =
    maxVisibleSets == null
      ? orderedTabs
      : (() => {
          let nonHighlightCount = 0;
          return orderedTabs.filter((tab) => {
            if (tab.isHighlights || tab.id == null) return true;
            if (nonHighlightCount >= maxVisibleSets) return false;
            nonHighlightCount += 1;
            return true;
          });
        })();

  const tabButtonClass = (active: boolean) =>
    cn(
      styles.tab,
      'transition-opacity',
      active ? 'opacity-100' : 'opacity-45 hover:opacity-100'
    );

  const renderMediaFilter = (layoutMode: 'inline' | 'bar' = 'inline') => {
    if (mediaFilter == null || !onMediaFilterChange) return null;
    return (
      <GalleryMediaFilter
        layout={layoutMode}
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
      {visibleTabs.map((tab) => {
        const isHighlights = tab.isHighlights || tab.id == null;
        const isActive = isHighlights ? !activeSetId : activeSetId === tab.id;
        return (
          <button
            key={isHighlights ? 'highlights' : tab.id}
            type="button"
            className={cn(
              'group relative inline-flex shrink-0 items-center whitespace-nowrap',
              isCompact ? 'py-0' : 'py-2'
            )}
            onClick={() => onSetChange?.(isHighlights ? null : tab.id)}
          >
            <span
              className={cn(tabButtonClass(isActive), 'whitespace-nowrap')}
              style={{ color: 'var(--gallery-text)' }}
            >
              {tab.name}
            </span>
            {isActive && (
              <div
                className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-100"
                style={{ backgroundColor: 'var(--gallery-text)' }}
              />
            )}
          </button>
        );
      })}
    </>
  );

  const renderActions = () => {
    const cartKey = 'pixnxt_printstore_cart';
    let cartItems = [];
    try {
      cartItems = JSON.parse(localStorage.getItem(cartKey) || '[]');
    } catch (e) {}
    const cartCount = Array.isArray(cartItems) ? cartItems.length : 0;

    return (
      <div className="flex items-center gap-4">
        {showPrintLab && (
          <button
            type="button"
            className={cn(
              'flex shrink-0 items-center justify-center transition-opacity hover:opacity-60',
              isCompact 
                ? 'h-8 w-8 rounded-full border' 
                : 'gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider'
            )}
            onClick={onPrintLabClick}
            style={{
              borderColor: 'color-mix(in srgb, var(--gallery-text) 22%, transparent)',
              color: 'var(--gallery-text)',
            }}
          >
            <Square size={isCompact ? 14 : 13} className="shrink-0 stroke-[2.25]" />
            {!isCompact && <span>Print</span>}
          </button>
        )}

        {showDownload && (
          <button
            type="button"
            className={cn(
              'flex shrink-0 items-center justify-center transition-opacity hover:opacity-60',
              isCompact 
                ? 'h-8 w-8 rounded-full border' 
                : 'gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider'
            )}
            onClick={() => !isDownloadingAll && onDownloadClick?.()}
            disabled={isDownloadingAll}
            style={{
              borderColor: 'color-mix(in srgb, var(--gallery-text) 22%, transparent)',
              color: 'var(--gallery-text)',
            }}
          >
            {isDownloadingAll ? (
              <Loader2 size={isCompact ? 14 : 13} className="animate-spin shrink-0" aria-hidden />
            ) : (
              <Download size={isCompact ? 14 : 13} className="shrink-0 stroke-[2.25]" />
            )}
            {!isCompact && <span>{isDownloadingAll ? 'Downloading' : 'Download'}</span>}
          </button>
        )}

        {!isCompact && (showPrintLab || showDownload) && (
          <div 
            className="h-6 w-px" 
            style={{ backgroundColor: 'color-mix(in srgb, var(--gallery-text) 12%, transparent)' }} 
          />
        )}

        <div className="flex items-center gap-3 md:gap-4.5">
          {showFavorites && (
            <button
              type="button"
              className="relative flex shrink-0 items-center transition-opacity hover:opacity-50"
              onClick={onFavoriteClick}
              style={{ color: 'var(--gallery-text)' }}
              title="Favorites"
            >
              <Heart size={iconSize} className={cn('stroke-[2.25]', favoritedCount > 0 ? 'fill-current' : '')} />
              {favoritedCount > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: '#8c827a' }}
                >
                  {favoritedCount}
                </span>
              )}
            </button>
          )}

          {showShop && (
            <button
              type="button"
              className="relative flex shrink-0 items-center transition-opacity hover:opacity-50"
              onClick={onShopClick}
              style={{ color: 'var(--gallery-text)' }}
              title="Cart"
            >
              <ShoppingCart size={iconSize} className="stroke-[2.25]" />
              {cartCount > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: '#8c827a' }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {showShare && (
            <button
              type="button"
              className="flex shrink-0 items-center transition-opacity hover:opacity-50"
              onClick={onShareClick}
              style={{ color: 'var(--gallery-text)' }}
              title="Share"
            >
              <Share2 size={iconSize} className="stroke-[2.25]" />
            </button>
          )}

          {showBuyGallery && (
            <button
              type="button"
              className="flex shrink-0 items-center transition-opacity hover:opacity-50"
              onClick={onBuyGalleryClick}
              style={{ color: 'var(--gallery-text)' }}
              title={buyGalleryLabel || 'Buy Link'}
            >
              <Infinity size={iconSize} className="stroke-[2.25]" />
            </button>
          )}

          {showSlideshow && (
            <button
              type="button"
              className="flex shrink-0 items-center transition-opacity hover:opacity-50"
              onClick={onSlideshowClick}
              style={{ color: 'var(--gallery-text)' }}
              title="Slideshow"
            >
              <Play size={iconSize} className="stroke-[2.25]" fill="currentColor" />
            </button>
          )}
        </div>
      </div>
    );
  };

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
              {renderMediaFilter('inline')}
            </div>
          </>
        ) : isCompact ? (
          <>
            <div className={styles.navLeft}>
              <div className={styles.brandBlock}>{renderBrand()}</div>
              <div className={styles.tabsBlock}>
                {renderTabs()}
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
              </div>
            </div>
            <div className={styles.navRailSpacer} aria-hidden />
            <div className={styles.actionsBlock}>{renderActions()}</div>
          </>
        )}
      </div>
      {!useMobileNavLayout && renderMediaFilter('bar')}
    </div>
  );
};
