function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFavoriteCreatedAt(date) {
  if (!date) return '—';
  return new Date(date)
    .toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(',', ' -');
}

export function resolveFavoritePhotoSetLabel(photo, sets = [], highlightsName = 'Highlights') {
  if (!photo?.set_id) return highlightsName;
  return sets.find((s) => s.id === photo.set_id)?.name || highlightsName;
}

/** Rows for favorite list Excel export. */
export function buildFavoriteListExportRows(itemRows = [], sets = [], highlightsName = 'Highlights') {
  return (itemRows || []).map((row) => {
    const ph = row.photo;
    return {
      name: ph?.filename || ph?.original_filename || 'Photo',
      photoset: resolveFavoritePhotoSetLabel(ph, sets, highlightsName),
      createdAt: formatFavoriteCreatedAt(row.itemCreatedAt),
    };
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const EXPORT_HEADERS = ['Image name', 'Photoset', 'Created at'];

/**
 * Excel-compatible .xls (HTML table) for a favorite list's photos.
 */
export function exportFavoriteListExcel(itemRows, sets, highlightsName, filenameBase = 'favorites') {
  const rows = buildFavoriteListExportRows(itemRows, sets, highlightsName);
  if (!rows.length) return false;

  const tableRows = rows
    .map(
      (r) =>
        `<tr>` +
        `<td>${escapeHtml(r.name)}</td>` +
        `<td>${escapeHtml(r.photoset)}</td>` +
        `<td>${escapeHtml(r.createdAt)}</td>` +
        `</tr>`
    )
    .join('');

  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="UTF-8"></head><body>` +
    `<table border="1"><thead><tr>` +
    EXPORT_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('') +
    `</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${filenameBase}.xls`);
  return true;
}
