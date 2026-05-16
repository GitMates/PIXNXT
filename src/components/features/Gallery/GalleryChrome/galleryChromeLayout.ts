/** Shared nav structure for GalleryView + GalleryPreview (preview uses smaller gaps). */
export const galleryChromeLayout = {
  brandBlock: 'gallery-chrome__brand shrink-0 flex flex-col items-start',
  tabsBlock: 'gallery-chrome__tabs flex flex-wrap items-end',
  actionsBlock: 'gallery-chrome__actions flex shrink-0 flex-wrap items-center justify-end',
  navLeft: 'gallery-chrome__nav-left flex items-end flex-1 min-w-0',
  navInner: 'gallery-chrome__nav-inner flex items-center justify-between w-full min-w-0',
} as const;
