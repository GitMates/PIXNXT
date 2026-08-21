import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { formatByteSize, fetchGalleryDownloadZip } from '../_shared/galleryDownload.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';
    const download = url.searchParams.get('download') === '1';

    if (!token) {
      return new Response(JSON.stringify({ error: 'token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: job, error } = await supabaseAdmin
      .from('gallery_download_jobs')
      .select(
        'id, collection_id, visitor_email, download_token, status, photo_count, byte_size, zip_filename, storage_path, expires_at, error_message, scope, resolution, completed_at'
      )
      .eq('download_token', token)
      .maybeSingle();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Download not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = Date.now();
    const expired =
      job.status === 'expired' ||
      (job.expires_at && new Date(job.expires_at).getTime() < now);

    if (expired) {
      if (job.status !== 'expired') {
        await supabaseAdmin
          .from('gallery_download_jobs')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', job.id);
      }
      return new Response(JSON.stringify({ error: 'This download link has expired.', expired: true }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (job.status === 'failed' && download) {
      return new Response(JSON.stringify({ error: job.error_message || 'Download failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (download) {
      if (job.status !== 'ready' || !job.storage_path) {
        return new Response(JSON.stringify({ error: 'Download is not ready yet', status: job.status }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const buffer = await fetchGalleryDownloadZip(job.storage_path, supabaseAdmin);
      const filename = job.zip_filename || 'gallery-download.zip';
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'application/zip');
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      return new Response(buffer, { status: 200, headers });
    }

    const { data: collection } = await supabaseAdmin
      .from('deliveries')
      .select('name, slug')
      .eq('id', job.collection_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        token: job.download_token,
        status: job.status,
        photoCount: job.photo_count,
        byteSize: job.byte_size,
        byteSizeLabel: formatByteSize(Number(job.byte_size) || 0),
        zipFilename: job.zip_filename,
        expiresAt: job.expires_at,
        collectionName: collection?.name || job.scope?.collectionName || 'Gallery',
        collectionSlug: collection?.slug || job.scope?.collectionSlug || null,
        brandName: job.scope?.brandName || collection?.name || 'PIXNXT',
        errorMessage: job.error_message,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('get-gallery-download error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
