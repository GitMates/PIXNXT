import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://oibvtecxxoqhvyejovsy.supabase.co", "sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU");

async function main() {
    const { data: o1, error } = await supabase.from('printstore_orders').select('*');
    const { data: o2, error: error2 } = await supabase.from('printstore_order_items').select('*');
    console.log("Orders length:", o1 ? o1.length : 0, "Error:", error);
    console.log("Items length:", o2 ? o2.length : 0, "Error:", error2);
}
main();
