/**
 * Sort collection rows for the client gallery dashboard.
 * @param {Array} collections
 * @param {string} sortKey - created-new | created-old | event-new | event-old | name-az | name-za
 */
export function sortCollections(collections, sortKey) {
  const list = [...(collections || [])];

  const createdAt = (c) => {
    const t = new Date(c.created_at || c.date || 0).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const eventAt = (c) => {
    if (!c.event_date) return 0;
    const t = new Date(c.event_date).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const nameKey = (c) => String(c.name || '').trim().toLowerCase();

  switch (sortKey) {
    case 'created-old':
      return list.sort((a, b) => createdAt(a) - createdAt(b));
    case 'event-new':
      return list.sort((a, b) => eventAt(b) - eventAt(a));
    case 'event-old':
      return list.sort((a, b) => eventAt(a) - eventAt(b));
    case 'name-az':
      return list.sort((a, b) => nameKey(a).localeCompare(nameKey(b)));
    case 'name-za':
      return list.sort((a, b) => nameKey(b).localeCompare(nameKey(a)));
    case 'created-new':
    default:
      return list.sort((a, b) => createdAt(b) - createdAt(a));
  }
}
