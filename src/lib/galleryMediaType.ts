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

export function partitionGalleryMedia<T extends GalleryPhotoLike>(photos: T[]) {
  const videos: T[] = [];
  const stills: T[] = [];
  for (const p of photos) {
    if (isGalleryVideo(p)) videos.push(p);
    else stills.push(p);
  }
  return { videos, photos: stills };
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Copy for the client-gallery delete confirmation modal. */
export function describeGalleryMediaForDelete<T extends GalleryPhotoLike>(items: T[]) {
  const { photos, videos } = countGalleryMedia(items);
  if (videos > 0 && photos === 0) {
    return { title: 'DELETE VIDEOS', summary: pluralize(videos, 'video', 'videos') };
  }
  if (photos > 0 && videos === 0) {
    return { title: 'DELETE PHOTOS', summary: pluralize(photos, 'photo', 'photos') };
  }
  if (videos > 0 && photos > 0) {
    return {
      title: 'DELETE MEDIA',
      summary: `${pluralize(videos, 'video', 'videos')} and ${pluralize(photos, 'photo', 'photos')}`,
    };
  }
  return { title: 'DELETE MEDIA', summary: '0 items' };
}
