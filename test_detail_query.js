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

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const orderId = 'cccebd6f-8b5e-425c-a09b-5a0dacedd216';
  console.log("Querying printstore_artwork_reviews for orderId:", orderId);
  try {
    const res = await supabase
      .from('printstore_artwork_reviews')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    console.log("Result:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
