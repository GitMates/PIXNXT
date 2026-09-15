const workersMobile = () => import('./workersMobile.service');

const PUBLIC_APP_FIELDS =
  'id, photographer_id, name, event_date, slug, icon_url, cover_image_url, status, settings';

export const mobileGalleryPublicService = {
  async getPublishedAppBySlug(slug) {
    return (await workersMobile()).getPublishedAppBySlug(slug);
  },

  async getPublishedAppPhotos(appId) {
    return (await workersMobile()).getPublishedAppPhotos(appId);
  },

  async getModuleBranding(photographerId) {
    return (await workersMobile()).getModuleBranding(photographerId);
  },

  async getPhotographerBranding(photographerId) {
    return (await workersMobile()).getPhotographerBranding(photographerId);
  },
};
