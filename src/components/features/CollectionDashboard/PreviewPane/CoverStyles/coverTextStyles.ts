export type CoverTextMode = 'preview' | 'gallery' | 'galleryView';

export const coverTextStyles = {
  preview: {
    subtitle: 'cover-text-grid__subtitle text-[7px] mb-1 tracking-[0.35em]',
    title: 'cover-text-grid__title text-[14px] mb-1',
    date: 'cover-text-grid__date text-[8px] mb-2 tracking-[0.2em]',
    description: 'cover-text-grid__description text-[8px] mb-2',
    button: 'cover-text-grid__button px-4 py-1 text-[7px]',
  },
  gallery: {
    subtitle: 'cover-text-grid__subtitle text-[10px] mb-2 tracking-[0.5em]',
    title: 'cover-text-grid__title text-[26px] mb-2',
    date: 'cover-text-grid__date text-[11px] mb-6 tracking-[0.3em]',
    description: 'cover-text-grid__description text-[11px] mb-6',
    button: 'cover-text-grid__button px-8 py-3 text-[10px]',
  },
  galleryView: {
    subtitle: 'cover-text-grid__subtitle text-[11px] mb-2 tracking-[0.5em]',
    title: 'cover-text-grid__title text-[32px] mb-3',
    date: 'cover-text-grid__date text-[12px] mb-7 tracking-[0.3em]',
    description: 'cover-text-grid__description text-[12px] mb-7',
    button: 'cover-text-grid__button px-10 py-3.5 text-[11px]',
  },
} as const;

export function getCoverTextMode(isPreview?: boolean, isGalleryView?: boolean): CoverTextMode {
  if (isPreview) return 'preview';
  if (isGalleryView) return 'galleryView';
  return 'gallery';
}
