import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';

if (!Deno.writeAll) {
  // @ts-ignore — required for SMTP client on Supabase Edge
  Deno.writeAll = async (w: Deno.Writer, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

import {
  buildDownloadEmailHtml,
  buildDownloadReadyPageUrl,
  formatByteSize,
  pickPhotoDownloadUrl,
  resolveSiteOrigin,
  sanitizeFilename,
  sendDownloadReadyEmail,
  getR2Base,
  uploadGalleryDownloadZipToR2,
} from '../_shared/galleryDownload.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoRow {
  id: string;
  filename: string | null;
  full_url: string | null;
  web_url: string | null;
  thumbnail_url: string | null;
  set_id: string | null;
  media_type: string | null;
  size_bytes: number | null;
}

function folderForPhoto(
  photo: PhotoRow,
  setNameMap: Map<string, string>,
  highlightsName: string
): string {
  if (!photo.set_id) return highlightsName;
  return setNameMap.get(String(photo.set_id)) || 'Set';
}

async function processDownloadJob(
  jobId: string,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  const r2Base = getR2Base();

  const { data: job, error: jobError } = await supabaseAdmin
    .from('gallery_download_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error('Job not found:', jobError);
    return;
  }

  await supabaseAdmin
    .from('gallery_download_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId);

  try {
    const scope = job.scope || {};
    const photoIds: string[] = Array.isArray(scope.photoIds) ? scope.photoIds : [];
    if (!photoIds.length) {
      throw new Error('No photos selected for download.');
    }

    const { data: collection } = await supabaseAdmin
      .from('deliveries')
      .select('id, name, slug, highlights_name, download_link_expiry_days, photographer_id')
      .eq('id', job.collection_id)
      .maybeSingle();

    const { data: sets } = await supabaseAdmin
      .from('sets')
      .select('id, name')
      .eq('collection_id', job.collection_id);

    const setNameMap = new Map<string, string>(
      (sets || []).map((s: { id: string; name: string }) => [String(s.id), s.name])
    );
    const highlightsName = collection?.highlights_name || 'Highlights';

    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('id, filename, full_url, web_url, thumbnail_url, set_id, media_type, size_bytes')
      .in('id', photoIds)
      .eq('collection_id', job.collection_id);

    if (photosError) throw photosError;
    const ordered = photoIds
      .map((id) => (photos || []).find((p: PhotoRow) => String(p.id) === String(id)))
      .filter(Boolean) as PhotoRow[];

    if (!ordered.length) {
      throw new Error('Could not find selected photos.');
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();
    let totalBytes = 0;

    for (let i = 0; i < ordered.length; i++) {
      const photo = ordered[i];
      const url = pickPhotoDownloadUrl(photo, job.resolution, r2Base);
      if (!url) continue;

      const response = await fetch(url, { headers: { Accept: '*/*' } });
      if (!response.ok) {
        console.warn(`Failed to fetch photo ${photo.id}: HTTP ${response.status}`);
        continue;
      }

      const blob = await response.arrayBuffer();
      totalBytes += blob.byteLength;

      let baseName = sanitizeFilename(photo.filename || `photo-${i + 1}.jpg`);
      let finalName = baseName;
      let suffix = 1;
      while (usedNames.has(finalName)) {
        const dot = baseName.lastIndexOf('.');
        finalName =
          dot > 0
            ? `${baseName.slice(0, dot)}-${suffix}${baseName.slice(dot)}`
            : `${baseName}-${suffix}`;
        suffix += 1;
      }
      usedNames.add(finalName);

      const folder = folderForPhoto(photo, setNameMap, highlightsName);
      const zipPath = ordered.length > 1 ? `${folder}/${finalName}` : finalName;
      zip.file(zipPath, blob);
    }

    const fileCount = Object.keys(zip.files).filter((k) => !k.endsWith('/')).length;
    if (fileCount === 0) {
      throw new Error('Could not download any photos. They may still be processing.');
    }

    const zipBlob = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
    const safeCollection = sanitizeFilename(collection?.name || 'gallery').replace(/\.zip$/i, '');
    const zipFilename = `${safeCollection.toLowerCase().replace(/\s+/g, '-')}-download-${fileCount}of${ordered.length}.zip`;
    const supabasePath = `${job.collection_id}/${jobId}.zip`;
    const r2Key = `gallery-downloads/${supabasePath}`;
    const maxSupabaseBytes = 52_428_800; // 50 MB — default Supabase bucket cap
    let storagePath = supabasePath;

    if (zipBlob.byteLength > maxSupabaseBytes) {
      try {
        storagePath = await uploadGalleryDownloadZipToR2(zipBlob, r2Key);
      } catch (r2Err) {
        console.warn('R2 upload failed, trying Supabase storage:', r2Err);
      }
    }

    if (!storagePath.startsWith('r2:')) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from('gallery-downloads')
        .upload(supabasePath, zipBlob, {
          contentType: 'application/zip',
          upsert: true,
        });

      if (uploadError) {
        const message = uploadError.message || '';
        const tooLarge =
          /maximum allowed size|payload too large|entity too large|413/i.test(message);
        if (tooLarge) {
          try {
            storagePath = await uploadGalleryDownloadZipToR2(zipBlob, r2Key);
          } catch {
            throw new Error(
              'This download is too large. Try fewer photos, choose Web size, or ask the photographer to enable cloud storage.'
            );
          }
        } else {
          throw uploadError;
        }
      } else {
        storagePath = supabasePath;
      }
    }

    const expiryDays = Number(collection?.download_link_expiry_days) || 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from('gallery_download_jobs')
      .update({
        status: 'ready',
        photo_count: fileCount,
        byte_size: zipBlob.byteLength || totalBytes,
        zip_filename: zipFilename,
        storage_path: storagePath,
        expires_at: expiresAt,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    const siteOrigin = resolveSiteOrigin(scope.siteOrigin);
    const downloadPageUrl = buildDownloadReadyPageUrl(siteOrigin, job.download_token);
    const gallerySlug = scope.collectionSlug || collection?.slug || '';
    const galleryUrl = gallerySlug ? `${siteOrigin}/gallery/${encodeURIComponent(gallerySlug)}` : siteOrigin;

    const brandName =
      scope.brandName ||
      scope.photographerName ||
      collection?.name ||
      'PIXNXT';

    const html = buildDownloadEmailHtml({
      brandName,
      collectionName: collection?.name || 'your gallery',
      downloadUrl: downloadPageUrl,
      expiryDays,
      galleryUrl,
    });

    await sendDownloadReadyEmail({
      to: job.visitor_email,
      subject: `Download Ready – ${collection?.name || 'Your Photos'}`,
      html,
      fromName: brandName,
    });

    await supabaseAdmin.from('activity_log').insert({
      collection_id: job.collection_id,
      photographer_id: job.photographer_id || collection?.photographer_id,
      event_type: 'download',
      visitor_email: job.visitor_email,
      resolution: job.resolution,
      metadata: {
        type: 'gallery',
        destination: 'email',
        photoCount: fileCount,
        byteSize: zipBlob.byteLength,
        jobId,
        expiresAt,
      },
    });
  } catch (err) {
    console.error('processDownloadJob failed:', err);
    await supabaseAdmin
      .from('gallery_download_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Download failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      collectionId,
      visitorEmail,
      photoIds,
      resolution = 'full',
      scope = {},
      siteOrigin,
    } = body;

    if (!collectionId || !visitorEmail || !Array.isArray(photoIds) || photoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'collectionId, visitorEmail, and photoIds are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: collection, error: colError } = await supabaseAdmin
      .from('deliveries')
      .select('id, photographer_id, name, slug')
      .eq('id', collectionId)
      .maybeSingle();

    if (colError || !collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jobScope = {
      ...scope,
      photoIds,
      siteOrigin: siteOrigin || null,
      collectionSlug: scope.collectionSlug || collection.slug,
      collectionName: scope.collectionName || collection.name,
    };

    const { data: job, error: insertError } = await supabaseAdmin
      .from('gallery_download_jobs')
      .insert({
        collection_id: collectionId,
        photographer_id: collection.photographer_id,
        visitor_email: String(visitorEmail).trim(),
        resolution,
        scope: jobScope,
        photo_count: photoIds.length,
        status: 'pending',
      })
      .select('id, download_token, status')
      .single();

    if (insertError || !job) {
      throw insertError || new Error('Could not create download job');
    }

    // Process in background so the client can show the preparing screen immediately.
    const processPromise = processDownloadJob(job.id, supabaseAdmin);
    // @ts-ignore EdgeRuntime is available in Supabase edge functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processPromise);
    } else {
      processPromise.catch(console.error);
    }

    return new Response(
      JSON.stringify({
        jobId: job.id,
        token: job.download_token,
        status: job.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-gallery-download error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
