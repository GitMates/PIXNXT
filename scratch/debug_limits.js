const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oibvtecxxoqhvyejovsy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NZ94_6axLD1cNdxC9SB3QQ_rWc4EPvU';
const COLLECTION_ID = 'b8564375-511f-4abf-a1e8-6759dd9f217b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('\n==== STEP 1: Fetch Collection ====');
  const { data: collection, error: colErr } = await supabase
    .from('collections')
    .select('id, name, user_id, download_limit_gallery, pin_usage_limit, download_pin_hash, require_pin_for_single_photo')
    .eq('id', COLLECTION_ID)
    .single();

  if (colErr) {
    console.error('❌ Collection fetch failed:', JSON.stringify(colErr));
    return;
  }
  console.log('✅ Collection:', JSON.stringify(collection, null, 2));

  const { id: collectionId, user_id: photographerId, download_limit_gallery, pin_usage_limit } = collection;

  console.log('\n==== STEP 2: Check Existing Download Count ====');
  const { count: downloadCount, error: countErr } = await supabase
    .from('activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collectionId)
    .eq('event_type', 'download');

  if (countErr) {
    console.error('❌ Download count check failed:', JSON.stringify(countErr));
  } else {
    console.log(`✅ Current download count: ${downloadCount} / limit: ${download_limit_gallery}`);
    if (download_limit_gallery && downloadCount >= download_limit_gallery) {
      console.log('🚫 LIMIT REACHED - Should block download');
    } else {
      console.log('✅ Under limit - should allow download');
    }
  }

  console.log('\n==== STEP 3: Check PIN Usage Count ====');
  const { data: pinData, error: pinErr } = await supabase
    .from('activity_log')
    .select('metadata')
    .eq('collection_id', collectionId)
    .eq('event_type', 'password_attempt');

  if (pinErr) {
    console.error('❌ PIN count check failed:', JSON.stringify(pinErr));
  } else {
    const pinSuccessCount = (pinData || []).filter(
      row => row.metadata?.success === true && row.metadata?.type === 'download_pin'
    ).length;
    console.log(`✅ Successful PIN uses: ${pinSuccessCount} / limit: ${pin_usage_limit}`);
  }

  console.log('\n==== STEP 4: Try Inserting a Download Log ====');
  const { error: insertErr } = await supabase
    .from('activity_log')
    .insert([{
      collection_id: collectionId,
      photographer_id: photographerId,
      event_type: 'download',
      visitor_email: 'test@debug.com',
      photo_id: null,
      metadata: null
    }]);

  if (insertErr) {
    console.error('❌ INSERT FAILED:', JSON.stringify(insertErr));
    console.log('\n>>> THIS IS THE ROOT CAUSE <<<');
    console.log('The activity_log insert is failing, so counts never go up.');
  } else {
    console.log('✅ Insert succeeded!');
  }

  console.log('\n==== STEP 5: Verify Count After Insert ====');
  const { count: newCount, error: newCountErr } = await supabase
    .from('activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collectionId)
    .eq('event_type', 'download');

  if (newCountErr) {
    console.error('❌ New count check failed:', JSON.stringify(newCountErr));
  } else {
    console.log(`✅ New download count: ${newCount}`);
    if (download_limit_gallery && newCount >= download_limit_gallery) {
      console.log('✅ Limit enforcement WOULD now work correctly');
    }
  }

  console.log('\n==== STEP 6: Check activity_log columns ====');
  const { data: sample, error: sampleErr } = await supabase
    .from('activity_log')
    .select('*')
    .limit(1);

  if (sampleErr) {
    console.error('❌ Sample fetch failed:', JSON.stringify(sampleErr));
  } else {
    console.log('✅ Sample row columns:', Object.keys(sample[0] || {}).join(', '));
  }
}

run().catch(console.error);
