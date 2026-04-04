import { supabase } from '../lib/supabase/client';

export const galleryService = {
  /**
   * Fetch all public collections for the landing page
   */
  async getPublicCollections(photographerId) {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug, date, cover_url, photo_count')
      .eq('status', 'published')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch a single collection by slug
   */
  async getCollectionBySlug(slug) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        id, 
        name, 
        slug, 
        date, 
        cover_url, 
        status,
        photos (
          id,
          url,
          aspect_ratio
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch a photographer's profile/branding
   */
  async getPhotographerProfile(photographerId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, branding_logo')
      .eq('id', photographerId)
      .single();

    if (error) throw error;
    return data;
  }
};
