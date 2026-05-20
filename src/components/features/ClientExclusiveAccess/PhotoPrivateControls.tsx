import React from 'react';
import { Download, Heart, Share2, EyeOff } from 'lucide-react';
import { cn } from '../../../lib/utils';
import './ClientExclusiveAccess.css';

export interface PhotoPrivateControlsProps {
  isPrivate: boolean;
  showBadge?: boolean;
  showPrivateToggle?: boolean;
  showFavorite?: boolean;
  showDownload?: boolean;
  showShare?: boolean;
  isFavorited?: boolean;
  onTogglePrivate?: () => void;
  onFavorite?: (e: React.MouseEvent) => void;
  onDownload?: (e: React.MouseEvent) => void;
  onShare?: (e: React.MouseEvent) => void;
}

export const PhotoPrivateBadge: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="cea-photo-badge" aria-hidden>
      <EyeOff strokeWidth={2} />
    </div>
  );
};

export const PhotoPrivateControls: React.FC<PhotoPrivateControlsProps> = ({
  isPrivate,
  showBadge = true,
  showPrivateToggle = false,
  showFavorite = false,
  showDownload = false,
  showShare = false,
  isFavorited = false,
  onTogglePrivate,
  onFavorite,
  onDownload,
  onShare,
}) => {
  const hasActions = showPrivateToggle || showFavorite || showDownload || showShare;

  return (
    <>
      <PhotoPrivateBadge visible={showBadge && isPrivate} />
      {hasActions ? (
        <div
          className={cn('cea-photo-actions', isFavorited && 'cea-photo-actions--visible')}
        >
          {showFavorite && (
            <button
              type="button"
              className={cn('cea-photo-action-btn', isFavorited && 'cea-photo-action-btn--active')}
              onClick={onFavorite}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={16} strokeWidth={1.5} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          )}
          {showDownload && (
            <button
              type="button"
              className="cea-photo-action-btn"
              onClick={onDownload}
              aria-label="Download"
            >
              <Download size={16} strokeWidth={1.5} />
            </button>
          )}
          {showPrivateToggle && (
            <button
              type="button"
              className={cn('cea-photo-action-btn', isPrivate && 'cea-photo-action-btn--active')}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePrivate?.();
              }}
              aria-label={isPrivate ? 'Mark as public' : 'Mark as private'}
            >
              <EyeOff size={16} strokeWidth={1.5} />
            </button>
          )}
          {showShare && (
            <button
              type="button"
              className="cea-photo-action-btn"
              onClick={onShare}
              aria-label="Share"
            >
              <Share2 size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      ) : null}
    </>
  );
};
