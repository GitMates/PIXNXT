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

function rowMeta(row) {
  const raw = row?.metadata;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function rowEmail(row) {
  const direct = row?.email || row?.visitor_email || row?.visitorEmail;
  if (direct && String(direct).trim()) return String(direct).trim();
  const meta = rowMeta(row);
  const fromMeta = meta?.email;
  if (fromMeta && String(fromMeta).trim() && String(fromMeta).toLowerCase() !== 'visitor') {
    return String(fromMeta).trim();
  }
  return direct ? String(direct).trim() : null;
}

function rowDate(row) {
  return row?.date || row?.created_at || row?.createdAt || null;
}

function rowInnerMeta(row) {
  const meta = rowMeta(row);
  if (meta && typeof meta.metadata === 'object' && meta.metadata !== null) return meta.metadata;
  return meta;
}

function downloadCopy(row) {
  const inner = rowInnerMeta(row);
  const count = Number(row.photoCount ?? inner?.photoCount ?? 0);
  const resolutionRaw = row.resolution ?? inner?.resolution ?? null;
  const sizeLabel = resolutionRaw ? String(resolutionRaw).toLowerCase() : null;
  const setLabel = row.setName || inner?.setName || null;
  if (row.type === 'gallery') {
    const hasCount = Number.isFinite(count) && count > 0;
    return {
      textParts: [
        { text: hasCount ? 'Downloaded ' : 'Downloaded the ' },
        { text: hasCount ? `${count} photo${count === 1 ? '' : 's'}` : 'full delivery', bold: true },
        ...(setLabel ? [{ text: ` from ${setLabel}` }] : []),
        ...(sizeLabel ? [{ text: ` · ${sizeLabel} size` }] : []),
      ],
    };
  }
  if (row.type === 'video') {
    return {
      textParts: [
        { text: 'Downloaded ' },
        { text: row.filename || 'a video', bold: true },
        ...(sizeLabel ? [{ text: ` · ${sizeLabel} size` }] : []),
      ],
    };
  }
  return {
    textParts: [
      { text: 'Downloaded ' },
      { text: row.filename || '1 photo', bold: true },
      ...(setLabel ? [{ text: ` from ${setLabel}` }] : []),
      ...(sizeLabel ? [{ text: ` · ${sizeLabel} size` }] : []),
    ],
  };
}

function selectionCopy(row) {
  const count = Number(row.photoCount) || 0;
  const max = row.max_selection != null ? Number(row.max_selection) : null;
  const listName = row.name || 'Favorites';
  const progress =
    Number.isFinite(max) && max > 0 ? `${count} of ${max}` : `${count} photo${count === 1 ? '' : 's'}`;
  if (row.submitted_at) {
    return {
      textParts: [
        { text: 'Submitted the ' },
        { text: listName, bold: true },
        { text: ` list · ${progress}` },
      ],
    };
  }
  return {
    textParts: [
      { text: 'Started the ' },
      { text: listName, bold: true },
      { text: ` list · ${progress} so far` },
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
      { text: `Ordered ${qty} print${qty === 1 ? '' : 's'} · ${size}` },
      ...(total ? [{ text: ' · ' }, { text: total, bold: true }] : []),
    ],
  };
}

function guestCopy(row) {
  const matched = Number(row.matched_photo_count);
  if (Number.isFinite(matched) && matched > 0) {
    return {
      textParts: [
        { text: 'Registered by QR and was matched to ' },
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
    textParts: [{ text: `Opened the delivery · ${ordinal} visit` }],
  };
}

/**
 * @returns {Array<{
 *  id: string,
 *  filter: 'downloads'|'selections'|'orders'|'guests'|'opens',
 *  badge: string,
 *  actor: string,
 *  textParts: Array<{text: string, bold?: boolean}>,
 *  highlight?: boolean,
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
    const at = rowDate(row);
    if (!at) continue;
    const inner = rowInnerMeta(row);
    const type = row.type || inner?.type || 'gallery';
    const filename = row.filename || inner?.filename || null;
    items.push({
      id: `download-${row.id}`,
      filter: 'downloads',
      badge: 'Download',
      actor: rowEmail(row) || 'Visitor',
      ...downloadCopy({ ...row, type, filename }),
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
      highlight: Boolean(row.submitted_at),
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
    const email = rowEmail(row);
    const key = String(email || row.id).toLowerCase();
    if (guestKeys.has(key)) continue;
    const at = rowDate(row);
    if (!at) continue;
    items.push({
      id: `guest-email-${row.id}`,
      filter: 'guests',
      badge: 'Guest',
      actor: email || 'Guest',
      ...guestCopy(row),
      at,
      source: { kind: 'guest-email', row },
    });
  }

  for (const row of galleryOpenActivity || []) {
    const at = rowDate(row);
    if (!at) continue;
    items.push({
      id: `open-${row.id}`,
      filter: 'opens',
      badge: 'Opened',
      actor: maskActivityEmail(rowEmail(row) || 'Visitor'),
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
  if (subTab === 'download' || subTab === 'downloads') return 'downloads';
  if (subTab === 'favorite' || subTab === 'favorites' || subTab === 'selections' || subTab === 'selection') return 'selections';
  if (subTab === 'store' || subTab === 'orders' || subTab === 'order') return 'orders';
  if (subTab === 'email' || subTab === 'guests' || subTab === 'guest') return 'guests';
  if (subTab === 'open' || subTab === 'opens' || subTab === 'views') return 'opens';
  return 'everything';
}
