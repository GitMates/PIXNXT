import { supabase } from '../lib/supabase/client';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../lib/r2';

// ── Slug generator ──────────────────────────────────────────
export function generateSlug(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Upload a file to R2 ─────────────────────────────────────
async function uploadToR2(file, path) {
  const buffer = await file.arrayBuffer();
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: file.type,
    })
  );
  return `${R2_PUBLIC_URL}/${path}`;
}

// ── Delete a file from R2 ───────────────────────────────────
async function deleteFromR2(url) {
  if (!url || !R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL)) return;
  const key = url.replace(`${R2_PUBLIC_URL}/`, '');
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  } catch (e) {
    console.warn('R2 delete failed (non-critical):', e);
  }
}

// ── GALLERY CRUD ────────────────────────────────────────────
export const mobileGalleryService = {
  // Fetch all galleries for a photographer
  async getGalleries(photographerId) {
    const { data, error } = await supabase
      .from('mobile_galleries')
      .select(`
        *,
        mobile_gallery_images(count)
      `)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Fetch single gallery by id
  async getGalleryById(id) {
    const { data, error } = await supabase
      .from('mobile_galleries')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Fetch single gallery by slug (public)
  async getGalleryBySlug(slug) {
    const { data, error } = await supabase
      .from('mobile_galleries')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error) throw error;
    return data;
  },

  // Create a new gallery
  async createGallery(photographerId, payload) {
    let slug;
    // Ensure slug is unique
    let attempts = 0;
    while (attempts < 10) {
      slug = generateSlug(8);
      const { data } = await supabase
        .from('mobile_galleries')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!data) break;
      attempts++;
    }

    const { data, error } = await supabase
      .from('mobile_galleries')
      .insert({ photographer_id: photographerId, slug, ...payload })
      .select()
      .single();
    if (error) throw error;

    // Auto-create settings row
    await supabase
      .from('mobile_gallery_settings')
      .insert({ gallery_id: data.id });

    return data;
  },

  // Update gallery
  async updateGallery(id, payload) {
    const { data, error } = await supabase
      .from('mobile_galleries')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete gallery
  async deleteGallery(id) {
    // Fetch images first to clean up R2
    const images = await mobileGalleryService.getImages(id);
    for (const img of images) {
      await deleteFromR2(img.original_url);
      if (img.thumbnail_url) await deleteFromR2(img.thumbnail_url);
    }
    const { error } = await supabase
      .from('mobile_galleries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Upload cover image
  async uploadCoverImage(galleryId, photographerId, file) {
    const ext = file.name.split('.').pop();
    const path = `mobile-galleries/${photographerId}/${galleryId}/cover.${ext}`;
    const url = await uploadToR2(file, path);
    await mobileGalleryService.updateGallery(galleryId, { cover_image_url: url });
    return url;
  },

  // Upload app icon
  async uploadAppIcon(galleryId, photographerId, file) {
    const ext = file.name.split('.').pop();
    const path = `mobile-galleries/${photographerId}/${galleryId}/icon.${ext}`;
    const url = await uploadToR2(file, path);
    await mobileGalleryService.updateGallery(galleryId, { app_icon_url: url });
    return url;
  },

  // ── IMAGES ─────────────────────────────────────────────────

  // Get all images for a gallery
  async getImages(galleryId) {
    const { data, error } = await supabase
      .from('mobile_gallery_images')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  // Upload multiple images
  async uploadImages(galleryId, photographerId, files, onProgress) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop().toLowerCase();
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `mobile-galleries/${photographerId}/${galleryId}/${uniqueId}.${ext}`;

      const url = await uploadToR2(file, path);

      // Get image dimensions
      let width = null;
      let height = null;
      try {
        const dims = await getImageDimensions(file);
        width = dims.width;
        height = dims.height;
      } catch (_) {}

      const { data, error } = await supabase
        .from('mobile_gallery_images')
        .insert({
          gallery_id: galleryId,
          photographer_id: photographerId,
          original_url: url,
          thumbnail_url: url, // same URL; we rely on CSS sizing
          file_name: file.name,
          file_size: file.size,
          width,
          height,
          sort_order: i,
        })
        .select()
        .single();
      if (error) throw error;
      results.push(data);

      if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 100));
    }
    return results;
  },

  // Delete a single image
  async deleteImage(imageId) {
    const { data: img } = await supabase
      .from('mobile_gallery_images')
      .select('original_url, thumbnail_url')
      .eq('id', imageId)
      .single();
    if (img) {
      await deleteFromR2(img.original_url);
    }
    const { error } = await supabase
      .from('mobile_gallery_images')
      .delete()
      .eq('id', imageId);
    if (error) throw error;
  },

  // Reorder images
  async reorderImages(galleryId, orderedIds) {
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index,
      gallery_id: galleryId,
    }));
    const { error } = await supabase
      .from('mobile_gallery_images')
      .upsert(updates, { onConflict: 'id' });
    if (error) throw error;
  },

  // ── ANALYTICS ──────────────────────────────────────────────

  async recordView(galleryId) {
    try {
      await supabase.from('mobile_gallery_views').insert({ gallery_id: galleryId });
      await supabase.rpc('increment_mobile_gallery_stat', {
        p_gallery_id: galleryId,
        p_field: 'view_count',
      });
    } catch (_) {}
  },

  async recordShare(galleryId, method = 'copy') {
    try {
      await supabase.from('mobile_gallery_shares').insert({ gallery_id: galleryId, share_method: method });
      await supabase.rpc('increment_mobile_gallery_stat', {
        p_gallery_id: galleryId,
        p_field: 'share_count',
      });
    } catch (_) {}
  },

  async recordInstall(galleryId, platform = 'unknown') {
    try {
      await supabase.from('mobile_gallery_installs').insert({ gallery_id: galleryId, platform });
      await supabase.rpc('increment_mobile_gallery_stat', {
        p_gallery_id: galleryId,
        p_field: 'install_count',
      });
    } catch (_) {}
  },

  async recordDownload(galleryId, imageId = null) {
    try {
      await supabase.from('mobile_gallery_downloads').insert({ gallery_id: galleryId, image_id: imageId });
    } catch (_) {}
  },

  // Get analytics summary for a gallery
  async getAnalytics(galleryId) {
    const [viewsRes, sharesRes, downloadsRes, installsRes] = await Promise.all([
      supabase.from('mobile_gallery_views').select('id', { count: 'exact', head: true }).eq('gallery_id', galleryId),
      supabase.from('mobile_gallery_shares').select('id', { count: 'exact', head: true }).eq('gallery_id', galleryId),
      supabase.from('mobile_gallery_downloads').select('id', { count: 'exact', head: true }).eq('gallery_id', galleryId),
      supabase.from('mobile_gallery_installs').select('id', { count: 'exact', head: true }).eq('gallery_id', galleryId),
    ]);
    return {
      views: viewsRes.count || 0,
      shares: sharesRes.count || 0,
      downloads: downloadsRes.count || 0,
      installs: installsRes.count || 0,
    };
  },

  // ── SETTINGS ───────────────────────────────────────────────
  async getSettings(galleryId) {
    const { data, error } = await supabase
      .from('mobile_gallery_settings')
      .select('*')
      .eq('gallery_id', galleryId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateSettings(galleryId, payload) {
    const { data, error } = await supabase
      .from('mobile_gallery_settings')
      .upsert({ gallery_id: galleryId, ...payload }, { onConflict: 'gallery_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ── Helper ──────────────────────────────────────────────────
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Supabase RPC helper (add this function in SQL editor too) ──
// CREATE OR REPLACE FUNCTION increment_mobile_gallery_stat(p_gallery_id UUID, p_field TEXT)
// RETURNS void AS $$
// BEGIN
//   EXECUTE format('UPDATE mobile_galleries SET %I = %I + 1 WHERE id = $1', p_field, p_field)
//   USING p_gallery_id;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;
