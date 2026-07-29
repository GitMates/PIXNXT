import { getSupabaseAdmin } from '../photoAi/supabaseAdmin.js';

const PHOTO_FIELDS =
  'id, filename, full_url, thumbnail_url, width, height, position, created_at';

export async function handleGuestGalleryRequest(body) {
  const slug = String(body?.slug || '').trim();
  const accessToken = String(body?.accessToken || body?.token || '').trim();

  if (!slug || !accessToken) {
    throw new Error('Event and access token are required.');
  }

  const db = getSupabaseAdmin();
  if (!db) throw new Error('Server is not configured for guest gallery.');

  const { data: event, error: eventError } = await db
    .from('guest_delivery_events')
    .select('id, name, slug, status, event_date, cover_image_url, published_at, collection_id')
    .eq('slug', slug)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!event) throw new Error('Event not found for this link.');
  if (event.status !== 'published') {
    throw new Error('This gallery is not available yet.');
  }

  const { data: guest, error: guestError } = await db
    .from('event_guests')
    .select('id, name, email, access_token, matched_photo_count, delivery_status')
    .eq('event_id', event.id)
    .eq('access_token', accessToken)
    .maybeSingle();

  if (guestError) throw guestError;
  if (!guest) throw new Error('Invalid or expired guest link. Use Copy link from Guests, or resend the email.');

  const { data: matches, error: matchError } = await db
    .from('event_guest_matches')
    .select('photo_id, similarity')
    .eq('guest_id', guest.id)
    .order('similarity', { ascending: false });

  if (matchError) throw matchError;

  const photoIds = (matches || []).map((m) => m.photo_id).filter(Boolean);
  if (!photoIds.length) {
    return {
      event: {
        name: event.name,
        slug: event.slug,
        eventDate: event.event_date,
        coverImageUrl: event.cover_image_url,
      },
      guest: {
        name: guest.name,
        matchedPhotoCount: 0,
      },
      photos: [],
    };
  }

  let photos;
  if (event.collection_id) {
    const { data, error: pErr } = await db
      .from('photos')
      .select(PHOTO_FIELDS)
      .eq('collection_id', event.collection_id)
      .in('id', photoIds);
    if (pErr) throw pErr;
    photos = data;
  } else {
    const { data, error: pErr } = await db
      .from('guest_delivery_photos')
      .select(PHOTO_FIELDS)
      .eq('event_id', event.id)
      .in('id', photoIds);
    if (pErr) throw pErr;
    photos = data;
  }

  const similarityByPhotoId = Object.fromEntries(
    (matches || []).map((m) => [m.photo_id, m.similarity])
  );

  const sortedPhotos = (photos || [])
    .map((photo) => ({
      ...photo,
      similarity: similarityByPhotoId[photo.id] ?? null,
    }))
    .sort((a, b) => {
      const pos = (a.position ?? 0) - (b.position ?? 0);
      if (pos !== 0) return pos;
      return String(a.created_at).localeCompare(String(b.created_at));
    });

  return {
    event: {
      name: event.name,
      slug: event.slug,
      eventDate: event.event_date,
      coverImageUrl: event.cover_image_url,
    },
    guest: {
      name: guest.name,
      matchedPhotoCount: sortedPhotos.length,
    },
    photos: sortedPhotos,
  };
}
