import { describe, expect, it } from 'vitest';
import { mapAdminPhotographer } from './adminPhotographerProfile.js';

describe('mapAdminPhotographer', () => {
  it('maps every onboarding field returned by the admin D1 roster', () => {
    const mapped = mapAdminPhotographer({
      id: 'user-1',
      email: 'sam@example.com',
      display_name: 'Sam Rivera',
      first_name: 'Sam',
      last_name: 'Rivera',
      phone: '+919876543210',
      business_name: 'Bloom Studio',
      business_country: 'India',
      time_zone: 'Asia/Kolkata',
      show_phone: 1,
      plan: 'free',
      is_disabled: 0,
      last_login_at: '2026-10-31T10:00:00.000Z',
      created_at: '2026-10-30T10:00:00.000Z',
      storage_used_bytes: 1024,
      delivery_count: 2,
      album_count: 3,
    });

    expect(mapped).toMatchObject({
      id: 'user-1',
      name: 'Sam Rivera',
      firstName: 'Sam',
      lastName: 'Rivera',
      email: 'sam@example.com',
      phone: '+919876543210',
      businessName: 'Bloom Studio',
      businessCountry: 'India',
      timeZone: 'Asia/Kolkata',
      showPhone: true,
      onboardingComplete: true,
      onboardingStarted: true,
      isDisabled: false,
      deliveryCount: 2,
      albumCount: 3,
      storageUsedBytes: 1024,
    });
  });

  it('treats D1 integer zero as a private mobile and pending onboarding', () => {
    const mapped = mapAdminPhotographer({
      id: 'user-2',
      email: 'new@example.com',
      display_name: 'new',
      first_name: '',
      last_name: null,
      phone: null,
      business_name: '',
      show_phone: 0,
    });

    expect(mapped.showPhone).toBe(false);
    expect(mapped.onboardingComplete).toBe(false);
    expect(mapped.onboardingStarted).toBe(false);
    expect(mapped.name).toBe('new');
  });

  it('falls back to first + last name and marks a partial profile as started', () => {
    const mapped = mapAdminPhotographer({
      id: 'user-3',
      first_name: 'Mira',
      last_name: 'Sen',
      business_name: 'Mira Sen Photography',
      show_phone: '0',
    });

    expect(mapped.name).toBe('Mira Sen');
    expect(mapped.phone).toBe('');
    expect(mapped.onboardingComplete).toBe(false);
    expect(mapped.onboardingStarted).toBe(true);
  });

  it('survives an empty row', () => {
    expect(mapAdminPhotographer(null)).toMatchObject({
      id: undefined,
      name: 'Unnamed',
      email: '',
      phone: '',
      onboardingComplete: false,
      onboardingStarted: false,
    });
  });
});
