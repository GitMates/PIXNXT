import { Photo as GlobalPhoto } from '../../../../types/collection.types';

export type Photo = GlobalPhoto;

export type CoverFocalSurfaceId = 'website' | 'desktop' | 'phone' | 'card' | 'email';

export type CoverFocalPoint = { x: number; y: number };

export type CoverFocals = Record<CoverFocalSurfaceId, CoverFocalPoint>;

export type ChangeCoverModalView = 'pick' | 'edit';

export interface ChangeCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  coverUrl?: string | null;
  coverPhoto?: Photo | null;
  initialFocals?: CoverFocals;
  initialView?: ChangeCoverModalView;
  sets?: { id: string; name: string }[];
  highlightsName?: string;
  onConfirm: (payload: { photo: Photo | null; focals: CoverFocals }) => void | Promise<void>;
  onDraftChange?: (payload: { photo: Photo | null; focals: CoverFocals }) => void;
  onRemove?: () => void | Promise<void>;
  saving?: boolean;
  onCoverFileSelect?: (file: File) => Promise<Photo | void | null> | Photo | void | null;
}
