export function getMobileGalleryDbErrorMessage(error) {
  const msg = String(error?.message || '').toLowerCase();

  if (
    msg.includes('could not find the table') ||
    msg.includes('mobile_gallery_apps')
  ) {
    return 'Mobile Gallery data is not available yet. Run the mobile-gallery migration on the Cloudflare backend, then refresh this page.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}
