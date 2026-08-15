import React from 'react';

export interface GeneralSettingsProps {
    collectionId: string;
    collection: any;
    setCollection: React.Dispatch<React.SetStateAction<any>>;
    collectionUrl: string;
    setCollectionUrl: (val: string) => void;
    defaultWatermark: string;
    setDefaultWatermark: (val: string) => void;
    autoExpiry: string | null;
    setAutoExpiry: (val: string | null) => void;
    setShowExpiryReminderModal: (val: boolean) => void;
    emailRegistration: boolean;
    setEmailRegistration: (val: boolean) => void;
    galleryAssist: boolean;
    setGalleryAssist: (val: boolean) => void;
    slideshow: boolean;
    setSlideshow: (val: boolean) => void;
    socialSharing: boolean;
    setSocialSharing: (val: boolean) => void;
    language: string;
    setLanguage: (val: string) => void;
    categoryTags: string[];
    onCategoryTagsChange: (tags: string[]) => void;
    categoryTagsSaving?: boolean;
    showGeneralAdditionalOptions: boolean;
    setShowGeneralAdditionalOptions: (val: boolean) => void;
}

export interface DownloadSettingsProps {
  collectionId: string;
  collection: any;
  setCollection?: React.Dispatch<React.SetStateAction<any>>;
  photos?: any[];
  photoDownload: boolean;
  setPhotoDownload: (val: boolean) => void;
  galleryDownload: boolean;
  setGalleryDownload: (val: boolean) => void;
  singlePhotoDownload: boolean;
  setSinglePhotoDownload: (val: boolean) => void;
  requirePinForSinglePhoto: boolean;
  setRequirePinForSinglePhoto: (val: boolean) => void;
  emailRegistration: boolean;
  setEmailRegistration: (val: boolean) => void;
  restrictSinglePhotoSizes: boolean;
  setRestrictSinglePhotoSizes: (val: boolean) => void;
  downloadPin: boolean;
  setDownloadPin: (val: boolean) => void;
  pinValue: string;
  setPinValue: (val: string) => void;
  onPinEnter?: (pin: string) => void;
  downloadLimit: string;
  setDownloadLimit: (val: string) => void;
  restrictToEmails: string;
  setRestrictToEmails: (val: string) => void;
  selectedDownloadSets: string[];
  setSelectedDownloadSets: React.Dispatch<React.SetStateAction<string[]>>;
  sets: { id: string, name: string }[];
  pinUsageLimit: string;
  setPinUsageLimit: (val: string) => void;
  photoDownloadSizes?: string[];
  setPhotoDownloadSizes?: (sizes: string[]) => void;
  highResChoice?: string;
  setHighResChoice?: (val: string) => void;
  webSizeChoice?: string;
  setWebSizeChoice?: (val: string) => void;
  setActiveSidebarTab?: (tab: string) => void;
  setActiveActivitySubTab?: (tab: string) => void;
}

export interface FavoriteSettingsProps {
  collectionId: string;
  collection: any;
  setCollection?: React.Dispatch<React.SetStateAction<any>>;
  collectionUrl: string;
  profile?: any;
  favoritePhotos: boolean;
  setFavoritePhotos: (val: boolean) => void;
  favoriteNotes: boolean;
  setFavoriteNotes: (val: boolean) => void;
  favoriteLists?: any[];
  onReviewList?: (list: any) => void;
  onEditList?: (list: any) => void;
  setShowCreateFavoriteListModal: (val: boolean) => void;
  setActiveSidebarTab?: (tab: string) => void;
  setActiveActivitySubTab?: (tab: string) => void;
}

export interface StoreSettingsProps {
  collectionId: string;
  collection: any;
  setCollection?: React.Dispatch<React.SetStateAction<any>>;
  storeEnabled: boolean;
  setStoreEnabled: (val: boolean) => void;
  setActiveSidebarTab: (tab: string) => void;
  setActiveActivitySubTab: (tab: string) => void;
}
