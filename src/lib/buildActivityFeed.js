/**
 * Build a single chronological activity feed from existing dashboard data sources.
 * @typedef {'everything'|'downloads'|'selections'|'orders'|'guests'|'opens'} ActivityFeedFilter
 */

function asDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatActivityRelativeTime(value) {
  const d = asDate(value);
  if (!d) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return 'Just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function maskActivityEmail(email) {
  const raw = String(email || '').trim();
  const at = raw.indexOf('@');
  if (at < 1) return raw || 'Visitor';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const tld = domain.match(/(\.[a-z]{2,})$/i)?.[1] || '';
  return `${local}@••••${tld}`;
}

function moneyLabel(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

function downloadCopy(row) {
  const count = Number(row.photoCount);
  const sizeLabel = row.resolution ? String(row.resolution).toLowerCase() : null;
  const setLabel = row.setName || null;
  if (row.type === 'gallery') {
    const countText = Number.isFinite(count) && count > 0 ? `${count} photos` : 'gallery';
    return {
      textParts: [
        { text: 'Downloaded ' },
        { text: countText, bold: true },
        ...(setLabel ? [{ text: ' from ' }, { text: setLabel, bold: true }] : []),
        ...(sizeLabel ? [{ text: ' · ' }, { text: `${sizeLabel} size`, bold: true }] : []),
      ],
    };
  }
  if (row.type === 'video') {
    return {
      textParts: [
        { text: 'Downloaded ' },
        { text: row.filename || 'a video', bold: true },
        ...(sizeLabel ? [{ text: ' · ' }, { text: `${sizeLabel} size`, bold: true }] : []),
      ],
    };
  }
  return {
    textParts: [
      { text: 'Downloaded ' },
      { text: row.filename || '1 photo', bold: true },
      ...(setLabel ? [{ text: ' from ' }, { text: setLabel, bold: true }] : []),
      ...(sizeLabel ? [{ text: ' · ' }, { text: `${sizeLabel} size`, bold: true }] : []),
    ],
  };
}

function selectionCopy(row) {
  const count = Number(row.photoCount) || 0;
  const max = row.max_selection != null ? Number(row.max_selection) : null;
  const listName = row.name || 'Favorites';
  if (row.submitted_at) {
    const progress =
      Number.isFinite(max) && max > 0 ? `${count} of ${max}` : `${count} photo${count === 1 ? '' : 's'}`;
    return {
      textParts: [
        { text: 'Submitted the ' },
        { text: `${listName} · ${progress}`, bold: true },
      ],
    };
  }
  return {
    textParts: [
      { text: 'Updated ' },
      { text: listName, bold: true },
      { text: ' · ' },
      { text: `${count} photo${count === 1 ? '' : 's'}`, bold: true },
    ],
  };
}

function orderCopy(order, items) {
  const orderItems = (items || []).filter((item) => item.order_id === order.id);
  const qty = orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
  const size =
    orderItems.find((item) => item.options?.size || item.options?.print_size)?.options?.size ||
    orderItems.find((item) => item.options?.size || item.options?.print_size)?.options?.print_size ||
    orderItems[0]?.product_name ||
    'prints';
  const total = moneyLabel(order.total ?? order.total_amount ?? order.amount);
  return {
    textParts: [
      { text: 'Ordered ' },
      {
        text: `${qty} print${qty === 1 ? '' : 's'} · ${size}${total ? ` · ${total}` : ''}`,
        bold: true,
      },
    ],
  };
}

function guestCopy(row) {
  const matched = Number(row.matched_photo_count);
  if (Number.isFinite(matched) && matched > 0) {
    return {
      textParts: [
        { text: 'Registered by ' },
        { text: 'QR', bold: true },
        { text: ' and was matched to ' },
        { text: `${matched} photo${matched === 1 ? '' : 's'}`, bold: true },
      ],
    };
  }
  return {
    textParts: [
      { text: 'Registered for the gallery' },
      row.source ? { text: ` · ${row.source}` } : null,
    ].filter(Boolean),
  };
}

function openCopy(row) {
  const visits = Number(row.visitCount) || 1;
  if (visits <= 1) {
    return {
      textParts: [{ text: 'Opened the delivery for the first time' }],
    };
  }
  const ordinal =
    visits % 10 === 1 && visits % 100 !== 11
      ? `${visits}st`
      : visits % 10 === 2 && visits % 100 !== 12
        ? `${visits}nd`
        : visits % 10 === 3 && visits % 100 !== 13
          ? `${visits}rd`
          : `${visits}th`;
  return {
    textParts: [
      { text: 'Opened the delivery · ' },
      { text: `${ordinal} visit`, bold: true },
    ],
  };
}

/**
 * @returns {Array<{
 *  id: string,
 *  filter: 'downloads'|'selections'|'orders'|'guests'|'opens',
 *  badge: string,
 *  actor: string,
 *  textParts: Array<{text: string, bold?: boolean}>,
 *  at: string,
 *  source: any,
 * }>}
 */
export function buildActivityFeedItems({
  downloadActivity = [],
  favoriteActivity = [],
  storeOrders = [],
  storeOrderItems = [],
  emailRegistrationActivity = [],
  galleryOpenActivity = [],
  guestDeliveryGuests = [],
} = {}) {
  const items = [];

  for (const row of downloadActivity || []) {
    const at = row.date || row.created_at;
    if (!at) continue;
    items.push({
      id: `download-${row.id}`,
      filter: 'downloads',
      badge: 'Download',
      actor: row.email || 'Visitor',
      ...downloadCopy(row),
      at,
      source: { kind: 'download', row },
    });
  }

  for (const row of favoriteActivity || []) {
    const at = row.submitted_at || row.updated_at || row.created_at;
    if (!at) continue;
    items.push({
      id: `selection-${row.id}`,
      filter: 'selections',
      badge: 'Selection',
      actor: row.email || row.name || 'Client',
      ...selectionCopy(row),
      at,
      source: { kind: 'selection', row },
    });
  }

  for (const order of storeOrders || []) {
    const at = order.created_at;
    if (!at) continue;
    items.push({
      id: `order-${order.id}`,
      filter: 'orders',
      badge: 'Order',
      actor: order.customer_name || order.customer_email || 'Customer',
      ...orderCopy(order, storeOrderItems),
      at,
      source: { kind: 'order', row: order },
    });
  }

  const guestKeys = new Set();
  for (const guest of guestDeliveryGuests || []) {
    const at = guest.registered_at || guest.created_at;
    if (!at) continue;
    const key = String(guest.email || guest.id).toLowerCase();
    guestKeys.add(key);
    items.push({
      id: `guest-delivery-${guest.id}`,
      filter: 'guests',
      badge: 'Guest',
      actor: guest.name || guest.email || 'Guest',
      ...guestCopy(guest),
      at,
      source: { kind: 'guest', row: guest },
    });
  }

  for (const row of emailRegistrationActivity || []) {
    const key = String(row.email || row.id).toLowerCase();
    if (guestKeys.has(key)) continue;
    const at = row.date || row.created_at;
    if (!at) continue;
    items.push({
      id: `guest-email-${row.id}`,
      filter: 'guests',
      badge: 'Guest',
      actor: row.email || 'Guest',
      ...guestCopy(row),
      at,
      source: { kind: 'guest-email', row },
    });
  }

  for (const row of galleryOpenActivity || []) {
    const at = row.date || row.created_at;
    if (!at) continue;
    items.push({
      id: `open-${row.id}`,
      filter: 'opens',
      badge: 'Opened',
      actor: maskActivityEmail(row.email || 'Visitor'),
      ...openCopy(row),
      at,
      source: { kind: 'open', row },
    });
  }

  return items.sort((a, b) => {
    const ta = asDate(a.at)?.getTime() || 0;
    const tb = asDate(b.at)?.getTime() || 0;
    return tb - ta;
  });
}

export function filterActivityFeedItems(items, filter) {
  if (!filter || filter === 'everything') return items;
  return items.filter((item) => item.filter === filter);
}

export function activitySubTabToFeedFilter(subTab) {
  if (subTab === 'download') return 'downloads';
  if (subTab === 'favorite') return 'selections';
  if (subTab === 'store') return 'orders';
  if (subTab === 'email') return 'guests';
  return 'everything';
}
