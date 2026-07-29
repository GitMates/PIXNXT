import { getSupabaseAdmin, getSupabaseUserClient } from '../photoAi/supabaseAdmin.js';

const EVENT_FIELDS =
  'id, photographer_id, name, slug, status, match_threshold, registration_enabled, photo_count, guest_count, collection_id';

export async function assertPhotographerOwnsEvent(req, eventId) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const userClient = getSupabaseUserClient(authHeader);
  if (!userClient) throw new Error('Unauthorized');

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) throw new Error('Unauthorized');

  const db = getSupabaseAdmin() || userClient;
  const { data: event, error: eventError } = await db
    .from('guest_delivery_events')
    .select(EVENT_FIELDS)
    .eq('id', eventId)
    .eq('photographer_id', user.id)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!event) throw new Error('Event not found.');

  return { db, event, userId: user.id };
}
