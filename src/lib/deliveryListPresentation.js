import { toDbDeliveryStatus, DELIVERY_STATUS } from './deliveryStatus';

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v|mkv|avi|wmv)$/i;
const SMALL_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export const DELIVERY_SHOW_FILTERS = [
  { id: 'needs-you', label: 'Needs you' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'live', label: 'Live' },
  { id: 'closing-soon', label: 'Closing soon' },
  { id: 'everything', label: 'Everything' },
];

export const DELIVERY_SORT_OPTIONS = [
  { id: 'activity', label: 'Recent activity' },
  { id: 'name', label: 'Name' },
  { id: 'shoot', label: 'Date of the shoot' },
  { id: 'closing', label: 'Closing soonest' },
  { id: 'earning', label: 'Best earning' },
  { id: 'largest', label: 'Largest first' },
];

export function isVideoFilename(name) {
  return VIDEO_EXT.test(String(name || ''));
}

export function countStillsAndFilms(collection) {
  const names = collection?.photo_filenames;
  if (Array.isArray(names) && names.length) {
    let films = 0;
    for (const name of names) {
      if (isVideoFilename(name)) films += 1;
    }
    return {
      photographs: Math.max(0, names.length - films),
      films,
    };
  }
  const total = Number(collection?.photo_count) || 0;
  const films = Number(collection?.video_count) || 0;
  return { photographs: Math.max(0, total - films), films };
}

export function deliveryUiStatus(collection) {
  const db = toDbDeliveryStatus(collection?.status);
  if (db === DELIVERY_STATUS.published) return 'live';
  if (db === DELIVERY_STATUS.archived) return 'closed';
  return 'draft';
}

export function deliveryUiStatusLabel(collection) {
  const status = deliveryUiStatus(collection);
  if (status === 'live') return 'Live';
  if (status === 'closed') return 'Closed';
  return 'Draft';
}

export function formatDeliveryShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDeliveryFullDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysPastExpiry(collection) {
  const raw = collection?.auto_expiry;
  if (!raw) return 0;
  const expiry = new Date(raw);
  if (Number.isNaN(expiry.getTime())) return 0;
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.floor((startOfToday() - expiry) / 86400000);
  return diff > 0 ? diff : 0;
}

export function isClosingSoon(collection) {
  const raw = collection?.auto_expiry;
  if (!raw || daysPastExpiry(collection) > 0) return false;
  const expiry = new Date(raw);
  if (Number.isNaN(expiry.getTime())) return false;
  const days = Math.ceil((expiry.setHours(0, 0, 0, 0) - startOfToday()) / 86400000);
  return days >= 0 && days <= 14;
}

export function deliveryAttentionBadge(collection) {
  const late = daysPastExpiry(collection);
  if (late > 0) {
    return { kind: 'late', label: `${late} day${late === 1 ? '' : 's'} late` };
  }
  if (collection?.order_stuck) return { kind: 'order', label: 'Order stuck' };
  if (collection?.list_submitted) return { kind: 'list', label: 'List submitted' };
  return null;
}

export function deliveryNeedsYou(collection) {
  return Boolean(
    deliveryAttentionBadge(collection) || collection?.list_submitted || collection?.order_stuck
  );
}

export function filterDeliveriesByShow(collections, showId) {
  const list = collections || [];
  if (!showId || showId === 'everything') return list;
  if (showId === 'drafts') return list.filter((c) => deliveryUiStatus(c) === 'draft');
  if (showId === 'live') return list.filter((c) => deliveryUiStatus(c) === 'live');
  if (showId === 'closing-soon') return list.filter((c) => isClosingSoon(c));
  if (showId === 'needs-you') return list.filter((c) => deliveryNeedsYou(c) || daysPastExpiry(c) > 0);
  return list;
}

export function countDeliveriesByShow(collections) {
  const list = collections || [];
  return {
    'needs-you': list.filter((c) => deliveryNeedsYou(c) || daysPastExpiry(c) > 0).length,
    drafts: list.filter((c) => deliveryUiStatus(c) === 'draft').length,
    live: list.filter((c) => deliveryUiStatus(c) === 'live').length,
    'closing-soon': list.filter((c) => isClosingSoon(c)).length,
    everything: list.length,
  };
}

function wordForCount(n) {
  if (n >= 0 && n < SMALL_WORDS.length) return SMALL_WORDS[n];
  return String(n);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function deliveryBoardSummary(collections) {
  const list = collections || [];
  const needs = list.filter((c) => deliveryNeedsYou(c) && daysPastExpiry(c) === 0).length;
  const overdue = list.filter((c) => daysPastExpiry(c) > 0).length;
  const needsLead = `${capitalize(wordForCount(needs))} ${needs === 1 ? 'delivery needs' : 'deliveries need'} you`;
  const overdueLead = `${capitalize(wordForCount(overdue))} ${overdue === 1 ? 'is' : 'are'} past the date you promised`;

  if (needs > 0 && overdue > 0) {
    return {
      lead: needsLead,
      rest: `, and ${wordForCount(overdue)} ${overdue === 1 ? 'is' : 'are'} past the date you promised. Everything else is moving.`,
    };
  }
  if (needs > 0) {
    return { lead: needsLead, rest: '. Everything else is moving.' };
  }
  if (overdue > 0) {
    return { lead: overdueLead, rest: '. Everything else is moving.' };
  }
  return { lead: '', rest: 'Everything is moving.' };
}

export function coverFallbackIndex(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 6;
}
