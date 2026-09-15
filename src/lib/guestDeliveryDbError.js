export function getGuestDeliveryDbErrorMessage(error) {
  const msg = String(error?.message || '').toLowerCase();

  if (
    msg.includes('could not find the table') ||
    msg.includes('guest_delivery_events')
  ) {
    return 'Guest Delivery data is not available yet. Run the guest_delivery migration on the Cloudflare backend, then refresh this page.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}
