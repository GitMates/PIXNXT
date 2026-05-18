import { galleryChromeLayout } from './galleryChromeLayout';

export type GalleryChromeVariant = 'preview' | 'galleryView';

export const galleryChromeStyles = {
  preview: {
    nav: 'gallery-sticky-nav gallery-sticky-nav--preview',
    navInner: `${galleryChromeLayout.navInner} justify-between px-2 py-1.5`,
    navLeft: `${galleryChromeLayout.navLeft} flex-row gap-1.5 min-w-0`,
    navRight: 'gallery-chrome__nav-right flex shrink-0 items-center justify-end gap-1',
    brandBlock: `${galleryChromeLayout.brandBlock} shrink-0 min-w-0 max-w-[38%]`,
    tabsBlock:
      'gallery-chrome__tabs flex flex-nowrap items-center shrink-0 gap-1.5 min-w-0 self-center overflow-x-auto no-scrollbar',
    navRailSpacer: galleryChromeLayout.navRailSpacer,
    actionsBlock:
      'gallery-chrome__actions flex shrink-0 flex-nowrap items-center justify-end self-center gap-0.5',
    brandTitle:
      'gallery-chrome__brand-title gallery-heading text-[9px] uppercase leading-none truncate max-w-full',
    brandSubtitle:
      'gallery-chrome__brand-subtitle gallery-body-text mt-px text-[5px] font-bold uppercase tracking-[0.12em] truncate max-w-full',
    tab: 'gallery-chrome__tab gallery-body-text text-[6px] font-bold uppercase tracking-[0.1em]',
    action: 'gallery-chrome__action gallery-body-text text-[6px] font-bold uppercase tracking-[0.08em]',
    actionIcon: 9,
    setHeading:
      'gallery-chrome__set-heading gallery-body-text px-2 py-0.5 text-left text-[6px] font-normal lowercase tracking-[0.16em] mb-0 md:px-3',
    setDescription:
      'gallery-chrome__set-description mx-auto max-w-2xl whitespace-pre-wrap text-[11px] font-light leading-relaxed tracking-wide md:text-[12px]',
    setDescriptionWrap: '-mx-6 border-b px-4 py-4 text-center md:px-6',
    navInnerMobile:
      'gallery-chrome__nav-inner gallery-chrome__nav-inner--mobile flex flex-col items-stretch gap-1 py-1.5 px-2',
    navRowMobile: 'gallery-chrome__nav-row flex w-full min-w-0 items-center justify-between gap-1.5',
    brandBlockMobile:
      'gallery-chrome__brand gallery-chrome__brand--mobile min-w-0 flex-1 max-w-[52%] flex flex-col items-start',
    tabsBlockMobile:
      'gallery-chrome__tabs gallery-chrome__tabs--mobile flex flex-row flex-nowrap items-center w-full min-w-0 gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar',
    actionsBlockMobile:
      'gallery-chrome__actions gallery-chrome__actions--mobile flex shrink-0 flex-row flex-nowrap items-center justify-end gap-0.5',
  },
  galleryView: {
    nav: 'gallery-sticky-nav gallery-sticky-nav--gallery-view',
    navInner: `${galleryChromeLayout.navInner} justify-between gap-4 py-4 pl-0 pr-0 sm:flex-row md:py-5`,
    navLeft: `${galleryChromeLayout.navLeft} shrink-0 flex-row items-center gap-3 md:gap-4 lg:gap-5`,
    navRight: `${galleryChromeLayout.navRight} gap-2 md:gap-3 ml-auto`,
    brandBlock: `${galleryChromeLayout.brandBlock} shrink-0`,
    tabsBlock: `${galleryChromeLayout.tabsBlock} shrink-0 gap-6 md:gap-10`,
    photographerCorner: `${galleryChromeLayout.photographerCorner} text-[9px] font-bold uppercase tracking-[0.28em] leading-none`,
    navRailSpacer: galleryChromeLayout.navRailSpacer,
    actionsBlock: `${galleryChromeLayout.actionsBlock} gap-5 sm:gap-6 lg:gap-8`,
    brandTitle:
      'gallery-chrome__brand-title gallery-heading text-[1.75rem] uppercase leading-none md:text-3xl',
    brandSubtitle:
      'gallery-chrome__brand-subtitle gallery-body-text mt-1.5 text-[9px] font-bold uppercase tracking-[0.28em]',
    tab: 'gallery-chrome__tab gallery-body-text text-[10px] font-bold uppercase tracking-[0.2em]',
    action: 'gallery-chrome__action gallery-body-text text-[10px] font-bold uppercase tracking-[0.2em]',
    actionIcon: 14,
    setHeading:
      'gallery-chrome__set-heading gallery-body-text py-10 text-center text-[11px] font-normal lowercase tracking-[0.35em] md:py-12 md:text-xs mb-0',
    setDescription:
      'gallery-chrome__set-description mx-auto max-w-3xl whitespace-pre-wrap text-base font-light leading-relaxed tracking-wide md:text-lg',
    setDescriptionWrap: '-mx-2 mb-6 border-b px-4 py-5 text-center md:-mx-4 md:px-6 md:py-6',
  },
} as const;

export function getGalleryChromeVariant(isPreview?: boolean, isGalleryView?: boolean): GalleryChromeVariant {
  if (isPreview) return 'preview';
  if (isGalleryView) return 'galleryView';
  return 'galleryView';
}
