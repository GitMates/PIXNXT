import { supabase } from '../lib/supabase/client';
import { formatRelativeTime } from '../lib/relativeTime';
import { smartAlbumsService } from './smartAlbums.service';
import {
  listClientGalleryNotifications,
  buildClientGalleryNotificationUrl,
  markAllClientGalleryNotificationsRead,
  clearAllClientGalleryNotifications,
  markClientGalleryNotificationRead,
  CG_NOTIFICATIONS_CHANGED_EVENT,
} from './clientGalleryNotifications';
import {
  listPhotographerNotifications,
  buildNotificationUrl,
  markAllPhotographerNotificationsRead,
  clearAllPhotographerNotifications,
  markNotificationItemSeen,
  NOTIFICATION_TYPES,
  NOTIFICATION_REFRESH_EVENTS,
} from './albumNotifications';

export const STUDIO_NOTIFICATIONS_CHANGED_EVENT = 'pixnxt-studio-notifications-changed';

export const STUDIO_NOTIFICATION_SOURCES = {
  CLIENT_GALLERY: 'client-gallery',
  SMART_ALBUM: 'smart-album',
  PRINT_LAB: 'print-lab',
  GUEST_DELIVERY: 'guest-delivery',
};

const SA_NEEDS_YOU = new Set([
  NOTIFICATION_TYPES.PHOTO_COMMENT,
  NOTIFICATION_TYPES.SWAP,
  NOTIFICATION_TYPES.SPREAD_COMMENT,
  NOTIFICATION_TYPES.CLIENT_REPLY,
  NOTIFICATION_TYPES.COMMENTS_SIGNED,
  NOTIFICATION_TYPES.CHANGES_SUBMITTED,
]);

const PL_SEEN_KEY = 'pixnxt_print_lab_notifications_seen';
const PL_DISMISSED_KEY = 'pixnxt_print_lab_notifications_dismissed';
const GD_SEEN_KEY = 'pixnxt_gd_notifications_seen';
const GD_DISMISSED_KEY = 'pixnxt_gd_notifications_dismissed';

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function isDismissed(key, id) {
  return Boolean(readJson(key)[id]);
}

function isUnread(key, id, createdAt) {
  const seenAt = readJson(key)[id];
  if (!seenAt) return true;
  if (!createdAt) return false;
  return new Date(createdAt).getTime() > new Date(seenAt).getTime();
}

function markSeen(key, id, createdAt) {
  if (!id) return;
  const all = readJson(key);
  all[id] = createdAt || new Date().toISOString();
  writeJson(key, all);
}

