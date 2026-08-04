/**
 * Client Gallery public portfolio (Showcase) admin route identity.
 * DB columns: showcase_slug, showcase_enabled, showcase_password, showcase_sort,
 * deliveries/folders.show_on_showcase.
 */

export const SHOWCASE_ROUTE = '/showcase';
export const SHOWCASE_ROUTE_LEGACY = '/homepage';

export function isShowcasePath(pathname) {
  return (
    pathname === SHOWCASE_ROUTE ||
    pathname.startsWith(`${SHOWCASE_ROUTE}/`) ||
    pathname === SHOWCASE_ROUTE_LEGACY ||
    pathname.startsWith(`${SHOWCASE_ROUTE_LEGACY}/`)
  );
}
