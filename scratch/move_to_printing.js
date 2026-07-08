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
  
  // 1. Update printstore_orders status to 'printing'
  const { error: orderErr } = await supabase
    .from('printstore_orders')
    .update({ status: 'printing' })
    .eq('id', orderId);
  if (orderErr) {
    console.error("Error updating order:", orderErr);
    return;
  }
  console.log("Updated order status to printing");

  // 2. Update printstore_artwork_reviews status to 'Ready For Print'
  const { error: revErr } = await supabase
    .from('printstore_artwork_reviews')
    .update({ review_status: 'Ready For Print' })
    .eq('order_id', orderId);
  if (revErr) {
    console.error("Error updating review status:", revErr);
    return;
  }
  console.log("Updated review status to Ready For Print");

  // 3. Insert tracking log
  const { error: trackErr } = await supabase
    .from('printstore_order_tracking')
    .insert({
      order_id: orderId,
      status: 'printing',
      label: 'Artwork Approved',
      description: 'Order automatically moved to Print Queue after customer confirmation.'
    });
  if (trackErr) {
    console.error("Error inserting tracking log:", trackErr);
    return;
  }
  console.log("Tracking log inserted successfully");
}

run();
