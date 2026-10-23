import React, { useCallback, useMemo, useRef, useState } from 'react';
import { startNativePhotoDownloads } from '@/lib/deliveryDownload';
import { DeliveryDownloadContext } from './deliveryDownloadContext';

const idleProgress = (folderName, count) => ({
  folderName,
  total: count,
  index: 0,
  filename: '',
  saved: 0,
  failed: 0,
  phase: 'starting',
  bytesReceived: 0,
  bytesTotal: 0,
  done: false,
});

export function DeliveryDownloadProvider({ children }) {
  const [progress, setProgress] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const runningRef = useRef(false);

  const startDownload = useCallback(async (photos = [], extra = {}) => {
    if (runningRef.current) {
      throw new Error('A delivery download is already in progress.');
    }
    runningRef.current = true;
    setMinimized(false);
    try {
      const result = await startNativePhotoDownloads(photos, {
        ...extra,
        onPicked: (folderName, count) => {
          extra.onPicked?.(folderName, count);
          setProgress(idleProgress(folderName, count));
        },
        onProgress: (patch) => {
          extra.onProgress?.(patch);
          setProgress((prev) => ({ ...(prev || {}), ...patch, done: false }));
        },
        onFileSaved: (saved, total, filename) => {
          extra.onFileSaved?.(saved, total, filename);
          setProgress((prev) => ({
            ...(prev || {}),
            saved,
            total,
            filename,
            phase: 'saved',
          }));
        },
      });
      if (result?.cancelled) {
        setProgress(null);
        return result;
      }
      setProgress((prev) => (
        prev
          ? {
              ...prev,
              saved: result.saved,
              failed: result.failed,
              folderName: result.folderName || prev.folderName,
              phase: 'done',
              done: true,
            }
          : prev
      ));
      return result;
    } catch (err) {
      setProgress(null);
      throw err;
    } finally {
      runningRef.current = false;
    }
  }, []);

  const startCloudSave = useCallback(async ({ folderName, total, destination, task }) => {
    if (runningRef.current) {
      throw new Error('A delivery download is already in progress.');
    }
    runningRef.current = true;
    setMinimized(false);
    const waiting = destination === 'dropbox'
      ? 'Waiting for Dropbox sign-in…'
      : 'Waiting for Google sign-in…';
    setProgress({
      ...idleProgress(folderName, total),
      destination,
      phase: 'auth',
      filename: waiting,
      percent: 0,
    });
    const report = (patch) => {
      setProgress((prev) => ({
        ...(prev || {}),
        ...patch,
        destination,
        folderName: patch.folderName || folderName,
        done: false,
      }));
    };
    try {
      const result = await task(report);
      const saved = Number(result?.uploaded ?? result?.photoCount ?? result?.saved ?? total) || 0;
      const failed = Number(result?.failed) || 0;
      setProgress((prev) => ({
        ...(prev || {}),
        destination,
        folderName,
        total,
        saved,
        failed,
        percent: 100,
        phase: 'done',
        done: true,
        openUrl: result?.folderUrl || result?.webViewLink || '',
        filename: '',
        error: '',
      }));
      return result;
    } catch (err) {
      const message = err?.message || 'Upload failed.';
      setProgress((prev) => ({
        ...(prev || {}),
        destination,
        folderName,
        phase: 'error',
        done: true,
        error: message,
        filename: message,
      }));
      return { failed: true, error: message };
    } finally {
      runningRef.current = false;
    }
  }, []);

  const dismiss = useCallback(() => {
    setProgress((prev) => (prev?.done || !runningRef.current ? null : prev));
    setMinimized(false);
  }, []);

  const minimize = useCallback(() => setMinimized(true), []);
  const expand = useCallback(() => setMinimized(false), []);

  const value = useMemo(
    () => ({
      progress,
      minimized,
      startDownload,
      startCloudSave,
      dismiss,
      minimize,
      expand,
    }),
    [progress, minimized, startDownload, startCloudSave, dismiss, minimize, expand],
  );

  return (
    <DeliveryDownloadContext.Provider value={value}>
      {children}
    </DeliveryDownloadContext.Provider>
  );
}
