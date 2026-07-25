import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://oibvtecxxoqhvyejovsy.supabase.co', 'sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU');

async function main() {
    // 1. Fetch watermarks
    const { data: wms, error: wmErr } = await supabase.from('watermarks').select('*');
    if (wmErr) {
        console.error("Watermarks Error:", wmErr);
    } else {
        console.log("\n--- Watermarks ---");
        wms.forEach(w => {
            console.log(`ID: ${w.id}, Name: ${w.name}, Type: ${w.type}, Scale: ${w.scale}, Opacity: ${w.opacity}, Position: ${w.position}, URL: ${w.url}`);
        });
    }

    // 2. Fetch collections
    const { data: cols, error: colErr } = await supabase.from('collections').select('id, name, default_watermark');
    if (colErr) {
        console.error("Collections Error:", colErr);
    } else {
        console.log("\n--- Collections ---");
        cols.forEach(c => {
            console.log(`ID: ${c.id}, Name: ${c.name}, Default Watermark: ${c.default_watermark}`);
        });
    }
}
main();
