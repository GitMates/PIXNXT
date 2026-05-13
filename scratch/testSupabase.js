import { createClient } from '@supabase/supabase-js';


const url = 'https://oibvtecxxoqhvyejovsy.supabase.co';
const key = 'sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU';

const supabase = createClient(url, key);

async function test() {
  const collectionId = 'b8561375-511f-4abf-a1e8-6759dd9f217b'; // Example ID from user's URL
  const email = 'kavisproject@gmail.com';

  let { data: session, error: fetchError } = await supabase
      .from('client_sessions')
      .select('*')
      .eq('collection_id', collectionId)
      .eq('visitor_email', email)
      .single();

  console.log('fetch session:', { session, fetchError });

  if (!session) {
      const { data: newSession, error: createError } = await supabase
        .from('client_sessions')
        .insert([{
          collection_id: collectionId,
          visitor_email: email,
          access_level: 'guest',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();
        
      console.log('create session:', { newSession, createError });
      session = newSession;
  }
}

test();
