const workersMobile = () => import('./workersMobile.service');

export const mobileGalleryService = {
  async getApps(photographerId) {
    return (await workersMobile()).getApps(photographerId);
  },

  async getApp(photographerId, appId) {
    return (await workersMobile()).getApp(photographerId, appId);
  },

  async createApp({ photographer_id, name, event_date = null }) {
    return (await workersMobile()).createApp({ photographer_id, name, event_date });
  },

  async updateApp(photographerId, appId, updates) {
    return (await workersMobile()).updateApp(photographerId, appId, updates);
  },

  async deleteApp(photographerId, appId) {
    return (await workersMobile()).deleteApp(photographerId, appId);
  },
};
