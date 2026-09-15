const workersMobile = () => import('./workersMobile.service');

export const DEFAULT_MOBILE_GALLERY_SETTINGS = {
  contact_show_biography: true,
  contact_show_social_links: true,
  contact_show_contact_email: true,
  contact_show_phone: true,
  contact_show_business_address: true,
  contact_show_website: true,
  custom_domain: '',
  logo_url: '',
  show_pixnxt_branding: true,
};

export const mobileGallerySettingsService = {
  async getSettings(photographerId) {
    return (await workersMobile()).getSettings(photographerId);
  },

  async updateSettings(photographerId, updates) {
    return (await workersMobile()).updateSettings(photographerId, updates);
  },
};
