import { getAppInstallLink as getInstallLink } from './mobileGalleryInstall';

export { getAppInstallLink, getAppClientLink } from './mobileGalleryInstall';

export function getDefaultInviteSubject(appName, senderName) {
  const name = appName || 'gallery';
  const from = senderName || 'Your photographer';
  return `${from} — your ${name} gallery is ready`;
}

export function getDefaultInviteMessage(appName, senderName) {
  const name = appName || 'gallery';
  const from = senderName || 'Your photographer';
  return `Hi,

To install your ${name} mobile gallery app, open this email on your mobile phone and tap Install App.

Thanks,
${from}`;
}

export function getAppDirectLink(slug, siteOrigin) {
  return getInstallLink(slug, siteOrigin);
}
