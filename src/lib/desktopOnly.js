/** Keep unfinished studio routes desktop-only until their responsive pass is complete. */

export const DESKTOP_MIN_WIDTH = 1024;

const PUBLIC_CLIENT_PREFIXES = [
  '/gallery/',
  '/g/',
  '/m/',
  '/e/',
  '/album-preview/',
  '/download/',
  '/p/',
];

function normalizePath(pathname) {
  const raw = String(pathname || '').split('?')[0];
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
  return raw || '/';
}

export function isPublicClientPath(pathname) {
  const path = normalizePath(pathname);
  return PUBLIC_CLIENT_PREFIXES.some(
    (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix),
  );
}

export function shouldRequireDesktop(pathname) {
  const path = normalizePath(pathname);
  const isAuthPath = path === '/auth'
    || path.startsWith('/auth/')
    || path === '/login'
    || path === '/signup';
  const isResponsiveClientGalleryPath = path === '/client-gallery'
    || path === '/client_gallery'
    || path === '/clientgallery';
  const isResponsiveAlbumProoferPath = path === '/album-proofer'
    || path.startsWith('/album-proofer/')
    || path === '/smart-albums'
    || path.startsWith('/smart-albums/');
  const isResponsiveDashboardPath = path === '/dashboard';
  const isResponsiveShowcasePath = path === '/showcase';
  const isResponsiveSettingsPath = path === '/settings' || path.startsWith('/settings/');
  const isResponsiveAccountPath = [
    '/account',
    '/account/profile',
    '/account/account',
    '/account/studio-identity',
    '/account/legal-consent',
    '/account/billing',
  ].includes(path);
  const isResponsiveStorePath = path === '/store' || path.startsWith('/store/');
  const isResponsivePrintstorePath = path === '/printstore';
  const isResponsiveLabPath = path === '/lab' || path.startsWith('/lab/');
  const isResponsivePhotographerPath = path === '/photographer';
  const isResponsiveOnboardingPath = path === '/onboarding';
  const isResponsiveAdminPath = path === '/admin' || path.startsWith('/admin/');
  const isResponsiveRekognitionPath = path === '/dev/rekognition';
  const isResponsiveRedirectPath = [
    '/portal',
    '/guest-delivery',
    '/mobile-gallery',
    '/collections',
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  // Studio routes are enabled individually after their responsive pass.
  const isResponsiveDeliveryManagerPath = path === '/deliveries/manage';
  const isResponsiveDeliverySharePath = path === '/deliveries/manage/share';
  const isResponsiveDeliveryCreatePath = path === '/deliveries/create';
  const isResponsiveFolderPath = path === '/folders/create' || /^\/folders\/[^/]+$/.test(path);
  const isResponsiveLibraryPath = path === '/photos';
  const isResponsiveStarredPath = path === '/starred' || path.startsWith('/starred/');
  return path !== '/'
    && !isAuthPath
    && !isResponsiveClientGalleryPath
    && !isResponsiveAlbumProoferPath
    && !isResponsiveDashboardPath
    && !isResponsiveDeliveryManagerPath
    && !isResponsiveDeliverySharePath
    && !isResponsiveDeliveryCreatePath
    && !isResponsiveFolderPath
    && !isResponsiveLibraryPath
    && !isResponsiveStarredPath
    && !isResponsiveShowcasePath
    && !isResponsiveSettingsPath
    && !isResponsiveAccountPath
    && !isResponsiveStorePath
    && !isResponsivePrintstorePath
    && !isResponsiveLabPath
    && !isResponsivePhotographerPath
    && !isResponsiveOnboardingPath
    && !isResponsiveAdminPath
    && !isResponsiveRekognitionPath
    && !isResponsiveRedirectPath
    && !isPublicClientPath(path);
}

export function isDesktopViewport(width) {
  return Number(width) >= DESKTOP_MIN_WIDTH;
}
