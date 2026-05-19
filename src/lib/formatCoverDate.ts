export function formatCoverDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';

    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    const getOrdinal = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${month.toUpperCase()} ${getOrdinal(day)}, ${year}`;
  } catch {
    return '';
  }
}

export function formatCollectionHeaderDate(dateStr?: string | null): string {
  if (!dateStr) return '...';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '...';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '...';
  }
}
