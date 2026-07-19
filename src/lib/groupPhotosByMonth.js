const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatPhotoMonthLabel(dateValue) {
  if (!dateValue) return 'Unknown date';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function groupPhotosByMonth(photos) {
  const groups = new Map();

  for (const photo of photos || []) {
    const dateValue = photo.exif_taken_at || photo.created_at;
    const label = formatPhotoMonthLabel(dateValue);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(photo);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    photos: items,
    sortKey: new Date(items[0]?.exif_taken_at || items[0]?.created_at || 0).getTime(),
  })).sort((a, b) => b.sortKey - a.sortKey);
}
