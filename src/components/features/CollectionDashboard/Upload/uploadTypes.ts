export type UploadFileStatus =
  | 'waiting'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

export type UploadPanelTab = 'uploading' | 'complete' | 'failed';

export interface UploadQueueFile {
  id: string;
  file: File;
  name: string;
  /** Original file size (for display). */
  size: number;
  /** Bytes sent to R2 after compression (for progress). */
  uploadSize?: number;
  progress: number;
  status: UploadFileStatus;
  previewUrl?: string;
  errorMessage?: string;
  /** Frozen at enqueue — uploads always use this collection/set. */
  collectionId?: string;
  photographerId?: string;
  setId?: string | null;
  sortIndex?: number;
  destinationLabel?: string;
}

export interface UploadWidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  isPaused: boolean;
  showDetails: boolean;
  activeTab: UploadPanelTab;
  files: UploadQueueFile[];
}

export const initialUploadWidgetState: UploadWidgetState = {
  isOpen: false,
  isMinimized: false,
  isPaused: false,
  showDetails: false,
  activeTab: 'uploading',
  files: [],
};
