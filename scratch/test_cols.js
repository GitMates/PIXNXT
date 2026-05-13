import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
  const columns = [
    'download_limit_gallery',
    'restrict_to_emails',
    'selected_download_sets',
    'pin_usage_limit',
    'gallery_download_enabled',
    'single_photo_download_enabled',
    'require_pin_for_single_photo'
  ];

  console.log("Testing columns existence...");
  for (const col of columns) {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(col)
        .limit(1);
      
      if (error) {
        console.log(`Column [${col}] does NOT exist or error:`, error.message);
      } else {
        console.log(`Column [${col}] exists!`);
      }
    } catch (e) {
      console.log(`Column [${col}] failed with exception:`, e.message);
    }
  }
}

testColumns();
