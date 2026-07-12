import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

async function main() {
    const tables = ['printstore_settings', 'store_settings', 'sales_campaigns', 'printstore_campaigns', 'sales_automation_campaigns', 'campaigns'];
    for (const table of tables) {
        console.log(`--- Checking ${table} ---`);
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`${table} error:`, error.message);
            } else {
                console.log(`${table} exists! Sample columns:`, data.length > 0 ? Object.keys(data[0]) : "Empty table");
                if (data.length > 0) console.log("Data row:", data[0]);
            }
        } catch (e) {
            console.log(`${table} exception:`, e.message);
        }
    }
}
main();
