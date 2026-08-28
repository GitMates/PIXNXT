import { assertPhotographerOwnsEvent } from './auth.js';
import { indexEventPhotos } from './indexEventPhoto.js';
import { matchGuestSelfie } from './matchGuestSelfie.js';
import { resetGuestDeliveryCollection } from './rekognitionCollection.js';
import { applyGuestLabelsToPeople } from '../photoAi/applyGuestLabels.js';
import { loadPeopleFromDb } from '../photoAi/peopleCache.js';

const GUEST_FIELDS =
  'id, event_id, name, email, phone, access_token, selfie_url, selfie_storage_path, delivery_status, matched_photo_count';

export async function handlePublishEventRequest(req, body) {
  const eventId = body?.eventId;
  if (!eventId) throw new Error('eventId is required.');

  const { db, event } = await assertPhotographerOwnsEvent(req, eventId);

  if (event.status === 'archived') {
    throw new Error('Archived events cannot be published.');
  }

  const useCollectionPhotos = Boolean(event.collection_id);

  const [photosResult, guestsResult] = await Promise.all([
    useCollectionPhotos
      ? db.from('photos').select('id').eq('collection_id', event.collection_id)
      : db.from('guest_delivery_photos').select('id').eq('event_id', eventId),
    db
      .from('event_guests')
      .select(GUEST_FIELDS)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true }),
  ]);

  const { data: photos, error: photosError } = photosResult;
  const { data: guests, error: guestsError } = guestsResult;

  if (photosError) throw photosError;
  if (guestsError) throw guestsError;

  if (!photos?.length) {
    throw new Error('Add at least one photo before publishing.');
  }
  if (!guests?.length) {
    throw new Error('At least one guest must register before publishing.');
  }

  await db.from('event_guest_matches').delete().eq('event_id', eventId);
  if (!useCollectionPhotos) {
    await db.from('guest_delivery_photos').update({ ai_indexed_at: null }).eq('event_id', eventId);
  }

  await resetGuestDeliveryCollection(eventId);
  const indexing = await indexEventPhotos(eventId, {
    supabase: db,
    force: true,
    collectionId: useCollectionPhotos ? event.collection_id : null,
  });

  if (indexing.indexed === 0) {
    const detail =
      indexing.noFaces > 0
        ? 'No faces were detected in the uploaded photos. Use clear photos where faces are visible.'
        : 'Could not index photos for face matching. Check AWS credentials and photo URLs.';
    throw new Error(detail);
  }

  const threshold = Math.min(Math.max(Number(event.match_threshold) || 85, 70), 99);
  const eventPhotoIds = new Set((photos || []).map((p) => p.id));
  const guestResults = [];

  for (const guest of guests) {
    const now = new Date().toISOString();
    await db
      .from('event_guests')
      .update({ delivery_status: 'matching', updated_at: now })
      .eq('id', guest.id);

    try {
      const matchResult = await matchGuestSelfie({
        eventId,
        collectionId: useCollectionPhotos ? event.collection_id : null,
        guest,
        threshold,
      });

      const eventMatches = matchResult.matches.filter((m) => eventPhotoIds.has(m.photoId));
      const matchedCount = new Set(eventMatches.map((m) => m.photoId)).size;

      if (eventMatches.length > 0) {
        const rows = eventMatches.map((m) => ({
          event_id: eventId,
          guest_id: guest.id,
          photo_id: m.photoId,
          face_id: m.faceId,
          similarity: m.similarity,
        }));

        const { error: matchInsertError } = await db
          .from('event_guest_matches')
          .upsert(rows, { onConflict: 'guest_id,photo_id' });
        if (matchInsertError) throw matchInsertError;
      }

      const deliveryStatus = matchedCount > 0 ? 'matched' : 'no_match';

      const { data: updatedGuest, error: guestUpdateError } = await db
        .from('event_guests')
        .update({
          delivery_status: deliveryStatus,
          matched_photo_count: matchedCount,
          updated_at: now,
        })
        .eq('id', guest.id)
        .select(GUEST_FIELDS)
        .single();

      if (guestUpdateError) throw guestUpdateError;

      guestResults.push({
        guestId: guest.id,
        ok: true,
        matched: matchedCount > 0,
        matchedPhotoCount: matchedCount,
        thresholdUsed: matchResult.thresholdUsed,
        guest: updatedGuest,
      });
    } catch (err) {
      console.error(`[guest-delivery/publish] guest ${guest.id}`, err);
      await db
        .from('event_guests')
        .update({
          delivery_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', guest.id);

      guestResults.push({
        guestId: guest.id,
        ok: false,
        error: err?.message || 'Matching failed',
        guest: { ...guest, delivery_status: 'failed' },
      });
    }
  }

  const publishedAt = new Date().toISOString();
  const { data: updatedEvent, error: eventUpdateError } = await db
    .from('guest_delivery_events')
    .update({
      status: 'published',
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq('id', eventId)
    .select(
      'id, photographer_id, name, slug, status, match_threshold, published_at, photo_count, guest_count, registration_enabled'
    )
    .single();

  if (eventUpdateError) throw eventUpdateError;

  if (useCollectionPhotos && event.collection_id) {
    try {
      const { people } = await loadPeopleFromDb(db, event.collection_id);
      if (people.length) {
        await applyGuestLabelsToPeople(db, event.collection_id, people, {
          persist: true,
          syncGuestMatches: false,
        });
      }
    } catch (labelErr) {
      console.warn('[guest-delivery/publish] people label sync failed:', labelErr?.message || labelErr);
    }
  }

  return {
    event: updatedEvent,
    indexing,
    guests: guestResults,
    summary: {
      photosIndexed: indexing.indexed,
      photosNoFaces: indexing.noFaces,
      photosFailed: indexing.failed,
      guestsMatched: guestResults.filter((g) => g.ok && g.matched).length,
      guestsNoMatch: guestResults.filter((g) => g.ok && !g.matched).length,
      guestsFailed: guestResults.filter((g) => !g.ok).length,
    },
  };
}
