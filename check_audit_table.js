import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://oibvtecxxoqhvyejovsy.supabase.co", "sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU");

async function main() {
    const { data, error } = await supabase.from('printstore_pricing_audit_logs').select('*').limit(1);
    console.log("Result:", data, "Error:", error);
}
main();
