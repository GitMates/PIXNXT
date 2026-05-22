import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
    const { data, error } = await supabase.from('photographers').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log(data.length > 0 ? Object.keys(data[0]) : "No data");
    }
}
main();
