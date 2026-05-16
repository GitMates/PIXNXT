import { galleryChromeLayout } from './galleryChromeLayout';

export type GalleryChromeVariant = 'preview' | 'galleryView';

export const galleryChromeStyles = {
  preview: {
    nav: 'gallery-sticky-nav gallery-sticky-nav--preview',
    navInner: `${galleryChromeLayout.navInner} px-3 py-3 md:px-6 md:py-4 gap-2`,
    navLeft: `${galleryChromeLayout.navLeft} flex-row gap-3 md:gap-5`,
    brandBlock: galleryChromeLayout.brandBlock,
    tabsBlock: `${galleryChromeLayout.tabsBlock} gap-2 md:gap-3`,
    actionsBlock: `${galleryChromeLayout.actionsBlock} gap-1.5 md:gap-2.5`,
    brandTitle:
      'gallery-chrome__brand-title text-[10px] md:text-[14px] font-serif font-bold uppercase leading-none tracking-tight truncate max-w-full',
    brandSubtitle:
      'gallery-chrome__brand-subtitle mt-0.5 text-[6px] md:text-[7px] font-bold uppercase tracking-[0.15em] truncate max-w-full',
    tab: 'gallery-chrome__tab text-[8px] md:text-[9px] font-bold uppercase tracking-[0.1em] md:tracking-[0.15em]',
    action: 'gallery-chrome__action text-[7px] md:text-[8px] font-bold uppercase tracking-[0.1em]',
    actionIcon: 12,
    setHeading:
      'gallery-chrome__set-heading py-4 text-center text-[8px] font-normal lowercase tracking-[0.28em] mb-0',
    setDescription:
      'gallery-chrome__set-description mx-auto max-w-2xl whitespace-pre-wrap text-[11px] font-light leading-relaxed tracking-wide md:text-[12px]',
    setDescriptionWrap: '-mx-6 border-b px-4 py-4 text-center md:px-6',
  },
  galleryView: {
    nav: 'gallery-sticky-nav gallery-sticky-nav--gallery-view',
    navInner: `${galleryChromeLayout.navInner} flex-col gap-5 px-4 py-4 sm:flex-row sm:gap-0 md:px-8 md:py-5 lg:px-12`,
    navLeft: `${galleryChromeLayout.navLeft} flex-col gap-5 sm:flex-row sm:gap-10 md:gap-14 lg:gap-20`,
    brandBlock: galleryChromeLayout.brandBlock,
    tabsBlock: `${galleryChromeLayout.tabsBlock} gap-6 md:gap-10`,
    actionsBlock: `${galleryChromeLayout.actionsBlock} gap-5 sm:gap-6 lg:gap-8`,
    brandTitle:
      'gallery-chrome__brand-title font-serif text-[1.75rem] font-bold uppercase leading-none tracking-tight md:text-3xl',
    brandSubtitle: 'gallery-chrome__brand-subtitle mt-1.5 text-[9px] font-bold uppercase tracking-[0.28em]',
    tab: 'gallery-chrome__tab text-[10px] font-bold uppercase tracking-[0.2em]',
    action: 'gallery-chrome__action text-[10px] font-bold uppercase tracking-[0.2em]',
    actionIcon: 14,
    setHeading:
      'gallery-chrome__set-heading py-10 text-center text-[11px] font-normal lowercase tracking-[0.35em] md:py-12 md:text-xs mb-0',
    setDescription:
      'gallery-chrome__set-description mx-auto max-w-3xl whitespace-pre-wrap text-base font-light leading-relaxed tracking-wide md:text-lg',
    setDescriptionWrap: '-mx-4 mb-6 border-b px-6 py-5 text-center md:-mx-8 md:px-12 md:py-6 lg:-mx-12',
  },
} as const;

export function getGalleryChromeVariant(isPreview?: boolean, isGalleryView?: boolean): GalleryChromeVariant {
  if (isPreview) return 'preview';
  if (isGalleryView) return 'galleryView';
  return 'galleryView';
}
