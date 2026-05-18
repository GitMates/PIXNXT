export type GalleryMediaFilterValue = 'photos' | 'videos';

type GalleryPhotoLike = {
  media_type?: string | null;
  filename?: string | null;
  full_url?: string | null;
  web_url?: string | null;
  thumbnail_url?: string | null;
};

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)$/i;

export function isGalleryVideo(photo: GalleryPhotoLike): boolean {
  if (photo.media_type === 'video') return true;
  const src = photo.full_url || photo.web_url || photo.thumbnail_url || '';
  return VIDEO_EXT.test(photo.filename || src || '');
}

export function isGalleryPhoto(photo: GalleryPhotoLike): boolean {
  return !isGalleryVideo(photo);
}

export function countGalleryMedia<T extends GalleryPhotoLike>(photos: T[]) {
  let photosCount = 0;
  let videosCount = 0;
  for (const p of photos) {
    if (isGalleryVideo(p)) videosCount += 1;
    else photosCount += 1;
  }
  return { photos: photosCount, videos: videosCount };
}

export function filterGalleryMediaByType<T extends GalleryPhotoLike>(
  photos: T[],
  filter: GalleryMediaFilterValue
): T[] {
  return photos.filter((p) => (filter === 'videos' ? isGalleryVideo(p) : isGalleryPhoto(p)));
}

export function shouldShowGalleryMediaFilter(counts: { photos: number; videos: number }) {
  return counts.photos > 0 && counts.videos > 0;
}
