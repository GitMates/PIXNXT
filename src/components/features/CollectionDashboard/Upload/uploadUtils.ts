import type { UploadPanelTab, UploadQueueFile } from './uploadTypes';

export function formatUploadMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01 && bytes > 0) return '<0.01 MB';
  return `${mb.toFixed(mb >= 10 ? 0 : 2)} MB`;
}

export function uploadTotalBytes(file: UploadQueueFile): number {
  return file.uploadSize ?? file.size;
}

export function uploadBytesDone(file: UploadQueueFile): number {
  const total = uploadTotalBytes(file);
  if (file.status === 'completed') return total;
  return Math.round((total * file.progress) / 100);
}

export function filterFilesByTab(files: UploadQueueFile[], tab: UploadPanelTab): UploadQueueFile[] {
  if (tab === 'uploading') {
    return files.filter((f) => f.status === 'waiting' || f.status === 'uploading' || f.status === 'processing');
  }
  if (tab === 'complete') return files.filter((f) => f.status === 'completed');
  return files.filter((f) => f.status === 'error');
}

export function uploadTabCounts(files: UploadQueueFile[]) {
  return {
    uploading: files.filter((f) => f.status === 'waiting' || f.status === 'uploading' || f.status === 'processing').length,
    complete: files.filter((f) => f.status === 'completed').length,
    failed: files.filter((f) => f.status === 'error').length,
  };
}

/** Byte-weighted progress (matches Pixieset % while count shows files). */
export function uploadOverallPercent(files: UploadQueueFile[]): number {
  if (files.length === 0) return 0;
  const totalBytes = files.reduce((acc, f) => acc + uploadTotalBytes(f), 0);
  if (totalBytes === 0) return 0;
  const doneBytes = files.reduce((acc, f) => acc + uploadBytesDone(f), 0);
  return Math.min(100, Math.round((doneBytes / totalBytes) * 100));
}
