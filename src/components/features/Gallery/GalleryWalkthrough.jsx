import React, { useMemo, useState } from 'react';
import { galleryUiStrings } from '../../../lib/galleryUiStrings';

const STORAGE_PREFIX = 'pixnxt_gallery_assist_seen_';

function seenKey(collectionId) {
  return `${STORAGE_PREFIX}${collectionId}`;
}

export function hasSeenGalleryWalkthrough(collectionId) {
  if (!collectionId || typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(seenKey(collectionId)) === '1';
  } catch {
    return true;
  }
}

export function markGalleryWalkthroughSeen(collectionId) {
  if (!collectionId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(seenKey(collectionId), '1');
  } catch {
    /* ignore */
  }
}

/**
 * First-visit walk-through cards when Basics → Walk-through cards is on.
 */
export function GalleryWalkthrough({
  collectionId,
  enabled,
  language,
  showFavorites = true,
  showDownload = true,
  showShare = true,
}) {
  const strings = useMemo(() => galleryUiStrings(language), [language]);
  const [open, setOpen] = useState(() => {
    if (!enabled || !collectionId) return false;
    return !hasSeenGalleryWalkthrough(collectionId);
  });
  const [step, setStep] = useState(0);

  const steps = useMemo(() => {
    const list = [{ title: strings.walkTitle, body: strings.walkBrowse }];
    if (showFavorites) list.push({ title: strings.favorites, body: strings.walkFavorite });
    if (showDownload) list.push({ title: strings.download, body: strings.walkDownload });
    if (showShare) list.push({ title: strings.share, body: strings.walkShare });
    return list;
  }, [strings, showFavorites, showDownload, showShare]);

  if (!enabled || !open || steps.length === 0) return null;

  const last = step >= steps.length - 1;
  const current = steps[Math.min(step, steps.length - 1)];

  const dismiss = () => {
    markGalleryWalkthroughSeen(collectionId);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={strings.walkTitle}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(20, 16, 12, 0.48)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '24px 16px 32px',
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#faf7f2',
          color: '#2a241e',
          borderRadius: 16,
          padding: '22px 22px 18px',
          boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.55 }}>
          {step + 1} / {steps.length}
        </p>
        <h2 style={{ margin: '8px 0 10px', fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>
          {current.title}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.45, opacity: 0.85 }}>
          {current.body}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={dismiss}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#6b635a',
              fontSize: 14,
              cursor: 'pointer',
              padding: '10px 12px',
            }}
          >
            {strings.walkSkip}
          </button>
          <button
            type="button"
            onClick={() => {
              if (last) dismiss();
              else setStep((s) => s + 1);
            }}
            style={{
              border: 'none',
              background: '#2a241e',
              color: '#faf7f2',
              fontSize: 14,
              fontWeight: 560,
              cursor: 'pointer',
              padding: '10px 16px',
              borderRadius: 10,
            }}
          >
            {last ? strings.walkGotIt : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
