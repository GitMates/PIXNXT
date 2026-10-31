import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POST_ONBOARDING_PATH,
  PHONE_COUNTRIES,
  guessDefaultCountry,
  normalizePhoneNumber,
  prettifyAccountName,
  profileFlagEnabled,
  profileNeedsOnboarding,
  resolvePostOnboardingPath,
  splitFullName,
  splitStoredPhone,
  verifySavedOnboardingProfile,
} from './onboarding.js';

const india = PHONE_COUNTRIES.find((country) => country.iso === 'IN');

describe('guessDefaultCountry', () => {
  it('defaults first-run onboarding to India', () => {
    expect(guessDefaultCountry()).toMatchObject({ iso: 'IN', name: 'India', dial: '+91' });
  });
});

describe('normalizePhoneNumber', () => {
  it('builds E.164 from a local number', () => {
    expect(normalizePhoneNumber('98765 43210', india)).toEqual({
      ok: true,
      digits: '9876543210',
      e164: '+919876543210',
    });
  });

  it('drops a pasted country code instead of duplicating it', () => {
    expect(normalizePhoneNumber('+91 98765 43210', india).e164).toBe('+919876543210');
  });

  it('drops a leading trunk zero', () => {
    expect(normalizePhoneNumber('098765 43210', india).e164).toBe('+919876543210');
  });

  it('rejects empty, short, and dial-code-less input', () => {
    expect(normalizePhoneNumber('', india).ok).toBe(false);
    expect(normalizePhoneNumber('12345', india).ok).toBe(false);
    expect(normalizePhoneNumber('98765 43210', { dial: '' }).ok).toBe(false);
  });
});

describe('splitStoredPhone', () => {
  it('splits a stored E.164 value back into country + national digits', () => {
    expect(splitStoredPhone('+919876543210')).toMatchObject({
      country: { iso: 'IN' },
      national: '9876543210',
    });
  });

  it('returns null for empty or unknown values', () => {
    expect(splitStoredPhone('')).toBeNull();
    expect(splitStoredPhone('+999999999999')).toBeNull();
  });
});

describe('profileNeedsOnboarding', () => {
  it('asks accounts with no saved profile details', () => {
    expect(profileNeedsOnboarding({ display_name: 'sam' })).toBe(true);
    expect(profileNeedsOnboarding({ phone: '  ', first_name: '', business_name: '' })).toBe(true);
  });

  it('never interrupts accounts that already saved a detail', () => {
    expect(profileNeedsOnboarding({ phone: '+919876543210' })).toBe(false);
    expect(profileNeedsOnboarding({ first_name: 'Sam' })).toBe(false);
    expect(profileNeedsOnboarding({ business_name: 'Bloom Studio' })).toBe(false);
  });

  it('fails open when there is no profile', () => {
    expect(profileNeedsOnboarding(null)).toBe(false);
  });
});

describe('profileFlagEnabled', () => {
  it('treats D1 integer and legacy string booleans as enabled', () => {
    expect(profileFlagEnabled(1)).toBe(true);
    expect(profileFlagEnabled('1')).toBe(true);
    expect(profileFlagEnabled(true)).toBe(true);
    expect(profileFlagEnabled('true')).toBe(true);
  });

  it('treats missing / false values as disabled', () => {
    expect(profileFlagEnabled(0)).toBe(false);
    expect(profileFlagEnabled('0')).toBe(false);
    expect(profileFlagEnabled(false)).toBe(false);
    expect(profileFlagEnabled(null)).toBe(false);
    expect(profileFlagEnabled(undefined)).toBe(false);
  });
});

describe('verifySavedOnboardingProfile', () => {
  const expected = {
    display_name: 'Sam Rivera',
    first_name: 'Sam',
    last_name: 'Rivera',
    phone: '+919876543210',
    show_phone: false,
    business_name: 'Bloom Studio',
  };

  const saved = {
    display_name: 'Sam Rivera',
    first_name: 'Sam',
    last_name: 'Rivera',
    phone: '+919876543210',
    show_phone: 0,
    business_name: 'Bloom Studio',
  };

  it('accepts the row read back from D1', () => {
    expect(verifySavedOnboardingProfile(saved, expected)).toEqual({ ok: true, error: '' });
    expect(verifySavedOnboardingProfile({ ...saved, show_phone: 1 }, { ...expected, show_phone: true }).ok).toBe(true);
  });

  it('accepts a skipped studio name', () => {
    expect(verifySavedOnboardingProfile(
      { ...saved, business_name: null },
      { ...expected, business_name: '' },
    ).ok).toBe(true);
  });

  it('fails when D1 did not persist a value', () => {
    expect(verifySavedOnboardingProfile({ ...saved, phone: null }, expected)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/mobile number/i),
    });
    expect(verifySavedOnboardingProfile({ ...saved, display_name: '' }, expected).ok).toBe(false);
    expect(verifySavedOnboardingProfile({ ...saved, first_name: '' }, expected).ok).toBe(false);
    expect(verifySavedOnboardingProfile({ ...saved, last_name: '' }, expected).ok).toBe(false);
    expect(verifySavedOnboardingProfile({ ...saved, business_name: '' }, expected).ok).toBe(false);
    expect(verifySavedOnboardingProfile({ ...saved, show_phone: 1 }, expected).ok).toBe(false);
    expect(verifySavedOnboardingProfile(null, expected).ok).toBe(false);
  });
});

describe('name helpers', () => {
  it('splits the first and remaining name parts', () => {
    expect(splitFullName('Sam Rivera')).toEqual({ firstName: 'Sam', lastName: 'Rivera' });
    expect(splitFullName('Sam van Gogh')).toEqual({ firstName: 'Sam', lastName: 'van Gogh' });
    expect(splitFullName('Sam')).toEqual({ firstName: 'Sam', lastName: '' });
  });

  it('turns email-prefix style names into friendly names', () => {
    expect(prettifyAccountName('sam.k')).toBe('Sam K');
    expect(prettifyAccountName('sam')).toBe('Sam');
    expect(prettifyAccountName('Sam Rivera')).toBe('Sam Rivera');
  });
});

describe('resolvePostOnboardingPath', () => {
  it('keeps same-origin destinations', () => {
    expect(resolvePostOnboardingPath('/dashboard')).toBe('/dashboard');
    expect(resolvePostOnboardingPath({ pathname: '/photos', search: '?a=1' })).toBe('/photos?a=1');
  });

  it('falls back for external or onboarding destinations', () => {
    expect(resolvePostOnboardingPath('https://evil.example')).toBe(DEFAULT_POST_ONBOARDING_PATH);
    expect(resolvePostOnboardingPath('//evil.example')).toBe(DEFAULT_POST_ONBOARDING_PATH);
    expect(resolvePostOnboardingPath('/onboarding')).toBe(DEFAULT_POST_ONBOARDING_PATH);
  });
});
