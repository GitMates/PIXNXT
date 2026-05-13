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
   * Update photo metadata (filename, set_id, etc.)
   */
  async updatePhoto(id, updateData) {
    const { data, error } = await supabase
      .from('photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
  },

  /**
   * Create or get a client session for favorites/downloads
   */
  async createOrGetSession(collectionId, email) {
    if (!collectionId || !email) {
      throw new Error('Collection ID and email are required');
    }

    try {
      console.log('createOrGetSession starting:', { collectionId, email });
      // 1. Try to find existing session
      const { data: sessions, error: findError } = await supabase
        .from('client_sessions')
        .select('id, collection_id, visitor_email, access_level, expires_at')
        .eq('collection_id', collectionId)
        .eq('visitor_email', email)
        .limit(1);

      if (findError) {
        console.warn('Find session error:', findError);
      }

      let session = sessions?.[0];

      if (session) {
        console.log('Existing session found:', session);
      } else {
        // 2. Create new session (Blind insert to handle RLS)
        const insertData = {
          collection_id: collectionId,
          visitor_email: email,
          access_level: 'guest',
          created_at: new Date().toISOString()
        };
        
        console.log('Attempting blind insert for session:', insertData);
        const { error: insertError } = await supabase
          .from('client_sessions')
          .insert([insertData]);

        if (insertError && insertError.code !== '23505') { // Ignore unique constraint violation
          console.error('Session insertion failed:', insertError);
          throw new Error(`Session creation failed: ${insertError.message}`);
        }

        // 3. Fetch the created session
        const { data: fetchSession, error: fetchAgainError } = await supabase
          .from('client_sessions')
          .select('id, collection_id, visitor_email')
          .eq('collection_id', collectionId)
          .eq('visitor_email', email)
          .limit(1)
          .single();

        if (fetchAgainError) {
          console.error('Error fetching session after blind insert:', fetchAgainError);
          throw new Error('Failed to retrieve created session after insert. Please check RLS policies.');
        }
        session = fetchSession;
        console.log('New session created and retrieved:', session);
      }

      // Ensure a favorite list exists for this session
      const { data: favLists, error: favListError } = await supabase
        .from('favorite_lists')
        .select('id, name')
        .eq('session_id', session.id)
        .eq('name', 'My Favorites')
        .limit(1);

      if (!favLists || favLists.length === 0) {
        console.log('Creating default favorite list for session:', session.id);
        const { error: insertListError } = await supabase
          .from('favorite_lists')
          .insert([{
            collection_id: collectionId,
            session_id: session.id,
            name: 'My Favorites'
          }]);
        
        if (insertListError) {
          console.error('Error creating default favorite list:', insertListError);
        }
      }

      return session;
    } catch (error) {
      console.error('Error in createOrGetSession:', error);
      throw error;
    }
  },

  /**
   * Get all favorited photo IDs for a given session
   */
  async getFavorites(sessionId) {
    if (!sessionId) return [];
    try {
      const { data: lists, error: listError } = await supabase
        .from('favorite_lists')
        .select('id')
        .eq('session_id', sessionId);

      if (listError || !lists || lists.length === 0) return [];

      const listIds = lists.map(l => l.id);

      const { data: items, error: itemsError } = await supabase
        .from('favorite_items')
        .select('photo_id')
        .in('list_id', listIds);

      if (itemsError) return [];
      
      // Return unique IDs
      return [...new Set(items.map(item => item.photo_id))];
    } catch (e) {
      console.error('Error in getFavorites:', e);
      return [];
    }
  },

  /**
   * Create a favorite list explicitly (for Dashboard)
   */
  async createFavoriteList(collectionId, sessionId, listName) {
    const { data, error } = await supabase
      .from('favorite_lists')
      .insert([{
        collection_id: collectionId,
        session_id: sessionId,
        name: listName || 'My Favorites'
      }])
      .select('id, name, session_id')
      .single();

    if (error) {
      console.error('Error creating favorite list:', error);
      throw error;
    }
    return data;
  },

  /**
   * Toggle a photo as favorite
   */
  async toggleFavorite(sessionId, photoId, isFavorite, listId = null) {
    let targetListId = listId;

    if (!targetListId) {
      // Find the "My Favorites" list for this session
      const { data: lists, error: listError } = await supabase
        .from('favorite_lists')
        .select('id')
        .eq('session_id', sessionId)
        .eq('name', 'My Favorites')
        .limit(1);

      if (listError || !lists || lists.length === 0) {
        // Fallback to any list if "My Favorites" not found
        const { data: anyLists } = await supabase
          .from('favorite_lists')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);
        
        if (!anyLists || anyLists.length === 0) {
          throw new Error('Favorite list not found');
        }
        targetListId = anyLists[0].id;
      } else {
        targetListId = lists[0].id;
      }
    }

    if (isFavorite) {
      // Add favorite
      const { error } = await supabase
        .from('favorite_items')
        .insert([{
          list_id: targetListId,
          photo_id: photoId
        }]);
      if (error && error.code !== '23505') throw error; // Ignore unique constraint violation
    } else {
      // Remove favorite
      const { error } = await supabase
        .from('favorite_items')
        .delete()
        .eq('list_id', targetListId)
        .eq('photo_id', photoId);
      if (error) throw error;
    }
  },

  /**
   * Get favorite activity for a collection
   */
  async getFavoriteActivity(collectionId) {
    try {
      console.log('Fetching favorite activity for collection:', collectionId);
      // 1. Fetch lists
      const { data: lists, error: listsError } = await supabase
        .from('favorite_lists')
        .select('id, name, session_id, collection_id, created_at')
        .eq('collection_id', collectionId);

      if (listsError) {
        console.error('Error fetching favorite lists:', listsError);
        throw listsError;
      }

      if (!lists || lists.length === 0) {
        console.log('No favorite lists found.');
        return [];
      }

      // 2. Fetch sessions
      const sessionIds = [...new Set(lists.map(l => l.session_id))];
      const { data: sessions, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('id, visitor_email')
        .in('id', sessionIds);

      if (sessionsError) {
        console.warn('Error fetching client sessions for activity:', sessionsError);
      }

      const sessionMap = (sessions || []).reduce((acc, s) => ({ ...acc, [s.id]: s.visitor_email }), {});

      // 3. Fetch item counts and thumbnails
      const listIds = lists.map(l => l.id);
      const { data: items, error: itemsError } = await supabase
        .from('favorite_items')
        .select(`
          id, 
          list_id,
          created_at,
          photo:photos(thumbnail_url, web_url, filename)
        `)
        .in('list_id', listIds);

      if (itemsError) {
        console.warn('Error fetching favorite items for activity:', itemsError);
      }

      const countMap = {};
      const thumbMap = {};
      const updatedMap = {};

      (items || []).forEach(item => {
        countMap[item.list_id] = (countMap[item.list_id] || 0) + 1;
        
        // Use the latest item creation date as the updated_at for the list
        if (!thumbMap[item.list_id] && item.photo) {
          thumbMap[item.list_id] = item.photo.thumbnail_url || item.photo.web_url;
        }
        
        const itemDate = new Date(item.created_at);
        if (!updatedMap[item.list_id] || itemDate > updatedMap[item.list_id]) {
          updatedMap[item.list_id] = itemDate;
        }
      });

      const results = lists.map(list => ({
        id: list.id,
        name: list.name,
        email: sessionMap[list.session_id] || 'Unknown visitor',
        photoCount: countMap[list.id] || 0,
        thumbnail: thumbMap[list.id] || null,
        created_at: list.created_at,
        updated_at: updatedMap[list.id] || list.created_at,
        sessionId: list.session_id
      }));

      console.log('Aggregated favorite activity:', results);
      return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Error in getFavoriteActivity:', error);
      return [];
    }
  },

  /**
   * Get all photos for a favorite list
   */
  async getFavoriteListPhotos(listId) {
    const { data, error } = await supabase
      .from('favorite_items')
      .select('photo:photos(*)')
      .eq('list_id', listId);

    if (error) throw error;
    return data.map(item => {
      if (Array.isArray(item.photo)) return item.photo[0];
      return item.photo;
    }).filter(p => !!p);
  },

  /**
   * Update a favorite list's metadata
   */
  async updateFavoriteList(listId, updateData) {
    const { data, error } = await supabase
      .from('favorite_lists')
      .update(updateData)
      .eq('id', listId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a favorite list and its items (collection owner only).
   * Uses RPC with SECURITY DEFINER so deletes succeed even when direct table DELETE is blocked by RLS.
   */
  async deleteFavoriteList(listId) {
    if (!listId) throw new Error('List id is required');

    const { data: deletedCount, error } = await supabase.rpc('delete_favorite_list_owned', {
      p_list_id: listId,
    });

    if (error) {
      const msg = error.message || '';
      if (/function .* does not exist|Could not find the function/i.test(msg)) {
        throw new Error(
          'Delete is not set up on the server yet. In Supabase → SQL Editor, run the file supabase/migrations/20260513130000_delete_favorite_list_rpc.sql (or push migrations), then try again.'
        );
      }
      throw error;
    }

    const n = Number(deletedCount);
    if (Number.isNaN(n) || n !== 1) {
      throw new Error(
        'This favorite list could not be deleted. Sign in as the account that owns this collection, or confirm the list still exists.'
      );
    }

    return true;
  },

  /**
   * Get download activity for a collection
   */
  async getDownloadActivity(collectionId) {
    try {
      console.log('Fetching download activity for collection:', collectionId);
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          id,
          event_type,
          visitor_email,
          created_at,
          metadata,
          resolution,
          photo:photos!activity_log_photo_id_fkey (
            id,
            filename
          )
        `)
        .eq('collection_id', collectionId)
        .eq('event_type', 'download')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        email: item.visitor_email || 'Unknown visitor',
        date: item.created_at,
        type: item.metadata?.type || (item.photo_id ? 'single' : 'gallery'),
        resolution: item.resolution || item.metadata?.resolution || 'Original',
        filename: item.photo?.filename || null,
        size: item.metadata?.size || null,
        pinUsed: item.metadata?.pinUsed || false,
        setName: item.metadata?.setName || 'Highlights',
        pin: item.metadata?.pin || '---'
      }));
    } catch (error) {
      console.error('Error in getDownloadActivity:', error);
      return [];
    }
  },

  /**
   * Delete an activity log entry (collection owner only).
   * Uses RPC with SECURITY DEFINER so deletes persist under RLS.
   */
  async deleteActivity(activityId) {
    const id = Number(activityId);
    if (!Number.isFinite(id)) {
      throw new Error('Invalid activity id');
    }

    const { data: deletedCount, error } = await supabase.rpc('delete_activity_log_owned', {
      p_activity_id: id,
    });

    if (error) {
      const msg = error.message || '';
      if (/function .* does not exist|Could not find the function/i.test(msg)) {
        throw new Error(
          'Delete is not set up on the server yet. In Supabase → SQL Editor, run supabase/migrations/20260513140000_delete_activity_log_rpc.sql, then try again.'
        );
      }
      throw error;
    }

    const n = Number(deletedCount);
    if (Number.isNaN(n) || n !== 1) {
      throw new Error(
        'This activity row could not be deleted. Sign in as the account that owns this collection, or confirm the entry still exists.'
      );
    }

    return true;
  },

  /**
   * Log an activity event
   */
  async logActivity(collectionId, eventType, data = {}) {
    try {
      const { error } = await supabase
        .from('activity_log')
        .insert([{
          collection_id: collectionId,
          photographer_id: data.photographerId || null,
          event_type: eventType,
          visitor_email: data.email || null,
          photo_id: data.photoId || null,
          metadata: data.metadata || null
        }]);
      if (error) throw error;
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }
  },

  /**
   * Get the download count for a collection
   */
  async getDownloadCount(collectionId) {
    try {
      const { count, error } = await supabase
        .from('activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collectionId)
        .eq('event_type', 'download');
      
      if (error) throw error;
      return count || 0;
    } catch (e) {
      console.error('Error getting download count:', e);
      return 0;
    }
  },

  /**
   * Get the number of times the download PIN has been successfully used
   */
  async getPinUsageCount(collectionId) {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('metadata')
        .eq('collection_id', collectionId)
        .eq('event_type', 'password_attempt');

      if (error) throw error;
      // Count only entries where metadata.success === true and type is download_pin
      const successCount = (data || []).filter(
        row => row.metadata?.success === true && row.metadata?.type === 'download_pin'
      ).length;
      return successCount;
    } catch (e) {
      console.error('Error getting PIN usage count:', e);
      return 0;
    }
  }
};
