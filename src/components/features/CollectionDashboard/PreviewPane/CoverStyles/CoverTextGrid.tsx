import React from 'react';
import { cn } from '../../../../../lib/utils';
import { coverTextStyles, getCoverTextMode } from './coverTextStyles';

export type CoverTextGridVariant = 'center' | 'standard' | 'vintage' | 'light';

interface CoverTextGridProps {
  title: string;
  date: string;
  subtitle?: string;
  description?: string;
  isPreview?: boolean;
  isGalleryView?: boolean;
  variant?: CoverTextGridVariant;
  align?: 'center' | 'start';
  onViewGallery?: () => void;
  className?: string;
  showSubtitle?: boolean;
  showTitle?: boolean;
  showDate?: boolean;
  showDescription?: boolean;
  showButton?: boolean;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

export const CoverTextGrid: React.FC<CoverTextGridProps> = ({
  title,
  date,
  subtitle,
  description,
  isPreview,
  isGalleryView,
  variant = 'standard',
  align = 'center',
  onViewGallery,
  className,
  showSubtitle = true,
  showTitle = true,
  showDate = true,
  showDescription = true,
  showButton = true,
  buttonClassName,
  buttonStyle,
  children,
}) => {
  const mode = getCoverTextMode(isPreview, isGalleryView);
  const styles = coverTextStyles[mode];
  const isLight = variant === 'light';
  const textColor = isLight ? '#fff' : 'var(--gallery-text)';
  const photoTextShadow = '0 1px 10px rgba(0,0,0,0.55), 0 2px 20px rgba(0,0,0,0.35)';
  const textStyle = (color: string): React.CSSProperties =>
    isLight ? { color, textShadow: photoTextShadow } : { color };
  const subtitleOpacity = variant === 'vintage' ? 'opacity-60' : 'opacity-80';
  const dateOpacity = variant === 'vintage' ? 'opacity-70' : 'opacity-80';
  const descriptionOpacity = variant === 'vintage' ? 'opacity-60' : 'opacity-70';

  const defaultButtonStyle: React.CSSProperties = {
    backgroundColor: 'var(--gallery-accent)',
    color: 'var(--gallery-bg)',
    border: 'none',
  };

  return (
    <div
      className={cn(
        'cover-text-grid flex flex-col',
        isPreview && 'cover-text-grid--compact',
        isGalleryView && 'cover-text-grid--gallery-view',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className
      )}
    >
      {children}
      {showSubtitle && (
        <div
          className={cn('gallery-heading uppercase font-medium', subtitleOpacity, styles.subtitle)}
          style={textStyle(textColor)}
        >
          {subtitle || 'GALLERY'}
        </div>
      )}
      {showTitle && (
        <h1
          className={cn('gallery-heading leading-tight', styles.title)}
          style={
            variant === 'center' && !isLight
              ? { color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.2)' }
              : textStyle(textColor)
          }
        >
          {title}
        </h1>
      )}
      {showDate && (
        <div
          className={cn('gallery-body-text uppercase font-medium', dateOpacity, styles.date)}
          style={textStyle(textColor)}
        >
          {date}
        </div>
      )}
      {showDescription && description && (
        <p
          className={cn(
            'gallery-body-text leading-relaxed whitespace-pre-wrap',
            descriptionOpacity,
            styles.description,
            align === 'center' ? 'max-w-lg' : 'max-w-md'
          )}
          style={textStyle(textColor)}
        >
          {description}
        </p>
      )}
      {showButton && (
        <button
          type="button"
          className={cn(
            'cover-text-grid__button view-gallery-btn gallery-body-text tracking-[0.2em] uppercase transition-all duration-300 font-medium',
            styles.button,
            buttonClassName
          )}
          style={{ ...defaultButtonStyle, ...buttonStyle }}
          onClick={onViewGallery}
        >
          VIEW GALLERY
        </button>
      )}
    </div>
  );
};
