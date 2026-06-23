import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://oibvtecxxoqhvyejovsy.supabase.co", "sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU");

async function main() {
    const { data: users, error } = await supabase.from('printstore_lab_users').select('*').limit(5);
    console.log("Users:", users, "Error:", error);
}
main();
