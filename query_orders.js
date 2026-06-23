import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://oibvtecxxoqhvyejovsy.supabase.co", "sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU");

async function main() {
    const { data: orders, error } = await supabase.from('printstore_orders').select('*');
    console.log("Selected orders:", orders, "Error:", error);
}
main();
