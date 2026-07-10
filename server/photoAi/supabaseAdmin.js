import { createClient } from '@supabase/supabase-js';

export function getSupabaseUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

export function getSupabaseAdmin() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseUserClient(authHeader) {
  const url = getSupabaseUrl();
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey || !authHeader) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
}

export async function getAuthedSupabase(req) {
  const admin = getSupabaseAdmin();
  if (admin) return { supabase: admin, isAdmin: true };

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const userClient = getSupabaseUserClient(authHeader);
  if (!userClient) {
    throw new Error('Missing Supabase credentials or Authorization header.');
  }
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    throw new Error('Unauthorized');
  }
  return { supabase: userClient, isAdmin: false, userId: data.user.id };
}
