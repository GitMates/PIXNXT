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
  const isResponsiveDashboardPath = path === '/dashboard';

  // The beta home, authentication, studio dashboard, and delivery manager are responsive.
  // Keep unfinished studio routes gated until each route has its own pass.
  const isResponsiveDeliveryManagerPath = path === '/deliveries/manage';
  const isResponsiveLibraryPath = path === '/photos';
  const isResponsiveStarredPath = path === '/starred' || path.startsWith('/starred/');
  return path !== '/'
    && !isAuthPath
    && !isResponsiveClientGalleryPath
    && !isResponsiveDashboardPath
    && !isResponsiveDeliveryManagerPath
    && !isResponsiveLibraryPath
    && !isResponsiveStarredPath
    && !isPublicClientPath(path);
}

export function isDesktopViewport(width) {
  return Number(width) >= DESKTOP_MIN_WIDTH;
}
