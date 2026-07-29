export function getGuestDeliveryDbErrorMessage(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (
    code === 'pgrst205' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('guest_delivery_events')
  ) {
    return 'Guest Delivery database tables are not set up yet. Run the guest_delivery migration in Supabase, then refresh this page.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}
