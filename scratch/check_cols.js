import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env manually
const env = fs.readFileSync('.env', 'utf-8');
const envVars = {};
env.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = envVars.VITE_SUPABASE_URL || 'https://oibvtecxxoqhvyejovsy.supabase.co';
const key = envVars.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('vault_extension_plans').select('*').limit(5);
  if (error) {
    console.error('Error fetching vault_extension_plans:', error);
  } else {
    console.log('Successfully fetched rows from vault_extension_plans. Count:', data.length);
    if (data.length > 0) {
      console.log('Row sample columns:', Object.keys(data[0] || {}));
      console.log('Data sample:', data[0]);
    }
  }
}
run();
