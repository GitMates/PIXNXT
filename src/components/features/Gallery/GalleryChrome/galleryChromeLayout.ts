/** Shared nav structure for GalleryView + GalleryPreview (preview uses smaller gaps). */
export const galleryChromeLayout = {
  brandBlock: 'gallery-chrome__brand shrink-0 flex flex-col items-start',
  tabsBlock: 'gallery-chrome__tabs flex flex-wrap items-center self-center',
  actionsBlock: 'gallery-chrome__actions flex shrink-0 flex-wrap items-center justify-end self-center',
  navRailSpacer: 'gallery-chrome__nav-rail-spacer hidden min-w-0 flex-1 sm:block',
  navLeft: 'gallery-chrome__nav-left flex items-center flex-1 min-w-0',
  navInner: 'gallery-chrome__nav-inner flex items-center w-full min-w-0',
} as const;
