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
const key = envVars.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('printstore_products').select('*');
  if (error) {
    console.error('Error fetching printstore_products:', error);
  } else {
    console.log('Products in database:');
    data.forEach(p => {
      console.log(`- ID: ${p.id}, Name: ${p.product_name}, Type: ${p.product_type}`);
    });
  }
}

run();
