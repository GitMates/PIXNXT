import { supabase } from '../lib/supabase/client';
import { formatRelativeTime } from '../lib/relativeTime';

const SEEN_KEY = 'pixnxt_cg_notifications_seen';
const DISMISSED_KEY = 'pixnxt_cg_notifications_dismissed';

export const CG_NOTIFICATIONS_CHANGED_EVENT = 'pixnxt-cg-notifications-changed';

export const CG_NOTIFICATION_TYPES = {
  DOWNLOAD: 'download',
  FAVORITE: 'favorite',
  STORE: 'store',
  EMAIL: 'email',
};

const TYPE_LABELS = {
  [CG_NOTIFICATION_TYPES.DOWNLOAD]: 'Download Activity',
  [CG_NOTIFICATION_TYPES.FAVORITE]: 'Favorite Activity',
  [CG_NOTIFICATION_TYPES.STORE]: 'Store Orders',
  [CG_NOTIFICATION_TYPES.EMAIL]: 'Email Registration',
};

export const CG_NOTIFICATION_SECTIONS = [
  { id: 'needs-you', label: 'Needs you' },
  { id: 'prints-sold', label: 'Prints sold' },
  { id: 'activity', label: 'Activity' },
];

export function getClientGalleryNotificationTypeLabel(type) {
  return TYPE_LABELS[type] || 'Activity';
}

