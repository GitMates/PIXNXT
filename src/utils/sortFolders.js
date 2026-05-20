/**
 * Sort folder rows for the client gallery (same keys as collections where possible).
 * @param {Array} folders
 * @param {string} sortKey
 */
export function sortFolders(folders, sortKey) {
  const list = [...(folders || [])];

  const createdAt = (f) => {
    const t = new Date(f.created_at || 0).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const eventAt = (f) => {
    if (!f.event_date) return 0;
    const t = new Date(f.event_date).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const nameKey = (f) => String(f.name || '').trim().toLowerCase();

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
