import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseKey) {
  console.error("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY is missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: reviews, error: revErr } = await supabase
      .from('printstore_artwork_reviews')
      .select('*');
    if (revErr) throw revErr;
    console.log("ARTWORK REVIEWS:");
    console.log(JSON.stringify(reviews, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