function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function notifyClientGalleryNotificationsChanged() {
  try {
    window.dispatchEvent(new CustomEvent(CG_NOTIFICATIONS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

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

function isDismissed(id) {
  return Boolean(readJson(DISMISSED_KEY)[id]);
}

function isUnread(id, createdAt) {
  const seenAt = readJson(SEEN_KEY)[id];
  if (!seenAt) return true;
  if (!createdAt) return false;
  return new Date(createdAt).getTime() > new Date(seenAt).getTime();
}

function markSeen(id, createdAt) {
  if (!id) return;
  const all = readJson(SEEN_KEY);
  all[id] = createdAt || new Date().toISOString();
  writeJson(SEEN_KEY, all);
}

export function dismissClientGalleryNotification(id) {
  if (!id) return;
  const all = readJson(DISMISSED_KEY);
  all[id] = new Date().toISOString();
  writeJson(DISMISSED_KEY, all);
  notifyClientGalleryNotificationsChanged();
}

export function markClientGalleryNotificationRead(item) {
  if (!item?.id) return;
  markSeen(item.id, item.createdAt);
  notifyClientGalleryNotificationsChanged();
}

export function markAllClientGalleryNotificationsRead(items) {
  (items || []).forEach((item) => markSeen(item.id, item.createdAt));
  notifyClientGalleryNotificationsChanged();
}

export function clearAllClientGalleryNotifications(items) {
  const dismissed = readJson(DISMISSED_KEY);
  const seen = readJson(SEEN_KEY);
  (items || []).forEach((item) => {
    if (!item?.id) return;
    dismissed[item.id] = new Date().toISOString();
    seen[item.id] = item.createdAt || new Date().toISOString();
  });
  writeJson(DISMISSED_KEY, dismissed);
  writeJson(SEEN_KEY, seen);
  notifyClientGalleryNotificationsChanged();
}

export function buildClientGalleryNotificationUrl(item) {
  if (!item?.collectionId) return '/client-gallery';
  const activity = item.type || CG_NOTIFICATION_TYPES.DOWNLOAD;
  return `/deliveries/manage?id=${encodeURIComponent(item.collectionId)}&tab=activity&activity=${encodeURIComponent(activity)}`;
}

/**
 * Build photographer-wide Client Gallery activity notifications.
 * Covers Download, Favorite, Store Orders, and Email Registration.
 */
export async function listClientGalleryNotifications(photographerId) {
  if (!photographerId) return { items: [], footer: '' };

  const { data: collections, error: colErr } = await supabase
    .from('deliveries')
    .select('id, name')
    .eq('photographer_id', photographerId)
    .order('created_at', { ascending: false });

  if (colErr) throw colErr;
  if (!collections?.length) return { items: [], footer: '' };

  const collectionIds = collections.map((c) => c.id);
  const nameById = Object.fromEntries(collections.map((c) => [c.id, c.name || 'Delivery']));

  const [downloadsRes, favoritesRes, ordersRes, emailsRes] = await Promise.all([
    supabase
      .from('activity_log')
      .select('id, collection_id, visitor_email, created_at, metadata, photo_id')
      .in('collection_id', collectionIds)
      .eq('event_type', 'download')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('favorite_lists')
      .select('id, name, collection_id, session_id, created_at, submitted_at, description')
      .in('collection_id', collectionIds)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('printstore_orders')
      .select('id, collection_id, customer_email, customer_name, created_at, status, total_amount')
      .in('collection_id', collectionIds)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('client_sessions')
      .select('id, collection_id, visitor_email, created_at')
      .in('collection_id', collectionIds)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const items = [];
  const threeDaysAgo = Date.now() - 3 * 86400000;
  let printTotal = 0;
  const printDeliveryIds = new Set();

  for (const row of downloadsRes.data || []) {
    const id = `download:${row.id}`;
    if (isDismissed(id)) continue;
    const email = row.visitor_email || 'A visitor';
    const metaType = String(row.metadata?.type || '').toLowerCase();
    const kind =
      metaType.includes('gallery') || metaType.includes('all') || metaType.includes('package')
        ? 'gallery download'
        : row.photo_id
          ? 'photo download'
          : 'download';
    const collectionName = nameById[row.collection_id] || 'Delivery';
    items.push({
      id,
      type: CG_NOTIFICATION_TYPES.DOWNLOAD,
      section: 'activity',
      tone: 'ok',
      collectionId: row.collection_id,
      collectionName,
      title: collectionName,
      subtitle: `${email} started a ${kind}`,
      preview: `${email} · ${kind}`,
      createdAt: row.created_at,
      timeLabel: formatRelativeTime(row.created_at),
      isUnread: isUnread(id, row.created_at),
    });
  }

  const favoriteSessionIds = [
    ...new Set((favoritesRes.data || []).map((r) => r.session_id).filter(Boolean)),
  ];
  let emailBySession = {};
  if (favoriteSessionIds.length) {
    const { data: sessions } = await supabase
      .from('client_sessions')
      .select('id, visitor_email')
      .in('id', favoriteSessionIds);
    emailBySession = Object.fromEntries(
      (sessions || []).map((s) => [s.id, s.visitor_email || 'Unknown visitor']),
    );
  }

  for (const row of favoritesRes.data || []) {
    const id = `favorite:${row.id}`;
    if (isDismissed(id)) continue;
    const email = emailBySession[row.session_id] || 'A visitor';
    const collectionName = nameById[row.collection_id] || 'Delivery';
    const listName = row.name || 'Favorites';
    const submitted = Boolean(row.submitted_at);
    items.push({
      id,
      type: CG_NOTIFICATION_TYPES.FAVORITE,
      section: submitted ? 'needs-you' : 'activity',
      tone: submitted ? 'warn' : 'ok',
      collectionId: row.collection_id,
      collectionName,
      title: submitted ? `${collectionName} — list submitted` : collectionName,
      subtitle: submitted
        ? `${email} sent their selection`
        : `${email} started “${listName}”`,
      preview: submitted
        ? `${email} submitted “${listName}”`
        : `${email} started “${listName}”`,
      createdAt: row.submitted_at || row.created_at,
      timeLabel: formatRelativeTime(row.submitted_at || row.created_at),
      isUnread: isUnread(id, row.submitted_at || row.created_at),
    });
  }

  for (const row of ordersRes.data || []) {
    if (!row.collection_id) continue;
    const id = `store:${row.id}`;
    if (isDismissed(id)) continue;
    const who = row.customer_name || row.customer_email || 'A customer';
    const amount = Number(row.total_amount) || 0;
    const amountLabel = formatInr(amount);
    const status = String(row.status || '').toLowerCase();
    const created = row.created_at ? new Date(row.created_at).getTime() : 0;
    const stuck = status === 'reprint' || (status === 'pending' && created && created < threeDaysAgo);
    const cancelled = status === 'cancelled';
    const collectionName = nameById[row.collection_id] || 'Delivery';
    const shipped = status === 'shipped' || status === 'completed' || status === 'delivered' || status === 'paid';

    if (!cancelled && amount > 0) {
      printTotal += amount;
      printDeliveryIds.add(row.collection_id);
    }

    if (stuck) {
      items.push({
        id,
        type: CG_NOTIFICATION_TYPES.STORE,
        section: 'needs-you',
        tone: 'warn',
        amount,
        collectionId: row.collection_id,
        collectionName,
        title: `${collectionName} — 1 order stuck`,
        subtitle: status === 'reprint' ? 'the print needs a reprint' : 'the payment failed',
        preview: `${who} placed an order${amountLabel ? ` · ${amountLabel}` : ''}`,
        createdAt: row.created_at,
        timeLabel: formatRelativeTime(row.created_at),
        isUnread: isUnread(id, row.created_at),
      });
    } else if (!cancelled && amount > 0) {
      items.push({
        id,
        type: CG_NOTIFICATION_TYPES.STORE,
        section: 'prints-sold',
        tone: 'ok',
        amount,
        collectionId: row.collection_id,
        collectionName,
        title: amountLabel ? `${amountLabel} — ${collectionName}` : collectionName,
        subtitle: shipped
          ? 'Printed and shipped automatically. Nothing for you to do.'
          : 'Print Lab is handling this order.',
        preview: `${who} placed an order${amountLabel ? ` · ${amountLabel}` : ''}`,
        createdAt: row.created_at,
        timeLabel: formatRelativeTime(row.created_at),
        isUnread: isUnread(id, row.created_at),
      });
    } else if (!cancelled) {
      items.push({
        id,
        type: CG_NOTIFICATION_TYPES.STORE,
        section: 'activity',
        tone: 'ok',
        amount,
        collectionId: row.collection_id,
        collectionName,
        title: collectionName,
        subtitle: `${who} placed an order`,
        preview: `${who} placed an order`,
        createdAt: row.created_at,
        timeLabel: formatRelativeTime(row.created_at),
        isUnread: isUnread(id, row.created_at),
      });
    }
  }

  // Deduplicate email registrations by collection + email (keep earliest)
  const emailSeen = new Set();
  for (const row of emailsRes.data || []) {
    const email = String(row.visitor_email || '').trim().toLowerCase();
    if (!email) continue;
    const dedupeKey = `${row.collection_id}:${email}`;
    if (emailSeen.has(dedupeKey)) continue;
    emailSeen.add(dedupeKey);

    const id = `email:${row.id}`;
    if (isDismissed(id)) continue;
    const collectionName = nameById[row.collection_id] || 'Delivery';
    items.push({
      id,
      type: CG_NOTIFICATION_TYPES.EMAIL,
      section: 'activity',
      tone: 'ok',
      collectionId: row.collection_id,
      collectionName,
      title: collectionName,
      subtitle: `${row.visitor_email} registered`,
      preview: `${row.visitor_email} registered`,
      createdAt: row.created_at,
      timeLabel: formatRelativeTime(row.created_at),
      isUnread: isUnread(id, row.created_at),
    });
  }

  const sorted = items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  const deliveryCount = printDeliveryIds.size;
  const footer =
    printTotal > 0
      ? `${formatInr(printTotal)} in prints across ${deliveryCount} ${
          deliveryCount === 1 ? 'delivery' : 'deliveries'
        }. Print Lab owns the ledger.`
      : '';

  return { items: sorted, footer };
}
