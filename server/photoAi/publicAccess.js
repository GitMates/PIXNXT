import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from './supabaseAdmin.js';

export function getSupabaseAnon() {
  const url = getSupabaseUrl();
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured.');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function assertPublishedCollection(collectionId) {
  if (!collectionId) throw new Error('collectionId is required.');

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from('collections')
    .select('id, status')
    .eq('id', collectionId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Forbidden');

  return supabase;
}
