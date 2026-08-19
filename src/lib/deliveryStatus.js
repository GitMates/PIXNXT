/** Delivery visibility stored on `deliveries.status` (`delivery_status` enum). */

export const DELIVERY_STATUS = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
};

export const DELIVERY_STATUS_DRAFT_OPTIONS = [
  { value: DELIVERY_STATUS.draft, label: 'Draft' },
  { value: DELIVERY_STATUS.published, label: 'Publish' },
];

export const DELIVERY_STATUS_LIVE_OPTIONS = [
  { value: DELIVERY_STATUS.published, label: 'Published' },
  { value: DELIVERY_STATUS.archived, label: 'Hidden' },
];

export const DELIVERY_STATUS_ALL_OPTIONS = [
  { value: DELIVERY_STATUS.published, label: 'Published' },
  { value: DELIVERY_STATUS.archived, label: 'Hidden' },
  { value: DELIVERY_STATUS.draft, label: 'Draft' },
];

export function toDbDeliveryStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'published' || raw === 'publish') return DELIVERY_STATUS.published;
  if (raw === 'archived' || raw === 'hidden') return DELIVERY_STATUS.archived;
  return DELIVERY_STATUS.draft;
}

export function hasBeenPublished(collection) {
  const raw = String(collection?.status || '').trim().toLowerCase();
  return Boolean(collection?.published_at)
    || raw === 'published'
    || raw === 'archived'
    || raw === 'hidden';
}

/** UI/DB status. After the first publish, draft is treated as Hidden. */
export function uiDeliveryStatus(collectionOrStatus, publishedAt) {
  const collection = collectionOrStatus && typeof collectionOrStatus === 'object'
    ? collectionOrStatus
    : { status: collectionOrStatus, published_at: publishedAt };
  const raw = String(collection?.status || 'draft').trim().toLowerCase();
  if (raw === 'published') return DELIVERY_STATUS.published;
  if (raw === 'archived' || raw === 'hidden') return DELIVERY_STATUS.archived;
  if (collection?.published_at) return DELIVERY_STATUS.archived;
  return DELIVERY_STATUS.draft;
}

export function deliveryStatusLabel(status) {
  const db = toDbDeliveryStatus(status);
  if (db === DELIVERY_STATUS.published) return 'Published';
  if (db === DELIVERY_STATUS.archived) return 'Hidden';
  return 'Draft';
}

export function deliveryStatusOptions(collection) {
  return hasBeenPublished(collection)
    ? DELIVERY_STATUS_LIVE_OPTIONS
    : DELIVERY_STATUS_DRAFT_OPTIONS;
}

export function buildDeliveryStatusPatch(nextStatus, collection) {
  const status = toDbDeliveryStatus(nextStatus);
  const patch = { status };
  if (status === DELIVERY_STATUS.published && !collection?.published_at) {
    patch.published_at = new Date().toISOString();
  }
  return patch;
}

export function deliveryStatusDotClass(status) {
  const db = toDbDeliveryStatus(status);
  if (db === DELIVERY_STATUS.published) return 'cg-status-dot--live';
  if (db === DELIVERY_STATUS.archived) return 'cg-status-dot--hidden';
  return 'cg-status-dot--draft';
}
