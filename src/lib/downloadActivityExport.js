import {
  countPhotosForDownloadActivity,
  formatDownloadDestination,
} from './downloadActivityResolve';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDownloadDate(date) {
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

/** Normalized rows for export (Excel / PDF / CSV). */
export function buildDownloadActivityExportRows(items, photos = [], sets = []) {
  return (items || []).map((item) => ({
    id: item.id,
    email: item.email || 'Unknown visitor',
    photoSet:
      item.setName && item.setName !== 'Unknown Set' ? item.setName : 'Highlights',
    photos: countPhotosForDownloadActivity(item, photos, sets),
    savedTo: formatDownloadDestination(item.destination),
    pin: item.pin !== '---' ? item.pin : item.pinUsed ? 'Yes' : '---',
    dateDownloaded: formatDownloadDate(item.date),
  }));
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

const EXPORT_HEADERS = ['Email', 'Photo Set', 'Photos', 'Saved to', 'PIN', 'Date Downloaded'];

/**
 * Excel-compatible .xls (HTML table) — opens directly in Microsoft Excel.
 */
export function exportDownloadActivityExcel(items, photos, sets, filenameBase = 'download-activity') {
  const rows = buildDownloadActivityExportRows(items, photos, sets);
  if (!rows.length) return false;

  const tableRows = rows
    .map(
      (r) =>
        `<tr>` +
        `<td>${escapeHtml(r.email)}</td>` +
        `<td>${escapeHtml(r.photoSet)}</td>` +
        `<td>${escapeHtml(r.photos)}</td>` +
        `<td>${escapeHtml(r.savedTo)}</td>` +
        `<td>${escapeHtml(r.pin)}</td>` +
        `<td>${escapeHtml(r.dateDownloaded)}</td>` +
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

/**
 * Opens a print-ready report; user can save as PDF from the browser print dialog.
 */
export function exportDownloadActivityPdf(items, photos, sets, filenameBase = 'download-activity') {
  const rows = buildDownloadActivityExportRows(items, photos, sets);
  if (!rows.length) return false;

  const tableRows = rows
    .map(
      (r) =>
        `<tr>` +
        `<td>${escapeHtml(r.email)}</td>` +
        `<td>${escapeHtml(r.photoSet)}</td>` +
        `<td>${escapeHtml(r.photos)}</td>` +
        `<td>${escapeHtml(r.savedTo)}</td>` +
        `<td>${escapeHtml(r.pin)}</td>` +
        `<td>${escapeHtml(r.dateDownloaded)}</td>` +
        `</tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(filenameBase)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p { font-size: 12px; color: #666; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { body { padding: 12px; } }
</style></head><body>
<h1>Download Activity</h1>
<p>Exported ${rows.length} record(s) · ${new Date().toLocaleString()}</p>
<table><thead><tr>${EXPORT_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
<tbody>${tableRows}</tbody></table></body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Allow popups to export PDF, then try again.');
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* ignore */
    }
  }, 400);
  return true;
}

/** Legacy CSV export (still used from detail modal if needed). */
export function exportDownloadActivityCsv(items, photos, sets, filenameBase = 'download-activity') {
  const rows = buildDownloadActivityExportRows(items, photos, sets);
  if (!rows.length) return false;

  const csvContent = [
    EXPORT_HEADERS.join(','),
    ...rows.map((r) =>
      [r.email, r.photoSet, r.photos, r.savedTo, r.pin, r.dateDownloaded]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filenameBase}.csv`);
  return true;
}
