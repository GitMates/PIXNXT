/**
 * Relative timestamps for album / activity UIs.
 *
 * Compact relative (notifications, etc.):
 * - < 45s → "Just now"
 * - < 60m → "Xm ago"
 * - < 24h → "Xh ago"
 * - previous calendar day → "Yesterday"
 * - < 7d → "Xd ago"
 * - < 30d → "Xw ago"
 * - else → absolute date
 *
 * Album card time (list/grid):
 * - < 60s → "Just now"
 * - same calendar day → clock time ("4:42 PM") so each album stays distinct
 * - Yesterday → "Yesterday"
 * - < 7d → "Xd ago"
 * - else → absolute date
 */

const MS_SEC = 1000;
const MS_MIN = 60 * MS_SEC;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

function toValidDate(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatAbsoluteDate(date, { now = new Date() } = {}) {
    const sameYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
}

function formatClockTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

/** Full absolute stamp for tooltips / accessibility. */
export function formatAbsoluteDateTime(value) {
    const date = toValidDate(value);
    if (!date) return '';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * @param {string|number|Date|null|undefined} value
 * @param {{ now?: Date|number, style?: 'compact'|'long' }} [options]
 * @returns {string}
 */
export function formatRelativeTime(value, options = {}) {
    const date = toValidDate(value);
    if (!date) return '';

    const now = toValidDate(options.now) || new Date();
    const style = options.style === 'long' ? 'long' : 'compact';

    let diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) diffMs = 0;

    const secs = Math.floor(diffMs / MS_SEC);
    if (secs < 45) return 'Just now';

    const mins = Math.floor(diffMs / MS_MIN);
    if (mins < 60) {
        if (style === 'long') {
            return `${mins} minute${mins === 1 ? '' : 's'} ago`;
        }
        return `${mins}m ago`;
    }

    const hours = Math.floor(diffMs / MS_HOUR);
    if (hours < 24) {
        if (style === 'long') {
            return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        }
        return `${hours}h ago`;
    }

    const todayStart = startOfLocalDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    if (date >= yesterdayStart && date < todayStart) {
        return 'Yesterday';
    }

    const days = Math.floor(diffMs / MS_DAY);
    if (days < 7) {
        if (style === 'long') {
            return `${days} day${days === 1 ? '' : 's'} ago`;
        }
        return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (days < 30) {
        if (style === 'long') {
            return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
        }
        return `${weeks}w ago`;
    }

    return formatAbsoluteDate(date, { now });
}

/**
 * Per-album card/list time — prefers a concrete clock time for today
 * so two recent albums don't both read as "Just now" / "1m ago".
 *
 * @param {string|number|Date|null|undefined} value
 * @param {{ now?: Date|number }} [options]
 * @returns {string}
 */
export function formatAlbumCardTime(value, options = {}) {
    const date = toValidDate(value);
    if (!date) return '';

    const now = toValidDate(options.now) || new Date();
    let diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) diffMs = 0;

    if (diffMs < 60 * MS_SEC) return 'Just now';

    const todayStart = startOfLocalDay(now);
    if (date >= todayStart) {
        return formatClockTime(date);
    }

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    if (date >= yesterdayStart) return 'Yesterday';

    const days = Math.floor(diffMs / MS_DAY);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return formatAbsoluteDate(date, { now });
}

/** Milliseconds until the compact label would change for this timestamp. */
export function msUntilRelativeTimeChange(value, options = {}) {
    const date = toValidDate(value);
    if (!date) return null;
    const now = toValidDate(options.now) || new Date();
    let diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return Math.min(-diffMs + 50, 30_000);

    if (diffMs < 45 * MS_SEC) return 45 * MS_SEC - diffMs + 50;
    if (diffMs < MS_HOUR) return MS_MIN - (diffMs % MS_MIN) + 50;
    if (diffMs < MS_DAY) return MS_HOUR - (diffMs % MS_HOUR) + 50;

    const todayStart = startOfLocalDay(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return Math.max(tomorrowStart.getTime() - now.getTime(), MS_HOUR);
}
