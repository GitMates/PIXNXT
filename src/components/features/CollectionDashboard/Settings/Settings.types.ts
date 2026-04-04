export interface GeneralSettingsProps {
  collectionUrl: string;
  setCollectionUrl: (url: string) => void;
  defaultWatermark: string;
  setDefaultWatermark: (val: string) => void;
  autoExpiry: string;
  setAutoExpiry: (val: string) => void;
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
}

export interface DownloadSettingsProps {
  photoDownload: boolean;
  setPhotoDownload: (val: boolean) => void;
  photoDownloadSizes: string[];
  setPhotoDownloadSizes: (val: string[]) => void;
  downloadPin: boolean;
  setDownloadPin: (val: boolean) => void;
  pinValue: string;
  setPinValue: (val: string) => void;
  activeTab: 'general' | 'advanced';
  setActiveTab: (tab: 'general' | 'advanced') => void;
}

export interface FavoriteSettingsProps {
  favoritePhotos: boolean;
  setFavoritePhotos: (val: boolean) => void;
  favoriteNotes: boolean;
  setFavoriteNotes: (val: boolean) => void;
}