export function notifyStudioNotificationsChanged() {
  try {
    window.dispatchEvent(new CustomEvent(STUDIO_NOTIFICATIONS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

const SOURCE_LIMITS = {
  [STUDIO_NOTIFICATION_SOURCES.CLIENT_GALLERY]: 3,
  [STUDIO_NOTIFICATION_SOURCES.SMART_ALBUM]: 5,
  [STUDIO_NOTIFICATION_SOURCES.PRINT_LAB]: 5,
  [STUDIO_NOTIFICATION_SOURCES.GUEST_DELIVERY]: 5,
};

function sortByPriorityWithinSource(items) {
  return [...items].sort((a, b) => {
    const sectionA = a.section === 'needs-you' ? 0 : 1;
    const sectionB = b.section === 'needs-you' ? 0 : 1;
    if (sectionA !== sectionB) return sectionA - sectionB;

    const unreadA = a.isUnread ? 0 : 1;
    const unreadB = b.isUnread ? 0 : 1;
    if (unreadA !== unreadB) return unreadA - unreadB;

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export const STUDIO_NOTIFICATION_SOURCE_SECTIONS = [
  { id: STUDIO_NOTIFICATION_SOURCES.CLIENT_GALLERY, label: 'Client Gallery' },
  { id: STUDIO_NOTIFICATION_SOURCES.SMART_ALBUM, label: 'Smart Album' },
  { id: STUDIO_NOTIFICATION_SOURCES.PRINT_LAB, label: 'Print Lab' },
  { id: STUDIO_NOTIFICATION_SOURCES.GUEST_DELIVERY, label: 'Guest Delivery' },
];

export function groupStudioNotificationSections(items) {
  return STUDIO_NOTIFICATION_SOURCE_SECTIONS.map((section) => ({
    ...section,
    items: sortByPriorityWithinSource(
      (items || []).filter((item) => item.source === section.id),
    ).slice(0, SOURCE_LIMITS[section.id] ?? 3),
  })).filter((section) => section.items.length > 0);
}

function mapClientGalleryItem(item) {
  return {
    id: `cg:${item.id}`,
    source: STUDIO_NOTIFICATION_SOURCES.CLIENT_GALLERY,
    section: item.section || 'activity',
    tone: item.tone || 'ok',
    title: item.title || item.collectionName || 'Delivery',
    subtitle: item.subtitle || item.preview || '',
    createdAt: item.createdAt,
    timeLabel: item.timeLabel || formatRelativeTime(item.createdAt),
    isUnread: Boolean(item.isUnread),
    raw: { kind: 'client-gallery', item },
  };
}

function mapSmartAlbumItem(item) {
  const needsYou = SA_NEEDS_YOU.has(item.type);
  return {
    id: `sa:${item.id}`,
    source: STUDIO_NOTIFICATION_SOURCES.SMART_ALBUM,
    section: needsYou ? 'needs-you' : 'activity',
    tone: needsYou && item.isUnread ? 'warn' : 'ok',
    title: item.albumName || 'Album',
    subtitle: item.preview || '',
    createdAt: item.createdAt,
    timeLabel: formatRelativeTime(item.createdAt),
    isUnread: Boolean(item.isUnread),
    raw: { kind: 'smart-album', item },
  };
}

function guestNeedsReview(guest, eventStatus) {
  const status = guest.delivery_status;
  if (status === 'no_match' || status === 'failed') return true;
  if (
    eventStatus === 'published'
    && guest.selfie_url
    && !(Number(guest.matched_photo_count) > 0)
    && status !== 'sent'
  ) {
    return true;
  }
  return false;
}

async function listPrintLabNotifications(photographerId) {
  const { data: collections, error } = await supabase
    .from('deliveries')
    .select('id, name')
    .eq('photographer_id', photographerId);

  if (error) throw error;
  if (!collections?.length) return [];

  const collectionIds = collections.map((c) => c.id);
  const nameById = Object.fromEntries(collections.map((c) => [c.id, c.name || 'Delivery']));

  const { data: orders, error: ordersErr } = await supabase
    .from('printstore_orders')
    .select('id, collection_id, customer_email, customer_name, created_at, status, total_amount, total')
    .in('collection_id', collectionIds)
    .order('created_at', { ascending: false })
    .limit(40);

  if (ordersErr) throw ordersErr;

  const threeDaysAgo = Date.now() - 3 * 86400000;
  const items = [];

  for (const row of orders || []) {
    const id = `order:${row.id}`;
    if (isDismissed(PL_DISMISSED_KEY, id)) continue;

    const who = row.customer_name || row.customer_email || 'A customer';
    const amount = Number(row.total_amount ?? row.total) || 0;
    const amountLabel = formatInr(amount);
    const status = String(row.status || '').toLowerCase();
    const created = row.created_at ? new Date(row.created_at).getTime() : 0;
    const collectionName = nameById[row.collection_id] || 'Delivery';
    const stuck =
      status === 'reprint'
      || status === 'artwork_review'
      || (status === 'pending' && created && created < threeDaysAgo);
    const cancelled = status === 'cancelled';
    if (cancelled) continue;

    const createdAt = row.created_at;
    const unread = isUnread(PL_SEEN_KEY, id, createdAt);

    if (stuck) {
      items.push({
        id: `pl:${id}`,
        source: STUDIO_NOTIFICATION_SOURCES.PRINT_LAB,
        section: 'needs-you',
        tone: 'warn',
        title: `${collectionName} — order needs attention`,
        subtitle:
          status === 'reprint'
            ? 'Print Lab flagged this for a reprint'
            : status === 'artwork_review'
              ? 'Artwork is waiting on review'
              : 'Payment or fulfilment is stuck',
        createdAt,
        timeLabel: formatRelativeTime(createdAt),
        isUnread: unread,
        raw: { kind: 'print-lab', orderId: row.id },
      });
    } else {
      items.push({
        id: `pl:${id}`,
        source: STUDIO_NOTIFICATION_SOURCES.PRINT_LAB,
        section: 'activity',
        tone: 'ok',
        title: collectionName,
        subtitle: `${who} placed an order${amountLabel ? ` · ${amountLabel}` : ''}`,
        createdAt,
        timeLabel: formatRelativeTime(createdAt),
        isUnread: unread,
        raw: { kind: 'print-lab', orderId: row.id },
      });
    }
  }

  return items;
}

async function listGuestDeliveryNotifications(photographerId) {
  const { data: events, error } = await supabase
    .from('guest_delivery_events')
    .select('id, name, status, published_at, updated_at')
    .eq('photographer_id', photographerId)
    .eq('status', 'published');

  if (error) throw error;
  if (!events?.length) return [];

  const eventIds = events.map((e) => e.id);
  const eventById = Object.fromEntries(events.map((e) => [e.id, e]));

  const { data: guests, error: guestsErr } = await supabase
    .from('event_guests')
    .select(
      'id, event_id, name, email, delivery_status, matched_photo_count, selfie_url, registered_at, updated_at',
    )
    .eq('photographer_id', photographerId)
    .in('event_id', eventIds)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (guestsErr) throw guestsErr;

  const items = [];

  for (const guest of guests || []) {
    const event = eventById[guest.event_id];
    if (!event) continue;

    const eventName = event.name || 'Event';
    const guestName = guest.name || guest.email || 'Guest';
    const createdAt = guest.updated_at || guest.registered_at;
    const review = guestNeedsReview(guest, event.status);

    if (review) {
      const id = `review:${guest.id}`;
      if (isDismissed(GD_DISMISSED_KEY, id)) continue;
      items.push({
        id: `gd:${id}`,
        source: STUDIO_NOTIFICATION_SOURCES.GUEST_DELIVERY,
        section: 'needs-you',
        tone: 'warn',
        title: `${eventName} — match needs review`,
        subtitle:
          guest.delivery_status === 'failed'
            ? `${guestName} · matching failed`
            : `${guestName} · low confidence match`,
        createdAt,
        timeLabel: formatRelativeTime(createdAt),
        isUnread: isUnread(GD_SEEN_KEY, id, createdAt),
        raw: { kind: 'guest-delivery', eventId: guest.event_id, guestId: guest.id },
      });
    } else if (guest.registered_at) {
      const id = `registered:${guest.id}`;
      if (isDismissed(GD_DISMISSED_KEY, id)) continue;
      items.push({
        id: `gd:${id}`,
        source: STUDIO_NOTIFICATION_SOURCES.GUEST_DELIVERY,
        section: 'activity',
        tone: 'ok',
        title: eventName,
        subtitle: `${guestName} registered`,
        createdAt: guest.registered_at,
        timeLabel: formatRelativeTime(guest.registered_at),
        isUnread: isUnread(GD_SEEN_KEY, id, guest.registered_at),
        raw: { kind: 'guest-delivery', eventId: guest.event_id, guestId: guest.id },
      });
    }
  }

  return items;
}

export async function listStudioNotifications(photographerId) {
  if (!photographerId) {
    return { items: [], albums: [], clientGalleryItems: [] };
  }

  const [cgResult, albums, printItems, guestItems] = await Promise.all([
    listClientGalleryNotifications(photographerId).catch(() => ({ items: [], footer: '' })),
    smartAlbumsService.getAlbums(photographerId).catch(() => []),
    listPrintLabNotifications(photographerId).catch(() => []),
    listGuestDeliveryNotifications(photographerId).catch(() => []),
  ]);

  const saItems = albums.length
    ? await listPhotographerNotifications(albums).catch(() => [])
    : [];

  const allItems = [
    ...(cgResult.items || []).map(mapClientGalleryItem),
    ...saItems.map(mapSmartAlbumItem),
    ...printItems,
    ...guestItems,
  ];

  return {
    items: allItems,
    sections: groupStudioNotificationSections(allItems),
    albums,
    clientGalleryItems: cgResult.items || [],
    footer: cgResult.footer || '',
  };
}

export function buildStudioNotificationUrl(item, albums = []) {
  const raw = item?.raw;
  if (!raw) return '/dashboard';

  if (raw.kind === 'client-gallery') {
    return buildClientGalleryNotificationUrl(raw.item);
  }

  if (raw.kind === 'smart-album') {
    const album = albums.find((a) => a.id === raw.item.albumId);
    return buildNotificationUrl(raw.item, album);
  }

  if (raw.kind === 'print-lab') {
    return '/store/orders';
  }

  if (raw.kind === 'guest-delivery' && raw.eventId) {
    return `/guest-delivery/event/${raw.eventId}`;
  }

  return '/dashboard';
}

export function markStudioNotificationRead(item) {
  const raw = item?.raw;
  if (!raw) return;

  if (raw.kind === 'client-gallery') {
    markClientGalleryNotificationRead(raw.item);
  } else if (raw.kind === 'smart-album') {
    markNotificationItemSeen(raw.item);
  } else if (raw.kind === 'print-lab') {
    markSeen(PL_SEEN_KEY, raw.orderId ? `order:${raw.orderId}` : item.id.replace(/^pl:/, ''), item.createdAt);
  } else if (raw.kind === 'guest-delivery') {
    const key = item.id.replace(/^gd:/, '');
    markSeen(GD_SEEN_KEY, key, item.createdAt);
  }

  notifyStudioNotificationsChanged();
}

export async function markAllStudioNotificationsRead(state) {
  const { items = [], albums = [], clientGalleryItems = [] } = state || {};

  markAllClientGalleryNotificationsRead(clientGalleryItems);
  await markAllPhotographerNotificationsRead(albums);

  const plSeen = readJson(PL_SEEN_KEY);
  const gdSeen = readJson(GD_SEEN_KEY);

  items.forEach((item) => {
    const raw = item.raw;
    if (raw?.kind === 'print-lab' && raw.orderId) {
      plSeen[`order:${raw.orderId}`] = item.createdAt || new Date().toISOString();
    }
    if (raw?.kind === 'guest-delivery') {
      const key = item.id.replace(/^gd:/, '');
      gdSeen[key] = item.createdAt || new Date().toISOString();
    }
  });

  writeJson(PL_SEEN_KEY, plSeen);
  writeJson(GD_SEEN_KEY, gdSeen);
  notifyStudioNotificationsChanged();
}

export async function clearAllStudioNotifications(state) {
  const { items = [], albums = [], clientGalleryItems = [] } = state || {};

  clearAllClientGalleryNotifications(clientGalleryItems);
  await clearAllPhotographerNotifications(albums);

  const plDismissed = readJson(PL_DISMISSED_KEY);
  const plSeen = readJson(PL_SEEN_KEY);
  const gdDismissed = readJson(GD_DISMISSED_KEY);
  const gdSeen = readJson(GD_SEEN_KEY);

  items.forEach((item) => {
    const raw = item.raw;
    if (raw?.kind === 'print-lab' && raw.orderId) {
      const key = `order:${raw.orderId}`;
      plDismissed[key] = new Date().toISOString();
      plSeen[key] = item.createdAt || new Date().toISOString();
    }
    if (raw?.kind === 'guest-delivery') {
      const key = item.id.replace(/^gd:/, '');
      gdDismissed[key] = new Date().toISOString();
      gdSeen[key] = item.createdAt || new Date().toISOString();
    }
  });

  writeJson(PL_DISMISSED_KEY, plDismissed);
  writeJson(PL_SEEN_KEY, plSeen);
  writeJson(GD_DISMISSED_KEY, gdDismissed);
  writeJson(GD_SEEN_KEY, gdSeen);
  notifyStudioNotificationsChanged();
}

export const STUDIO_NOTIFICATION_REFRESH_EVENTS = [
  STUDIO_NOTIFICATIONS_CHANGED_EVENT,
  CG_NOTIFICATIONS_CHANGED_EVENT,
  ...NOTIFICATION_REFRESH_EVENTS,
];
