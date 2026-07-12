import { createContext, useContext } from 'react';

export const UploadQueueContext = createContext(null);

export function useUploadQueueContext() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) {
    throw new Error('useUploadQueueContext must be used within UploadQueueProvider');
  }
  return ctx;
}
