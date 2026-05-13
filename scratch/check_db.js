import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCollectionsSchema() {
  console.log("Checking collections table schema...");
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error("Error selecting from collections:", error);
  } else if (data && data.length > 0) {
    console.log("Success! Columns in collections table:");
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log("No data in collections table, but query succeeded.");
  }
}

checkCollectionsSchema();
