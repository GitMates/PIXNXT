export interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

export interface UploadWidgetProps {
  isOpen: boolean;
  isMinimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  files: UploadFile[];
}
