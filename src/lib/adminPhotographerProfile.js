import { profileFlagEnabled } from './onboarding';

const text = (value) => String(value ?? '').trim();

/**
 * Normalize one /v1/admin/photographers row for the admin roster.
 *
 * The API returns the full D1 photographers row, so onboarding details
 * (mobile, studio, country, time zone, privacy flag) travel with it. Map them
 * once here instead of dropping unknown columns in the page component.
 */
export function mapAdminPhotographer(row) {
  const profile = row && typeof row === 'object' ? row : {};
  const firstName = text(profile.first_name);
  const lastName = text(profile.last_name);
  const displayName = text(profile.display_name);
  const fullName = displayName
    || [firstName, lastName].filter(Boolean).join(' ')
    || 'Unnamed';

  const phone = text(profile.phone);
  const businessName = text(profile.business_name);
  const businessCountry = text(profile.business_country);
  const timeZone = text(profile.time_zone);

  return {
    id: profile.id,
    name: fullName,
    firstName,
    lastName,
    email: text(profile.email),
    phone,
    businessName,
    businessCountry,
    timeZone,
    showPhone: profileFlagEnabled(profile.show_phone),
    onboardingComplete: Boolean(phone),
    onboardingStarted: Boolean(phone || firstName || businessName || businessCountry || timeZone),
    plan: profile.plan || 'Unknown',
    isDisabled: Number(profile.is_disabled) === 1 || profile.is_disabled === true,
    lastLoginAt: profile.last_login_at || null,
    joinedAt: profile.created_at || null,
    storageUsedBytes: Number(profile.storage_used_bytes) || 0,
    deliveryCount: Number(profile.delivery_count ?? profile.delivery_used_count) || 0,
    albumCount: Number(profile.album_count ?? profile.album_used_count) || 0,
  };
}
