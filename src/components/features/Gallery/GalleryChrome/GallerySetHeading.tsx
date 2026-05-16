import React from 'react';
import { cn } from '../../../../lib/utils';
import { galleryChromeStyles, GalleryChromeVariant } from './galleryChromeStyles';

interface GallerySetHeadingProps {
  variant: GalleryChromeVariant;
  label: string;
  className?: string;
}

export const GallerySetHeading: React.FC<GallerySetHeadingProps> = ({ variant, label, className }) => {
  const styles = galleryChromeStyles[variant];
  return (
    <p
      className={cn(styles.setHeading, className)}
      style={{ color: 'var(--gallery-text)' }}
    >
      {label}
    </p>
  );
};

interface GallerySetDescriptionProps {
  variant: GalleryChromeVariant;
  text: string;
  isDark?: boolean;
  className?: string;
}

export const GallerySetDescription: React.FC<GallerySetDescriptionProps> = ({
  variant,
  text,
  isDark,
  className,
}) => {
  const styles = galleryChromeStyles[variant];
  return (
    <div
      className={cn(
        styles.setDescriptionWrap,
        isDark ? 'border-white/10' : 'border-black/5',
        className
      )}
      style={{ backgroundColor: 'var(--gallery-bg)' }}
    >
      <p className={styles.setDescription} style={{ color: 'var(--gallery-text)' }}>
        {text}
      </p>
    </div>
  );
};
