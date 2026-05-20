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

/** Overall progress by completed file count (e.g. 100 / 200 → 50%). */
export function uploadOverallPercent(files: UploadQueueFile[]): number {
  if (files.length === 0) return 0;
  const completed = files.filter((f) => f.status === 'completed').length;
  return Math.min(100, Math.round((completed / files.length) * 100));
}

/** Skip files whose name already exists in the collection or the active upload queue. */
export function partitionDuplicateUploadFiles(
  files: File[],
  existingNamesLower: Iterable<string>,
  queuedNamesLower: Iterable<string>
): { accepted: File[]; skipped: string[] } {
  const seen = new Set<string>();
  for (const name of existingNamesLower) seen.add(name);
  for (const name of queuedNamesLower) seen.add(name);

  const accepted: File[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const key = file.name.toLowerCase();
    if (seen.has(key)) {
      skipped.push(file.name);
      continue;
    }
    seen.add(key);
    accepted.push(file);
  }

  return { accepted, skipped };
}
