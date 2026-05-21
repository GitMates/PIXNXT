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
}

export interface PrivacySettingsProps {
    collectionPassword: string;
    setCollectionPassword: (val: string) => void;
    showOnHomepage: boolean;
    setShowOnHomepage: (val: boolean) => void;
    clientExclusiveAccess: boolean;
    setClientExclusiveAccess: (val: boolean) => void;
    clientPrivatePassword: string;
    setClientPrivatePassword: (val: string) => void;
    allowClientsMarkPrivate: boolean;
    setAllowClientsMarkPrivate: (val: boolean) => void;
    clientOnlyHighlights: boolean;
    setClientOnlyHighlights: (val: boolean) => void;
    clientOnlySets: import('../../ClientExclusiveAccess').ClientExclusiveSetOption[];
    onSetClientOnlyChange: (setId: string, isClientOnly: boolean) => void;
}

export interface DownloadSettingsProps {
  photoDownload: boolean;
  setPhotoDownload: (val: boolean) => void;
  showAdditionalOptions: boolean;
  setShowAdditionalOptions: (val: boolean) => void;
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
  activeDownloadTab: 'general' | 'advanced';
  setActiveDownloadTab: (tab: 'general' | 'advanced') => void;
  setActiveSidebarTab: (tab: string) => void;
  setActiveActivitySubTab: (tab: string) => void;
}

export interface FavoriteSettingsProps {
  favoritePhotos: boolean;
  setFavoritePhotos: (val: boolean) => void;
  favoriteNotes: boolean;
  setFavoriteNotes: (val: boolean) => void;
  setShowCreateFavoriteListModal: (val: boolean) => void;
  setActiveSidebarTab: (tab: string) => void;
  setActiveActivitySubTab: (tab: string) => void;
}
