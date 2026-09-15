const workersMobile = () => import('./workersMobile.service');

export const mobileGalleryShareService = {
  async sendInvite({
    appId,
    recipientEmail,
    subject,
    message,
    sendCopy = false,
    websiteLink = null,
    photographerProfile = null,
  }) {
    return (await workersMobile()).sendInvite({ appId, recipientEmail, subject, message, sendCopy, websiteLink, photographerProfile });
  },

  async getInviteHistory(photographerId, appId) {
    return (await workersMobile()).getInviteHistory(photographerId, appId);
  },
};
