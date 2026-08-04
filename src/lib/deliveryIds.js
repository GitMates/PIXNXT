/**
 * Client Gallery deliveries identity: DB tables, R2 path segments, app routes.
 * Legacy "collections" names remain for dual-read / redirects during migration.
 */

export const DELIVERY_ROUTE = '/deliveries';
export const DELIVERY_ROUTE_LEGACY = '/collections';
export const DELIVERY_PRODUCT_HOME = '/client-gallery';
export const DELIVERY_STARRED_ROUTE = '/starred/deliveries';
export const DELIVERY_STARRED_ROUTE_LEGACY = '/starred/collections';

/** Supabase table names (post rename migration). */
export const DELIVERY_TABLES = {
  deliveries: 'deliveries',
  reminders: 'delivery_reminders',
  shareEmails: 'delivery_share_emails',
  contacts: 'delivery_contacts',
};

/** Legacy table names (pre-migration / dual-read). */
export const DELIVERY_TABLES_LEGACY = {
  deliveries: 'collections',
  reminders: 'collection_reminders',
  shareEmails: 'collection_share_emails',
  contacts: 'collection_contacts',
};

/** R2 module folder under users/{photographer}/… */
export const DELIVERY_R2_MODULE = 'deliveries';
export const DELIVERY_R2_MODULE_LEGACY = 'clientgallery';

export function deliveryAppPath(suffix = '') {
  const clean = String(suffix || '').replace(/^\/+/, '');
  return clean ? `${DELIVERY_ROUTE}/${clean}` : DELIVERY_ROUTE;
}

export function isDeliveryPath(pathname) {
  return (
    pathname === DELIVERY_PRODUCT_HOME ||
    pathname === DELIVERY_ROUTE ||
    pathname.startsWith(`${DELIVERY_ROUTE}/`) ||
    pathname === DELIVERY_ROUTE_LEGACY ||
    pathname.startsWith(`${DELIVERY_ROUTE_LEGACY}/`) ||
    pathname.startsWith('/folders')
  );
}

export function isDeliveryStarredPath(pathname) {
  return (
    pathname === DELIVERY_STARRED_ROUTE ||
    pathname.startsWith(`${DELIVERY_STARRED_ROUTE}/`) ||
    pathname === DELIVERY_STARRED_ROUTE_LEGACY ||
    pathname.startsWith(`${DELIVERY_STARRED_ROUTE_LEGACY}/`) ||
    pathname === '/starred' ||
    pathname.startsWith('/starred/')
  );
}
