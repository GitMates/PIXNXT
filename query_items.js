import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://oibvtecxxoqhvyejovsy.supabase.co", "sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU");

async function main() {
    const { data: sessions, error: e1 } = await supabase.from('client_sessions').select('*').limit(5);
    console.log("Sessions:", sessions, "Error:", e1);
}
main();
