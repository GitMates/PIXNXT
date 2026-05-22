/** Demo photos for Smart Album spreads until real uploads are wired up. */
export const SAMPLE_ALBUM_IMAGES = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1465492799731-2e37208da0ba?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522673603031-0c2274bfd79a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b4561120f2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520854221256-174b7ce0e8a7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1523438885200-635a43e658f9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1469371670867-dece0e02a88a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
];

export function getSampleImageForPage(pageNum) {
    if (pageNum <= 0) return null;
    const index = (pageNum - 1) % SAMPLE_ALBUM_IMAGES.length;
    return SAMPLE_ALBUM_IMAGES[index];
}
