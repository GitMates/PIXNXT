import { supabase } from '../lib/supabase/client';
import { storageService } from './storage.service';

export const galleryService = {
  /**
   * Fetch all collections for a specific photographer (Dashboard view)
   */
  async getCollections(photographerId) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(count)
      `)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten the count for easier UI usage
    return data.map(c => ({
      ...c,
      photo_count: c.photos?.[0]?.count || 0
    }));
  },

  /**
   * Fetch all published collections for a specific photographer (Public view)
   */
  async getPublicCollections(photographerId) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(count)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(c => ({
      ...c,
      photo_count: c.photos?.[0]?.count || 0
    }));
  },

  /**
   * Create a new collection
   */
  async createCollection(collectionData) {
    const { data, error } = await supabase
      .from('collections')
      .insert([collectionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing collection
   */
  async updateCollection(id, updateData) {
    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a collection and all associated files
   */
  async deleteCollection(id) {
    // 1. Get collection info (to get photographer_id and list of photos)
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('photographer_id, photos:photos!photos_collection_id_fkey(original_storage_path)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete files from Storage if they exist
    const storagePaths = collection.photos
      ?.map(p => p.original_storage_path)
      .filter(path => !!path);

    if (storagePaths && storagePaths.length > 0) {
      try {
        await storageService.delete(storagePaths);
      } catch (storageError) {
        console.error('Error deleting storage files from R2:', storageError);
        // We continue anyway to at least delete the database records
      }
    }

    // 3. Delete the collection record (cascade deletes related DB tables)
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetch a single collection by ID (for management) — includes sets
   */
  async getCollectionById(id) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos!photos_collection_id_fkey (*),
        sets!sets_collection_id_fkey (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Sort sets by position
    if (data.sets) {
      data.sets.sort((a, b) => a.position - b.position);
    }

    return data;
  },

  /**
   * Fetch a single collection by slug
   */
  async getCollectionBySlug(slug) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos!photos_collection_id_fkey (
          id,
          filename,
          set_id,
          web_url,
          thumbnail_url,
          full_url,
          width,
          height,
          position
        ),
        sets!sets_collection_id_fkey (
          id,
          name,
          description,
          position,
          photo_count,
          is_private
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;

    if (data.photos) {
      data.photos.sort((a, b) => a.position - b.position);
    }
    if (data.sets) {
      data.sets.sort((a, b) => a.position - b.position);
    }

    return data;
  },

  // ─── SET CRUD ──────────────────────────────────────────────

  /**
   * Fetch all sets for a collection
   */
  async getSets(collectionId) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, name, description, position, photo_count, is_private, created_at')
      .eq('collection_id', collectionId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  /**
   * Create a new set
   */
  async createSet({ collectionId, photographerId, name, description, position }) {
    const { data, error } = await supabase
      .from('sets')
      .insert([{
        collection_id: collectionId,
        photographer_id: photographerId,
        name,
        description: description || null,
        position: position ?? 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a set's name/description
   */
  async updateSet(setId, updateData) {
    const { data, error } = await supabase
      .from('sets')
      .update(updateData)
      .eq('id', setId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a set. First unassigns all photos in that set.
   */
  async deleteSet(setId) {
    // Unassign photos from this set
    const { error: unassignError } = await supabase
      .from('photos')
      .update({ set_id: null })
      .eq('set_id', setId);

    if (unassignError) throw unassignError;

    // Delete the set
    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', setId);

    if (error) throw error;
  },

  /**
   * Assign photos to a specific set (or unassign by passing null)
   */
  async assignPhotosToSet(photoIds, setId) {
    if (!photoIds || photoIds.length === 0) return;

    const { error } = await supabase
      .from('photos')
      .update({ set_id: setId })
      .in('id', photoIds);

    if (error) throw error;
  },

  // ─── PHOTO OPERATIONS ─────────────────────────────────────

  /**
   * Upload multiple photos (legacy bulk upload)
   */
  async uploadPhotos(collectionId, photographerId, files, setId = null) {
    const uploadPromises = files.map((file, index) =>
      this.uploadPhoto(collectionId, photographerId, file, index, setId)
    );
    return Promise.all(uploadPromises);
  },

  /**
   * Upload a single photo to Supabase Storage and record in database
   */
  async uploadPhoto(collectionId, photographerId, file, index = 0, setId = null) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${photographerId}/${collectionId}/${fileName}`;

    // Get image dimensions
    const dimensions = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 1500, height: 1000 }); // Fallback
      img.src = URL.createObjectURL(file);
    });

    // 1. Upload to R2
    const { url: publicUrl } = await storageService.upload(filePath, file);

    // 3. Insert record into 'photos' table
    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert([{
        collection_id: collectionId,
        photographer_id: photographerId,
        set_id: setId,
        filename: file.name,
        full_url: publicUrl,
        web_url: publicUrl,
        thumbnail_url: publicUrl,
        original_storage_path: filePath,
        size_bytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        position: index,
        status: 'ready'
      }])
      .select()
      .single();

    if (dbError) throw dbError;
    return photoData;
  },

  /**
   * Delete photos from the database
   */
  async deletePhotos(ids) {
    if (!ids || ids.length === 0) return;

    const { error } = await supabase
      .from('photos')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },

  /**
   * Toggle the is_starred status of a photo
   */
  async togglePhotoStar(id, isStarred) {
    const { data, error } = await supabase
      .from('photos')
      .update({ is_starred: isStarred })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch a photographer's profile/branding
   */
  async getPhotographerProfile(photographerId) {
    const { data, error } = await supabase
      .from('photographers')
      .select('*')
      .eq('id', photographerId)
      .single();

    if (error) throw error;
    return data;
  }
};
