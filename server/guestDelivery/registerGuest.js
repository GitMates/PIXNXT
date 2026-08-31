import { getSupabaseAdmin } from '../photoAi/supabaseAdmin.js';
import { decodeBase64Image, uploadBytesToR2 } from './r2Server.js';
import { matchGuestToCollectionPhotos } from '../photoAi/applyGuestLabels.js';
import {
  buildUserModulePath,
  fetchPhotographerR2Folder,
  R2_USER_MODULES,
  safeR2PathSegment,
} from '../../src/lib/photographerR2FolderCore.js';

const GUEST_FIELDS =
  'id, event_id, name, email, phone, access_token, selfie_url, registered_at, delivery_status';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateAccessToken() {
  // Avoid ambiguous characters (0/O, 1/l/I) so emailed links are easy to copy.
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 24; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function safePathSegment(value, fallback = 'item') {
  return safeR2PathSegment(value, fallback);
}

export async function handleRegisterGuestRequest(body) {
  const db = getSupabaseAdmin();
  if (!db) throw new Error('Server is not configured for guest registration.');

  const slug = String(body?.slug || '').trim();
  const name = normalizeName(body?.name);
  const email = normalizeEmail(body?.email);
  const phone = body?.phone ? String(body.phone).trim() : null;

  if (!slug) throw new Error('Event not found.');
  if (!name) throw new Error('Name is required.');
  if (!email || !isValidEmail(email)) throw new Error('A valid email is required.');

  const { data: event, error: eventError } = await db
    .from('guest_delivery_events')
    .select('id, photographer_id, name, slug, registration_enabled, status, collection_id, match_threshold')
    .eq('slug', slug)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!event) throw new Error('Event not found.');

  if (event.registration_enabled === false) {
    throw new Error('Registration is closed for this event.');
  }

  if (String(event.status || '').toLowerCase() === 'archived') {
    throw new Error('Registration is closed for this event.');
  }

  const { data: existingGuest } = await db
    .from('event_guests')
    .select('id')
    .eq('event_id', event.id)
    .eq('email', email)
    .maybeSingle();

  if (existingGuest) {
    throw new Error('This email is already registered for this event.');
  }

  const imageBytes = decodeBase64Image(body?.selfieBase64);
  if (!imageBytes?.length) {
    throw new Error('Selfie image is required.');
  }
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.jpg`;
  const eventFolder = `${safePathSegment(event.name, 'event')}__${event.id}`;
  const photographerFolder = await fetchPhotographerR2Folder(db, event.photographer_id);
  const storagePath = buildUserModulePath(
    photographerFolder,
    R2_USER_MODULES.GUEST_DELIVERY,
    eventFolder,
    'selfies',
    fileName
  );

  const { url: selfieUrl } = await uploadBytesToR2(storagePath, imageBytes, 'image/jpeg');

  let accessToken = generateAccessToken();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: tokenConflict } = await db
      .from('event_guests')
      .select('id')
      .eq('access_token', accessToken)
      .maybeSingle();
    if (!tokenConflict) break;
    accessToken = generateAccessToken();
  }

  const now = new Date().toISOString();
  const { data: guest, error: insertError } = await db
    .from('event_guests')
    .insert([
      {
        event_id: event.id,
        photographer_id: event.photographer_id,
        name,
        email,
        phone,
        access_token: accessToken,
        selfie_storage_path: storagePath,
        selfie_url: selfieUrl,
        delivery_status: 'pending',
        updated_at: now,
      },
    ])
    .select(GUEST_FIELDS)
    .single();

  if (insertError) throw insertError;

  if (event.collection_id) {
    try {
      await matchGuestToCollectionPhotos(db, event.collection_id, event.id, guest, {
        threshold: event.match_threshold,
      });
    } catch (matchErr) {
      console.warn('[registerGuest] collection face match deferred:', matchErr?.message || matchErr);
    }
  }

  const { data: countRow } = await db
    .from('guest_delivery_events')
    .select('guest_count')
    .eq('id', event.id)
    .maybeSingle();

  await db
    .from('guest_delivery_events')
    .update({
      guest_count: (countRow?.guest_count || 0) + 1,
      updated_at: now,
    })
    .eq('id', event.id);

  return {
    guestId: guest.id,
    name: guest.name,
    email: guest.email,
    registeredAt: guest.registered_at,
  };
}
