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
    case 'activity':
      return list.sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime();
        const tb = new Date(b.updated_at || b.created_at || 0).getTime();
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      });
    case 'name':
    case 'name-az':
      return list.sort((a, b) => nameKey(a).localeCompare(nameKey(b)));
    case 'name-za':
      return list.sort((a, b) => nameKey(b).localeCompare(nameKey(a)));
    case 'shoot':
    case 'event-new':
      return list.sort((a, b) => eventAt(b) - eventAt(a));
    case 'event-old':
      return list.sort((a, b) => eventAt(a) - eventAt(b));
    case 'closing':
      return list.sort((a, b) => {
        const ta = a.auto_expiry ? new Date(a.auto_expiry).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.auto_expiry ? new Date(b.auto_expiry).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      });
    case 'earning':
      return list.sort((a, b) => (Number(b.store_earnings) || 0) - (Number(a.store_earnings) || 0));
    case 'largest':
      return list.sort((a, b) => (Number(b.storage_bytes) || 0) - (Number(a.storage_bytes) || 0));
    case 'created-new':
    default:
      return list.sort((a, b) => createdAt(b) - createdAt(a));
  }
}
