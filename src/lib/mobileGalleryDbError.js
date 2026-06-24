export function getMobileGalleryDbErrorMessage(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (
    code === 'pgrst205' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('mobile_gallery_apps')
  ) {
    return 'Mobile Gallery database tables are not set up yet. Run scripts/setup-mobile-gallery-db.sql in your Supabase SQL Editor, then refresh this page.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}
