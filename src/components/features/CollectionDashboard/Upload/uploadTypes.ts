export type UploadFileStatus =
  | 'waiting'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

export type UploadPanelTab = 'uploading' | 'waiting' | 'complete' | 'failed';

export type UploadMediaKind = 'image' | 'video' | 'gif' | 'raw';

export interface UploadQueueFile {
  id: string;
  file: File;
  name: string;
  /** Original file size (for display). */
  size: number;
  /** Bytes sent to R2 after compression (for progress). */
  uploadSize?: number;
  /**
   * Original PUT/part bytes that returned 2xx. Never includes xhr buffer
   * progress, so overall metrics cannot go backwards on a retry.
   */
  confirmedBytes?: number;
  progress: number;
  status: UploadFileStatus;
  previewUrl?: string;
  /** image | video | gif | raw — drives upload UI copy (e.g. "Video upload"). */
  mediaKind?: UploadMediaKind;
  errorMessage?: string;
  /** True when multipart/original progress can continue via Resume. */
  resumable?: boolean;
  /** In-flight upload context (photo id, path, multipart checkpoint). */
  uploadContext?: Record<string, unknown>;
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
  isStopped: boolean;
  /** Files currently in flight (derivatives + originals). */
  activeConcurrency: number;
  showDetails: boolean;
  activeTab: UploadPanelTab;
  files: UploadQueueFile[];
}

export const initialUploadWidgetState: UploadWidgetState = {
  isOpen: false,
  isMinimized: false,
  isPaused: false,
  isStopped: false,
  activeConcurrency: 0,
  showDetails: false,
  activeTab: 'uploading',
  files: [],
};
