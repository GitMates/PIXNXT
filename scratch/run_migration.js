import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  // Test each column - they may already exist if the service key can run DDL
  // Since anon key can't run DDL, let's just verify what exists
  console.log("Checking which columns need to be added...\n");
  
  const columnsToAdd = [
    { name: 'restrict_to_emails', type: 'TEXT', default: null },
    { name: 'selected_download_sets', type: 'JSONB', default: '\'["Highlights"]\'::jsonb' },
    { name: 'pin_usage_limit', type: 'INTEGER', default: null },
    { name: 'gallery_download_enabled', type: 'BOOLEAN', default: 'true' },
    { name: 'single_photo_download_enabled', type: 'BOOLEAN', default: 'true' },
    { name: 'require_pin_for_single_photo', type: 'BOOLEAN', default: 'false' },
  ];

  let missing = [];
  for (const col of columnsToAdd) {
    const { error } = await supabase.from('collections').select(col.name).limit(1);
    if (error) {
      console.log(`❌ MISSING: ${col.name}`);
      missing.push(col);
    } else {
      console.log(`✅ EXISTS:  ${col.name}`);
    }
  }

  if (missing.length === 0) {
    console.log("\n✅ All columns already exist! No migration needed.");
    return;
  }

  console.log(`\n⚠️  ${missing.length} column(s) need to be added to Supabase.`);
  console.log("\nRun this SQL in the Supabase SQL Editor:\n");
  console.log("─".repeat(60));
  const sql = missing.map(col => {
    const def = col.default ? ` DEFAULT ${col.default}` : '';
    return `ALTER TABLE collections ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${def};`;
  }).join('\n');
  console.log(sql);
  console.log("─".repeat(60));
}

runMigration();
