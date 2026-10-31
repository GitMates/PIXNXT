/**
 * First-run studio onboarding helpers.
 *
 * The flow asks for the smallest set of details we actually store:
 *   full name   → first_name / last_name / display_name
 *   studio name → business_name
 *   mobile      → phone (+ business_country, time_zone captured silently)
 *
 * A profile is treated as "onboarded" once it has a phone number. The gate is
 * intentionally conservative (phone + name + studio all empty) so existing
 * accounts that already added any profile detail are never interrupted.
 */

export const ONBOARDING_PATH = '/onboarding';
export const DEFAULT_POST_ONBOARDING_PATH = '/client-gallery';

/** Common dial codes, India first because PIXNXT's primary market is India. */
export const PHONE_COUNTRIES = [
  { iso: 'IN', name: 'India', dial: '+91' },
  { iso: 'US', name: 'United States', dial: '+1' },
  { iso: 'CA', name: 'Canada', dial: '+1' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { iso: 'AU', name: 'Australia', dial: '+61' },
  { iso: 'SG', name: 'Singapore', dial: '+65' },
  { iso: 'MY', name: 'Malaysia', dial: '+60' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64' },
  { iso: 'ZA', name: 'South Africa', dial: '+27' },
  { iso: 'DE', name: 'Germany', dial: '+49' },
  { iso: 'FR', name: 'France', dial: '+33' },
  { iso: 'IT', name: 'Italy', dial: '+39' },
  { iso: 'ES', name: 'Spain', dial: '+34' },
  { iso: 'NL', name: 'Netherlands', dial: '+31' },
  { iso: 'IE', name: 'Ireland', dial: '+353' },
  { iso: 'PT', name: 'Portugal', dial: '+351' },
  { iso: 'CH', name: 'Switzerland', dial: '+41' },
  { iso: 'SE', name: 'Sweden', dial: '+46' },
  { iso: 'NO', name: 'Norway', dial: '+47' },
  { iso: 'DK', name: 'Denmark', dial: '+45' },
  { iso: 'FI', name: 'Finland', dial: '+358' },
  { iso: 'PL', name: 'Poland', dial: '+48' },
  { iso: 'AT', name: 'Austria', dial: '+43' },
  { iso: 'BE', name: 'Belgium', dial: '+32' },
  { iso: 'GR', name: 'Greece', dial: '+30' },
  { iso: 'TR', name: 'Turkey', dial: '+90' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { iso: 'QA', name: 'Qatar', dial: '+974' },
  { iso: 'KW', name: 'Kuwait', dial: '+965' },
  { iso: 'BH', name: 'Bahrain', dial: '+973' },
  { iso: 'OM', name: 'Oman', dial: '+968' },
  { iso: 'IL', name: 'Israel', dial: '+972' },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94' },
  { iso: 'NP', name: 'Nepal', dial: '+977' },
  { iso: 'BD', name: 'Bangladesh', dial: '+880' },
  { iso: 'PK', name: 'Pakistan', dial: '+92' },
  { iso: 'ID', name: 'Indonesia', dial: '+62' },
  { iso: 'PH', name: 'Philippines', dial: '+63' },
  { iso: 'TH', name: 'Thailand', dial: '+66' },
  { iso: 'VN', name: 'Vietnam', dial: '+84' },
  { iso: 'JP', name: 'Japan', dial: '+81' },
  { iso: 'KR', name: 'South Korea', dial: '+82' },
  { iso: 'CN', name: 'China', dial: '+86' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852' },
  { iso: 'TW', name: 'Taiwan', dial: '+886' },
  { iso: 'BR', name: 'Brazil', dial: '+55' },
  { iso: 'MX', name: 'Mexico', dial: '+52' },
  { iso: 'AR', name: 'Argentina', dial: '+54' },
  { iso: 'CL', name: 'Chile', dial: '+56' },
  { iso: 'CO', name: 'Colombia', dial: '+57' },
  { iso: 'PE', name: 'Peru', dial: '+51' },
];

/** Used when the visitor's country is not in the curated list. */
export const OTHER_COUNTRY = { iso: 'OTHER', name: 'Other', dial: '' };

/** First-run onboarding defaults to India; a saved profile country overrides it. */
export function guessDefaultCountry() {
  return PHONE_COUNTRIES[0];
}

/** Split a display name into the first_name / last_name columns. */
export function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Turn an email-prefix style display name ("sam.k" / "sam_k") into a friendly
 * name, while leaving real names untouched.
 */
export function prettifyAccountName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/\s/.test(raw)) return raw;
  if (/[._-]/.test(raw)) {
    return raw
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  if (raw === raw.toLowerCase()) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return raw;
}

/**
 * Normalize a national phone number to E.164.
 * Handles pasted numbers that still include the selected country code and
 * leading trunk zeros.
 */
export function normalizePhoneNumber(raw, country) {
  const source = String(raw || '').trim();
  const dialDigits = String(country?.dial || '').replace(/\D/g, '');
  if (!source) return { ok: false, error: 'Please enter your mobile number.' };
  if (!dialDigits) return { ok: false, error: 'Please enter your country code.' };

  let digits = source.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Please enter a valid mobile number.' };

  // If the visitor pasted +91 98765 43210 into the number field, drop the
  // duplicated country code instead of creating +91 9198…
  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 6) {
    digits = digits.slice(dialDigits.length);
  }
  digits = digits.replace(/^0+/, '');

  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, error: 'Enter a valid mobile number (7–15 digits).' };
  }
  return { ok: true, digits, e164: `+${dialDigits}${digits}` };
}

