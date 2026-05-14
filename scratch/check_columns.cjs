
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oibvtecxxoqhvyejovsy.supabase.co';
const supabaseKey = 'sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU'; // Using the publishable key might work for selecting if RLS allows, or I need the service key.
// Wait, the .env had VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY.
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .limit(1);

  if (error) {
    console.error(error);
    return;
  }

  if (data && data.length > 0) {
    console.log(JSON.stringify(Object.keys(data[0]), null, 2));
  } else {
    console.log('No data found in collections table to check columns.');
  }
}

checkColumns();
