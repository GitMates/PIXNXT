import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Collection,
  PhotoSet,
  Photo,
  SidebarTab,
  SettingsTab,
  DesignTab,
} from "@/types/collection.types";
import { DesignSettings } from "@/types/design.types";

export function useCollectionDashboard(collectionId: string | null) {
  const [isLoading, setIsLoading] = useState(true);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [sets, setSets] = useState<PhotoSet[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  // Status State
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [gridSize, setGridSize] = useState<"small" | "large">("small");
  const [showFilename, setShowFilename] = useState(false);

  // Settings State
  const [collectionUrl, setCollectionUrl] = useState("");
  const [defaultWatermark, setDefaultWatermark] = useState("No watermark");
  const [autoExpiry, setAutoExpiry] = useState("");
  const [emailRegistration, setEmailRegistration] = useState(true);
  const [galleryAssist, setGalleryAssist] = useState(false);
  const [slideshow, setSlideshow] = useState(true);
  const [socialSharing, setSocialSharing] = useState(true);
  const [language, setLanguage] = useState("English");

  // Privacy State
  const [collectionPassword, setCollectionPassword] = useState("");
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [clientExclusiveAccess, setClientExclusiveAccess] = useState(false);

  // Download State
  const [photoDownload, setPhotoDownload] = useState(true);
  const [galleryDownload, setGalleryDownload] = useState(true);
  const [singlePhotoDownload, setSinglePhotoDownload] = useState(true);
  const [photoDownloadSizes, setPhotoDownloadSizes] = useState<string[]>([
    "high",
    "web",
  ]);
  const [downloadPin, setDownloadPin] = useState(true);
  const [pinValue, setPinValue] = useState("");
  const [emailTracking, setEmailTracking] = useState(true);

  // Favorite State
  const [favoritePhotos, setFavoritePhotos] = useState(true);
  const [favoriteNotes, setFavoriteNotes] = useState(true);

  // Activity State
  const [activeActivityTab, setActiveActivityTab] = useState<any>("download");

  // UI State
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<SidebarTab>("photos");
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<SettingsTab>("general");
  const [activeDesignTab, setActiveDesignTab] = useState<DesignTab>("cover");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"upload" | "embed">(
    "upload",
  );
  const [showAddSetModal, setShowAddSetModal] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [savingSet, setSavingSet] = useState(false);
  const [editingSet, setEditingSet] = useState<PhotoSet | null>(null);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [uploadWidget, setUploadWidget] = useState({
    isOpen: false,
    isMinimized: false,
    files: [],
  });

  // Design State (Mirrored from Collection but managed locally for preview)
  const [designSettings, setDesignSettings] = useState<DesignSettings>({
    coverStyle: "center",
    fontFamily: "sans",
    colorPalette: "light",
    grid: {
      style: "vertical",
      size: "regular",
      spacing: "regular",
      aspectRatio: "3-2",
      navigation: "icon",
    },
  });

  const fetchData = useCallback(async () => {
    if (!collectionId) return;

    setIsLoading(true);
    try {
      // 1. Fetch Collection
      const { data: collectionData, error: colError } = await supabase
        .from("collections")
        .select("*")
        .eq("id", collectionId)
        .single();

      if (colError) throw colError;
      setCollection(collectionData);

      // Sync settings from collection data
      if (collectionData.status)
        setStatus(collectionData.status.toUpperCase() as any);
      if (collectionData.slug) setCollectionUrl(collectionData.slug);
      
      // Sync design settings
      setDesignSettings({
        coverStyle: collectionData.cover_style || 'novel',
        fontFamily: collectionData.font_family || 'sans',
        colorPalette: collectionData.color_palette || 'light',
        grid: {
          style: collectionData.grid_style || 'vertical',
          size: collectionData.thumbnail_size || 'regular',
          spacing: collectionData.grid_spacing || 'regular',
          aspectRatio: collectionData.aspect_ratio || '3-2',
          navigation:
            collectionData.nav_style === 'icons_labels' ? 'text' : 'icon'
        }
      });

      const { data: setsData, error: setsError } = await supabase
        .from("sets")
        .select("*")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: true });

      if (setsError) throw setsError;
      setSets(setsData || []);

      // 3. Fetch Photos (Highlights initially or based on activeSetId)
      await fetchPhotos(activeSetId);
    } catch (error) {
      console.error("Error fetching collection data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [collectionId, activeSetId]);

  const fetchPhotos = useCallback(
    async (setId: string | null) => {
      if (!collectionId) return;

      let query = supabase
        .from("photos")
        .select("*")
        .eq("collection_id", collectionId);

      if (setId) {
        query = query.eq("set_id", setId);
      } else {
        query = query.is("set_id", null);
      }

      const { data: photosData, error: photosError } = await query.order(
        "position",
        { ascending: true },
      ).order("created_at", { ascending: false });

      if (photosError) {
        console.error("Error fetching photos:", photosError);
        return;
      }
      setPhotos(photosData || []);
    },
    [collectionId],
  );

  // Fetch all photos for the collection (no set filter) — used for the preview pane
  const fetchAllPhotos = useCallback(async () => {
    if (!collectionId) return;
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("collection_id", collectionId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (!error) setAllPhotos(data || []);
  }, [collectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch all photos once on mount/collectionId change (for preview pane)
  useEffect(() => {
    fetchAllPhotos();
  }, [fetchAllPhotos]);

  // Auto-save design settings
  useEffect(() => {
    const saveDesignSettings = async () => {
      if (!collectionId || !collection) return;

      const { error } = await supabase
        .from('collections')
        .update({
          cover_style: designSettings.coverStyle,
          font_family: designSettings.fontFamily,
          color_palette: designSettings.colorPalette,
          grid_style: designSettings.grid.style,
          thumbnail_size: designSettings.grid.size,
          grid_spacing: designSettings.grid.spacing,
          aspect_ratio: designSettings.grid.aspectRatio,
          nav_style:
            designSettings.grid.navigation === 'text' ? 'icons_labels' : 'icons'
        })
        .eq('id', collectionId);

      if (error) {
        console.error('Error saving design settings:', error);
      }
    };

    const debounceTimer = setTimeout(saveDesignSettings, 1000);
    return () => clearTimeout(debounceTimer);
  }, [designSettings, collectionId]);

  // Sync photos when activeSetId changes
  useEffect(() => {
    if (collectionId) {
      fetchPhotos(activeSetId);
      // Also refresh allPhotos so preview stays up to date
      fetchAllPhotos();
    }
  }, [activeSetId, collectionId, fetchPhotos, fetchAllPhotos]);

  return {
    isLoading,
    collection,
    setCollection,
    sets,
    photos,
    activeSetId,
    setActiveSetId,
    activeSidebarTab,
    setActiveSidebarTab,
    activeSettingsTab,
    setActiveSettingsTab,
    activeDesignTab,
    setActiveDesignTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    status,
    setStatus,
    gridSize,
    setGridSize,
    showFilename,
    setShowFilename,
    collectionUrl,
    setCollectionUrl,
    defaultWatermark,
    setDefaultWatermark,
    autoExpiry,
    setAutoExpiry,
    emailRegistration,
    setEmailRegistration,
    galleryAssist,
    setGalleryAssist,
    slideshow,
    setSlideshow,
    socialSharing,
    setSocialSharing,
    language,
    setLanguage,
    collectionPassword,
    setCollectionPassword,
    showOnHomepage,
    setShowOnHomepage,
    clientExclusiveAccess,
    setClientExclusiveAccess,
    photoDownload,
    setPhotoDownload,
    galleryDownload,
    setGalleryDownload,
    singlePhotoDownload,
    setSinglePhotoDownload,
    photoDownloadSizes,
    setPhotoDownloadSizes,
    downloadPin,
    setDownloadPin,
    pinValue,
    setPinValue,
    emailTracking,
    setEmailTracking,
    favoritePhotos,
    setFavoritePhotos,
    favoriteNotes,
    setFavoriteNotes,
    activeActivityTab,
    setActiveActivityTab,
    showUploadModal,
    setShowUploadModal,
    activeMediaTab,
    setActiveMediaTab,
    showAddSetModal,
    setShowAddSetModal,
    newSetName,
    setNewSetName,
    newSetDescription,
    setNewSetDescription,
    savingSet,
    setSavingSet,
    editingSet,
    setEditingSet,
    showCoverModal,
    setShowCoverModal,
    uploadWidget,
    setUploadWidget,
    designSettings,
    setDesignSettings,
    previewMode,
    setPreviewMode,
    refreshData: fetchData,
    setPhotos,
    allPhotos,
    setAllPhotos,
  };
}