/** Split a stored E.164 value back into country + national digits. */
export function splitStoredPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  const match = PHONE_COUNTRIES
    .map((country) => ({ country, dial: country.dial.replace(/\D/g, '') }))
    .filter((entry) => entry.dial && digits.startsWith(entry.dial))
    .sort((a, b) => b.dial.length - a.dial.length)[0];
  if (!match) return null;
  return {
    country: match.country,
    national: digits.slice(match.dial.length),
  };
}

/** True only for clearly-untouched accounts. Fails open for existing users. */
export function profileNeedsOnboarding(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const phone = String(profile.phone || '').trim();
  const firstName = String(profile.first_name || '').trim();
  const businessName = String(profile.business_name || '').trim();
  return !phone && !firstName && !businessName;
}

/**
 * D1 stores booleans as INTEGER, so a saved `show_phone` comes back as 1/0
 * (or "1"/"0" after older migrations). Treat all of those as enabled.
 */
export function profileFlagEnabled(value) {
  return value === true
    || value === 1
    || value === '1'
    || String(value).toLowerCase() === 'true';
}

/**
 * Confirm the D1 row returned by PATCH /v1/me/profile actually contains the
 * onboarding values we sent. The endpoint reads the row back from D1 after the
 * UPDATE, so a mismatch (or a missing/readonly column) is caught here instead
 * of being hidden behind a local cache and losing the user's details.
 */
export function verifySavedOnboardingProfile(saved, expected) {
  if (!saved || typeof saved !== 'object') {
    return {
      ok: false,
      error: 'We could not confirm your details were saved. Please try again.',
    };
  }

  const text = (value) => String(value ?? '').trim();

  if (text(saved.phone) !== text(expected?.phone)) {
    return {
      ok: false,
      error: 'Your mobile number did not save correctly. Please try again.',
    };
  }

  if (
    text(saved.display_name) !== text(expected?.display_name)
    || text(saved.first_name) !== text(expected?.first_name)
    || text(saved.last_name) !== text(expected?.last_name)
  ) {
    return {
      ok: false,
      error: 'Your name did not save correctly. Please try again.',
    };
  }

  const expectedBusiness = text(expected?.business_name);
  if (expectedBusiness && text(saved.business_name) !== expectedBusiness) {
    return {
      ok: false,
      error: 'Your studio name did not save correctly. Please try again.',
    };
  }

  if (profileFlagEnabled(saved.show_phone) !== Boolean(expected?.show_phone)) {
    return {
      ok: false,
      error: 'Your phone privacy setting did not save correctly. Please try again.',
    };
  }

  return { ok: true, error: '' };
}

/** Only allow same-origin app paths as a post-onboarding destination. */
export function resolvePostOnboardingPath(from) {
  const raw = typeof from === 'string'
    ? from
    : from
      ? `${from.pathname || ''}${from.search || ''}${from.hash || ''}`
      : '';
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return DEFAULT_POST_ONBOARDING_PATH;
  }
  if (raw === ONBOARDING_PATH || raw.startsWith(`${ONBOARDING_PATH}/`)) {
    return DEFAULT_POST_ONBOARDING_PATH;
  }
  return raw;
}
